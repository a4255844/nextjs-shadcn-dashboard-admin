import "server-only";

import { createClient } from "@/lib/supabase/server";
import { parsePermissionKeys, type PermissionKey } from "@/lib/permissions";

export interface MemberRow {
  userId: string;
  roleId: string;
  roleName: string;
  /** 角色之外单独授予的额外权限（叠加在角色权限之上） */
  extraPermissions: PermissionKey[];
  /** 单独撤销的角色权限（仅对该成员生效） */
  deniedPermissions: PermissionKey[];
  /** ISO 时间串 */
  joinedAt: string;
  /** profile 行缺失时为 ""（left join 返回 null，UI 用首字母兜底） */
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface ActiveInvite {
  token: string;
  roleId: string;
  roleName: string;
  /** ISO 时间串 */
  expiresAt: string;
  createdAt: string;
}

/** 成员名单（rpc security definer：profiles RLS 只放行自己，必须经函数读他人资料） */
export async function listOrgMembers(orgId: string): Promise<MemberRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("list_org_members", {
    p_org_id: orgId,
  });

  if (error !== null) {
    throw new Error(`Failed to list org members: ${error.message}`);
  }

  return data.map((row) => ({
    userId: row.user_id,
    roleId: row.role_id,
    roleName: row.role_name,
    extraPermissions: parsePermissionKeys(row.extra_permissions),
    deniedPermissions: parsePermissionKeys(row.denied_permissions),
    joinedAt: row.joined_at,
    email: row.email ?? "",
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
  }));
}

/** 当前活跃邀请（单活跃链接语义，最多一行；无活跃邀请返回 null） */
export async function getActiveInvite(
  orgId: string,
): Promise<ActiveInvite | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_active_invite", {
    p_org_id: orgId,
  });

  if (error !== null) {
    throw new Error(`Failed to get active invite: ${error.message}`);
  }

  const row = data[0];
  if (row === undefined) return null;

  return {
    token: row.token,
    roleId: row.role_id,
    roleName: row.role_name,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/** 变更成员角色（rpc 内含 members.manage 校验与 last_admin 保护） */
export async function updateMemberRoleRpc(
  orgId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_member_role", {
    p_org_id: orgId,
    p_user_id: userId,
    p_role_id: roleId,
  });

  if (error !== null) {
    throw new Error(error.message);
  }
}

/** 移除成员 / 自行退出（同一 rpc；异常码以 Error message 抛出） */
export async function removeMemberRpc(
  orgId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("remove_member", {
    p_org_id: orgId,
    p_user_id: userId,
  });

  if (error !== null) {
    throw new Error(error.message);
  }
}

/** 覆盖式设置成员权限：额外授予 + 撤销角色权限（空数组 = 清空） */
export async function setMemberPermissionOverridesRpc(
  orgId: string,
  userId: string,
  granted: readonly PermissionKey[],
  denied: readonly PermissionKey[],
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_member_permission_overrides", {
    p_org_id: orgId,
    p_user_id: userId,
    p_granted: [...granted],
    p_denied: [...denied],
  });

  if (error !== null) {
    throw new Error(error.message);
  }
}
