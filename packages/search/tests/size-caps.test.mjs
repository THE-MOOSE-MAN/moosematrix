// Size caps: Content-Length precheck, 1 MB streaming abort, oversized and
// deeply nested bodies, all time-boxed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readCapped, parseIndexText, CAPS } from "../search-core.mjs";

function streamResponse(totalBytes, { contentLength = null, chunk = 64 * 1024 } = {}) {
  let sent = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(c) {
      if (sent >= totalBytes) return c.close();
      const n = Math.min(chunk, totalBytes - sent);
      sent += n;
      c.enqueue(new Uint8Array(n).fill(0x20));
    },
    cancel() { cancelled = true; },
  });
  const headers = new Headers();
  if (contentLength !== null) headers.set("content-length", String(contentLength));
  return { res: new Response(body, { headers }), state: () => ({ sent, cancelled }) };
}

test("Content-Length over 1 MB is rejected before reading", async () => {
  const { res } = streamResponse(10, { contentLength: CAPS.responseBytes + 1 });
  await assert.rejects(readCapped(res), /too-large/);
  assert.equal(res.bodyUsed, false, "body never read");
});

test("lying/absent Content-Length: stream aborted just past 1 MB", async () => {
  for (const cl of [null, 100]) {
    const { res, state } = streamResponse(2 * 1024 * 1024, { contentLength: cl });
    await assert.rejects(readCapped(res), /too-large/);
    assert.ok(state().cancelled, "stream cancelled");
    assert.ok(state().sent <= CAPS.responseBytes + 128 * 1024, `read ${state().sent} B`);
  }
});

test("50 MB body: aborted within the cap and quickly", async () => {
  const t0 = performance.now();
  const { res, state } = streamResponse(50 * 1024 * 1024);
  await assert.rejects(readCapped(res), /too-large/);
  assert.ok(state().sent < 2 * 1024 * 1024);
  assert.ok(performance.now() - t0 < 2000);
});

test("bad Content-Length values fail closed; exactly 1 MB is allowed", async () => {
  for (const cl of ["-1", "abc", "1e9"]) await assert.rejects(readCapped(streamResponse(1, { contentLength: cl }).res), /too-large/);
  const ok = await readCapped(streamResponse(CAPS.responseBytes, { contentLength: CAPS.responseBytes }).res);
  assert.equal(ok.length, CAPS.responseBytes);
});

test("invalid UTF-8 is rejected", async () => {
  const res = new Response(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]));
  await assert.rejects(readCapped(res));
});

test("deeply nested JSON (within 1 MB) is rejected without a crash, time-boxed", () => {
  const depth = 400_000; // 800 KB of brackets
  const t0 = performance.now();
  for (const text of ["[".repeat(depth) + "]".repeat(depth), '{"a":'.repeat(150_000) + "1" + "}".repeat(150_000)]) {
    const r = parseIndexText(text, "moosematrix");
    assert.equal(r.ok, false);
  }
  assert.ok(performance.now() - t0 < 2000);
});

test("deep nesting inside an item field is dropped", () => {
  const deep = "[".repeat(5000) + "]".repeat(5000);
  const text = `{"version":1,"site":"moosematrix","generated":"2026-10-30T12:00:00Z","items":[{"id":"d","title":"D","site":"moosematrix","section":"library","type":"note","url":"/d","access":"public","tags":${deep}}]}`;
  const r = parseIndexText(text, "moosematrix");
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 0);
});
