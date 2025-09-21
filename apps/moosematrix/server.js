// apps/moosematrix/server.js

const express = require("express");
const next = require("next");

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: "." });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Default handler — forward all routes (pages + API) to Next.js
  server.all("*", (req, res) => handle(req, res));

  server.listen(port, () => {
    console.log(`🚀 MooseMatrix running on http://localhost:${port}`);
  });
});

