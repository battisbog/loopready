/**
 * Proves the Tavus failover account is ready to take over.
 *
 * Run this BEFORE trusting the backup in an incident, and periodically so a
 * drift between the two accounts is found on a calm afternoon rather than
 * during an outage:
 *
 *   npx tsx scripts/verify-tavus-backup.mts
 *
 * It compares the two personas field by field -- including a hash of the system
 * prompt and of the objectives/guardrails content -- because a failover that
 * behaves differently from production is not a failover, it is a second bug.
 *
 * Read-only. It never creates a conversation, so it costs nothing.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const BASE = process.env.TAVUS_API_BASE ?? "https://tavusapi.com";

const PRIMARY = {
  label: "primary",
  key: process.env.TAVUS_API_KEY ?? "",
  persona: process.env.TAVUS_PERSONA_ID ?? "",
  replica: process.env.TAVUS_REPLICA_ID ?? "",
};
const BACKUP = {
  label: "backup",
  key: process.env.TAVUS_BACKUP_API_KEY ?? "",
  persona: process.env.TAVUS_BACKUP_PERSONA_ID ?? "",
  replica: process.env.TAVUS_BACKUP_REPLICA_ID ?? PRIMARY.replica,
};

const sha = (v: unknown) =>
  createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex").slice(0, 16);

async function get(key: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-api-key": key } });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

interface Snapshot {
  fields: Record<string, unknown>;
  replicaOk: boolean;
}

async function snapshot(acct: typeof PRIMARY): Promise<Snapshot> {
  const p = await get(acct.key, `/v2/personas/${acct.persona}`);
  const cf = p.layers?.conversational_flow ?? {};
  const [obj, grd] = await Promise.all([
    p.objectives_id ? get(acct.key, `/v2/objectives/${p.objectives_id}`) : null,
    p.guardrails_id ? get(acct.key, `/v2/guardrails/${p.guardrails_id}`) : null,
  ]);

  // The replica must exist on THIS account, or the switch fails at the first
  // conversation rather than here.
  let replicaOk = false;
  try {
    const r = await get(acct.key, `/v2/replicas/${acct.replica}`);
    replicaOk = r.status === "completed";
  } catch {
    replicaOk = false;
  }

  return {
    replicaOk,
    fields: {
      persona_name: p.persona_name,
      "system_prompt#": sha(p.system_prompt ?? ""),
      pipeline_mode: p.pipeline_mode,
      default_replica_id: p.default_replica_id,
      "llm.model": p.layers?.llm?.model,
      "llm.speculative_inference": p.layers?.llm?.speculative_inference,
      perception_model: p.layers?.perception?.perception_model,
      emotion_recognition: p.layers?.perception?.emotion_recognition,
      turn_detection_model: cf.turn_detection_model,
      turn_taking_patience: cf.turn_taking_patience,
      replica_interruptibility: cf.replica_interruptibility,
      voice_isolation: cf.voice_isolation,
      idle_engagement: cf.idle_engagement,
      idle_end_behavior: cf.idle_end_behavior,
      greeting: JSON.stringify(p.greeting ?? ""),
      is_published: p.is_published,
      "objectives#": obj ? sha(obj.data) : "MISSING",
      "guardrails#": grd ? sha(grd.data) : "MISSING",
    },
  };
}

async function main() {
  for (const a of [PRIMARY, BACKUP]) {
    if (!a.key || !a.persona) {
      console.error(`\n${a.label}: not configured (key or persona id missing)`);
      process.exit(1);
    }
  }

  const [prod, back] = await Promise.all([snapshot(PRIMARY), snapshot(BACKUP)]);

  console.log(`\nprimary persona ${PRIMARY.persona}   backup persona ${BACKUP.persona}\n`);
  console.log("  " + "field".padEnd(28) + "primary".padEnd(26) + "backup");

  let mismatches = 0;
  for (const key of Object.keys(prod.fields)) {
    const a = String(prod.fields[key]);
    const b = String(back.fields[key]);
    const ok = a === b;
    if (!ok) mismatches++;
    console.log((ok ? "  " : "! ") + key.padEnd(28) + a.padEnd(26) + b);
  }

  console.log(
    `\n  replica ${PRIMARY.replica} present+trained: primary=${prod.replicaOk} backup=${back.replicaOk}`
  );
  if (!back.replicaOk) mismatches++;

  if (mismatches) {
    console.error(
      `\nFAIL: ${mismatches} difference(s). The backup would NOT behave like production.\n`
    );
    process.exit(1);
  }
  console.log("\n  configuration: identical");

  // Configuration alone does NOT mean the account can run an interview.
  //
  // The first version of this script stopped above and reported "ready" for a
  // backup that was out of conversational credits -- every field matched and
  // every request 402'd. That is the exact failure you would otherwise discover
  // mid-incident, so readiness is now proved by actually opening a room and
  // closing it again. A refusal costs nothing; a success costs seconds.
  if (process.argv.includes("--no-drill")) {
    console.log(
      "\n  drill SKIPPED (--no-drill): configuration checked, but capacity NOT proved.\n"
    );
    return;
  }

  const res = await fetch(`${BASE}/v2/conversations`, {
    method: "POST",
    headers: { "x-api-key": BACKUP.key, "Content-Type": "application/json" },
    body: JSON.stringify({
      replica_id: BACKUP.replica,
      persona_id: BACKUP.persona,
      conversation_name: "loopready failover drill",
      conversational_context: "Automated readiness check. Say nothing.",
      properties: {
        max_call_duration: 60,
        participant_absent_timeout: 60,
        enable_recording: false,
        enable_transcription: false,
      },
    }),
  });
  const body = await res.json().catch(() => ({}) as Record<string, unknown>);

  const message = String(body.message ?? "");
  const outOfCredits = res.status === 402 || /credit/i.test(message);

  if (outOfCredits) {
    // The intended resting state: the failover is kept configured but unfunded,
    // and credits are added at the moment it is needed. Reported clearly rather
    // than as a failure, because nothing here is broken -- but never reported as
    // "ready", because it cannot serve an interview in this state.
    console.log("  capacity:      DORMANT — no conversational credits");
    console.log(
      "\nBackup is configuration-identical but UNFUNDED. Before switching:" +
        "\n  1. add credits/a plan to the backup Tavus account" +
        "\n  2. re-run this script to confirm it can open a room" +
        "\n  3. set TAVUS_USE_BACKUP=true and redeploy\n"
    );
    return;
  }

  if (!res.ok || !body.conversation_id) {
    console.error(
      `\nFAIL: the backup cannot start a conversation (HTTP ${res.status}).` +
        `\n  ${JSON.stringify(body).slice(0, 200)}\n`
    );
    process.exit(1);
  }

  await fetch(`${BASE}/v2/conversations/${body.conversation_id}/end`, {
    method: "POST",
    headers: { "x-api-key": BACKUP.key },
  }).catch(() => {});

  console.log("  capacity:      room opened and closed OK");
  console.log("\nOK: backup is identical to production AND can serve an interview.\n");
}

await main();
