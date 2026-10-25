import { getTranslations } from "next-intl/server";
import MembersTable from "@/components/orgs/MembersTable";
import InviteCard from "@/components/orgs/InviteCard";
import RolesPanel from "@/components/orgs/RolesPanel";
import LeaveOrgButton from "@/components/orgs/LeaveOrgButton";
import NoOrgState from "@/components/orgs/NoOrgState";
import { getActiveOrg } from "@/lib/api/organizations";
import { getActiveInvite, listOrgMembers } from "@/lib/api/members";
import { listOrgRoles } from "@/lib/api/roles";
import { getCurrentUser } from "@/lib/api/auth";
import { hasPermission } from "@/lib/permissions";
import { requirePermission } from "@/lib/route-guard";

const page = async () => {
  const t = await getTranslations("orgs.page");

  // 当前激活组织（cookie -> 第一个组织 -> null 的 fallback 链）
  const org = await getActiveOrg();
  if (org === null) {
    return <NoOrgState />;
  }

  await requirePermission(org.permissions, "members.browse");

  const canManage = hasPermission(org.permissions, "members.manage");
  const canInvite = hasPermission(org.permissions, "members.invite");

  // 邀请状态仅 members.invite 持有者可查（rpc 门控），否则不发这次查询
  const [user, roles, members, invite] = await Promise.all([
    getCurrentUser(),
    listOrgRoles(org.id),
    listOrgMembers(org.id),
    canInvite ? getActiveInvite(org.id) : Promise.resolve(null),
  ]);

  // proxy 已保证登录，此处纯类型兜底
  if (user === null) {
    return <NoOrgState />;
  }

  // 持有 members.manage 的成员数（角色权限或额外权限）：last_admin 保护要求至少保留一名；
  // 真正的拦截在 RPC 内，这里只做退出前的教育性提示
  const manageRoleIds = new Set(
    roles
      .filter((r) => r.permissions.includes("members.manage"))
      .map((r) => r.id),
  );
  const manageCount = members.filter(
    (m) =>
      manageRoleIds.has(m.roleId) ||
      m.extraPermissions.includes("members.manage"),
  ).length;
  const isLastAdmin = canManage && manageCount === 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <RolesPanel orgId={org.id} roles={roles} canManage={canManage} />

      <MembersTable
        rows={members}
        roles={roles}
        orgId={org.id}
        currentUserId={user.id}
        canManage={canManage}
      />

      {canInvite && (
        <InviteCard orgId={org.id} roles={roles} invite={invite} />
      )}

      <LeaveOrgButton
        orgId={org.id}
        orgName={org.name}
        currentUserId={user.id}
        isLastAdmin={isLastAdmin}
      />
    </div>
  );
};

export default page;
