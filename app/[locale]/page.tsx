import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("sidebar");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Dashboard Next</h1>
        <p className="text-muted-foreground">
          Built with Next.js 16, React 19, TypeScript, Tailwind CSS & shadcn/ui
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          {t("menu.dashboard")}
        </Link>
      </div>
    </div>
  );
}
