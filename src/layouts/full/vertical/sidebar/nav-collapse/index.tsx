"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import NavItem from "../nav-items/index";
import { cn } from "cn";
import { useSidebar } from "@/components/ui/sidebar";
import { useCustomizer } from "@/components/customizer/customizer-context";
import type { MenuItem, ChildItem } from "../types";

interface NavCollapseProps {
  menu: MenuItem[];
  className?: string;
}

export default function NavCollapse({ menu, className }: NavCollapseProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapse = state === "collapsed";
  const t = useTranslations("sidebar");
  const { openCustomizer } = useCustomizer();

  const handleAction = (item: ChildItem) => {
    if (item.actionType === "customizer") openCustomizer();
  };

  const isActiveRoute = (item: ChildItem): boolean => {
    if (item.url && pathname === item.url) return true;
    if (item.items) return item.items.some(isActiveRoute);
    return false;
  };

  const getMenuText = (key: string, type: "heading" | "menu" = "menu") => {
    return t(`${type}.${key}`);
  };

  return (
    <>
      {menu.map((section, index) => (
        <div key={index}>
          {/* Heading (omitted for nested recursive levels) */}
          {section.heading && (
            <span className={cn(
              "text-xs uppercase block font-semibold text-muted-foreground mb-2 transition-all duration-200",
              isCollapse ? "text-center group-hover:text-start group-data-[state=expanded]:text-start" : ""
            )}>
              {isCollapse ? (
                <>
                  <span className="group-hover:hidden group-data-[state=expanded]:hidden">...</span>
                  <span className="hidden group-hover:inline group-data-[state=expanded]:inline">
                    {getMenuText(section.heading, "heading")}
                  </span>
                </>
              ) : (
                getMenuText(section.heading, "heading")
              )}
            </span>
          )}

          {section.items?.map((item: ChildItem, index) => {
            const hasChildren =
              Array.isArray(item.items) && item.items.length > 0;
            const active = isActiveRoute(item);

            // No children → direct link or action button
            if (!hasChildren) {
              // 非路由型动作（如打开 Customizer 侧边栏）
              if (item.actionType) {
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAction(item)}
                    className={cn(
                      "flex items-center gap-3 rounded-md transition-all duration-200 ease-in-out w-full text-start cursor-pointer bg-transparent border-0 p-0",
                      className,
                    )}
                  >
                    <NavItem
                      item={item}
                      hasChildren={false}
                      isActive={active}
                      label={getMenuText(item.name || "")}
                    />
                  </button>
                );
              }
              return (
                <Link
                  key={index}
                  href={item.url || "#"}
                  target={item.external ? "_blank" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md transition-all duration-200 ease-in-out",
                    className,
                  )}
                >
                  <NavItem
                    item={item}
                    hasChildren={false}
                    isActive={active}
                    label={getMenuText(item.name || "")}
                  />
                </Link>
              );
            }

            // With children → collapsible
            return (
              <details
                key={index}
                className="group/nav"
                open={active || item.isActive}
              >
                <summary
                  className={cn(
                    "cursor-pointer rounded-md flex items-center transition-all duration-200 ease-in-out",
                  )}
                >
                  <NavItem
                    item={item}
                    hasChildren={true}
                    className={className}
                    isActive={active}
                    label={getMenuText(item.name || "")}
                  />
                </summary>

                <div className="ps-3 ms-5 border-s border-border group-data-[state=collapsed]:hidden">
                  {item.items?.map((sub: ChildItem, index) =>
                    sub.items ? (
                      <NavCollapse
                        key={index}
                        menu={[{ items: [sub] }]}
                        className={className}
                      />
                    ) : sub.actionType ? (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleAction(sub)}
                        className={cn(
                          "block rounded-md transition-all duration-200 ease-in-out w-full text-start cursor-pointer bg-transparent border-0 p-0",
                          className,
                        )}
                      >
                        <NavItem
                          item={sub}
                          hasChildren={false}
                          className={cn("px-2! py-1! my-1!")}
                          isActive={false}
                          label={getMenuText(sub.name || "")}
                        />
                      </button>
                    ) : (
                      <Link
                        key={index}
                        href={sub.url || "#"}
                        target={sub.external ? "_blank" : undefined}
                        className={cn(
                          "block rounded-md transition-all duration-200 ease-in-out",
                          className,
                        )}
                      >
                        <NavItem
                          item={sub}
                          hasChildren={false}
                          className={cn("px-2! py-1! my-1!", pathname === sub.url && "bg-primary/5 text-primary")}
                          isActive={pathname === sub.url}
                          label={getMenuText(sub.name || "")}
                        />
                      </Link>
                    )
                  )}
                </div>
              </details>
            );
          })}
        </div>
      ))}
    </>
  );
}
