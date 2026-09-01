/**
 * Creates a 20%-off discount code per hackathon in
 * scripts/campus-outreach-hackathons.csv, same discipline as
 * scripts/generate-batch3-codes.mts.
 *
 *   npx tsx scripts/generate-hackathon-codes.mts             # dry run
 *   npx tsx scripts/generate-hackathon-codes.mts --create    # actually inserts + appends to the mapping file
 */
import { readFileSync, appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const PERCENT_OFF = 20;
const CREATE = process.argv.includes("--create");

const HACKATHONS: [string, string][] = [
  ["PennApps", "PENNAPPS20"],
  ["HopHacks", "HOPHACKS20"],
  ["DubHacks", "DUBHACKS20"],
  ["TreeHacks", "TREEHACKS20"],
  ["MHacks", "MHACKS20"],
  ["HackPrinceton", "HACKPRINCETON20"],
  ["BigRed//Hacks", "BIGREDHACKS20"],
  ["YHack", "YHACK20"],
  ["LA Hacks", "LAHACKS20"],
  ["HackIllinois", "HACKILLINOIS20"],
  ["HackTX", "HACKTX20"],
  ["Hack@Brown", "HACKBROWN20"],
  ["HackRPI", "HACKRPI20"],
  ["HackUMass", "HACKUMASS20"],
  ["VandyHacks", "VANDYHACKS20"],
  ["HackNC", "HACKNC20"],
  ["SB Hacks", "SBHACKS20"],
  ["HackWashU", "HACKWASHU20"],
  ["CruzHacks", "CRUZHACKS20"],
];

async function main() {
  console.log(`${HACKATHONS.length} codes to ${CREATE ? "create" : "dry-run"} at ${PERCENT_OFF}% off.\n`);

  if (!CREATE) {
    for (const [name, code] of HACKATHONS) console.log(`  ${code} -- ${name}`);
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
  for (const [name, code] of HACKATHONS) {
    const { error } = await admin
      .from("discount_codes")
      .insert({ code, percent_off: PERCENT_OFF, max_uses: null, active: true });
    if (error) {
      if (error.code === "23505") {
        skipped++;
      } else {
        console.log(`FAILED ${code} (${name}): ${error.message}`);
      }
      continue;
    }
    created++;
    newRows.push(`"${name}",${code}`);
    console.log(`created ${code} -- ${name}`);
  }

  if (newRows.length) {
    appendFileSync("scripts/college-discount-codes.csv", newRows.join("\n") + "\n");
  }
  console.log(`\n${created} created, ${skipped} already existed. Appended to college-discount-codes.csv.`);
}

await main();
