import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  parsePermissionKeys,
  type PermissionKey,
} from "@/lib/permissions";

export interface OrgSummary {
  id: string;
  name: string;
  /** 当前用户在该组织持有的角色 */
  roleId: string;
  roleName: string;
  /** 系统角色（Admin）= 超级管理员 */
  isAdmin: boolean;
  permissions: PermissionKey[];
}

/** join_organization rpc 的异常码（与 0005/0012 迁移对齐） */
export type JoinErrorCode = "auth_required" | "invalid" | "used" | "expired";

/** active org 持久化在 cookie，服务端 RSC 读取用于查询过滤 */
export const ACTIVE_ORG_COOKIE = "active-org";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** cookie 值是信任边界（用户可伪造）：仅接受 UUID 形状的值 */
export function parseActiveOrgId(v: string | undefined): string | null {
  return v !== undefined && UUID_PATTERN.test(v) ? v : null;
}

/** 角色 id 来自客户端（改角色/邀请/删角色）：仅接受 UUID 形状的值 */
export function parseRoleId(v: string): string | null {
  return UUID_PATTERN.test(v) ? v : null;
}

/**
 * 当前用户的组织列表。
 * 权限必须走 my_org_permissions：它按「角色权限 - 撤销 ∪ 额外授予」计算，
 * 与 RLS / 页面守卫同一套判定。只读 role_permissions 会漏掉成员级覆盖，
 * 导致侧边栏渲染出已被撤销的菜单。
 */
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
    .select("org_id, role_id, organizations(name), roles(name, is_system)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error !== null) {
    throw new Error(`Failed to fetch organizations: ${error.message}`);
  }

  const rows = data.flatMap((row) => {
    const role = row.roles;
    if (role === null) return [];
    return [
      {
        id: row.org_id,
        name: row.organizations.name,
        roleId: row.role_id,
        roleName: role.name,
        isAdmin: role.is_system,
      },
    ];
  });

  return Promise.all(
    rows.map(async (org) => {
      const { data: keys, error: permissionError } = await supabase.rpc(
        "my_org_permissions",
        { p_org_id: org.id },
      );
      if (permissionError !== null) {
        throw new Error(
          `Failed to fetch permissions: ${permissionError.message}`,
        );
      }
      return { ...org, permissions: parsePermissionKeys(keys) };
    }),
  );
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
