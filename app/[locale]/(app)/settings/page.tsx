import { getTranslations } from "next-intl/server";
import { PagePlaceholder } from "@/components/page-placeholder";

export default async function SettingsPage() {
  const t = await getTranslations("pages.settings");
  const tPages = await getTranslations("pages");

  return (
    <PagePlaceholder
      title={t("title")}
      description={t("description")}
      badge={tPages("comingSoon")}
    />
  );
}
