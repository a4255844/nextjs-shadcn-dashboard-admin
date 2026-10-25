/** 固定系统角色在 DB 里的名称（迁移 0013 创建），与 i18n builtin.<key> 对应 */
const BUILTIN_ROLE_KEYS = ["admin", "manager", "sales", "viewer"] as const;

export interface RoleLike {
  name: string;
  isSystem: boolean;
}

/**
 * 角色显示名：固定系统角色按当前语言本地化（Admin/Manager/Sales/Viewer），
 * 自定义角色原样返回用户输入的名称。
 * t 传 `useTranslations("orgs.roles")` 的返回值即可。
 */
export function roleLabel(role: RoleLike, t: (key: string) => string): string {
  const key = role.name.trim().toLowerCase();
  if (
    role.isSystem &&
    (BUILTIN_ROLE_KEYS as readonly string[]).includes(key)
  ) {
    return t(`builtin.${key}`);
  }
  return role.name;
}
