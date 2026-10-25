"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseRoleId, ACTIVE_ORG_COOKIE } from "@/lib/api/organizations";
import {
  updateMemberRoleRpc,
  removeMemberRpc,
  setMemberPermissionOverridesRpc,
} from "@/lib/api/members";
import { parsePermissionKeys } from "@/lib/permissions";
import { toErrorCode } from "./rpc-errors";

export type MemberErrorCode =
  | "auth_required"
  | "not_allowed"
  | "invalid_role"
  | "invalid_permission"
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
  "not_allowed",
  "invalid_role",
  "invalid_permission",
  "not_member",
  "last_admin",
] as const;

/** 变更成员角色（rpc 内含 members.manage 校验与 last_admin 保护） */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  roleId: string,
): Promise<UpdateMemberRoleResult> {
  // roleId 来自客户端，属信任边界：先运行时校验收窄，非法直接拒绝
  const parsed = parseRoleId(roleId);
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

/** 覆盖式设置成员权限：额外授予 + 撤销角色权限（撤销仅对该成员生效） */
export async function setMemberPermissionOverrides(
  orgId: string,
  userId: string,
  granted: readonly string[],
  denied: readonly string[],
): Promise<UpdateMemberRoleResult> {
  // permissions 来自客户端，属信任边界：目录白名单过滤，含未知 key 直接拒绝
  if (!Array.isArray(granted) || !Array.isArray(denied)) {
    return { ok: false, errorCode: "invalid_permission" };
  }
  const parsedGranted = parsePermissionKeys(granted);
  const parsedDenied = parsePermissionKeys(denied);
  if (
    parsedGranted.length !== granted.length ||
    parsedDenied.length !== denied.length
  ) {
    return { ok: false, errorCode: "invalid_permission" };
  }
  if (parsedGranted.some((key) => parsedDenied.includes(key))) {
    return { ok: false, errorCode: "invalid_permission" };
  }

  try {
    await setMemberPermissionOverridesRpc(
      orgId,
      userId,
      parsedGranted,
      parsedDenied,
    );
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

/** 移除成员 / 自行退出（同一 rpc，权限由 DB 判定：members.manage 任意、否则仅自己） */
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
