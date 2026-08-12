import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// LLM provider selection:
//   LOOPREADY_LLM=gateway (default) — Vercel AI Gateway (needs purchased
//     gateway credits; auth via VERCEL_OIDC_TOKEN / AI_GATEWAY_API_KEY)
//   LOOPREADY_LLM=openai — direct OpenAI with OPENAI_API_KEY (the same key
//     used for Whisper/TTS)

function openaiModel(model: string): LanguageModel {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai(model);
}

export function interviewModel(): LanguageModel {
  if (process.env.LOOPREADY_LLM === "openai") {
    // Fast conversational variant — interviewer turns need low latency
    return openaiModel(process.env.LOOPREADY_MODEL ?? "gpt-5-chat-latest");
  }
  return process.env.LOOPREADY_MODEL ?? "anthropic/claude-sonnet-4.6";
}

export function feedbackModel(): LanguageModel {
  if (process.env.LOOPREADY_LLM === "openai") {
    // Reasoning variant — the debrief is worth the extra seconds
    return openaiModel(process.env.LOOPREADY_FEEDBACK_MODEL ?? "gpt-5");
  }
  return process.env.LOOPREADY_FEEDBACK_MODEL ?? "anthropic/claude-sonnet-4.6";
}
