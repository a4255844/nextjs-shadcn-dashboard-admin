import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  parsePermissionKeys,
  type PermissionKey,
  type PermissionMap,
  toPermissionMap,
} from "@/lib/permissions";

export interface OrgRole {
  id: string;
  name: string;
  /** 系统角色（Admin）：不可删、不可改权限 */
  isSystem: boolean;
  permissions: PermissionKey[];
}

/** 组织内全部角色（成员可读；RPC 门控 is_org_member） */
export async function listOrgRoles(orgId: string): Promise<OrgRole[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("list_org_roles", {
    p_org_id: orgId,
  });

  if (error !== null) {
    throw new Error(`Failed to list org roles: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    isSystem: row.is_system,
    permissions: parsePermissionKeys(row.permissions),
  }));
}

/** 当前用户在某组织的权限集合 */
export async function getMyPermissions(
  orgId: string,
): Promise<PermissionKey[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("my_org_permissions", {
    p_org_id: orgId,
  });

  if (error !== null) {
    throw new Error(`Failed to load permissions: ${error.message}`);
  }

  return parsePermissionKeys(data);
}

export async function getMyPermissionMap(
  orgId: string,
): Promise<PermissionMap> {
  return toPermissionMap(await getMyPermissions(orgId));
}

/**
 * 服务端信任边界：Server Action / Route Handler 不信任客户端传的 orgId，
 * 统一用 DB 函数判定当前会话在该组织是否持有该权限（RLS 仍为最终兜底）。
 */
export async function hasPermissionInOrg(
  orgId: string,
  permission: PermissionKey,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("has_org_permission", {
    check_org_id: orgId,
    check_permission: permission,
  });

  if (error !== null) return false;
  return data === true;
}

/** 任一权限命中（同一组织；用于"新建或编辑都可用"的入口，如头像上传） */
export async function hasAnyPermissionInOrg(
  orgId: string,
  permissions: readonly PermissionKey[],
): Promise<boolean> {
  if (permissions.length === 0) return false;
  const owned = await getMyPermissions(orgId);
  return permissions.some((p) => owned.includes(p));
}

// ---- 角色 CRUD（RPC 内部已做权限校验与系统角色保护） ----

export async function createRoleRpc(
  orgId: string,
  name: string,
  permissions: readonly PermissionKey[],
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_role", {
    p_org_id: orgId,
    p_name: name,
    p_permissions: [...permissions],
  });

  if (error !== null) throw new Error(error.message);
  return data;
}

export async function updateRoleRpc(
  roleId: string,
  name: string,
  permissions: readonly PermissionKey[],
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_role", {
    p_role_id: roleId,
    p_name: name,
    p_permissions: [...permissions],
  });

  if (error !== null) throw new Error(error.message);
}

export async function deleteRoleRpc(roleId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_role", {
    p_role_id: roleId,
  });

  if (error !== null) throw new Error(error.message);
}
