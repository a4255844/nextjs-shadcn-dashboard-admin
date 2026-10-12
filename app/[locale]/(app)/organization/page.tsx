import { getTranslations } from "next-intl/server";
import MembersTable from "@/components/orgs/MembersTable";
import InviteCard from "@/components/orgs/InviteCard";
import LeaveOrgButton from "@/components/orgs/LeaveOrgButton";
import NoOrgState from "@/components/orgs/NoOrgState";
import { getActiveOrg } from "@/lib/api/organizations";
import { getActiveInvite, listOrgMembers } from "@/lib/api/members";
import { getCurrentUser } from "@/lib/api/auth";

const page = async () => {
  const t = await getTranslations("orgs.page");

  // 当前激活组织（cookie -> 第一个组织 -> null 的 fallback 链）
  const org = await getActiveOrg();
  if (org === null) {
    return <NoOrgState />;
  }

  const isAdmin = org.role === "admin";

  // 邀请状态仅 admin 可查（rpc 门控），非 admin 不发这次查询
  const [user, members, invite] = await Promise.all([
    getCurrentUser(),
    listOrgMembers(org.id),
    isAdmin ? getActiveInvite(org.id) : Promise.resolve(null),
  ]);

  // proxy 已保证登录，此处纯类型兜底
  if (user === null) {
    return <NoOrgState />;
  }

  // 退出组织的教育性提示用；真正的 last_admin 保护在 RPC 内
  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <MembersTable
        rows={members}
        orgId={org.id}
        currentUserId={user.id}
        isAdmin={isAdmin}
      />

      {isAdmin && <InviteCard orgId={org.id} invite={invite} />}

      <LeaveOrgButton
        orgId={org.id}
        orgName={org.name}
        currentUserId={user.id}
        isLastAdmin={isAdmin && adminCount === 1}
      />
    </div>
  );
};

export default page;
