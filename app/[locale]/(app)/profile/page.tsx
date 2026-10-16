import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import ProfileForm from "@/components/profile/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const t = await getTranslations("pages.profile");
  const user = await getCurrentUser();

  if (user === null) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
