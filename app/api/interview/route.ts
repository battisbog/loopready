import { NextResponse } from "next/server";
import { generateText, type ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INTERVIEW_MODEL } from "@/lib/ai";
import {
  MAX_FOLLOWUPS,
  QUESTIONS,
  pickSessionQuestions,
  type Question,
} from "@/lib/interview/questions";
import {
  closingPrompt,
  interviewerSystemPrompt,
  transitionPrompt,
} from "@/lib/interview/prompt";

export const maxDuration = 60;

interface Body {
  sessionId?: string;
  userMessage?: string;
}

function opening(firstQuestion: Question): string {
  return `Hi, thanks for joining. I'm a senior engineer here and I'll be running your behavioral round today — about three questions, and I may dig into your answers. Let's get started. ${firstQuestion.text}`;
}

async function llm(system: string, messages: ModelMessage[]): Promise<string> {
  const { text } = await generateText({
    model: INTERVIEW_MODEL,
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
    const questions = pickSessionQuestions();
    const { data: session, error } = await admin
      .from("sessions")
      .insert({ user_id: user.id, questions })
      .select()
      .single();
    if (error || !session) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
    const reply = opening(questions[0]);
    await admin
      .from("turns")
      .insert({ session_id: session.id, role: "interviewer", text: reply });
    return NextResponse.json({
      sessionId: session.id,
      reply,
      done: false,
      questionIndex: 0,
      questionCount: questions.length,
    });
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

  const questions: Question[] = session.questions ?? QUESTIONS;
  let questionIndex: number = session.question_index;
  let followupCount: number = session.followup_count;
  let reply: string;
  let done = false;

  // Decide: follow-up probe on the current question, or move on?
  let advance = followupCount >= MAX_FOLLOWUPS;
  if (!advance) {
    const probe = await llm(
      interviewerSystemPrompt(questions[questionIndex], followupCount),
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
      reply = await llm(
        interviewerSystemPrompt(questions[questionIndex], 0) +
          "\n\n" +
          transitionPrompt(questions[questionIndex]),
        messages
      );
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

  return NextResponse.json({
    sessionId: session.id,
    reply: reply!,
    done,
    questionIndex: Math.min(questionIndex, questions.length - 1),
    questionCount: questions.length,
  });
}
