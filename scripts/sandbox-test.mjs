import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dotenv from "dotenv";
import { Sandbox } from "@vercel/sandbox";

dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"),
  quiet: true,
});

const t0 = Date.now();
const sandbox = await Sandbox.create({ runtime: "node24", timeout: 120_000 });
console.log(`created in ${Date.now() - t0}ms`);

const py = await sandbox.runCommand("python3", ["-c", "print(sum([1,2,3]))"]);
console.log("python stdout:", JSON.stringify((await py.stdout()).trim()), "exit:", py.exitCode);

const js = await sandbox.runCommand("node", ["-e", "console.log([1,2,3].reduce((a,b)=>a+b))"]);
console.log("node stdout:", JSON.stringify((await js.stdout()).trim()), "exit:", js.exitCode);

console.log(`total ${Date.now() - t0}ms`);
await sandbox.stop();
