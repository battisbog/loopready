# LoopReady v1 Build Plan

LoopReady: a voice-based mock interviewer that gets you ready for your FAANG loop, with feedback calibrated to what actually passes.

A complete, working app covering the full FAANG loop: behavioral, coding, and system design rounds. Voice-based, with calibrated feedback. Not production ready, but fully functional end to end. Built to be executed with Claude Code, one milestone at a time.

## What v1 is

The full loop, as three round types on one shared engine, configured per candidate:

1. User configures the interview first: **target company** (Amazon, Google, Meta, etc.), **level** (e.g. L4/E4/SDE II, L5/E5/senior), and **which rounds** to run (a single round, or the full loop back to back)
2. The interview is then shaped to that config: company-specific style and values, level-appropriate difficulty and bar, and the chosen rounds in sequence
3. An AI interviewer conducts each round by voice (push-to-talk in v1, realtime upgrade later), with the right surface for the round:
   - Behavioral: voice only (company values baked in, e.g. Amazon LPs, Google googliness/GCA)
   - Coding: voice + a live code editor the AI can see, with the code runnable against test cases (difficulty scaled to level)
   - System Design: voice + a diagram/architecture canvas the AI can see and probe (depth/scope scaled to level; often skipped or lighter at junior levels)
4. The session ends and the user gets a structured, honest feedback report calibrated to that company and level, tuned per round type
5. Sessions and feedback are saved and viewable in a history list

## Build strategy: full loop, built in difficulty order

1. **Behavioral first** - pure conversation, cheapest to build, proves the core engine and feedback quality
2. **Coding second** - adds a code editor + execution surface
3. **System design third** - adds a diagram canvas the AI can interpret

Architecture is full-loop from day one (round_type is a first-class field everywhere), but always have something working; never block the whole app on the hardest round.

## What v1 is NOT

No payments/tiers, no video avatar, no account management beyond sign-in, no email/marketing/analytics. The moat is the interviewer's probing quality and the feedback calibration, across all three rounds.

---

## Tech stack

- Next.js App Router + TypeScript + Tailwind
- Supabase: database AND auth (schema in `supabase/schema.sql`, applied via `node scripts/migrate.mjs`)
- LLM: Claude via Vercel AI Gateway (anthropic/claude-sonnet-4.6, OIDC auth)
- STT: Whisper; TTS: OpenAI TTS — with browser Web Speech fallback when no OPENAI_API_KEY
- Local dev with `npm run dev`; deploy to Vercel only after v1 works

## Data model

See `supabase/schema.sql`: `loops` (company, level, rounds[], status) groups sessions; `sessions` (loop_id, round_type behavioral|coding|system_design, round_order, question_index, followup_count, artifact jsonb for code/diagram state); `turns`; `feedback`. All with RLS.

`round_type` drives which interviewer prompt, surface, and feedback rubric are used. `artifact` holds the round's work product (candidate code + language, or diagram JSON) so the interviewer and feedback engine can both see it.

---

## Milestones

### Core (behavioral) — M0-M5: DONE (gates pending LLM credits)

- **M0** Scaffold: Next.js 16, Supabase via Vercel Marketplace, magic-link + password auth, proxy.ts protection, dark layout.
- **M1** Interview engine (text): `POST /api/interview` `{ sessionId?, roundType?, userMessage?, artifact? }`, deterministic state (3 questions, max 2 follow-ups, state on session row), round-aware prompt map, `/dev-chat` test UI.
  **GATE: 3 real runs; tune probing until not generic.**
- **M2** Feedback engine: `POST /api/feedback`, structured JSON (signal/summary/perAnswer/topIssues/rewrites), round-aware rubric, `/session/[id]/feedback` page.
  **GATE: must beat "paste transcript into ChatGPT".**
- **M3** Voice push-to-talk: `/api/transcribe`, `/api/tts`, captions, thinking states, progress. Browser Web Speech fallback when no OpenAI key.
- **M4** Session flow + history: home start button + past sessions (round-type labeled), end-early, transcript/artifact/feedback history.
- **M5** Quality pass: 18-question bank (6 competencies, randomized per session), per-competency probing guidance, calibrated hire/no-hire examples in feedback prompt, timer + conciseness signal.

### M6: Config layer (company + level + rounds) — THE COMPREHENSIVE UPGRADE

Build once behavioral M1-5 gates pass. `/start` config screen: company (Amazon, Google, Meta, Microsoft, Apple, Netflix, Generic), level (in that company's ladder terms, mapped to junior/mid/senior tiers), rounds (single or full loop). Creates a `loops` row, kicks off first session.

`companyProfiles.ts` — per company: behavioralStyle (e.g. Amazon LPs + Bar Raiser mindset; Google googliness/GCA), codingStyle, systemDesignStyle, levels ladder→tier map, valuesList (e.g. the 16 LPs). This file is the moat: Amazon L5 must probe like a Bar Raiser scoring LPs at senior bar.

Wiring: interviewer + feedback prompts gain company/level/tier context; question selection prefers company-value-tagged questions; difficulty tier scales problem hardness, design scope, and feedback bar. Full-loop sequencing: after a round completes, route to the next round in the loop; combined summary at the end.

**GATE: Amazon L6 vs Google L4 must feel genuinely different, not cosmetic.**

### M6b: Realtime voice (optional, defer freely)

OpenAI Realtime over WebRTC; keep push-to-talk fallback. Don't let it block the loop.

### M7: Coding round

Monaco editor (`@monaco-editor/react`), Python + JavaScript, code in `session.artifact` (debounced save). Execution via hosted API (Judge0/Piston) — never run untrusted code locally. Run button + console panel. Coding interviewer prompt (sees artifact + run results; probes approach before code, complexity, edge cases; nudges, never solves). Coding feedback rubric: communication-before-code, correctness, complexity analysis, edge cases, code quality, response to hints. Bank: 8-12 problems by pattern with test cases.

**GATE: 3 real coding rounds; must probe like a real interviewer, not wait silently.**

### M8: System design round

React Flow (`@xyflow/react`) canvas — nodes/edges/labels serialized to `session.artifact` as JSON the LLM reads directly (no pixel interpretation). Design interviewer prompt (references components by name; pushes scale estimates, data model, read/write paths, bottlenecks, caching, failure modes; challenges hand-waving). Design feedback rubric: requirements clarification, design soundness, estimation, data model, trade-offs, depth on one component. Bank: 6-10 classic prompts each with "what a strong answer covers" notes.

**GATE: 3 real design rounds; must probe trade-offs like a staff interviewer.**

### M9: Full-loop mode — DONE

Chain all three rounds with combined summary. Only after all three are individually solid.

## Sequencing rules

- One milestone at a time; commit each.
- Do NOT start M7/M8 surfaces before the behavioral round is working end to end.
- After M1 and M2: STOP and run gates. Each new round has its own gate.
- Validate the behavioral core with real people BEFORE the config layer and other rounds. Recommended after core is proven: M6 first (multiplies behavioral value), then M7, M8.

## Definition of done for v1

- [ ] Config: pick company + level + rounds; interview visibly shaped to it
- [ ] Behavioral round: full voice mock, zero keyboard, company/level-calibrated
- [ ] Coding round: voice + editor + execution + coding-specific feedback, level-scaled
- [ ] System design round: voice + canvas the AI references + design feedback, level-scoped
- [x] Full loop: rounds in sequence under one config, combined summary
- [ ] Feedback references the candidate's actual work; beats "better than ChatGPT"
- [ ] History persists, labeled by company/level/round
- [ ] Three different people completed a mock; at least one would pay

Validation starts the moment the behavioral core is sharp — not after the entire loop is done.
