import "server-only";

import type { CustomerRow } from "@/components/dashboards/customers/types";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

// DB 行类型（snake_case，由 database.types 推导）
type CustomerDbRow = Tables<"customers">;

// DB 行 -> 前端行：只做 snake_case -> camelCase 映射。
// status 的 DB enum 值与前端 StatusKey 完全一致，类型层面直接收窄，
// 无需运行时校验（schema 约束是自己的 check/enum，属于可信来源）。
function toCustomerRow(row: CustomerDbRow): CustomerRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    status: row.status,
    spent: row.spent,
    createdAt: row.created_at,
    avatarColor: row.avatar_color ?? "bg-muted",
    avatarUrl: row.avatar_url ?? null,
  };
}

// 读取指定组织的全部 customers（服务端 RSC 使用）。
// 排序与前端表格无关（表格是客户端排序），这里只保证返回顺序稳定。
// 必须显式按 org_id 过滤：RLS 只保证"所属组织并集"（读权限），
// 多组织用户不做 eq 会看到所有组织的客户（RLS 不是数据过滤的替代品）。
export async function getCustomers(orgId: string): Promise<CustomerRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .order("name", { ascending: true });

  if (error !== null) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }

  return data.map(toCustomerRow);
}

// 供统计卡聚合用的状态枚举引用（保持类型同源）
export type CustomerStatusValue = Enums<"customer_status">;

// PostgREST 单次 select 默认最多 1000 行，导出需要按 range 分批拉取
const EXPORT_PAGE_SIZE = 1000;

// 导出专用：分页拉全量，绕过 1000 行上限。
// ids 为 null 表示导出全部；传数组时直接按 id 过滤，避免先拉全表再内存筛选。
export async function getCustomersForExport(
  orgId: string,
  ids: string[] | null,
): Promise<CustomerRow[]> {
  const supabase = await createClient();
  const rows: CustomerRow[] = [];

  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const base = supabase.from("customers").select("*").eq("org_id", orgId);
    const filtered = ids === null ? base : base.in("id", ids);
    const { data, error } = await filtered
      .order("created_at", { ascending: false })
      .order("name", { ascending: true })
      .range(from, from + EXPORT_PAGE_SIZE - 1);

    if (error !== null) {
      throw new Error(`Failed to fetch customers for export: ${error.message}`);
    }

    rows.push(...data.map(toCustomerRow));
    if (data.length < EXPORT_PAGE_SIZE) break;
  }

  return rows;
}

// 新建/编辑客户的白名单写入字段（不含 org_id：由服务端按 active org 注入；
// 不含 avatar_color / created_at：走 DB 默认）
export interface CustomerWriteInput {
  name: string;
  email: string;
  company: string;
  status: CustomerStatusValue;
  spent: number;
  /** Storage 公开 URL；null = 不设置/清除头像。URL 归属已在 action 层校验 */
  avatar_url: string | null;
}

// DB 错误码 -> action 层白名单收窄：
//   23505 unique(org_id, email) 冲突；42501/42503 RLS 拒绝；
//   not_found 为自定义码（update/delete 命中 0 行）
function toPgErrorCode(code: string): string {
  if (code === "23505") return "duplicate_email";
  if (code === "42501" || code === "42503") return "forbidden";
  return code;
}

// 新建客户（RLS：仅本组织 admin 可插入；org_id 由服务端注入）
export async function insertCustomer(
  orgId: string,
  input: CustomerWriteInput,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("customers").insert({
    org_id: orgId,
    name: input.name,
    email: input.email,
    company: input.company,
    status: input.status,
    spent: input.spent,
    avatar_url: input.avatar_url,
  });

  if (error !== null) {
    throw new Error(toPgErrorCode(error.code));
  }
}

// 批量新建客户（导入用）：单次请求写入，避免逐行跨境往返
export async function insertCustomers(
  orgId: string,
  inputs: CustomerWriteInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  const supabase = await createClient();

  const { error } = await supabase.from("customers").insert(
    inputs.map((input) => ({
      org_id: orgId,
      name: input.name,
      email: input.email,
      company: input.company,
      status: input.status,
      spent: input.spent,
      avatar_url: input.avatar_url,
    })),
  );

  if (error !== null) {
    throw new Error(toPgErrorCode(error.code));
  }
}

// 编辑客户（org_id 双重限定：既防越组织改行，也用于 0 行判定）
export async function patchCustomer(
  orgId: string,
  id: string,
  input: CustomerWriteInput,
): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .update({
      name: input.name,
      email: input.email,
      company: input.company,
      status: input.status,
      spent: input.spent,
      avatar_url: input.avatar_url,
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

// 批量删除客户：级联删除其名下订单（0009 的 customer_id 外键 on delete cascade）
// 返回实际删除行数（已被他人删掉的行不计入）
export async function deleteCustomers(
  orgId: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
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

// 删除客户（同样 org_id 限定 + 0 行判定）
export async function deleteCustomer(
  orgId: string,
  id: string,
): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
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
