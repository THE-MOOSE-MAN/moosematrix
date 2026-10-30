// Copies the @moosematrix/tokens runtime assets (fonts, nav.js, search.js) into public/mm/ before `next build`,
// after checking the fonts against SHA256SUMS. The CSS is bundled by Next from src/app/globals.css.
// public/mm/ is generated (gitignored). Fonts come from packages/tokens (unchanged since 0.1.0); fonts.css, nav.js and
// search.js from the app's pinned 0.1.0 copy (vendor/tokens-0.1.0, see src/lib/partials.mjs) until the app moves to 0.1.1.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { tokensDir, pinnedTokensDir } from "../src/lib/partials.mjs";

const app = path.join(import.meta.dirname, "..");
const src = tokensDir(app);
const pinned = pinnedTokensDir(app);
const out = path.join(app, "public", "mm");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "fonts"), { recursive: true });

const sums = fs.readFileSync(path.join(src, "fonts", "SHA256SUMS"), "utf8").trim().split("\n").map((l) => l.trim().split(/\s+\*?/));
for (const [sum, name] of sums) {
  const buf = fs.readFileSync(path.join(src, "fonts", name));
  const got = crypto.createHash("sha256").update(buf).digest("hex");
  if (got !== sum) throw new Error(`font ${name}: sha256 ${got} does not match SHA256SUMS`);
  fs.writeFileSync(path.join(out, "fonts", name), buf);
}
for (const f of ["fonts.css", "nav.js", "search.js"]) fs.copyFileSync(path.join(pinned, f), path.join(out, f));
console.log(`tokens: ${sums.length} fonts, fonts.css, nav.js, search.js -> public/mm/`);
