"use client";

import { useTranslations } from "next-intl";
import { LayoutPanelLeft, MousePointerClick } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PERMISSION_GROUPS,
  groupPermissionKeys,
  type PermissionKey,
} from "@/lib/permissions";

interface PermissionTreeProps {
  /** 当前勾选的权限集合 */
  selected: readonly PermissionKey[];
  onChange: (next: PermissionKey[]) => void;
}

/**
 * 权限树（模块级全选 + 逐项勾选）。
 * 结构直接对齐侧边栏菜单：每个菜单权限独占一块，
 * 菜单下的按钮权限缩进挂在它下面，各自可单独勾选。
 * 角色表单与成员权限弹窗共用。
 */
export default function PermissionTree({
  selected,
  onChange,
}: PermissionTreeProps) {
  const t = useTranslations("orgs.roles");
  const tSidebar = useTranslations("sidebar");

  function toggle(key: PermissionKey, next: boolean) {
    onChange(
      next
        ? [...selected.filter((k) => k !== key), key]
        : selected.filter((k) => k !== key),
    );
  }

  function toggleGroup(keys: readonly PermissionKey[], next: boolean) {
    onChange(
      next
        ? [...new Set([...selected, ...keys])]
        : selected.filter((k) => !keys.includes(k)),
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <LayoutPanelLeft className="size-3.5 text-primary" />
          {t("kind.menu")}
        </span>
        <span className="flex items-center gap-1.5">
          <MousePointerClick className="size-3.5" />
          {t("kind.action")}
        </span>
      </div>

      {PERMISSION_GROUPS.map((group) => {
        const keys = groupPermissionKeys(group);
        const allSelected = keys.every((k) => selected.includes(k));
        const someSelected =
          !allSelected && keys.some((k) => selected.includes(k));

        return (
          <div key={group.module} className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={
                  allSelected || (someSelected ? "indeterminate" : false)
                }
                onCheckedChange={(v) => toggleGroup(keys, v === true)}
                aria-label={t(`modules.${group.module}`)}
              />
              {t(`modules.${group.module}`)}
            </label>

            <div className="flex flex-col gap-2 ps-6">
              {group.menus.map((menu) => (
                <div key={menu.key} className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selected.includes(menu.key)}
                      onCheckedChange={(v) => toggle(menu.key, v === true)}
                      aria-label={tSidebar(`menu.${menu.menuKey}`)}
                    />
                    <LayoutPanelLeft className="size-3.5 shrink-0 text-primary" />
                    <span>{tSidebar(`menu.${menu.menuKey}`)}</span>
                    <code className="text-[11px] text-muted-foreground">
                      {menu.route}
                    </code>
                  </label>

                  {menu.actions.length > 0 && (
                    <div className="ms-6 flex flex-col gap-0.5 border-s border-border ps-3">
                      {menu.actions.map((actionKey) => (
                        <label
                          key={actionKey}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Checkbox
                            checked={selected.includes(actionKey)}
                            onCheckedChange={(v) =>
                              toggle(actionKey, v === true)
                            }
                            aria-label={t(`permissions.${actionKey}`)}
                          />
                          <MousePointerClick className="size-3.5 shrink-0" />
                          {t(`permissions.${actionKey}`)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {group.actions.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Checkbox
                    checked={selected.includes(key)}
                    onCheckedChange={(v) => toggle(key, v === true)}
                    aria-label={t(`permissions.${key}`)}
                  />
                  <MousePointerClick className="size-3.5 shrink-0" />
                  {t(`permissions.${key}`)}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">{t("alwaysAvailable")}</p>
    </div>
  );
}
