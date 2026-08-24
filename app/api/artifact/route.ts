import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeArtifactPatch } from "@/lib/interview/artifact";
import { checkRateLimit } from "@/lib/rate-limit";

// Debounced autosave of round work (code, diagram) between spoken turns.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // This route was the only write path with no limit at all, so a script could
  // hammer unbounded JSONB writes at it.
  const limited = await checkRateLimit("interview", user.id);
  if (!limited.ok) return limited.response!;

  const { sessionId, patch } = await request.json().catch(() => ({}));
  if (!sessionId || typeof patch !== "object" || patch === null) {
    return NextResponse.json({ error: "sessionId and patch required" }, { status: 400 });
  }

  const { patch: safe, rejected } = sanitizeArtifactPatch(patch);
  if (rejected.length) {
    console.warn(
      `[artifact] dropped non-writable keys from user=${user.id}: ${rejected.join(", ")}`
    );
  }
  if (Object.keys(safe).length === 0) {
    return NextResponse.json({ ok: true, applied: 0 });
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
    .update({ artifact: { ...session.artifact, ...safe } })
    .eq("id", sessionId);

  return NextResponse.json({ ok: true });
}
