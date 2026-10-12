import "server-only";

import { createClient } from "@/lib/supabase/server";
import { parseOrgRole, type OrgRole } from "@/lib/api/organizations";

export interface MemberRow {
  userId: string;
  role: OrgRole;
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
  role: OrgRole;
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

  return data.flatMap((row) => {
    const role = parseOrgRole(row.role);
    if (role === null) return [];
    return [
      {
        userId: row.user_id,
        role,
        joinedAt: row.joined_at,
        email: row.email ?? "",
        firstName: row.first_name,
        lastName: row.last_name,
        avatarUrl: row.avatar_url,
      },
    ];
  });
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

  // invites.role 有 check 约束，理论不会非法；校验失败按 member 兜底展示
  return {
    token: row.token,
    role: parseOrgRole(row.role) ?? "member",
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/** 变更成员角色（rpc 内含 last_admin 保护；异常码以 Error message 抛出） */
export async function updateMemberRoleRpc(
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_member_role", {
    p_org_id: orgId,
    p_user_id: userId,
    p_role: role,
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
