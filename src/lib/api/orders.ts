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
    .select("id, org_id, customer_id, number, amount, status, payment_method, notes, created_at, customers(name, email)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .order("number", { ascending: false });

  if (error !== null) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return data.map(toOrderRow);
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
