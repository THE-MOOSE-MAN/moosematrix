// Writes public/search-index.json from src/content/catalog.json at build time (rollout §2, ia.md "Search index").
// Fails the build if the export guard finds a body field, a premium item with tags or a long summary, or a sample.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { buildIndex, MAX_GZ_BYTES } from "../src/lib/search-index.mjs";

const app = path.join(import.meta.dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(app, "src", "content", "catalog.json"), "utf8"));
const json = JSON.stringify(buildIndex(catalog));
const gz = zlib.gzipSync(json).length;
if (gz > MAX_GZ_BYTES) throw new Error(`search-index.json is ${gz} bytes gzipped (budget ${MAX_GZ_BYTES})`);
fs.writeFileSync(path.join(app, "public", "search-index.json"), json + "\n");
console.log(`search-index.json: ${catalog.items.length} items, ${json.length} bytes (${gz} gz)`);
