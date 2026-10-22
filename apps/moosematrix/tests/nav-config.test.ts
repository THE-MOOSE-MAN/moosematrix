// Labels and order of the shared header (Dustin, 22 Oct 2026). Run: npm test (node --test, built-in type stripping).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAIN_NAV, MORE_NAV, MORE_LABEL, navLabel, headerLabel } from "../src/components/nav-config.ts";

test("main links: exact labels in order, Shop last", () => {
  assert.deepEqual(MAIN_NAV.map((l) => l.label), ["Research & Development", "Moose Mumbles", "Moo$e Money", "Shop"]);
  assert.equal(MAIN_NAV.at(-1)!.label, "Shop");
});

test("main links keep their URLs (Research & Development is still /builds)", () => {
  assert.deepEqual(MAIN_NAV.map((l) => l.href), ["/builds", "https://mooseman.moosematrix.com/", "https://m2.moosematrix.com/", "https://merch.moosematrix.com/"]);
});

test("More holds About, Directory, Security, Contact", () => {
  assert.equal(MORE_LABEL, "More");
  assert.deepEqual(MORE_NAV.map((l) => [l.label, l.href]), [["About", "/about"], ["Directory", "/subsidiaries"], ["Security", "/security"], ["Contact", "/contact"]]);
});

test("old labels are gone and not abbreviated", () => {
  const all = [...MAIN_NAV, ...MORE_NAV].map((l) => l.label);
  for (const old of ["Builds", "Write-ups", "Money tools", "Store", "Mumbles", "R&D", "Home"]) assert.ok(!all.includes(old), old);
  assert.equal(navLabel("rnd"), "Research & Development");
  assert.throws(() => navLabel("nope"));
});

test("top menu shows R&D; the full name stays for cards, headings and the title (Dustin 22 Oct 7:31)", () => {
  assert.deepEqual(MAIN_NAV.map(headerLabel), ["R&D", "Moose Mumbles", "Moo$e Money", "Shop"]);
  assert.equal(MAIN_NAV[0].label, "Research & Development");
});
