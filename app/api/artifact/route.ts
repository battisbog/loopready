import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Debounced autosave of round work (code, diagram) between spoken turns.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, patch } = await request.json().catch(() => ({}));
  if (!sessionId || typeof patch !== "object" || patch === null) {
    return NextResponse.json({ error: "sessionId and patch required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select("id, artifact")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await admin
    .from("sessions")
    .update({ artifact: { ...session.artifact, ...patch } })
    .eq("id", sessionId);

  return NextResponse.json({ ok: true });
}
