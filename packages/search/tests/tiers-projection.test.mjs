// Tier allowlist + published-only / premium projection, with per-field
// canaries that must never reach any index, the HTML, or the package output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, projectRecord, isPublished, belongsTo } from "../scripts/projection.mjs";
import { parseIndex, checkItem } from "../search-core.mjs";
import { canary, rec, item, envelope, NOW } from "./fixtures/corpus.mjs";

const SITES = ["moosematrix", "mooseman", "m2", "merch"];
const BAD_TIERS = ["private", "notes", "", "Public ", "PUBLIC", "Premium", ["public"], null, undefined, 1, { tier: "public" }, "free"];

test("only exact 'public' and 'premium' are indexed; everything else is dropped (canaries absent)", () => {
  const records = [];
  const canaries = [];
  BAD_TIERS.forEach((t, i) => {
    const c = canary("tier" + i);
    canaries.push(c);
    const r = rec({ id: "bad" + i, title: c, summary: c, tags: [c] });
    if (t === undefined) delete r.tier; else r.tier = t;
    records.push(r);
  });
  records.push(rec({ id: "pub", tier: "public" }), rec({ id: "prem", tier: "premium", teaser: "Teaser." }));
  for (const site of SITES.filter((s) => s !== "mooseman")) {
    const env = buildIndex(records, { site, now: NOW, generated: "2026-10-30T12:00:00Z" });
    const out = JSON.stringify(env);
    for (const c of canaries) assert.ok(!out.includes(c), "tier canary leaked");
    assert.deepEqual(env.items.map((i) => i.id), ["pub", "prem"]);
  }
});

test("client side: unknown access values are dropped by the validator", () => {
  for (const t of BAD_TIERS) {
    const it = item({ id: "x" });
    if (t === undefined) delete it.access; else it.access = t;
    assert.equal(typeof checkItem(it, "moosematrix"), "string");
  }
});

test("premium carries title + teaser only; body/summary/tags/excerpt canaries absent", () => {
  const c = { body: canary("body"), summary: canary("summary"), tags: canary("tags"), excerpt: canary("excerpt") };
  const r = rec({ id: "p", tier: "premium", teaser: "Editor teaser.", body: c.body, summary: c.summary, tags: [c.tags], excerpt: c.excerpt });
  const env = buildIndex([r], { site: "moosematrix", now: NOW });
  const out = JSON.stringify(env);
  for (const v of Object.values(c)) assert.ok(!out.includes(v));
  assert.deepEqual(Object.keys(env.items[0]).sort(), ["access", "date", "id", "section", "site", "summary", "title", "type", "url"]);
  assert.equal(env.items[0].summary, "Editor teaser.");
  const noTeaser = buildIndex([rec({ id: "q", tier: "premium" })], { site: "moosematrix", now: NOW });
  assert.ok(!("summary" in noTeaser.items[0]));
});

test("premium teaser > 160 fails the build; premium with tags fails the validator", () => {
  assert.throws(() => buildIndex([rec({ tier: "premium", teaser: "x".repeat(161) })], { site: "moosematrix", now: NOW }), /teaser over 160/);
  assert.equal(checkItem(item({ access: "premium", tags: ["a"] }), "moosematrix"), "premium-has-tags");
  const p = item({ access: "premium", summary: "x".repeat(161) });
  delete p.tags;
  assert.equal(checkItem(p, "moosematrix"), "premium-summary-too-long");
});

test("body never indexed for public items either", () => {
  const b = canary("pubbody");
  const env = buildIndex([rec({ body: b, excerpt: b })], { site: "moosematrix", now: NOW });
  assert.ok(!JSON.stringify(env).includes(b));
});

test("published-only: draft, scheduled, deleted, unlisted, noindex, bad dates excluded (ids absent)", () => {
  const cases = {
    draft: { status: "draft" },
    review: { status: "Published" },
    scheduled: { published_at: "2026-11-01T00:00:00Z" },
    nodate: { published_at: null },
    baddate: { published_at: "soon" },
    deleted: { deleted_at: "2026-10-02T00:00:00Z" },
    unlisted: { unlisted: true },
    unlistedstr: { unlisted: "false" },
    noindex: { noindex: true },
  };
  const records = Object.entries(cases).map(([id, over]) => rec({ id: "x-" + id, title: canary(id), ...over }));
  records.push(rec({ id: "live" }));
  const env = buildIndex(records, { site: "moosematrix", now: NOW });
  assert.deepEqual(env.items.map((i) => i.id), ["live"]);
  for (const id of Object.keys(cases)) assert.ok(!JSON.stringify(env).includes("x-" + id));
  assert.equal(isPublished(rec({}), NOW), true);
  assert.equal(isPublished(null, NOW), false);
});

test("no mooseman items in non-mooseman indexes; mooseman index holds only mooseman items", () => {
  const mm = canary("mumble");
  const records = [
    rec({ id: "lib" }),
    rec({ id: "mum", site: "mooseman", section: "mumbles", url: "https://mooseman.moosematrix.com/moose-mumbles/x/", title: mm }),
  ];
  for (const site of ["moosematrix", "m2", "merch"]) {
    const out = JSON.stringify(buildIndex(records, { site, now: NOW }));
    assert.ok(!out.includes(mm) && !out.includes("mooseman.moosematrix.com"));
  }
  const own = buildIndex(records, { site: "mooseman", now: NOW });
  assert.deepEqual(own.items.map((i) => i.id), ["mum"]);
  assert.equal(belongsTo("mooseman", "moosematrix"), false);
  assert.equal(belongsTo("evil", "moosematrix"), false);
  // client side too
  const r = parseIndex(envelope([item({ id: "m", site: "mooseman", section: "mumbles", url: "https://mooseman.moosematrix.com/x" })]), "moosematrix");
  assert.equal(r.items.length, 0);
  assert.equal(r.dropped[0].reason, "mooseman-item-off-mooseman");
});

test("buildIndex rejects invalid projections (strict validator) and bad input", () => {
  assert.throws(() => buildIndex([rec({ url: "javascript:alert(1)" })], { site: "moosematrix", now: NOW }), /fails validation/);
  assert.throws(() => buildIndex([], { site: "evil" }), /unknown site/);
  assert.throws(() => buildIndex(null, { site: "moosematrix" }), /array/);
  assert.equal(projectRecord(rec({ tier: "private" }), "moosematrix", NOW), null);
});
