// The app is pinned to @moosematrix/tokens 0.1.0 (vendor/tokens-0.1.0) until it moves to 0.1.1 in its own PR.
// The copy must stay byte-identical to the 0.1.0 release files listed in SHA256SUMS, and the build must read
// the partials, scripts and CSS from it (fonts keep coming from packages/tokens, unchanged since 0.1.0).
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pinnedTokensDir } from "../src/lib/partials.mjs";

const app = path.join(import.meta.dirname, "..");
const dir = pinnedTokensDir(app);

test("vendor/tokens-0.1.0 matches SHA256SUMS and is version 0.1.0", () => {
  const rows = fs.readFileSync(path.join(dir, "SHA256SUMS"), "utf8").trim().split("\n").map((l) => l.split(/\s+\*?/));
  assert.deepEqual(rows.map((r) => r[1]).sort(), ["fonts.css", "footer.css", "footer.html", "header.css", "header.html", "nav.js", "search.css", "search.html", "search.js", "tokens.css"]);
  for (const [sum, name] of rows) assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, name))).digest("hex"), sum, name);
  assert.match(fs.readFileSync(path.join(dir, "tokens.css"), "utf8"), /--mm-tokens-version: "0\.1\.0"/);
});

test("the app build reads tokens from the pinned copy, not packages/tokens", () => {
  const css = fs.readFileSync(path.join(app, "src", "app", "globals.css"), "utf8");
  const imports = [...css.matchAll(/@import "([^"]+tokens[^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(imports, ["tokens.css", "header.css", "search.css", "footer.css"].map((f) => `../../vendor/tokens-0.1.0/${f}`));
  const sync = fs.readFileSync(path.join(app, "scripts", "sync-tokens.mjs"), "utf8");
  assert.match(sync, /fs\.copyFileSync\(path\.join\(pinned, f\), path\.join\(out, f\)\)/);
  assert.match(fs.readFileSync(path.join(app, "src", "lib", "partials.mjs"), "utf8"), /export function loadPartials\(dir = pinnedTokensDir\(\)\)/);
});
