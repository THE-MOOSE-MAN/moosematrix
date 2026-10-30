// IP-leak check: fails if any text file under the given paths contains something that could locate our servers:
//   - a public IPv4 address, or a CGNAT/tailnet address (the 100.64/10 block);
//   - an IPv6 literal (except ::, ::1 and the documentation ranges 2001:db8::/32 and 3fff::/20);
//   - our SSH port as a standalone number (see PORT);
//   - a Tailscale MagicDNS name (anything under the ts\.net domain).
// Allowed IPv4: private (10/8, 172.16/12, 192.168/16), loopback (127/8), 0.0.0.0/8, link-local (169.254/16)
// and the documentation ranges (192.0.2/24, 198.51.100/24, 203.0.113/24).
// Matches are reported by file, line and kind only; the value itself is never printed.
// Usage: node check-ips.mjs <file-or-dir> [...]
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { isIPv6 } from "node:net";

const BINARY = new Set([".woff2", ".woff", ".ttf", ".otf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".avif", ".zip", ".gz", ".tgz"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".turbo", "dist", ".next"]);
const IPV4 = /(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])/g;
// Candidate IPv6 runs (hex groups and colons, optional trailing dotted IPv4); confirmed with net.isIPv6.
// The boundaries keep CSS/C++ forms like `a::before` or `std::max` from matching.
const IPV6 = /(?<![0-9A-Za-z_:.-])((?:[0-9A-Fa-f]{0,4}:){2,7}(?:[0-9A-Fa-f]{1,4}|\d{1,3}(?:\.\d{1,3}){3})?)(?![0-9A-Za-z_:-]|\.\d)/g;
// The [7] class keeps this line from matching itself; the pattern is the plain five-digit port.
const PORT = /(?<![0-9A-Za-z])3377[7](?![0-9A-Za-z])/g;
const TSNET = /(?<![a-z0-9-])(?:[a-z0-9-]+\.)*ts\.net(?![a-z0-9-])/gi;

export function isAllowed(a, b, c) {
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

// Expand an IPv6 literal to its first two 16-bit groups (enough for the allow rules).
function v6Head(addr) {
  const [head, tail = ""] = addr.split("::");
  const h = head ? head.split(":") : [];
  if (addr.includes("::") && h.length < 2) {
    const t = tail ? tail.split(":") : [];
    const total = 8 - (t.some((g) => g.includes(".")) ? t.length + 1 : t.length);
    while (h.length < Math.min(2, total)) h.push("0");
  }
  return h.slice(0, 2).map((g) => parseInt(g || "0", 16));
}

export function isAllowedV6(addr) {
  const a = addr.toLowerCase();
  if (a === "::" || a === "::1") return true;
  const [g0, g1] = v6Head(a);
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // 2001:db8::/32 documentation
  if (g0 === 0x3fff && g1 <= 0x0fff) return true;   // 3fff::/20 documentation (RFC 9637)
  return false;
}

export function scanText(text) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    const ln = i + 1;
    for (const m of line.matchAll(IPV4)) {
      const o = m.slice(1, 5).map(Number);
      if (o.some((n) => n > 255)) continue;
      if (!isAllowed(o[0], o[1], o[2])) hits.push({ line: ln, kind: o[0] === 100 && o[1] >= 64 && o[1] <= 127 ? "tailnet-ipv4" : "public-ipv4" });
    }
    for (const m of line.matchAll(IPV6)) {
      if (isIPv6(m[1]) && !isAllowedV6(m[1])) hits.push({ line: ln, kind: "ipv6" });
    }
    for (const _ of line.matchAll(PORT)) hits.push({ line: ln, kind: "ssh-port" });
    for (const _ of line.matchAll(TSNET)) hits.push({ line: ln, kind: "ts.net-name" });
  });
  return hits;
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
      for (const h of scanText(readFileSync(file, "utf8"))) hits.push(`${file}:${h.line} (${h.kind})`);
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
    console.error(`IP check: ${hits.length} address/host/port match(es) found (values not shown):`);
    for (const h of hits) console.error(`  ${h}`);
    process.exit(1);
  }
  console.log(`IP check: no public/tailnet IPs, IPv6 literals, SSH port or MagicDNS names in ${paths.length} path(s).`);
}
