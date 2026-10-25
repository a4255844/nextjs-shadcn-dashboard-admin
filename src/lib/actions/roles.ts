"use server";

import { revalidatePath } from "next/cache";
import {
  createRoleRpc,
  deleteRoleRpc,
  updateRoleRpc,
} from "@/lib/api/roles";
import { parseRoleId } from "@/lib/api/organizations";
import { parsePermissionKeys, type PermissionKey } from "@/lib/permissions";
import { toErrorCode } from "./rpc-errors";

export type RoleErrorCode =
  | "auth_required"
  | "not_allowed"
  | "invalid_role"
  | "invalid_name"
  | "invalid_permission"
  | "role_name_taken"
  | "role_in_use"
  | "system_role"
  | "last_admin";

export type RoleResult =
  | { ok: true; roleId?: string }
  | { ok: false; errorCode: RoleErrorCode | "network" };

const ROLE_ERRORS = [
  "auth_required",
  "not_allowed",
  "invalid_role",
  "invalid_name",
  "invalid_permission",
  "role_name_taken",
  "role_in_use",
  "system_role",
  "last_admin",
] as const;

/**
 * 权限数组来自客户端（信任边界）：
 * 先用本地目录白名单过滤，未知 key 直接视为非法输入，
 * 避免把脏数据交给 DB 靠 FK 报错。
 */
function parsePermissions(raw: readonly string[]): PermissionKey[] | null {
  // 运行时形状校验：客户端可能传 null/非数组，直接读 .length 会抛错
  if (!Array.isArray(raw)) return null;
  const parsed = parsePermissionKeys(raw);
  return parsed.length === raw.length ? parsed : null;
}

/** 创建自定义角色（rpc 内校验 members.manage） */
export async function createRole(
  orgId: string,
  name: string,
  permissions: readonly string[],
): Promise<RoleResult> {
  const parsed = parsePermissions(permissions);
  if (parsed === null) return { ok: false, errorCode: "invalid_permission" };

  try {
    const roleId = await createRoleRpc(orgId, name, parsed);
    revalidatePath("/", "layout");
    return { ok: true, roleId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      errorCode: toErrorCode(message, ROLE_ERRORS, "network"),
    };
  }
}

/** 更新角色：自定义角色可改名称 + 权限；固定系统角色仅可改权限 */
export async function updateRole(
  roleId: string,
  name: string,
  permissions: readonly string[],
): Promise<RoleResult> {
  // roleId 来自客户端：UUID 形状校验
  const parsedRoleId = parseRoleId(roleId);
  if (parsedRoleId === null) return { ok: false, errorCode: "invalid_role" };

  const parsed = parsePermissions(permissions);
  if (parsed === null) return { ok: false, errorCode: "invalid_permission" };

  try {
    await updateRoleRpc(parsedRoleId, name, parsed);
    revalidatePath("/", "layout");
    return { ok: true, roleId: parsedRoleId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      errorCode: toErrorCode(message, ROLE_ERRORS, "network"),
    };
  }
}

/** 删除自定义角色（系统角色 / 仍被成员或活跃邀请引用时拒绝） */
export async function deleteRole(roleId: string): Promise<RoleResult> {
  const parsedRoleId = parseRoleId(roleId);
  if (parsedRoleId === null) return { ok: false, errorCode: "invalid_role" };

  try {
    await deleteRoleRpc(parsedRoleId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      errorCode: toErrorCode(message, ROLE_ERRORS, "network"),
    };
  }
}
