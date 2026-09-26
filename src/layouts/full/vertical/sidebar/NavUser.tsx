import { Code2 } from 'lucide-react';
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroupContent, SidebarGroup } from "@/components/ui/sidebar"

// TODO: 部署前替换为你的公开仓库地址
const GITHUB_REPO_URL = "https://github.com/your-username/dashboard-next";

export function NavUser() {
    const t = useTranslations("sidebar.menu");

    const navItems = [
        {
            titleKey: "viewSource",
            url: GITHUB_REPO_URL,
            icon: Code2,
        },
    ]

    return (
        <SidebarGroup className="mt-auto p-0">
            <SidebarGroupContent>
                <SidebarMenu>
                    {navItems.map((item) => (
                        <SidebarMenuItem key={item.titleKey}>
                            <Link href={item.url} target="_blank" className="block">
                                <SidebarMenuButton size="lg" className="h-full cursor-pointer w-full">
                                    <div className="flex items-center gap-3 w-full">
                                        <item.icon className="shadow-none size-5 shrink-0" />
                                        <div className="flex flex-col flex-1 text-left text-sm leading-tight hide-menu whitespace-nowrap">
                                            <span className="truncate font-medium">{t(item.titleKey)}</span>
                                        </div>
                                    </div>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
