// All LLM calls route through the Vercel AI Gateway (auth via VERCEL_OIDC_TOKEN
// from `vercel env pull`, or AI_GATEWAY_API_KEY in CI).
export const INTERVIEW_MODEL =
  process.env.LOOPREADY_MODEL || "anthropic/claude-sonnet-4.6";

export const FEEDBACK_MODEL =
  process.env.LOOPREADY_FEEDBACK_MODEL || "anthropic/claude-sonnet-4.6";
