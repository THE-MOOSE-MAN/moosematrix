// Name-denylist check for pull requests.
// Terms come from the REGISTRY_DENYLIST secret (comma-separated) and are never printed:
// a hit is reported as file path plus "term #n" only.
// Usage: REGISTRY_DENYLIST=... node check-denylist.mjs <file> [...]
import { readFileSync, statSync } from "node:fs";

const terms = (process.env.REGISTRY_DENYLIST || "")
  .split(",")
  .map((t) => t.trim().toLowerCase())
  .filter(Boolean);
if (!terms.length) {
  console.error("denylist: REGISTRY_DENYLIST is empty");
  process.exit(2);
}
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = terms.map((t) => new RegExp(`\\b${escape(t)}\\b`, "i"));

let hits = 0;
for (const file of process.argv.slice(2)) {
  let text;
  try {
    if (!statSync(file).isFile()) continue;
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  patterns.forEach((re, i) => {
    if (re.test(text) || re.test(file)) {
      console.error(`${file}: matches denylist term #${i + 1}`);
      hits++;
    }
  });
}
if (hits) process.exit(1);
console.log(`denylist: ${terms.length} term(s), ${process.argv.length - 2} file(s), no matches`);
