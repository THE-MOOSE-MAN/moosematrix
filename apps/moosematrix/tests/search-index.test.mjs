// Export guard for /search-index.json (rollout §2): no body fields, premium items stay thin, no samples.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { buildIndex, guard, MAX_GZ_BYTES } from "../src/lib/search-index.mjs";

const catalog = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "src", "content", "catalog.json"), "utf8"));
const free = { id: "a-page", title: "A", site: "moosematrix", type: "Page", url: "https://moosematrix.com/a", summary: "s", tags: ["x"], related: [], access: "free" };
const premium = { id: "p-item", title: "P", site: "moosematrix", type: "Research", url: "https://moosematrix.com/library/p", summary: "s", related: [], access: "premium" };

test("the checked-in catalog passes the guard and fits the size budget", () => {
  const idx = buildIndex(catalog);
  assert.equal(idx.version, 1);
  assert.equal(idx.site, "moosematrix");
  assert.ok(zlib.gzipSync(JSON.stringify(idx)).length <= MAX_GZ_BYTES);
  for (const it of idx.items) assert.ok(!("status" in it) || typeof it.status === "string");
});

const bad = (items, re) => { assert.ok(guard(items).length > 0); assert.throws(() => buildIndex({ items }), re); };

test("guard rejects body fields, premium tags, long premium summaries, samples, bad urls", () => {
  for (const k of ["body", "body_premium", "content", "html"]) bad([{ ...free, [k]: "x" }], new RegExp(k));
  bad([{ ...premium, tags: ["x"] }]);
  bad([{ ...premium, summary: "x".repeat(161) }]);
  assert.deepEqual(guard([{ ...premium, summary: "x".repeat(160) }]), []);
  bad([{ ...free, sample: true }]);
  bad([{ ...free, url: "http://moosematrix.com/a" }]);
  bad([{ ...free, url: "/a" }]);
  bad([free, { ...free }], /duplicate/i);
  bad([{ ...free, type: "Nope" }]);
  bad([{ ...free, tags: undefined }]);
});

test("L1: status must be one of the public statuses; anything else fails the build", () => {
  for (const status of ["published", "Live", "In development", "Planned"]) assert.deepEqual(guard([{ ...free, status }]), [], status);
  assert.deepEqual(guard([{ ...free }]), [], "no status is fine");
  for (const status of ["draft", "unlisted", "Published", "live", "", null, 1]) bad([{ ...free, status }], /status/);
  bad([{ ...premium, status: "draft" }], /status/);
});

