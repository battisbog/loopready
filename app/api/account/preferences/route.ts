import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Preference writes go through the server; profiles is not client-writable. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { emailNotifications } = await request.json().catch(() => ({}));
  if (typeof emailNotifications !== "boolean") {
    return NextResponse.json({ error: "emailNotifications required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      email_notifications: emailNotifications,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: "Could not save preferences" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
