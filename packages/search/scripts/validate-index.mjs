#!/usr/bin/env node
// Strict build-side check of a built index: schema rules (search-core.mjs,
// strict mode: any bad item fails), <= 150 KB gzipped, <= 1 MB raw.
// Usage: node scripts/validate-index.mjs --site <site> <path/to/search-index.json>
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { parseIndexText, CAPS } from "../search-core.mjs";

export const MAX_GZ_BYTES = 150 * 1024;

export function validateIndexFile(path, site) {
  const raw = readFileSync(path);
  const errors = [];
  if (raw.byteLength > CAPS.responseBytes) errors.push(`raw size ${raw.byteLength} B > ${CAPS.responseBytes} B`);
  const gz = gzipSync(raw, { level: 9 }).byteLength;
  if (gz > MAX_GZ_BYTES) errors.push(`gzip size ${gz} B > ${MAX_GZ_BYTES} B`);
  let text = "";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    errors.push("not valid UTF-8");
  }
  if (text) {
    const r = parseIndexText(text, site, { strict: true });
    if (!r.ok) {
      errors.push("schema: " + r.reason);
      for (const d of r.dropped) errors.push(`item #${d.index}: ${d.reason}`);
    }
  }
  return { ok: errors.length === 0, errors, gz, raw: raw.byteLength };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--site");
  const site = i >= 0 ? args[i + 1] : "";
  const files = args.filter((a, j) => a !== "--site" && j !== i + 1);
  if (!site || !files.length) {
    console.error("usage: validate-index.mjs --site <site> <file...>");
    process.exit(2);
  }
  let bad = 0;
  for (const f of files) {
    const r = validateIndexFile(f, site);
    if (r.ok) console.log(`ok ${f} (${r.raw} B raw, ${r.gz} B gz)`);
    else {
      bad++;
      for (const e of r.errors) console.error(`FAIL ${f}: ${e}`);
    }
  }
  process.exit(bad ? 1 : 0);
}
