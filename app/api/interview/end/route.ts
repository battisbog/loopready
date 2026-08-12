import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await request.json().catch(() => ({}));
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status === "active") {
    await admin
      .from("sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  return NextResponse.json({ ok: true });
}
