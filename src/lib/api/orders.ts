import "server-only";

import type { OrderRow } from "@/components/dashboards/orders/types";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type OrderStatusValue = Enums<"order_status">;

// DB 行 -> 前端行：select 时 left join customers 拿 customer_name，
// 避免前端再发一次请求
interface OrderJoinRow {
  id: string;
  org_id: string;
  customer_id: string;
  number: string;
  amount: number;
  status: OrderStatusValue;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  customers: { name: string; email: string } | null;
}

// orders 查询列（列表与导出共用，含 customers 关联）
const ORDER_SELECT =
  "id, org_id, customer_id, number, amount, status, payment_method, notes, created_at, customers(name, email)";

function toOrderRow(row: OrderJoinRow): OrderRow {
  return {
    id: row.id,
    orgId: row.org_id,
    customerId: row.customer_id,
    customerName: row.customers?.name ?? "",
    customerEmail: row.customers?.email ?? "",
    number: row.number,
    amount: row.amount,
    status: row.status,
    paymentMethod: row.payment_method,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

// 读取指定组织的全部 orders（left join customers 拿名称 + email）
export async function getOrders(orgId: string): Promise<OrderRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .order("number", { ascending: false });

  if (error !== null) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return data.map(toOrderRow);
}

// PostgREST 单次 select 默认最多 1000 行，导出需要按 range 分批拉取
const EXPORT_PAGE_SIZE = 1000;

// 导出专用：分页拉全量，绕过 1000 行上限。
// ids 为 null 表示导出全部；传数组时直接按 id 过滤，避免先拉全表再内存筛选。
export async function getOrdersForExport(
  orgId: string,
  ids: string[] | null,
): Promise<OrderRow[]> {
  const supabase = await createClient();
  const rows: OrderRow[] = [];

  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const base = supabase.from("orders").select(ORDER_SELECT).eq("org_id", orgId);
    const filtered = ids === null ? base : base.in("id", ids);
    const { data, error } = await filtered
      .order("created_at", { ascending: false })
      .order("number", { ascending: false })
      .range(from, from + EXPORT_PAGE_SIZE - 1);

    if (error !== null) {
      throw new Error(`Failed to fetch orders for export: ${error.message}`);
    }

    rows.push(...data.map(toOrderRow));
    if (data.length < EXPORT_PAGE_SIZE) break;
  }

  return rows;
}

// 新建/编辑订单的白名单写入字段（number 服务端生成；org_id 服务端注入）
export interface OrderWriteInput {
  customer_id: string;
  amount: number;
  status: OrderStatusValue;
  payment_method: string | null;
  notes: string | null;
}

function toPgErrorCode(code: string): string {
  if (code === "23505") return "duplicate_number";
  if (code === "42501" || code === "42503") return "forbidden";
  return code;
}

// 生成订单号（RPC：security definer 绕 RLS）
async function generateOrderNumber(orgId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_order_number", { p_org_id: orgId });
  if (error !== null) {
    throw new Error(`Failed to generate order number: ${error.message}`);
  }
  return data as string;
}

// 批量取号（导入用）：generate_order_number 的序号是「当日该组织订单数 + 1」，
// 所以一次调用即可按序推导出后续单号，避免每单一次往返。
// 若期间有并发下单导致撞号，调用方回退到逐条重新取号插入。
const ORDER_NUMBER_PATTERN = /^(ORD-\d{8}-)(\d{4,})$/;

export async function generateOrderNumbers(
  orgId: string,
  count: number,
): Promise<string[]> {
  if (count <= 0) return [];
  const first = await generateOrderNumber(orgId);
  const match = ORDER_NUMBER_PATTERN.exec(first);
  if (match === null) {
    throw new Error("unexpected_order_number_format");
  }
  const prefix = match[1];
  const start = Number(match[2]);
  return Array.from(
    { length: count },
    (_, i) => `${prefix}${String(start + i).padStart(4, "0")}`,
  );
}

// 带单号的订单写入字段（批量插入用：单号已由 generateOrderNumbers 一次生成）
export interface OrderNumberedInput extends OrderWriteInput {
  number: string;
}

// 批量新建订单（导入用）：单次请求写入，避免逐行跨境往返
export async function insertOrders(
  orgId: string,
  inputs: OrderNumberedInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  const supabase = await createClient();

  const { error } = await supabase.from("orders").insert(
    inputs.map((input) => ({
      org_id: orgId,
      customer_id: input.customer_id,
      number: input.number,
      amount: input.amount,
      status: input.status,
      payment_method: input.payment_method,
      notes: input.notes,
    })),
  );

  if (error !== null) {
    throw new Error(toPgErrorCode(error.code));
  }
}

export async function insertOrder(
  orgId: string,
  input: OrderWriteInput,
): Promise<void> {
  const supabase = await createClient();
  const number = await generateOrderNumber(orgId);

  const { error } = await supabase.from("orders").insert({
    org_id: orgId,
    customer_id: input.customer_id,
    number,
    amount: input.amount,
    status: input.status,
    payment_method: input.payment_method,
    notes: input.notes,
  });

  if (error !== null) {
    throw new Error(toPgErrorCode(error.code));
  }
}

export async function patchOrder(
  orgId: string,
  id: string,
  input: OrderWriteInput,
): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .update({
      customer_id: input.customer_id,
      amount: input.amount,
      status: input.status,
      payment_method: input.payment_method,
      notes: input.notes,
    })
    .eq("org_id", orgId)
    .eq("id", id)
    .select("id");

  if (error !== null) {
    throw new Error(toPgErrorCode(error.code));
  }
  if (data.length === 0) {
    throw new Error("not_found");
  }
}

// 批量删除订单：返回实际删除行数
export async function deleteOrders(
  orgId: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .delete()
    .eq("org_id", orgId)
    .in("id", ids)
    .select("id");

  if (error !== null) {
    throw new Error(toPgErrorCode(error.code));
  }
  if (data.length === 0) {
    throw new Error("not_found");
  }
  return data.length;
}

export async function deleteOrder(
  orgId: string,
  id: string,
): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .delete()
    .eq("org_id", orgId)
    .eq("id", id)
    .select("id");

  if (error !== null) {
    throw new Error(toPgErrorCode(error.code));
  }
  if (data.length === 0) {
    throw new Error("not_found");
  }
}
