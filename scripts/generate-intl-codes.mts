/**
 * Creates a 20%-off discount code per international school in
 * scripts/campus-outreach-intl.csv. Same discipline as
 * generate-batch3-codes.mts / generate-batch4-codes.mts.
 *
 *   npx tsx scripts/generate-intl-codes.mts             # dry run
 *   npx tsx scripts/generate-intl-codes.mts --create    # actually inserts + appends
 */
import { readFileSync, appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const PERCENT_OFF = 20;
const CREATE = process.argv.includes("--create");

const SCHOOLS: [string, string][] = [
  ["Oxford", "OXFORD20"],
  ["Cambridge", "CAMBRIDGE20"],
  ["Imperial College London", "IMPERIAL20"],
  ["UCL", "UCL20"],
  ["Edinburgh", "EDINBURGH20"],
  ["Manchester", "MANCHESTER20"],
  ["Warwick", "WARWICK20"],
  ["Bristol", "BRISTOL20"],
  ["Southampton", "SOUTHAMPTON20"],
  ["Durham", "DURHAM20"],
  ["Bath", "BATH20"],
  ["Glasgow", "GLASGOW20"],
  ["Nottingham", "NOTTINGHAM20"],
  ["Sheffield", "SHEFFIELD20"],
  ["St Andrews", "STANDREWS20"],
  ["York", "YORK20"],
  ["Waterloo", "WATERLOO20"],
  ["Toronto", "TORONTO20"],
  ["UBC", "UBC20"],
  ["McGill", "MCGILL20"],
  ["Simon Fraser", "SFU20"],
  ["Western University", "WESTERNU20"],
  ["Queen's University", "QUEENSU20"],
  ["Melbourne", "MELBOURNE20"],
  ["UNSW Sydney", "UNSW20"],
  ["Sydney", "SYDNEY20"],
  ["University of Queensland", "UQ20"],
  ["Trinity College Dublin", "TCD20"],
  ["UCD", "UCD20"],
  ["NUI Galway", "NUIGALWAY20"],
];

async function main() {
  console.log(`${SCHOOLS.length} codes to ${CREATE ? "create" : "dry-run"} at ${PERCENT_OFF}% off.\n`);

  if (!CREATE) {
    for (const [school, code] of SCHOOLS) console.log(`  ${code} -- ${school}`);
    console.log("\n(dry run -- pass --create to actually create + append)");
    return;
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let created = 0;
  let skipped = 0;
  const newRows: string[] = [];
  for (const [school, code] of SCHOOLS) {
    const { error } = await admin
      .from("discount_codes")
      .insert({ code, percent_off: PERCENT_OFF, max_uses: null, active: true });
    if (error) {
      if (error.code === "23505") {
        skipped++;
      } else {
        console.log(`FAILED ${code} (${school}): ${error.message}`);
      }
      continue;
    }
    created++;
    newRows.push(`"${school}",${code}`);
    console.log(`created ${code} -- ${school}`);
  }

  if (newRows.length) {
    appendFileSync("scripts/college-discount-codes.csv", newRows.join("\n") + "\n");
  }
  console.log(`\n${created} created, ${skipped} already existed. Appended to college-discount-codes.csv.`);
}

await main();
