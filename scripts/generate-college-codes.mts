/**
 * Generates one discount code per college, e.g. STANFORD10, for the campus
 * outreach push (see scripts/send-campus-outreach.mts and
 * scripts/campus-outreach-contacts.csv). $10 off the first billing cycle
 * only -- same flat-dollar-amount discount as WELCOME10
 * (supabase/migrations-welcome-email.sql), unlimited uses per code: this is
 * a school-wide promo meant to be shared with everyone at that school, not a
 * single-use coupon.
 *
 * Codes are hand-mapped, not algorithmically slugified: a few school names
 * collide badly under naive slugification ("Ohio State", "Penn State",
 * "Florida State", and "University of Florida" would all fight over
 * "STATE"/"FLORIDA" if the word "State" were stripped blindly), so each
 * school gets an explicit, sensible short code instead.
 *
 *   npx tsx scripts/generate-college-codes.mts             # dry run, prints what would be created
 *   npx tsx scripts/generate-college-codes.mts --create    # actually inserts into discount_codes
 *
 * Writes scripts/college-discount-codes.csv (school,code) either way, so the
 * mapping exists for send-campus-outreach.mts to join against once more real
 * contacts are researched.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const AMOUNT_OFF = 10;

/** [school name (matches campus-outreach-contacts.csv where it overlaps), code] */
const SCHOOLS: [string, string][] = [
  ["Stanford", "STANFORD10"],
  ["Carnegie Mellon", "CMU10"],
  ["UC Berkeley", "BERKELEY10"],
  ["Princeton", "PRINCETON10"],
  ["UIUC", "UIUC10"],
  ["UT Austin", "UTEXAS10"],
  ["UC San Diego", "UCSD10"],
  ["UCLA", "UCLA10"],
  ["Columbia", "COLUMBIA10"],
  ["University of Washington", "UWASH10"],
  ["UW-Madison", "UWMADISON10"],
  ["USC", "USC10"],
  ["Purdue", "PURDUE10"],
  ["Brown", "BROWN10"],
  ["MIT", "MIT10"],
  ["Harvard", "HARVARD10"],
  ["Yale", "YALE10"],
  ["Cornell", "CORNELL10"],
  ["University of Michigan", "UMICH10"],
  ["Georgia Tech", "GATECH10"],
  ["University of Pennsylvania", "UPENN10"],
  ["Caltech", "CALTECH10"],
  ["University of Chicago", "UCHICAGO10"],
  ["Duke", "DUKE10"],
  ["Johns Hopkins", "JHU10"],
  ["NYU", "NYU10"],
  ["Rutgers", "RUTGERS10"],
  ["Ohio State", "OHIOSTATE10"],
  ["Penn State", "PENNSTATE10"],
  ["University of Maryland", "UMD10"],
  ["University of Virginia", "UVA10"],
  ["Virginia Tech", "VATECH10"],
  ["North Carolina State", "NCSTATE10"],
  ["University of North Carolina", "UNC10"],
  ["Boston University", "BU10"],
  ["Northeastern", "NEU10"],
  ["University of Florida", "UFLORIDA10"],
  ["Florida State", "FLORIDASTATE10"],
  ["Georgia State", "GASTATE10"],
  ["University of Arizona", "UARIZONA10"],
  ["Arizona State", "ASU10"],
  ["University of Colorado Boulder", "CUBOULDER10"],
  ["Colorado State", "COLOSTATE10"],
  ["University of Utah", "UUTAH10"],
  ["University of Oregon", "UOREGON10"],
  ["Oregon State", "OREGONSTATE10"],
  ["University of Minnesota", "UMN10"],
  ["Iowa State", "IOWASTATE10"],
  ["University of Iowa", "UIOWA10"],
  ["Michigan State", "MSU10"],
  ["Indiana University", "INDIANA10"],
  ["Notre Dame", "NOTREDAME10"],
  ["Vanderbilt", "VANDERBILT10"],
  ["Rice", "RICE10"],
  ["Texas A&M", "TAMU10"],
  ["Baylor", "BAYLOR10"],
  ["SMU", "SMU10"],
  ["University of Houston", "UHOUSTON10"],
  ["Texas Tech", "TTU10"],
  ["University of Miami", "UMIAMI10"],
  ["University of South Florida", "USF10"],
  ["Case Western Reserve", "CWRU10"],
  ["University of Rochester", "UROCHESTER10"],
  ["Rensselaer Polytechnic", "RPI10"],
  ["Stevens Institute of Technology", "STEVENS10"],
  ["Drexel", "DREXEL10"],
  ["Temple", "TEMPLE10"],
  ["Villanova", "VILLANOVA10"],
  ["Lehigh", "LEHIGH10"],
  ["Syracuse", "SYRACUSE10"],
  ["University of Connecticut", "UCONN10"],
  ["University of Massachusetts Amherst", "UMASS10"],
  ["Boston College", "BC10"],
  ["Tufts", "TUFTS10"],
  ["Dartmouth", "DARTMOUTH10"],
  ["Brandeis", "BRANDEIS10"],
  ["William & Mary", "WM10"],
  ["George Washington", "GWU10"],
  ["Georgetown", "GEORGETOWN10"],
  ["American University", "AU10"],
  ["University of Pittsburgh", "PITT10"],
  ["West Virginia University", "WVU10"],
  ["University of Kentucky", "UKY10"],
  ["University of Tennessee", "UTENN10"],
  ["Auburn", "AUBURN10"],
  ["University of Alabama", "BAMA10"],
  ["Louisiana State University", "LSU10"],
  ["University of Oklahoma", "OU10"],
  ["Oklahoma State", "OKSTATE10"],
  ["Kansas State", "KSTATE10"],
  ["University of Kansas", "KU10"],
  ["University of Nebraska", "UNL10"],
  ["University of Missouri", "MIZZOU10"],
  ["Washington University in St. Louis", "WUSTL10"],
  ["University of Wisconsin-Milwaukee", "UWM10"],
  ["Marquette", "MARQUETTE10"],
  ["DePaul", "DEPAUL10"],
  ["Illinois Institute of Technology", "IIT10"],
  ["Loyola University Chicago", "LOYOLACHI10"],
  ["University of Illinois Chicago", "UIC10"],
];

if (SCHOOLS.length !== 100) {
  throw new Error(`Expected exactly 100 schools, got ${SCHOOLS.length}`);
}
const dupes = SCHOOLS.map((s) => s[1]).filter((c, i, a) => a.indexOf(c) !== i);
if (dupes.length) throw new Error(`Duplicate codes: ${dupes.join(", ")}`);

const CREATE = process.argv.includes("--create");

async function main() {
  writeFileSync(
    "scripts/college-discount-codes.csv",
    "school,code\n" + SCHOOLS.map(([school, code]) => `"${school}",${code}`).join("\n") + "\n"
  );
  console.log(`Wrote scripts/college-discount-codes.csv (${SCHOOLS.length} schools).\n`);

  if (!CREATE) {
    console.log(`DRY RUN -- would create ${SCHOOLS.length} codes at $${AMOUNT_OFF} off, unlimited uses.`);
    console.log("Re-run with --create to actually insert them.");
    return;
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let created = 0;
  let skipped = 0;
  for (const [school, code] of SCHOOLS) {
    const { error } = await admin
      .from("discount_codes")
      .insert({ code, amount_off: AMOUNT_OFF, max_uses: null, active: true });
    if (error) {
      // 23505 = unique_violation -- code already exists, leave it alone
      // (re-running this script must not reset an already-live code's
      // times_used or an active=false a human deliberately set).
      if (error.code === "23505") {
        skipped++;
      } else {
        console.log(`FAILED ${code} (${school}): ${error.message}`);
      }
      continue;
    }
    created++;
    console.log(`created ${code} -- ${school}`);
  }
  console.log(`\n${created} created, ${skipped} already existed.`);
}

await main();
