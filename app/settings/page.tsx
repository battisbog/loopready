import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppNav from "@/components/app-nav";
import { PageShell } from "@/components/ui";
import SettingsForms from "./settings-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email_notifications")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <AppNav email={user.email} />
      <PageShell
        width="sm"
        title="Settings"
        description="Manage your login details, preferences, and account."
      >
        <SettingsForms
          email={user.email ?? ""}
          emailNotifications={profile?.email_notifications ?? true}
        />
      </PageShell>
    </>
  );
}
