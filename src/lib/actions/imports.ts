"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  insertCustomer,
  insertCustomers,
  type CustomerWriteInput,
} from "@/lib/api/customers";
import { generateOrderNumbers, insertOrder, insertOrders } from "@/lib/api/orders";
import { parseCsv } from "@/lib/csv";
import { z } from "zod";

export interface ImportError {
  /** CSV 里的行号（从 1 开始，不含 header） */
  row: number;
  field?: string;
  message: string;
}

export interface ImportSuccess {
  ok: true;
  inserted: number;
  totalRows: number;
}

export interface ImportPartialFail {
  ok: false;
  inserted: number;
  totalRows: number;
  errors: ImportError[];
}

export type ImportResult = ImportSuccess | ImportPartialFail;

// ============= 字段名规范化 =============

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "fullname", "full name", "customer name"],
  email: ["email", "e-mail", "email address", "customer email"],
  company: ["company", "company name", "organization", "org"],
  status: ["status", "customer status"],
  spent: ["spent", "lifetime value", "ltv", "total spent"],
  amount: ["amount", "order amount", "total", "total amount"],
  paymentMethod: ["payment method", "paymentmethod", "payment", "payment type"],
  notes: ["notes", "note", "remark", "remarks", "comment"],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]+/g, "");
}

function mapHeaders(headers: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const nh = normalizeHeader(headers[i] ?? "");
    if (nh === "") continue;
    for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.map(normalizeHeader).includes(nh)) {
        out[canonical] = i;
        break;
      }
    }
  }
  return out;
}

// ============= Customers 导入 =============

const CUSTOMER_STATUS_VALUES = ["active", "inactive", "vip", "atRisk"] as const;
const customerImportSchema = z.object({
  name: z.string().trim().min(1, "required").max(100, "tooLong"),
  email: z.string().trim().email("invalidEmail"),
  company: z.string().trim().min(1, "required").max(100, "tooLong"),
  status: z.string().trim(),
  spent: z
    .string()
    .trim()
    .transform((v) => (v === "" ? 0 : Number(v.replace(/[^0-9.-]/g, ""))))
    .refine((n) => Number.isFinite(n) && n >= 0, "invalidAmount")
    .transform((n) => Math.round(n)), // spent 是 integer
});

export async function importCustomersCsv(
  orgId: string,
  formData: FormData,
): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, inserted: 0, totalRows: 0, errors: [{ row: 0, message: "no_file" }] };
  }

  const text = await file.text();
  const parsed = parseCsv(text);
  if (parsed.headers.length === 0) {
    return { ok: false, inserted: 0, totalRows: 0, errors: [{ row: 0, message: "empty_file" }] };
  }

  const colIdx = mapHeaders(parsed.headers);
  const requiredCols = ["name", "email", "company"] as const;
  for (const c of requiredCols) {
    if (!(c in colIdx)) {
      return {
        ok: false,
        inserted: 0,
        totalRows: 0,
        errors: [{ row: 0, message: `missing_column_${c}` }],
      };
    }
  }

  // 查本组织已有 email，避免导入重复。
  // DB 查询失败必须整体中止：否则重复校验会静默失效，只能靠唯一约束兜底。
  let existing: Set<string>;
  try {
    existing = new Set(await getOrgCustomerEmails(orgId));
  } catch {
    return {
      ok: false,
      inserted: 0,
      totalRows: parsed.rows.length,
      errors: [{ row: 0, message: "network" }],
    };
  }

  const errors: ImportError[] = [];
  // rowNum 随输入一起保存，插入失败时直接用它报行号，避免事后推算
  const ready: { rowNum: number; input: CustomerWriteInput }[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const rowNum = i + 1;
    const get = (key: string) => colIdx[key] !== undefined ? row[colIdx[key] ?? 0] ?? "" : "";

    // 跳过空行
    if (row.every((c) => c.trim() === "")) continue;

    const raw = {
      name: get("name"),
      email: get("email"),
      company: get("company"),
      status: get("status") || "active",
      spent: get("spent") || "0",
    };

    // zod 校验
    const result = customerImportSchema.safeParse(raw);
    if (!result.success) {
      for (const [field, issues] of Object.entries(result.error.flatten().fieldErrors)) {
        errors.push({ row: rowNum, field, message: issues[0] ?? "invalid" });
      }
      continue;
    }

    // status 枚举校验：大小写不敏感，映射回规范值（导出再导入时 atRisk 不会失配）
    const st = CUSTOMER_STATUS_VALUES.find(
      (s) => s.toLowerCase() === result.data.status.toLowerCase(),
    );
    if (!st) {
      errors.push({ row: rowNum, field: "status", message: "invalidStatus" });
      continue;
    }

    // org 内 email 重复？
    if (existing.has(result.data.email.toLowerCase())) {
      errors.push({ row: rowNum, field: "email", message: "duplicateEmail" });
      continue;
    }

    existing.add(result.data.email.toLowerCase());
    ready.push({
      rowNum,
      input: {
        name: result.data.name,
        email: result.data.email,
        company: result.data.company,
        status: st,
        spent: result.data.spent,
        avatar_url: null,
      },
    });
  }

  // 批量插入（单次请求）；只有批量失败时才回退到逐条插入以定位失败行
  let inserted = 0;
  try {
    await insertCustomers(orgId, ready.map((item) => item.input));
    inserted = ready.length;
  } catch {
    for (const item of ready) {
      try {
        await insertCustomer(orgId, item.input);
        inserted++;
      } catch (err) {
        errors.push({
          row: item.rowNum,
          field: "email",
          message: err instanceof Error ? err.message : "network",
        });
      }
    }
  }

  const nonEmptyRows = parsed.rows.filter(
    (r) => !r.every((c) => c.trim() === ""),
  ).length;

  // 有任何一行写入成功就要刷新列表（导入是写操作，与 CRUD 一致）
  if (inserted > 0) revalidatePath("/", "layout");

  if (errors.length === 0 && inserted === nonEmptyRows) {
    return { ok: true, inserted, totalRows: parsed.rows.length };
  }
  return { ok: false, inserted, totalRows: parsed.rows.length, errors };
}

// 收集本组织所有 customer email（lowercase）
async function getOrgCustomerEmails(orgId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("email")
    .eq("org_id", orgId);
  if (error !== null) throw new Error(error.message);
  return data.map((r) => r.email.toLowerCase());
}

// ============= Orders 导入 =============

const ORDER_STATUS_VALUES = ["pending", "paid", "refunded", "cancelled"] as const;

const orderImportSchema = z.object({
  email: z.string().trim().email("invalidEmail"),
  status: z.string().trim().toLowerCase(),
  amount: z
    .string()
    .trim()
    .transform((v) => (v === "" ? NaN : Number(v.replace(/[^0-9.-]/g, ""))))
    .refine((n) => Number.isFinite(n) && n >= 0 && n <= 999_999_999_999.99, "invalidAmount"),
  paymentMethod: z.string().trim().max(50, "tooLong").optional().default(""),
  notes: z.string().trim().max(1000, "tooLong").optional().default(""),
});

export async function importOrdersCsv(
  orgId: string,
  formData: FormData,
): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, inserted: 0, totalRows: 0, errors: [{ row: 0, message: "no_file" }] };
  }

  const text = await file.text();
  const parsed = parseCsv(text);
  if (parsed.headers.length === 0) {
    return { ok: false, inserted: 0, totalRows: 0, errors: [{ row: 0, message: "empty_file" }] };
  }

  const colIdx = mapHeaders(parsed.headers);
  // Orders CSV 需要 email 列用于 customer 关联
  if (!("email" in colIdx)) {
    return {
      ok: false,
      inserted: 0,
      totalRows: 0,
      errors: [{ row: 0, message: "missing_column_email" }],
    };
  }

  // 先查本组织 customers → Map<email(lower), id>。
  // 查询失败必须整体中止：否则所有行都会被误判成 invalidCustomer。
  let emailMap: Map<string, string>;
  try {
    emailMap = await buildCustomerEmailMap(orgId);
  } catch {
    return {
      ok: false,
      inserted: 0,
      totalRows: parsed.rows.length,
      errors: [{ row: 0, message: "network" }],
    };
  }

  const errors: ImportError[] = [];
  // rowNum / customerId 随输入一起保存，插入失败时直接报行号，无需事后推算
  const ready: {
    rowNum: number;
    customerId: string;
    amount: number;
    status: typeof ORDER_STATUS_VALUES[number];
    paymentMethod: string;
    notes: string;
  }[] = [];

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const rowNum = i + 1;
    if (row.every((c) => c.trim() === "")) continue;

    const get = (key: string) => colIdx[key] !== undefined ? row[colIdx[key] ?? 0] ?? "" : "";
    const raw = {
      email: get("email"),
      status: get("status") || "pending",
      amount: get("amount"),
      paymentMethod: get("paymentMethod"),
      notes: get("notes"),
    };

    const result = orderImportSchema.safeParse(raw);
    if (!result.success) {
      for (const [field, issues] of Object.entries(result.error.flatten().fieldErrors)) {
        errors.push({ row: rowNum, field, message: issues[0] ?? "invalid" });
      }
      continue;
    }

    // status 枚举校验
    const st = result.data.status as typeof ORDER_STATUS_VALUES[number];
    if (!(ORDER_STATUS_VALUES as readonly string[]).includes(st)) {
      errors.push({ row: rowNum, field: "status", message: "invalidStatus" });
      continue;
    }

    // customer email 归属校验
    const customerId = emailMap.get(result.data.email.toLowerCase());
    if (!customerId) {
      errors.push({ row: rowNum, field: "email", message: "invalidCustomer" });
      continue;
    }

    ready.push({
      rowNum,
      customerId,
      amount: Number(result.data.amount.toFixed(2)),
      status: st,
      paymentMethod: result.data.paymentMethod || "",
      notes: result.data.notes || "",
    });
  }

  // 一次取号后批量插入；失败时回退到逐条插入（每行重新取号）以定位失败行
  let inserted = 0;
  try {
    const numbers = await generateOrderNumbers(orgId, ready.length);
    await insertOrders(
      orgId,
      ready.map((item, i) => ({
        customer_id: item.customerId,
        number: numbers[i],
        amount: item.amount,
        status: item.status,
        payment_method: item.paymentMethod || null,
        notes: item.notes || null,
      })),
    );
    inserted = ready.length;
  } catch {
    for (const item of ready) {
      try {
        await insertOrder(orgId, {
          customer_id: item.customerId,
          amount: item.amount,
          status: item.status,
          payment_method: item.paymentMethod || null,
          notes: item.notes || null,
        });
        inserted++;
      } catch (err) {
        errors.push({
          row: item.rowNum,
          message: err instanceof Error ? err.message : "network",
        });
      }
    }
  }

  const nonEmptyRows = parsed.rows.filter((r) => !r.every((c) => c.trim() === "")).length;
  // 有任何一行写入成功就要刷新列表（导入是写操作，与 CRUD 一致）
  if (inserted > 0) revalidatePath("/", "layout");

  if (errors.length === 0 && inserted === nonEmptyRows) {
    return { ok: true, inserted, totalRows: parsed.rows.length };
  }
  return { ok: false, inserted, totalRows: parsed.rows.length, errors };
}

async function buildCustomerEmailMap(orgId: string): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, email")
    .eq("org_id", orgId);
  if (error !== null || data === null) throw new Error("network");
  const map = new Map<string, string>();
  for (const r of data) map.set(r.email.toLowerCase(), r.id);
  return map;
}
