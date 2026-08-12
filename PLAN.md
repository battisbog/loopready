# LoopReady v1 Build Plan

LoopReady: a voice-based mock interviewer that gets you ready for your FAANG loop, with feedback calibrated to what actually passes.

A complete, working app. Voice-based, with calibrated feedback. Not production ready, but fully functional end to end. Built to be executed with Claude Code, one milestone at a time.

## What v1 is

One complete flow:

1. User opens the app and clicks "Start behavioral mock"
2. An AI interviewer conducts a 2-3 question behavioral interview by voice (push-to-talk in v1, realtime upgrade in v1.1)
3. The session ends and the user gets a structured, honest feedback report calibrated to what passes a FAANG loop
4. Sessions and feedback are saved and viewable in a history list

## What v1 is NOT (do not build these yet)

- No payments or tiers
- No video avatar (later premium tier)
- No coding or system design rounds
- No account management beyond basic sign-in (Supabase handles auth; no profiles, settings, or roles)
- No email, marketing site, or analytics

The moat is the interviewer's probing quality and the feedback calibration. Everything else is packaging.

---

## Tech stack

- **Next.js 14+ (App Router) + TypeScript + Tailwind** - one repo, API routes included
- **Supabase** - database AND auth in one, via the JS SDK. Create tables once (supabase/schema.sql), use the SDK everywhere. Auth: magic link or password.
- **LLM**: Anthropic Claude via Vercel AI Gateway (no separate key needed; OIDC token from `vercel env pull`)
- **STT**: Whisper (audio in, text out)
- **TTS**: OpenAI TTS (text out, audio back)
- Runs locally with `npm run dev`. Deploy to Vercel only after v1 works.

## Environment variables

Provisioned automatically by the Vercel Supabase integration (`vercel env pull`):

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
POSTGRES_URL / POSTGRES_URL_NON_POOLING (migrations)
VERCEL_OIDC_TOKEN (AI Gateway auth, ~24h; re-pull when expired)
OPENAI_API_KEY (only if gateway can't serve STT/TTS)
```

## Data model

See `supabase/schema.sql` (applied via `node scripts/migrate.mjs`): `sessions` (with question_index, followup_count state), `turns`, `feedback` + RLS policies.

---

## Milestone 0: Scaffold — DONE

Next.js 16 App Router + TS + Tailwind, Supabase provisioned through Vercel Marketplace, schema applied, magic-link + password sign-in, protected routes via proxy.ts, dark minimal layout (emerald accent).

## Milestone 1: Interview engine in TEXT mode

`POST /api/interview` — `{ sessionId?, userMessage? }`. No sessionId: create session + opening question. With sessionId: store candidate turn, LLM next turn, deterministic state machine (3 main questions, max 2 follow-ups each, tracked on the session row). `/dev-chat` test UI.

**GATE: 3 real runs; tune probing until it's not generic. This tuning is the product.**

## Milestone 2: Feedback engine

`POST /api/feedback` — loads transcript, returns structured JSON (overallSignal, overallSummary, perAnswer[], topIssues[], rewrites[]). Feedback page at `/session/[id]/feedback`.

**GATE: must beat "paste transcript into ChatGPT" — tune until it does.**

## Milestone 3: Voice (push-to-talk)

`POST /api/transcribe` (Whisper), `POST /api/tts` (OpenAI TTS), interview page with MediaRecorder push-to-talk, live captions, thinking state, progress indicator. 2-4s latency acceptable.

## Milestone 4: Session flow + history

Home with start button + past sessions list. End-interview-early. `/session/[id]` transcript + feedback history view.

## Milestone 5: Quality pass

Question bank (15-20 questions, 6 competencies, randomized 3 per session), per-competency probing guidance, calibrated pass/fail examples in the feedback prompt, session timer + conciseness signal.

## Milestone 6 (v1.1, optional): Realtime voice

OpenAI Realtime API over WebRTC. Only after 3-5 real candidates used push-to-talk v1.

## Definition of done for v1

- [ ] Full voice mock interview, start to feedback, with zero keyboard input
- [ ] Feedback that references the candidate's actual answers and beats the "better than ChatGPT" test
- [ ] Sessions persist and are viewable in history
- [ ] Three different people have completed a mock and at least one said they would pay for this
