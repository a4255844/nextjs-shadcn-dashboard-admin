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
  };
}

// 读取全部 customers（服务端 RSC 使用）。
// 排序与前端表格无关（表格是客户端排序），这里只保证返回顺序稳定。
export async function getCustomers(): Promise<CustomerRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .order("name", { ascending: true });

  if (error !== null) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }

  return data.map(toCustomerRow);
}

// 供统计卡聚合用的状态枚举引用（保持类型同源）
export type CustomerStatusValue = Enums<"customer_status">;
