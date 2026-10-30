// Prints a GitHub Actions ::add-mask:: line for every term in <file> and its common variants, so a
// term can't appear in the job log even if some later step echoed it. Prints nothing else.
// Usage: node mask.mjs <file>
import { readFileSync } from "node:fs";

let raw = "";
try { raw = readFileSync(process.argv[2], "utf8"); } catch { /* the scan step fails closed on a missing file */ }
const out = new Set();
for (const t of raw.split(/[,\n\r]+/).map((s) => s.trim()).filter(Boolean)) {
  const words = t.split(/\s+/);
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  for (const form of [words, words.map((w) => w.toLowerCase()), words.map((w) => w.toUpperCase()), words.map(cap)]) {
    for (const j of [" ", "", "-", "_", ".", "+", "%20", "/"]) out.add(form.join(j));
    if (form.length > 1) out.add(form.slice().reverse().join(" "));
  }
}
for (const v of out) if (v.length >= 3) process.stdout.write(`::add-mask::${v}\n`);
