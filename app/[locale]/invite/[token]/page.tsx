import { getTranslations } from "next-intl/server";
import InviteAccept from "./InviteAccept";

// 邀请 token 为 64 位 hex（gen_random_bytes(32)）；
// 形状不符直接渲染无效态，省一次 DB 请求
const TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

const page = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const t = await getTranslations("orgs.invitePage");
  const { token } = await params;

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      {TOKEN_PATTERN.test(token) ? (
        <InviteAccept token={token} />
      ) : (
        <div className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold">{t("errorTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("error.invalid")}
          </p>
        </div>
      )}
    </main>
  );
};

export default page;
