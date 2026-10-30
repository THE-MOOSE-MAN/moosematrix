// Serves packages/tokens from disk on https://moosematrix.com/ and https://m2.moosematrix.com/ inside the browser
// (Playwright request routing; no network, no DNS, no hosts file). The pages get real https *.moosematrix.com origins,
// so the shared Secure Domain=.moosematrix.com theme cookie behaves as in production. Every other request is aborted.
import { readFile } from "node:fs/promises";
import { join, normalize, extname, resolve } from "node:path";
import { chromium } from "playwright-core";

export const ORIGINS = ["https://moosematrix.com", "https://m2.moosematrix.com"];
export const DEMO = "/demo/index.html";
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml" };

export async function launch() {
  return chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
}

export async function newContext(browser, root, options = {}) {
  const dir = resolve(root);
  const context = await browser.newContext(options);
  const blocked = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!ORIGINS.includes(url.origin)) {
      blocked.push(url.href);
      return route.abort();
    }
    const path = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
    const file = join(dir, path.endsWith("/") ? path + "index.html" : path);
    if (!file.startsWith(dir)) return route.fulfill({ status: 403, body: "" });
    try {
      const body = await readFile(file);
      return route.fulfill({ status: 200, headers: { "content-type": TYPES[extname(file)] || "application/octet-stream", "x-content-type-options": "nosniff" }, body });
    } catch {
      return route.fulfill({ status: 404, body: "" });
    }
  });
  context.blocked = blocked;
  return context;
}

export const lightCookie = () => ({ name: "mm-theme", value: "light", domain: ".moosematrix.com", path: "/", secure: true, sameSite: "Lax" });
