import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import AppNav from "@/components/app-nav";
import CostDashboard from "./dashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cost" };

export default async function CostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Indistinguishable from a route that does not exist.
  if (!isAdmin(user)) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppNav email={user.email} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold text-primary">Today&rsquo;s spend</h1>
        <p className="mt-1 text-sm text-secondary">
          Estimated API cost against the daily ceiling. Refreshes every 15
          seconds.
        </p>
        <CostDashboard />
      </main>
    </div>
  );
}
