import { getTranslations } from "next-intl/server";
import { PagePlaceholder } from "@/components/page-placeholder";

export default async function ProfilePage() {
  const t = await getTranslations("pages.profile");
  const tPages = await getTranslations("pages");

  return (
    <PagePlaceholder
      title={t("title")}
      description={t("description")}
      badge={tPages("comingSoon")}
    />
  );
}
