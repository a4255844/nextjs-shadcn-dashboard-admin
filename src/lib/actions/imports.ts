"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  insertCustomer,
  type CustomerWriteInput,
} from "@/lib/api/customers";
import { insertOrder } from "@/lib/api/orders";
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

  // 查本组织已有 email，避免导入重复
  const existing = new Set(await getOrgCustomerEmails(orgId));

  const errors: ImportError[] = [];
  const ready: CustomerWriteInput[] = [];

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
      name: result.data.name,
      email: result.data.email,
      company: result.data.company,
      status: st,
      spent: result.data.spent,
      avatar_url: null,
    });
  }

  // 批量插入
  let inserted = 0;
  for (const input of ready) {
    try {
      await insertCustomer(orgId, input);
      inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "network";
      // 找 ready 里对应的 row（用 email 匹配）
      const idxInReady = ready.indexOf(input);
      const originalRowNum = errors.length > 0
        ? errors[errors.length - 1].row + idxInReady + 1
        : idxInReady + 1;
      errors.push({ row: originalRowNum, field: "email", message: msg });
    }
  }

  // 有任何一行写入成功就要刷新列表（导入是写操作，与 CRUD 一致）
  if (inserted > 0) revalidatePath("/", "layout");

  if (errors.length === 0 && inserted === parsed.rows.filter((_, idx) =>
    !parsed.rows[idx].every((c) => c.trim() === "")
  ).length) {
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
  if (error !== null) return [];
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

  // 先查本组织 customers → Map<email(lower), id>
  const emailMap = await buildCustomerEmailMap(orgId);

  const errors: ImportError[] = [];
  const ready: { customerEmail: string; amount: number; status: typeof ORDER_STATUS_VALUES[number]; paymentMethod: string; notes: string }[] = [];

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
      customerEmail: result.data.email,
      amount: Number(result.data.amount.toFixed(2)),
      status: st,
      paymentMethod: result.data.paymentMethod || "",
      notes: result.data.notes || "",
    });
  }

  // 批量插入（逐行调 insertOrder，每行触发 RPC 生成 order number）
  let inserted = 0;
  for (const row of ready) {
    const customerId = emailMap.get(row.customerEmail.toLowerCase())!;
    try {
      await insertOrder(orgId, {
        customer_id: customerId,
        amount: row.amount,
        status: row.status,
        payment_method: row.paymentMethod || null,
        notes: row.notes || null,
      });
      inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "network";
      const rowNum = errors.find((e, idx) =>
        idx === errors.length - 1
          ? true
          : errors[idx + 1].row === e.row + 1
      )?.row ?? 0;
      errors.push({ row: rowNum + 1, message: msg });
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
  if (error !== null || data === null) return new Map();
  const map = new Map<string, string>();
  for (const r of data) map.set(r.email.toLowerCase(), r.id);
  return map;
}
