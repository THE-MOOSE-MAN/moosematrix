// Index contract + hostile index corpus + prototype pollution.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseIndex, parseIndexText, checkItem, CAPS, SCOPES, SITES, SECTIONS, TIERS, MUMBLES_LINK_OUT, prepare, search, pieces,
} from "../search-core.mjs";
import { envelope, item } from "./fixtures/corpus.mjs";

const schema = JSON.parse(readFileSync(new URL("../index.schema.json", import.meta.url), "utf8"));
const scopes = JSON.parse(readFileSync(new URL("../scopes.json", import.meta.url), "utf8"));

test("schema file and core constants agree (additionalProperties:false at every level, caps, enums)", () => {
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.$defs.item.additionalProperties, false);
  assert.deepEqual(schema.required, ["version", "site", "generated", "items"]);
  assert.equal(schema.properties.version.const, 1);
  assert.deepEqual(schema.properties.site.enum, SITES);
  assert.equal(schema.properties.items.maxItems, CAPS.items);
  const p = schema.$defs.item.properties;
  assert.deepEqual(Object.keys(p), ["id", "title", "site", "section", "type", "url", "summary", "tags", "date", "access"]);
  assert.equal(p.title.maxLength, CAPS.title);
  assert.equal(p.summary.maxLength, CAPS.summary);
  assert.equal(p.url.maxLength, CAPS.url);
  assert.equal(p.tags.maxItems, CAPS.tags);
  assert.equal(schema.$defs.tag.maxLength, CAPS.tag);
  assert.deepEqual(p.section.enum, SECTIONS);
  assert.deepEqual(p.access.enum, TIERS);
  assert.equal(schema.$defs.item.then.properties.summary.maxLength, CAPS.summaryPremium);
  assert.ok(!("body" in p) && !("excerpt" in p));
});

test("scopes.json and core SCOPES agree; chip order is All, Library, Moose Mumbles, Reading Room, CTF, Moo$e Money", () => {
  assert.deepEqual(scopes.scopes.map((s) => s.label), ["All", "Library", "Moose Mumbles", "Reading Room", "CTF", "Moo$e Money"]);
  assert.deepEqual(JSON.parse(JSON.stringify(SCOPES)), scopes.scopes);
  assert.equal(scopes.mumblesLinkOut, MUMBLES_LINK_OUT);
  assert.deepEqual(SCOPES.find((s) => s.id === "library").sections, ["library", "projects"]); // Projects sit under Library
});

test("valid index parses; items are frozen null-prototype records", () => {
  const r = parseIndex(envelope([item({})]), "moosematrix");
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 1);
  assert.equal(Object.getPrototypeOf(r.items[0]), null);
  assert.ok(Object.isFrozen(r.items[0]));
});

test("envelope: wrong version, wrong site, unknown key, missing key, non-JSON → unavailable", () => {
  for (const [env, reason] of [
    [{ ...envelope([]), version: 2 }, "wrong-version"],
    [{ ...envelope([]), version: "1" }, "wrong-version"],
    [envelope([], "m2"), "wrong-site"],
    [{ ...envelope([]), extra: 1 }, "envelope-unknown-key"],
    [{ version: 1, site: "moosematrix", items: [] }, "envelope-missing-generated"],
    [[], "envelope-not-object"],
    [null, "envelope-not-object"],
  ]) {
    const r = parseIndex(env, "moosematrix");
    assert.equal(r.ok, false);
    assert.equal(r.reason, reason);
  }
  assert.equal(parseIndexText("<html>oops</html>", "moosematrix").reason, "not-json");
  assert.equal(parseIndexText("", "moosematrix").reason, "not-json");
});

test("caps: > 5,000 items rejected; over-cap fields dropped", () => {
  const many = Array.from({ length: CAPS.items + 1 }, (_, i) => item({ id: "i" + i, url: "/x" + i }));
  assert.equal(parseIndex(envelope(many), "moosematrix").reason, "too-many-items");
  const bad = [
    item({ id: "t", title: "x".repeat(201) }),
    item({ id: "s", summary: "x".repeat(301) }),
    item({ id: "g", tags: Array.from({ length: 21 }, (_, i) => "t" + i) }),
    item({ id: "h", tags: ["x".repeat(41)] }),
    item({ id: "u", url: "https://moosematrix.com/" + "x".repeat(2048) }),
    item({ id: "b", body: "never" }),
    item({ id: "e", excerpt: "never" }),
    item({ id: "n", title: "   " }),
    item({ id: "c", title: "line\nbreak" }),
    item({ id: "BAD ID" }),
    item({ id: "sec", section: "admin" }),
    item({ id: "d", date: "yesterday" }),
  ];
  const r = parseIndex(envelope([...bad, item({ id: "ok" })]), "moosematrix");
  assert.equal(r.ok, true);
  assert.deepEqual(r.items.map((i) => i.id), ["ok"]);
  assert.equal(r.dropped.length, bad.length);
  assert.equal(parseIndex(envelope([...bad]), "moosematrix", { strict: true }).ok, false);
});

test("hostile HTML in title/summary stays inert text (no HTML is ever produced)", () => {
  const hostile = [
    '<script>alert(1)</script>',
    '<img src=x onerror="alert(1)">',
    '"><svg/onload=alert(1)>',
    '</mark><script>alert(1)</script>',
  ];
  const r = parseIndex(envelope(hostile.map((h, i) => item({ id: "h" + i, title: h + " alert", summary: h }))), "moosematrix");
  assert.equal(r.items.length, hostile.length); // valid strings: kept, rendered via textContent only
  const res = search(prepare(r.items), "alert", "all");
  for (const x of res.results) {
    const joined = pieces(x.item.title, x.titleMarks).map((p) => p.text).join("");
    assert.equal(joined, x.item.title); // pieces are plain text slices; the DOM layer uses textContent
  }
});

test("duplicate ids: only the first is kept", () => {
  const r = parseIndex(envelope([item({ id: "a" }), item({ id: "a", title: "two" })]), "moosematrix");
  assert.equal(r.items.length, 1);
  assert.equal(r.dropped[0].reason, "item-duplicate-id");
});

test("prototype pollution: __proto__ / constructor.prototype in envelope, items and tags are rejected; Object.prototype untouched", () => {
  const texts = [
    '{"version":1,"site":"moosematrix","generated":"2026-10-30T12:00:00Z","items":[],"__proto__":{"polluted":1}}',
    '{"version":1,"site":"moosematrix","generated":"2026-10-30T12:00:00Z","items":[],"constructor":{"prototype":{"polluted":1}}}',
  ];
  for (const t of texts) assert.equal(parseIndexText(t, "moosematrix").ok, false);
  const base = '{"id":"p","title":"P","site":"moosematrix","section":"library","type":"note","url":"/p","access":"public"';
  const itemsText = [
    base + ',"__proto__":{"polluted":1}}',
    base + ',"constructor":{"prototype":{"polluted":1}}}',
    base + ',"tags":[{"__proto__":{"polluted":1}}]}',
    base + ',"tags":{"__proto__":{"polluted":1}}}',
    base + ',"tags":["ok",{"constructor":{"prototype":{"polluted":1}}}]}',
  ];
  for (const it of itemsText) {
    const r = parseIndexText(`{"version":1,"site":"moosematrix","generated":"2026-10-30T12:00:00Z","items":[${it}]}`, "moosematrix");
    assert.equal(r.ok, true);
    assert.equal(r.items.length, 0, "polluting item must be dropped");
  }
  assert.equal(({}).polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
  // an object with a non-plain prototype is not accepted either
  assert.equal(checkItem(Object.create({ access: "public" }), "moosematrix"), "item-not-object");
});
