import { readFileSync, appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const PERCENT_OFF = 20;
const CREATE = process.argv.includes("--create");

const SCHOOLS: [string, string][] = [
  ["King's College London", "KCL20"],
  ["University of Birmingham", "BIRMINGHAM20"],
  ["University of Leeds", "LEEDS20"],
  ["Queen Mary University of London", "QMUL20"],
  ["University of Leicester", "LEICESTER20"],
  ["University of Exeter", "EXETER20"],
  ["Cardiff University", "CARDIFF20"],
  ["Queen's University Belfast", "QUB20"],
  ["University of Surrey", "SURREY20"],
  ["Lancaster University", "LANCASTER20"],
  ["Loughborough University", "LOUGHBOROUGH20"],
  ["Newcastle University", "NEWCASTLEUK20"],
  ["University of Liverpool", "LIVERPOOL20"],
  ["University of Reading", "READING20"],
  ["University of Kent", "KENT20"],
  ["University of Sussex", "SUSSEX20"],
  ["City St George's University of London", "CITYLONDON20"],
  ["University of Strathclyde", "STRATHCLYDE20"],
  ["Bangor University", "BANGOR20"],
  ["University of Essex", "ESSEX20"],
  ["Maynooth University", "MAYNOOTH20"],
  ["TU Dublin", "TUDUBLIN20"],
  ["University College Cork", "UCC20"],
  ["Dublin City University", "DCU20"],
  ["University of Alberta", "UALBERTA20"],
  ["McMaster University", "MCMASTER20"],
  ["Concordia University", "CONCORDIA20"],
  ["Carleton University", "CARLETON20"],
  ["York University", "YORKU20"],
  ["University of Calgary", "CALGARY20"],
  ["University of Victoria", "UVIC20"],
  ["Dalhousie University", "DALHOUSIE20"],
  ["Toronto Metropolitan University", "TMU20"],
  ["University of Manitoba", "MANITOBA20"],
  ["University of Guelph", "GUELPH20"],
  ["University of Windsor", "WINDSOR20"],
  ["Monash University", "MONASH20"],
  ["Australian National University", "ANU20"],
  ["University of Adelaide", "ADELAIDE20"],
  ["Griffith University", "GRIFFITH20"],
  ["University of Newcastle", "NEWCASTLEAU20"],
  ["Flinders University", "FLINDERS20"],
  ["Western Sydney University", "WESTERNSYDNEY20"],
  ["Swinburne University of Technology", "SWINBURNE20"],
  ["Queensland University of Technology", "QUT20"],
  ["University of Auckland", "AUCKLAND20"],
  ["University of Canterbury", "CANTERBURY20"],
  ["University of Waikato", "WAIKATO20"],
  ["National University of Singapore", "NUS20"],
  ["Nanyang Technological University", "NTU20"],
  ["Singapore Management University", "SMU_SG20"],
  ["Singapore University of Technology and Design", "SUTD20"],
];

async function main() {
  console.log(`${SCHOOLS.length} codes to ${CREATE ? "create" : "dry-run"} at ${PERCENT_OFF}% off.\n`);
  if (!CREATE) {
    for (const [school, code] of SCHOOLS) console.log(`  ${code} -- ${school}`);
    return;
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  let created = 0, skipped = 0;
  const newRows: string[] = [];
  for (const [school, code] of SCHOOLS) {
    const { error } = await admin.from("discount_codes").insert({ code, percent_off: PERCENT_OFF, max_uses: null, active: true });
    if (error) {
      if (error.code === "23505") skipped++;
      else console.log(`FAILED ${code} (${school}): ${error.message}`);
      continue;
    }
    created++;
    newRows.push(`"${school}",${code}`);
    console.log(`created ${code} -- ${school}`);
  }
  if (newRows.length) appendFileSync("scripts/college-discount-codes.csv", newRows.join("\n") + "\n");
  console.log(`\n${created} created, ${skipped} already existed.`);
}

await main();
