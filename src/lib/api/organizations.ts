import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type OrgRole = "admin" | "member";

export interface OrgSummary {
  id: string;
  name: string;
  role: OrgRole;
}

/** join_organization rpc 的异常码（与 0005 迁移对齐） */
export type JoinErrorCode = "auth_required" | "invalid" | "used" | "expired";

/** active org 持久化在 cookie，服务端 RSC 读取用于查询过滤 */
export const ACTIVE_ORG_COOKIE = "active-org";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// role 列是 text + check 约束（非原生 enum），gen types 推导为 string，
// 需运行时校验后收窄（与 customers status 的处理同理，DB check 属可信来源）。
// members.ts 等同域模块复用此收窄，故导出。
export function parseOrgRole(v: string): OrgRole | null {
  return v === "admin" || v === "member" ? v : null;
}

/** cookie 值是信任边界（用户可伪造）：仅接受 UUID 形状的值 */
export function parseActiveOrgId(v: string | undefined): string | null {
  return v !== undefined && UUID_PATTERN.test(v) ? v : null;
}

/** 当前用户的组织列表 */
export async function listMyOrganizations(): Promise<OrgSummary[]> {
  const supabase = await createClient();

  // 必须显式按 user_id 过滤：members 的 SELECT policy 是 is_org_member(org_id)，
  // 会把同组织其他成员的 member 行也读出来，导致同一组织在切换器里重复显示。
  // RLS 只做权限兜底，不做业务过滤。
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return [];

  const { data, error } = await supabase
    .from("members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error !== null) {
    throw new Error(`Failed to fetch organizations: ${error.message}`);
  }

  return data.flatMap((row) => {
    const role = parseOrgRole(row.role);
    if (role === null) return [];
    return [
      {
        id: row.org_id,
        name: row.organizations.name,
        role,
      },
    ];
  });
}

/**
 * 当前激活组织。fallback 链：
 * cookie 值命中 memberships -> 该项；不命中/无 cookie -> 第一个组织；
 * 无任何组织 -> null（UI 显示创建组织空态）。
 * memberships 是唯一真源：cookie 残留已失去成员资格的组织时自动回落。
 */
export async function getActiveOrg(
  preloaded?: OrgSummary[],
): Promise<OrgSummary | null> {
  const orgs = preloaded ?? (await listMyOrganizations());
  if (orgs.length === 0) return null;

  const cookieStore = await cookies();
  const activeId = parseActiveOrgId(cookieStore.get(ACTIVE_ORG_COOKIE)?.value);
  const [first] = orgs;
  return orgs.find((o) => o.id === activeId) ?? first ?? null;
}

/** 消费邀请链接（rpc；异常码以 Error message 抛出，由 action 层映射） */
export async function joinOrganization(
  token: string,
): Promise<{ orgId: string; alreadyMember: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("join_organization", {
    p_token: token,
  });

  if (error !== null) {
    throw new Error(error.message);
  }

  const row = data[0];
  if (row === undefined) {
    throw new Error("empty_join_result");
  }

  return { orgId: row.org_id, alreadyMember: row.already_member };
}
