// URL allowlist: https, no credentials, origin exactly one of the four.
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeUrl, checkItem, ORIGINS } from "../search-core.mjs";
import { item } from "./fixtures/corpus.mjs";

const BASE = "https://moosematrix.com";
const REJECT = [
  "javascript:alert(1)", "JaVaScRiPt:alert(1)", "\tjavascript:alert(1)", " javascript:alert(1)", "java\nscript:alert(1)",
  "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)", "blob:https://moosematrix.com/uuid",
  "//evil.com/x", "/\\evil.com/x", "\\\\evil.com/x", "https://moosematrix.com.evil.com/x", "https://evil.com/moosematrix.com",
  "https://user@moosematrix.com/x", "https://user:pass@moosematrix.com/x", "https://moosematrix.com./x",
  "https://mооsematrix.com/x", "https://xn--msematrix-o8ab.com/", "http://moosematrix.com/x", "https://moosematrix.com:8443/x",
  "https://www.moosematrix.com/x", "https://evil.moosematrix.com/x", "ftp://moosematrix.com/x", "", "https://" + "a".repeat(2050),
];
const ACCEPT = [
  ["/library/x/", "https://moosematrix.com/library/x/"],
  ["https://moosematrix.com/a?b=1#c", "https://moosematrix.com/a?b=1#c"],
  ["https://MOOSEMATRIX.com:443/a", "https://moosematrix.com/a"],
  ["https://mooseman.moosematrix.com/moose-mumbles/", "https://mooseman.moosematrix.com/moose-mumbles/"],
  ["https://m2.moosematrix.com/", "https://m2.moosematrix.com/"],
  ["https://merch.moosematrix.com/", "https://merch.moosematrix.com/"],
];

test("lookalike and non-https URLs are rejected", () => {
  for (const raw of REJECT) assert.equal(safeUrl(raw, BASE), null, JSON.stringify(raw.slice(0, 60)));
  assert.equal(safeUrl(null, BASE), null);
  assert.equal(safeUrl(42, BASE), null);
});

test("allowlisted forms are accepted and normalised", () => {
  for (const [raw, want] of ACCEPT) assert.equal(safeUrl(raw, BASE), want);
});

test("items with a bad URL are dropped; item URL must sit on the item's own site origin", () => {
  for (const raw of REJECT) assert.equal(checkItem(item({ url: raw }), "moosematrix"), "item-bad-url");
  assert.equal(checkItem(item({ url: "https://m2.moosematrix.com/x" }), "moosematrix"), "item-url-site-mismatch");
  const ok = checkItem(item({ site: "m2", section: "money", url: "/tools/x" }), "moosematrix");
  assert.equal(ok.url, ORIGINS.m2 + "/tools/x");
});
