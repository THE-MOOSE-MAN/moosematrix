// I1: OPTIONS on /search-index.json and the static scripts returns 204 with the same CORS rules as GET, not a 500.
// Starts the production server from the build (run after `npm run build`).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";

const port = 30000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
let srv;
before(async () => {
  srv = spawn(process.execPath, ["server.js"], { cwd: path.join(import.meta.dirname, ".."), env: { ...process.env, NODE_ENV: "production", PORT: String(port) }, stdio: "ignore" });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + "/healthz")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});
after(() => srv && srv.kill());

const MOOSEMAN = "https://mooseman.moosematrix.com";
const opt = (p, origin = MOOSEMAN) => fetch(base + p, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "GET" } });

test("OPTIONS /search-index.json: 204, fixed mooseman origin, GET/HEAD only, no credentials", async () => {
  for (const origin of [MOOSEMAN, "https://evil.example"]) {
    const r = await opt("/search-index.json", origin);
    assert.equal(r.status, 204);
    assert.equal(r.headers.get("access-control-allow-origin"), MOOSEMAN, "never echoes the request origin");
    assert.equal(r.headers.get("access-control-allow-methods"), "GET, HEAD");
    assert.equal(r.headers.get("access-control-allow-credentials"), null);
    assert.equal(r.headers.get("vary"), "Origin");
  }
  const g = await fetch(base + "/search-index.json");
  assert.equal(g.status, 200);
  assert.equal(g.headers.get("access-control-allow-origin"), MOOSEMAN);
});

test("OPTIONS /mm/nav.js and /js/mm-list.js: 204, no CORS grant (same as their GET)", async () => {
  for (const p of ["/mm/nav.js", "/js/mm-list.js"]) {
    const r = await opt(p);
    assert.equal(r.status, 204, p);
    assert.equal(r.headers.get("access-control-allow-origin"), null, p);
    assert.equal((await fetch(base + p)).headers.get("access-control-allow-origin"), null, p);
  }
});
