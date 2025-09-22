// apps/moosematrix/server.js

const express = require("express");
const next = require("next");

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: "." });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

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
  // 3. Default Next.js handler
  // ----------------------------
  server.all("*", (req, res) => handle(req, res));

  server.listen(port, () => {
    console.log(`🚀 MooseMatrix running on http://localhost:${port}`);
  });
});
