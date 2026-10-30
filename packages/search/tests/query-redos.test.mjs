// Query handling: 128-char / 8-term caps, literal indexOf matching only,
// ReDoS time budget (< 50 ms per keystroke search over 5,000 items).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIndex, prepare, search, parseQuery, pieces, statusText, CAPS, fold } from "../search-core.mjs";
import { bigIndex, envelope, item } from "./fixtures/corpus.mjs";

const entries = prepare(parseIndex(bigIndex("moosematrix", 5000), "moosematrix").items);

test("query capped at 128 chars and 8 unique terms", () => {
  assert.equal(parseQuery("x".repeat(10_000))[0].length, CAPS.query);
  assert.equal(parseQuery("a b c d e f g h i j k l").length, CAPS.terms);
  assert.deepEqual(parseQuery("Foo foo FOO"), ["foo"]);
  assert.deepEqual(parseQuery("   "), []);
});

test("regex metacharacters are matched literally, never compiled", () => {
  const e = prepare(parseIndex(envelope([item({ id: "r", title: "a+b (c) [d] .* $ ^ | \\ ?" })]), "moosematrix").items);
  assert.equal(search(e, "(c)", "all").total, 1);
  assert.equal(search(e, ".*", "all").total, 1);
  assert.equal(search(e, "a.b", "all").total, 0);
  assert.equal(search(e, "(a+)+$", "all").total, 0);
});

test("NFKC + case-insensitive matching with correct <mark> ranges", () => {
  const e = prepare(parseIndex(envelope([item({ id: "n", title: "Ｒｅｖｅｒｓｅ Ëngineering ﬁle" })]), "moosematrix").items);
  const r = search(e, "reverse ëngineering file", "all");
  assert.equal(r.total, 1);
  const marks = pieces(r.results[0].item.title, r.results[0].titleMarks).filter((p) => p.mark).map((p) => p.text);
  assert.deepEqual(marks, ["Ｒｅｖｅｒｓｅ", "Ëngineering", "ﬁle"]);
  assert.equal(fold("ABC").text, "abc");
});

for (const [name, q] of [
  ["10k-char query", "q".repeat(10_000)],
  ["'a'*5e4 + '!'", "a".repeat(50_000) + "!"],
  ["(a+)+$", "(a+)+$"],
  ["8 common terms", "e i a o t r s n"],
  ["common single letter", "e"],
]) {
  test(`time budget: ${name} over 5,000 items < 50 ms`, () => {
    search(entries, q, "all"); // warm
    const runs = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      search(entries, q, "all");
      runs.push(performance.now() - t0);
    }
    runs.sort((a, b) => a - b);
    assert.ok(runs[2] < 50, `median ${runs[2].toFixed(1)} ms`);
  });
}

test("results capped at 50 with an honest status line", () => {
  const r = search(entries, "title", "all");
  assert.equal(r.total, 5000);
  assert.equal(r.results.length, CAPS.results);
  assert.equal(statusText(r.total, "library"), "5000 results in Library (showing first 50)");
  assert.equal(statusText(12, "library"), "12 results in Library");
  assert.equal(statusText(1, "all"), "1 result in All");
  assert.equal(statusText(0, "ctf"), "No results in CTF");
});

test("scopes filter by section (Library includes Projects)", () => {
  const e = prepare(parseIndex(envelope([
    item({ id: "l", title: "kernel lib", section: "library" }),
    item({ id: "p", title: "kernel proj", section: "projects", url: "/projects/p/" }),
    item({ id: "c", title: "kernel ctf", section: "ctf", url: "/ctf/c/" }),
  ]), "moosematrix").items);
  assert.deepEqual(search(e, "kernel", "library").results.map((r) => r.item.id), ["l", "p"]);
  assert.deepEqual(search(e, "kernel", "ctf").results.map((r) => r.item.id), ["c"]);
  assert.equal(search(e, "kernel", "all").total, 3);
});
