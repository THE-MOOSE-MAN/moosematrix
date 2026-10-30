// apps/moosematrix/server.js

const express = require("express");
const next = require("next");
const path = require("path");

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// ----------------------------
// Content-Security-Policy (22 Oct 2026): generated at build time by scripts/csp-hashes.mjs from the prerendered
// pages, so script-src lists the sha256 of each inline script Next emits instead of 'unsafe-inline'.
// Production only (next dev injects its own inline scripts). nginx on moose-web still adds its older baseline
// policy; browsers enforce both, so this stricter one is what applies.
// ----------------------------
let csp = null;
if (!dev) {
  const fs = require("fs");
  const file = path.join(__dirname, ".next", "csp.json");
  if (!fs.existsSync(file)) {
    console.error("csp: .next/csp.json missing; run `npm run build` (next build && node scripts/csp-hashes.mjs)");
    process.exit(1);
  }
  csp = JSON.parse(fs.readFileSync(file, "utf8")).policy;
}

app.prepare().then(() => {
  const server = express();
  if (csp) {
    const header = process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
    server.use((req, res, nextMw) => { res.setHeader(header, csp); nextMw(); });
  }

  // ----------------------------
  // 1. Lightweight container health check (fast, no Next.js)
  // ----------------------------
  server.get("/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // ----------------------------
  // 2. Application health check (delegates to Next.js route)
  //    Will hit src/app/api/healthz/route.ts if you define it
  // ----------------------------
  server.get("/api/healthz", (req, res) => {
    req.url = "/api/healthz";
    handle(req, res);
  });

  // ----------------------------
  // 3. /search-index.json (rollout §2): The Moose Man's search overlay is its one foreign reader, so the CORS origin is a
  //    fixed value, never an echo, and there is no Allow-Credentials. Plain GET, so no preflight.
  // ----------------------------
  const indexCors = (res) => {
    res.setHeader("Access-Control-Allow-Origin", "https://mooseman.moosematrix.com");
    res.setHeader("Vary", "Origin");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
  };
  server.get("/search-index.json", (req, res, nextMw) => {
    indexCors(res);
    res.setHeader("Content-Type", "application/json");
    nextMw();
  });
  // OPTIONS on the index and the static scripts: 204 with the same CORS rules as GET (the index allows the mooseman
  // origin for GET/HEAD only, no credentials; /mm/* and /js/* grant no CORS). Next would answer these with a 500.
  server.options(["/search-index.json", "/mm/*", "/js/*"], (req, res) => {
    if (req.path === "/search-index.json") {
      indexCors(res);
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD");
      res.setHeader("Access-Control-Max-Age", "600");
    }
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    res.status(204).end();
  });

  // ----------------------------
  // 4. Default Next.js handler
  // ----------------------------
  server.all("*", (req, res) => handle(req, res));

  server.listen(port, () => {
    console.log(`🚀 MooseMatrix running on http://localhost:${port}`);
  });
});
