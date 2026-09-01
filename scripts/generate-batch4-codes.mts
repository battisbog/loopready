/**
 * Creates a 20%-off discount code for each batch-4 school that doesn't
 * already have one. Same discipline as generate-batch3-codes.mts.
 *
 *   npx tsx scripts/generate-batch4-codes.mts             # dry run
 *   npx tsx scripts/generate-batch4-codes.mts --create    # actually inserts + appends
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
  ["Stony Brook University", "STONYBROOK20"],
  ["Binghamton University", "BINGHAMTON20"],
  ["NYU Tandon School of Engineering", "NYUTANDON20"],
  ["UMBC", "UMBC20"],
  ["George Mason University", "GMU20"],
  ["James Madison University", "JMU20"],
  ["Virginia Commonwealth University", "VCU20"],
  ["Howard University", "HOWARD20"],
  ["University of Richmond", "RICHMOND20"],
  ["Wake Forest University", "WAKEFOREST20"],
  ["UNC Charlotte", "UNCC20"],
  ["East Carolina University", "ECU20"],
  ["College of Charleston", "COFC20"],
  ["NC A&T State University", "NCAT20"],
  ["LSU", "LSU20"],
  ["Xavier University of Louisiana", "XULA20"],
  ["University of Louisiana Lafayette", "ULLAFAYETTE20"],
  ["Texas State University", "TXSTATE20"],
  ["UT Dallas", "UTDALLAS20"],
  ["UT Arlington", "UTARLINGTON20"],
  ["Texas Tech University", "TEXASTECH20"],
  ["Trinity University San Antonio", "TRINITYSA20"],
  ["Sam Houston State University", "SHSU20"],
  ["Rose-Hulman Institute of Technology", "ROSEHULMAN20"],
  ["Butler University", "BUTLER20"],
  ["Valparaiso University", "VALPO20"],
  ["University of Dayton", "DAYTON20"],
  ["Miami University Ohio", "MIAMIOH20"],
  ["University of Akron", "AKRON20"],
  ["Cleveland State University", "CLEVELANDSTATE20"],
  ["Calvin University", "CALVIN20"],
  ["Michigan State University", "MSU20"],
  ["Santa Clara University", "SCU20"],
  ["Loyola Marymount University", "LMU20"],
  ["San Jose State University", "SJSU20"],
  ["Cal Poly San Luis Obispo", "CALPOLYSLO20"],
  ["Chapman University", "CHAPMAN20"],
  ["Harvey Mudd College", "HARVEYMUDD20"],
  ["Gonzaga University", "GONZAGA20"],
  ["Seattle University", "SEATTLEU20"],
  ["University of Portland", "PORTLAND20"],
  ["University of San Francisco", "USF_CA20"],
  ["Bentley University", "BENTLEY20"],
  ["Babson College", "BABSON20"],
  ["Worcester State University", "WORCESTERSTATE20"],
  ["UMass Lowell", "UMASSLOWELL20"],
  ["Bryant University", "BRYANT20"],
  ["Roger Williams University", "RWU20"],
  ["Quinnipiac University", "QUINNIPIAC20"],
  ["University of Vermont", "UVM20"],
  ["Clarkson University", "CLARKSON20"],
  ["Union College Schenectady", "UNIONCOLLEGE20"],
  ["Ithaca College", "ITHACA20"],
  ["Hofstra University", "HOFSTRA20"],
  ["Manhattan College", "MANHATTANCOLLEGE20"],
  ["CUNY City College", "CCNY20"],
  ["Pace University", "PACE20"],
  ["Villanova University", "VILLANOVA20"],
  ["Lehigh University", "LEHIGH20"],
  ["Temple University", "TEMPLE20"],
  ["Bucknell University", "BUCKNELL20"],
  ["Lafayette College", "LAFAYETTE20"],
  ["Widener University", "WIDENER20"],
  ["Duquesne University", "DUQUESNE20"],
  ["Towson University", "TOWSON20"],
  ["Salisbury University", "SALISBURY20"],
  ["Christopher Newport University", "CNU20"],
  ["Old Dominion University", "ODU20"],
  ["Radford University", "RADFORD20"],
  ["Appalachian State University", "APPSTATE20"],
  ["Elon University", "ELON20"],
  ["Winthrop University", "WINTHROP20"],
  ["Coastal Carolina University", "COASTAL20"],
  ["Furman University", "FURMAN20"],
  ["University of Central Arkansas", "UCA20"],
  ["Georgetown University", "GEORGETOWN20"],
  ["George Washington University", "GWU20"],
  ["University of Nebraska Omaha", "UNOMAHA20"],
  ["Creighton University", "CREIGHTON20"],
  ["Xavier University Cincinnati", "XAVIERCIN20"],
  ["Baldwin Wallace University", "BALDWINWALLACE20"],
  ["Oberlin College", "OBERLIN20"],
  ["Western Michigan University", "WMU20"],
  ["DePaul University", "DEPAULU20"],
  ["Northern Illinois University", "NIU20"],
  ["Bradley University", "BRADLEY20"],
  ["Southern Illinois University Carbondale", "SIUC20"],
  ["Indiana State University", "INDIANASTATE20"],
  ["IUPUI IU Indianapolis", "IUPUI20"],
  ["University of Evansville", "EVANSVILLE20"],
  ["Drake University", "DRAKE20"],
  ["Simpson College", "SIMPSON20"],
  ["Grinnell College", "GRINNELL20"],
  ["Macalester College", "MACALESTER20"],
  ["Minnesota State University Mankato", "MNSU20"],
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
