// Tests for check-ips.mjs (run: node --test packages/tokens/scripts/check-ips.test.mjs).
// The positive samples are assembled at runtime, so this file never contains a literal the checker would flag,
// and every sample is made up (none is one of our real addresses or names).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scan, scanText } from "./check-ips.mjs";

const dot = (...p) => p.join(".");
const col = (...p) => p.join(":");
const kinds = (s) => scanText(s).map((h) => h.kind);

test("flags a public IPv4", () => assert.deepEqual(kinds(`host ${dot(8, 8, 4, 4)} x`), ["public-ipv4"]));
test("flags tailnet/CGNAT addresses (100.64/10), both ends", () => {
  assert.deepEqual(kinds(dot(100, 64, 0, 1)), ["tailnet-ipv4"]);
  assert.deepEqual(kinds(dot(100, 101, 102, 103)), ["tailnet-ipv4"]);
  assert.deepEqual(kinds(dot(100, 127, 255, 254)), ["tailnet-ipv4"]);
  assert.deepEqual(kinds(dot(100, 128, 0, 1)), ["public-ipv4"]);
});
test("flags the SSH port", () => {
  assert.deepEqual(kinds(`ssh -p ${33000 + 777} host`), ["ssh-port"]);
  assert.deepEqual(kinds(`port: ${33000 + 777}`), ["ssh-port"]);
  assert.deepEqual(kinds(`id 1${33000 + 777}9 and a${33000 + 777}b`), []);
});
test("flags Tailscale MagicDNS names", () => {
  assert.deepEqual(kinds(`ssh ${dot("box-1", "tail0000", "ts", "net")}`), ["ts.net-name"]);
  assert.deepEqual(kinds(`https://${dot("EXAMPLE", "TS", "NET")}/x`), ["ts.net-name"]);
  assert.deepEqual(kinds(dot("notts", "network")), []);
});
test("flags IPv6 literals", () => {
  assert.deepEqual(kinds(`addr ${col("2606", "4700", "", "1111")} end`), ["ipv6"]);
  assert.deepEqual(kinds(`[${col("fd7a", "115c", "a1e0", "", "1")}]:443`), ["ipv6"]);
  assert.deepEqual(kinds(`${col("2a01", "4f8", "c0c", "1", "0", "0", "0", "2")}.`), ["ipv6"]);
  assert.deepEqual(kinds(col("", "", "ffff", dot(8, 8, 4, 4))), ["public-ipv4", "ipv6"]);
});
test("allows loopback, unspecified, documentation and private ranges", () => {
  const ok = [
    col("", "", "1"), "::", col("2001", "db8", "", "1"), col("2001", "0db8", "85a3", "", "8a2e", "370", "7334"),
    col("3fff", "", "1"), dot(10, 0, 0, 1), dot(192, 168, 1, 1), dot(172, 16, 0, 1), dot(127, 0, 0, 1),
    dot(192, 0, 2, 10), dot(198, 51, 100, 7), dot(203, 0, 113, 9),
  ];
  for (const s of ok) assert.deepEqual(kinds(`x ${s} y`), [], s);
});
test("no false positives on CSS, code, times or versions", () => {
  const text = [
    "a::before, a::after { content: ''; } ::selection { color: red }",
    ":root:not([data-theme]) .x::placeholder {}",
    "std::max(a, b); Foo::Bar::baz; mod::fn()",
    "at 12:30:45 on 2026-10-30, ratio 16:9, port 3000, :443",
    "version 1.2.3 and 10.1.0-beta, sha 5ca0837c, abc:def:ghi",
    "font-feature-settings: 'tnum' 1; grid-area: 1 / 2 / 3 / 4;",
  ].join("\n");
  assert.deepEqual(scanText(text), []);
});
test("the published package itself is clean", () => {
  const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
  assert.deepEqual(scan([pkg]), []);
});
test("scan reports file, line and kind, never the value", () => {
  const d = mkdtempSync(join(tmpdir(), "ipchk-"));
  try {
    const secret = dot(100, 90, 1, 2);
    writeFileSync(join(d, "a.txt"), `ok\nhost ${secret}\n`);
    const hits = scan([d]);
    assert.equal(hits.length, 1);
    assert.match(hits[0], /a\.txt:2 \(tailnet-ipv4\)$/);
    assert.ok(!hits[0].includes(secret));
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});
