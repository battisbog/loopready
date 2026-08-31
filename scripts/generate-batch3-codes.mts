/**
 * One-off: creates a 20%-off discount code for each batch-3 school that
 * doesn't already have one (checked against scripts/college-discount-codes.csv).
 * Percent, not flat dollars -- see commit "Add percentage-off discount
 * codes" for why flat amounts are unfair across Voice ($19) vs Premium ($69).
 *
 *   npx tsx scripts/generate-batch3-codes.mts             # dry run
 *   npx tsx scripts/generate-batch3-codes.mts --create    # actually inserts + appends to the mapping file
 */
import { readFileSync, appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const PERCENT_OFF = 20;
const CREATE = process.argv.includes("--create");

const MISSING: [string, string][] = [
  ["UC Santa Barbara", "UCSB20"],
  ["CU Boulder", "CUBOULDER20"],
  ["Worcester Polytechnic Institute", "WPI20"],
  ["Rochester Institute of Technology", "RIT20"],
  ["Wayne State University", "WAYNESTATE20"],
  ["University of Nebraska-Lincoln", "UNL20"],
  ["Syracuse University", "SYRACUSE20"],
  ["Marquette University", "MARQUETTE20"],
  ["Saint Louis University", "SLU20"],
  ["Texas Christian University", "TCU20"],
  ["Kennesaw State University", "KENNESAW20"],
  ["Florida Atlantic University", "FAU20"],
  ["NC State University", "NCSTATE20"],
  ["University of Alabama Birmingham", "UAB20"],
  ["Mississippi State University", "MSSTATE20"],
  ["University of Mississippi", "OLEMISS20"],
  ["Georgia Southern University", "GASOUTHERN20"],
  ["University of South Carolina", "USC_SC20"],
  ["Oklahoma State University", "OKSTATE20"],
  ["University of Arkansas", "ARKANSAS20"],
  ["University of Nevada Reno", "UNR20"],
  ["UNLV", "UNLV20"],
  ["Colorado School of Mines", "MINES20"],
  ["Washington State University", "WSU20"],
  ["University of North Texas", "UNT20"],
  ["Missouri University of Science and Technology", "MISSOURIST20"],
  ["Ohio University", "OHIOU20"],
  ["Michigan Technological University", "MICHIGANTECH20"],
  ["Embry-Riddle Aeronautical University", "EMBRYRIDDLE20"],
  ["University of New Mexico", "UNM20"],
  ["Boise State University", "BOISESTATE20"],
  ["University of Idaho", "IDAHO20"],
  ["Wichita State University", "WICHITASTATE20"],
  ["Louisiana Tech University", "LATECH20"],
  ["University of Toledo", "TOLEDO20"],
  ["Grand Valley State University", "GVSU20"],
  ["Central Michigan University", "CMICH20"],
  ["Oakland University", "OAKLANDU20"],
  ["Milwaukee School of Engineering", "MSOE20"],
  ["North Dakota State University", "NDSU20"],
  ["Northeastern University", "NORTHEASTERN20"],
  ["Rutgers University", "RUTGERS20"],
];

async function main() {
  console.log(`${MISSING.length} codes to ${CREATE ? "create" : "dry-run"} at ${PERCENT_OFF}% off.\n`);

  if (!CREATE) {
    for (const [school, code] of MISSING) console.log(`  ${code} -- ${school}`);
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
  for (const [school, code] of MISSING) {
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
