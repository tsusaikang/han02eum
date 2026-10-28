import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const commit = (process.env.WORKERS_CI_COMMIT_SHA ?? execFileSync(
  "git", ["-C", root, "rev-parse", "--verify", "HEAD"], { encoding: "utf8" }
)).trim();

if (!/^[0-9a-f]{40}$/i.test(commit)) {
  throw new Error("Deployment metadata requires a valid Git commit SHA.");
}

writeFileSync(new URL("../public/meta.json", import.meta.url), JSON.stringify({
  commit: commit.toLowerCase(),
  builtAt: new Date().toISOString()
}, null, 2) + "\n");
