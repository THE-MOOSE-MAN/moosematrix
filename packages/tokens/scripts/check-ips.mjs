// IP-leak check: fails if any text file under the given paths contains a public IPv4 address.
// Allowed: private (10/8, 172.16/12, 192.168/16), CGNAT/tailnet (100.64/10), loopback (127/8),
// 0.0.0.0, link-local (169.254/16) and the documentation ranges (192.0.2/24, 198.51.100/24, 203.0.113/24).
// Matches are reported by file and line only; the address itself is never printed.
// Usage: node check-ips.mjs <file-or-dir> [...]
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const BINARY = new Set([".woff2", ".woff", ".ttf", ".otf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".avif", ".zip", ".gz", ".tgz"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".turbo", "dist", ".next"]);
const IPV4 = /(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])/g;

export function isAllowed(a, b, c) {
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function* walk(p) {
  if (!existsSync(p)) return;
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const name of readdirSync(p)) if (!SKIP_DIRS.has(name)) yield* walk(join(p, name));
  } else if (st.isFile() && !BINARY.has(extname(p).toLowerCase())) {
    yield p;
  }
}

export function scan(paths) {
  const hits = [];
  for (const root of paths) {
    for (const file of walk(root)) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const m of line.matchAll(IPV4)) {
          const o = m.slice(1, 5).map(Number);
          if (o.some((n) => n > 255)) continue;
          if (!isAllowed(o[0], o[1], o[2])) hits.push(`${file}:${i + 1}`);
        }
      });
    }
  }
  return hits;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error("usage: check-ips.mjs <file-or-dir> [...]");
    process.exit(2);
  }
  const hits = scan(paths);
  if (hits.length) {
    console.error(`IP check: ${hits.length} public IPv4 address(es) found (values not shown):`);
    for (const h of hits) console.error(`  ${h}`);
    process.exit(1);
  }
  console.log(`IP check: no public IPv4 addresses in ${paths.length} path(s).`);
}
