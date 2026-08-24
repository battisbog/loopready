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
  console.log("\nOK: backup is configuration-identical and ready to take over.\n");
}

await main();
