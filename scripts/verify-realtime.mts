/**
 * Guards the two realtime bugs found in the probe captures, without spending
 * API calls. Run alongside the typecheck.
 *
 *   npx tsx scripts/verify-realtime.mts
 */
import { readFileSync } from "node:fs";

const {
  shouldGreet,
  isSubstantiveAnswer,
  advanceState,
  buildInstructions,
  buildGreeting,
} = await import("../lib/realtime/conversation.ts");
const { pickSessionQuestions, MAX_FOLLOWUPS } = await import(
  "../lib/interview/questions.ts"
);
const { getContext } = await import("../lib/interview/companies.ts");

const ctx = getContext("Google", "L4");
let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(56)} ${detail}`);
  if (!ok) failures++;
}

// -------------------------------------------------------- bug 1: the greeting

console.log("\nGreeting decision (bug 1)");
check(
  "fresh session still greets despite a seeded opening",
  shouldGreet([{ role: "interviewer" }]) === true,
  "startSession always writes one interviewer row"
);
check(
  "greets when there are no turns at all",
  shouldGreet([]) === true
);
check(
  "does NOT re-greet once the candidate has spoken",
  shouldGreet([{ role: "interviewer" }, { role: "candidate" }]) === false,
  "a genuine resume"
);

const questions = pickSessionQuestions();
for (const round of ["behavioral", "coding", "system_design"] as const) {
  const session = {
    round_type: round,
    question_index: 0,
    followup_count: 0,
    phase: "greeting",
    questions: round === "behavioral" ? questions : null,
    artifact:
      round === "coding"
        ? { problemId: "two-sum", language: "python", code: "" }
        : round === "system_design"
          ? { promptId: "url-shortener", nodes: [], edges: [] }
          : {},
  };
  const g = buildGreeting(session, ctx);
  check(
    `${round}: opening asks for THEIR intro, not a question`,
    /tell you a bit about themselves/i.test(g) &&
      /Do NOT ask an interview question yet/i.test(g) &&
      /Do NOT present the problem yet/i.test(g),
    `${g.length} chars`
  );
}

console.log("\nOpening arc walks greeting -> format -> questions");
{
  const base = {
    round_type: "behavioral",
    question_index: 0,
    followup_count: 0,
    questions,
    artifact: {},
  };
  const a = advanceState({ ...base, phase: "greeting" }, { substantive: true, modelRequestedAdvance: false });
  check("greeting advances to format", a.phase === "format", `-> ${a.phase}`);
  const b = advanceState({ ...base, phase: "format" }, { substantive: false, modelRequestedAdvance: false });
  check("format advances even on a short 'ready'", b.phase === "questions", `-> ${b.phase}`);
  check("the intro never spends a follow-up", a.followupCount === 0 && b.followupCount === 0);
  const fmt = buildInstructions({ ...base, phase: "greeting" }, { ...a, phase: "greeting" }, ctx);
  check(
    "during greeting, the next reply explains the format",
    /React to something specific they actually said/i.test(fmt) &&
      /Do NOT ask an interview question/i.test(fmt)
  );
}

// ------------------------------------------------ bug 2: the question dispenser

console.log("\nFollow-up budget (bug 2)");
check("\"Hello?\" is not an answer", isSubstantiveAnswer("Hello?") === false);
check(
  "\"Can you hear me?\" is not an answer",
  isSubstantiveAnswer("Can you hear me?") === false
);
check("\"Sure.\" is not an answer", isSubstantiveAnswer("Sure.") === false);
check(
  "\"Sorry, could you repeat that?\" is not an answer",
  isSubstantiveAnswer("Sorry, could you repeat that?") === false
);
check(
  "a real STAR answer counts",
  isSubstantiveAnswer(
    "I owned the checkout service and during Black Friday our p99 jumped to 4 seconds, so I added a batch endpoint and brought it back to 180 milliseconds."
  ) === true
);

const base = {
  round_type: "behavioral",
  question_index: 0,
  followup_count: 0,
  phase: "questions",
  questions,
  artifact: {},
};

const chatter = advanceState(base, {
  substantive: false,
  modelRequestedAdvance: false,
});
check(
  "chatter does not spend the budget",
  chatter.followupCount === 0 && chatter.questionIndex === 0,
  `q=${chatter.questionIndex} fc=${chatter.followupCount}`
);

let st = { ...base };
let advancedAt = -1;
for (let i = 1; i <= 4; i++) {
  const next = advanceState(st, { substantive: true, modelRequestedAdvance: false });
  if (next.questionIndex !== st.question_index && advancedAt < 0) advancedAt = i;
  st = { ...st, question_index: next.questionIndex, followup_count: next.followupCount };
}
check(
  "advances only after the follow-up budget is spent",
  advancedAt === MAX_FOLLOWUPS + 1,
  `advanced on substantive answer #${advancedAt} (MAX_FOLLOWUPS=${MAX_FOLLOWUPS})`
);

const early = advanceState(base, { substantive: true, modelRequestedAdvance: true });
check(
  "the advance_question tool can move on early",
  early.questionIndex === 1 && early.followupCount === 0
);

// --------------------------------------------------- forward-looking directive

console.log("\nForward-looking instructions");
// The budget is spent when the count REACHES the max, which is the answer
// before the index actually moves. That is the whole point of the design: the
// model is told to transition one reply ahead of the counter.
const spent = advanceState(
  { ...base, followup_count: MAX_FOLLOWUPS - 1 },
  { substantive: true, modelRequestedAdvance: false }
);
check(
  "budget spent one reply before the index moves",
  spent.followupCount === MAX_FOLLOWUPS && spent.questionIndex === 0,
  `fc=${spent.followupCount} q=${spent.questionIndex}`
);
const moveOn = buildInstructions({ ...base }, spent, ctx);
check(
  "names the exact next question when the budget is spent",
  moveOn.includes(questions[1].text),
  "verbatim next question present"
);
check("tells the model to move on next reply", /MOVE ON NOW/.test(moveOn));

// And the reply after that must NOT re-ask it.
const afterMove = advanceState(
  { ...base, followup_count: MAX_FOLLOWUPS },
  { substantive: true, modelRequestedAdvance: false }
);
check(
  "the following turn moves the index and stops saying MOVE ON",
  afterMove.questionIndex === 1 &&
    afterMove.followupCount === 0 &&
    !/MOVE ON NOW/.test(buildInstructions({ ...base }, afterMove, ctx)),
  "no double-asking the same question"
);
check(
  "always demands an acknowledgement first",
  /Never open a reply with a bare question/.test(moveOn)
);

const mid = advanceState(base, { substantive: true, modelRequestedAdvance: false });
const probing = buildInstructions({ ...base }, mid, ctx);
check(
  "keeps probing while budget remains",
  !/MOVE ON NOW/.test(probing) && /follow-up/.test(probing)
);

const finished = advanceState(
  { ...base, question_index: questions.length - 1, followup_count: MAX_FOLLOWUPS },
  { substantive: true, modelRequestedAdvance: false }
);
check("marks the interview done after the last question", finished.done === true);
check(
  "closing instructions give no feedback",
  /no feedback/i.test(buildInstructions({ ...base }, finished, ctx))
);

for (const round of ["coding", "system_design"] as const) {
  const session = {
    ...base,
    round_type: round,
    questions: null,
    artifact:
      round === "coding"
        ? { problemId: "two-sum", language: "python", code: "def two_sum():\n  pass" }
        : { promptId: "url-shortener", nodes: [], edges: [] },
  };
  const s = advanceState(session, { substantive: true, modelRequestedAdvance: false });
  const ins = buildInstructions(session, s, ctx);
  check(
    `${round}: instructions carry the artifact and the acknowledge rule`,
    /Never open a reply with a bare question/.test(ins) && ins.length > 500,
    `${ins.length} chars`
  );
}

// ------------------------------------------------------------ regression guard

console.log("\nRegression guards");
const turnRoute = readFileSync("app/api/realtime/turn/route.ts", "utf8");
check(
  "the racing sayNext is gone from the turn route",
  !/sayNext/.test(turnRoute),
  "reactive response.create was always rejected by the API"
);
const client = readFileSync("lib/realtime/client.ts", "utf8");
check(
  "the greeting no longer keys off history.length",
  !/history\.length === 0/.test(client),
  "that test was never true for a fresh session"
);
check(
  "concurrent response.create is queued, not dropped",
  /pendingSpeak/.test(client) && /conversation_already_has_active_response/.test(client)
);

console.log(
  failures === 0
    ? "\nAll realtime checks passed.\n"
    : `\n${failures} realtime check(s) FAILED.\n`
);
process.exit(failures === 0 ? 0 : 1);
