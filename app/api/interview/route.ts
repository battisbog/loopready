import { NextResponse } from "next/server";
import { generateText, type ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { interviewModel } from "@/lib/ai";
import { MAX_FOLLOWUPS, QUESTIONS, type Question } from "@/lib/interview/questions";
import { MAX_CODING_TURNS, MAX_DESIGN_TURNS, startSession } from "@/lib/interview/start";
import { getContext } from "@/lib/interview/companies";
import { getProblem } from "@/lib/coding/problems";
import {
  codingClosingPrompt,
  codingSystemPrompt,
  type CodingArtifact,
} from "@/lib/coding/prompt";
import { getDesignPrompt } from "@/lib/design/prompts";
import {
  designClosingPrompt,
  designSystemPrompt,
  type DesignArtifact,
} from "@/lib/design/prompt";
import {
  closingPrompt,
  interviewerSystemPrompt,
  transitionPrompt,
} from "@/lib/interview/prompt";
import { ROUND_IMPLEMENTED, isRoundType } from "@/lib/interview/rounds";

export const maxDuration = 60;

interface Body {
  sessionId?: string;
  roundType?: string;
  company?: string;
  level?: string;
  userMessage?: string;
  artifact?: object;
}

function opening(firstQuestion: Question): string {
  return `Hi, thanks for joining. I'm a senior engineer here and I'll be running your behavioral round today — about three questions, and I may dig into your answers. Let's get started. ${firstQuestion.text}`;
}

async function llm(system: string, messages: ModelMessage[]): Promise<string> {
  const { text } = await generateText({
    model: interviewModel(),
    system,
    messages,
    providerOptions: { gateway: { tags: ["feature:interview"] } },
  });
  return text.trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const body: Body = await request.json().catch(() => ({}));

  // --- New session: create it and return the opening ---
  if (!body.sessionId) {
    const roundType = body.roundType ?? "behavioral";
    if (!isRoundType(roundType)) {
      return NextResponse.json({ error: "Unknown round type" }, { status: 400 });
    }
    if (!ROUND_IMPLEMENTED[roundType]) {
      return NextResponse.json(
        { error: `${roundType} rounds aren't available yet` },
        { status: 501 }
      );
    }
    try {
      const started = await startSession({
        admin,
        userId: user.id,
        roundType,
        company: body.company ?? null,
        level: body.level ?? null,
      });
      return NextResponse.json(started);
    } catch {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
  }

  // --- Existing session: advance the state machine ---
  const { data: session } = await admin
    .from("sessions")
    .select()
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }
  if (!body.userMessage?.trim()) {
    return NextResponse.json({ error: "userMessage required" }, { status: 400 });
  }

  await admin.from("turns").insert({
    session_id: session.id,
    role: "candidate",
    text: body.userMessage.trim(),
  });

  // Coding/design rounds send their work product (code or diagram JSON) with
  // each turn. Merge it — a full replace would drop server-owned fields like
  // problemId and the last run results.
  if (body.artifact !== undefined) {
    session.artifact = { ...session.artifact, ...body.artifact };
    await admin
      .from("sessions")
      .update({ artifact: session.artifact })
      .eq("id", session.id);
  }

  const { data: turns } = await admin
    .from("turns")
    .select("role, text")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  // Anthropic requires the first message to be a user turn; our transcript
  // starts with the interviewer's opening.
  const messages: ModelMessage[] = [
    { role: "user", content: "(The candidate joins the interview.)" },
    ...(turns ?? []).map(
      (t): ModelMessage => ({
        role: t.role === "interviewer" ? "assistant" : "user",
        content: t.text,
      })
    ),
  ];

  // Company/level config lives on the loop this session belongs to.
  let ctx = null;
  if (session.loop_id) {
    const { data: loop } = await admin
      .from("loops")
      .select("company, level")
      .eq("id", session.loop_id)
      .single();
    if (loop) ctx = getContext(loop.company, loop.level);
  }

  const questions: Question[] = session.questions ?? QUESTIONS;
  let questionIndex: number = session.question_index;
  let followupCount: number = session.followup_count;
  let reply: string;
  let done = false;

  if (session.round_type === "system_design") {
    const artifact = (session.artifact ?? {}) as DesignArtifact;
    const design = getDesignPrompt(artifact.promptId);
    if (!design) {
      return NextResponse.json({ error: "Session has no design prompt" }, { status: 409 });
    }
    questionIndex += 1;
    done = questionIndex >= MAX_DESIGN_TURNS;
    if (!done) {
      reply = await llm(designSystemPrompt(design, artifact, ctx), messages);
      if (reply.startsWith("[DONE]")) done = true;
    }
    if (done) reply = await llm(designClosingPrompt(), messages);
  } else if (session.round_type === "coding") {
    // Coding is one problem over many turns; question_index counts turns.
    const artifact = (session.artifact ?? {}) as CodingArtifact;
    const problem = getProblem(artifact.problemId);
    if (!problem) {
      return NextResponse.json({ error: "Session has no problem" }, { status: 409 });
    }
    questionIndex += 1;
    done = questionIndex >= MAX_CODING_TURNS;
    if (!done) {
      reply = await llm(codingSystemPrompt(problem, artifact, ctx), messages);
      // The interviewer signals it has enough signal rather than padding out
      // the remaining turns with small talk.
      if (reply.startsWith("[DONE]")) done = true;
    }
    if (done) {
      reply = await llm(codingClosingPrompt(), messages);
    }
  } else {
  // Decide: follow-up probe on the current question, or move on?
  let advance = followupCount >= MAX_FOLLOWUPS;
  if (!advance) {
    const probe = await llm(
      interviewerSystemPrompt(questions[questionIndex], followupCount, ctx),
      messages
    );
    if (probe.startsWith("[NEXT]")) {
      advance = true;
    } else {
      followupCount += 1;
      reply = probe;
    }
  }

  if (advance) {
    questionIndex += 1;
    followupCount = 0;
    if (questionIndex >= questions.length) {
      done = true;
      reply = await llm(closingPrompt(), messages);
    } else {
      reply = await llm(transitionPrompt(questions[questionIndex], ctx), messages);
    }
  }
  }

  await admin
    .from("turns")
    .insert({ session_id: session.id, role: "interviewer", text: reply! });
  await admin
    .from("sessions")
    .update({
      question_index: questionIndex,
      followup_count: followupCount,
      ...(done ? { status: "completed", ended_at: new Date().toISOString() } : {}),
    })
    .eq("id", session.id);

  // Full-loop sequencing: if this round finished and the loop has more rounds,
  // tell the client where to go next.
  let nextRound: { roundType: string; sessionId: string } | null = null;
  if (done && session.loop_id) {
    const { data: loop } = await admin
      .from("loops")
      .select("company, level, rounds")
      .eq("id", session.loop_id)
      .single();
    const nextOrder = (session.round_order ?? 0) + 1;
    const upcoming = loop?.rounds?.[nextOrder];
    if (loop && upcoming && isRoundType(upcoming) && ROUND_IMPLEMENTED[upcoming]) {
      const started = await startSession({
        admin,
        userId: user.id,
        roundType: upcoming,
        loopId: session.loop_id,
        roundOrder: nextOrder,
        company: loop.company,
        level: loop.level,
      });
      nextRound = { roundType: upcoming, sessionId: started.sessionId };
    } else if (loop) {
      await admin
        .from("loops")
        .update({ status: "completed" })
        .eq("id", session.loop_id);
    }
  }

  return NextResponse.json({
    sessionId: session.id,
    reply: reply!,
    nextRound,
    done,
    ...(session.round_type !== "behavioral"
      ? { questionIndex: 0, questionCount: 1, turn: questionIndex }
      : {
          questionIndex: Math.min(questionIndex, questions.length - 1),
          questionCount: questions.length,
        }),
  });
}
