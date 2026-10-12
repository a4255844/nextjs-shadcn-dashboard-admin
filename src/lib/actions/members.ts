"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOrgRole, ACTIVE_ORG_COOKIE } from "@/lib/api/organizations";
import { updateMemberRoleRpc, removeMemberRpc } from "@/lib/api/members";
import { toErrorCode } from "./rpc-errors";

export type MemberErrorCode =
  | "auth_required"
  | "not_admin"
  | "invalid_role"
  | "not_member"
  | "last_admin";

export interface UpdateMemberRoleResult {
  ok: boolean;
  errorCode?: MemberErrorCode | "network";
}

export interface RemoveMemberResult {
  ok: boolean;
  errorCode?: MemberErrorCode | "network";
}

const MEMBER_ERRORS = [
  "auth_required",
  "not_admin",
  "invalid_role",
  "not_member",
  "last_admin",
] as const;

/** 管理员变更成员角色（rpc 内含 last_admin 保护） */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: string,
): Promise<UpdateMemberRoleResult> {
  // role 来自客户端，属信任边界：先运行时校验收窄，非法直接拒绝
  const parsed = parseOrgRole(role);
  if (parsed === null) {
    return { ok: false, errorCode: "invalid_role" };
  }

  try {
    await updateMemberRoleRpc(orgId, userId, parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      errorCode: toErrorCode(message, MEMBER_ERRORS, "network"),
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** 移除成员 / 自行退出（同一 rpc，权限由 DB 判定：admin 任意、非 admin 仅自己） */
export async function removeMember(
  orgId: string,
  userId: string,
): Promise<RemoveMemberResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    return { ok: false, errorCode: "auth_required" };
  }

  const isSelfLeave = userId === user.id;

  try {
    await removeMemberRpc(orgId, userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      errorCode: toErrorCode(message, MEMBER_ERRORS, "network"),
    };
  }

  // 退出后删除 active-org cookie，getActiveOrg 走既有 fallback 链
  // 回落到剩余组织/无组织；layout revalidate 让 Header 切换器同步刷新
  if (isSelfLeave) {
    const cookieStore = await cookies();
    cookieStore.delete(ACTIVE_ORG_COOKIE);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
