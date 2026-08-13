import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProblem } from "@/lib/coding/problems";
import { runTests, type Language } from "@/lib/coding/runner";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("run", user.id);
  if (!limited.ok) return limited.response!;

  const { sessionId, code, language } = await request.json().catch(() => ({}));
  if (!sessionId || typeof code !== "string") {
    return NextResponse.json(
      { error: "sessionId and code required" },
      { status: 400 }
    );
  }
  const lang: Language = language === "javascript" ? "javascript" : "python";

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select("id, artifact, round_type")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.round_type !== "coding") {
    return NextResponse.json({ error: "Not a coding round" }, { status: 400 });
  }

  const problem = getProblem(session.artifact?.problemId);
  if (!problem) {
    return NextResponse.json({ error: "No problem on this session" }, { status: 409 });
  }

  let result;
  try {
    result = await runTests(code, lang, problem);
  } catch (e) {
    console.error("sandbox run failed", e);
    return NextResponse.json(
      { error: "Could not run your code right now. Try again." },
      { status: 502 }
    );
  }

  // Persist the code plus the latest run so the interviewer and the feedback
  // engine both see what actually happened.
  await admin
    .from("sessions")
    .update({
      artifact: {
        ...session.artifact,
        language: lang,
        code,
        lastRun: {
          passed: result.passed,
          total: result.total,
          compileError: result.compileError ?? null,
          failures: result.results
            .filter((r) => !r.passed)
            .slice(0, 3)
            .map((r) => ({
              input: r.input,
              expected: r.expected,
              actual: r.actual,
              error: r.error ?? null,
            })),
        },
      },
    })
    .eq("id", sessionId);

  return NextResponse.json(result);
}
