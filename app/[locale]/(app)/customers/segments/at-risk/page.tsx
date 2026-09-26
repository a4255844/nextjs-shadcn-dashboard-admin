import { getTranslations } from "next-intl/server";
import { PagePlaceholder } from "@/components/page-placeholder";

export default async function AtRiskCustomersPage() {
  const t = await getTranslations("pages.customers.segments.atRisk");
  const tPages = await getTranslations("pages");

  return (
    <PagePlaceholder
      title={t("title")}
      description={t("description")}
      badge={tPages("comingSoon")}
    />
  );
}
