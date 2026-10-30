// Metadata extractors for allowlisted binaries. Each returns a list of Buffers to scan as text.
// Any malformed input throws; the caller reports "term-scan error in <path>" and fails closed.
import { inflateSync, brotliDecompressSync } from "node:zlib";

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function pngChunks(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) throw new Error("not a PNG");
  const out = [];
  let off = 8;
  let sawEnd = false;
  while (off < buf.length) {
    if (off + 12 > buf.length) throw new Error("truncated PNG chunk header");
    const len = buf.readUInt32BE(off);
    const type = buf.toString("latin1", off + 4, off + 8);
    const end = off + 12 + len;
    if (end > buf.length) throw new Error("truncated PNG chunk");
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "tEXt") out.push(Buffer.from(data));
    else if (type === "zTXt") {
      const z = data.indexOf(0);
      if (z < 0) throw new Error("bad zTXt");
      out.push(data.subarray(0, z), inflateSync(data.subarray(z + 2)));
    } else if (type === "iTXt") {
      const z = data.indexOf(0);
      if (z < 0 || z + 2 >= data.length) throw new Error("bad iTXt");
      const compressed = data[z + 1] === 1;
      let p = z + 3;
      const lang = data.indexOf(0, p);
      if (lang < 0) throw new Error("bad iTXt");
      const tk = data.indexOf(0, lang + 1);
      if (tk < 0) throw new Error("bad iTXt");
      const text = data.subarray(tk + 1);
      out.push(data.subarray(0, z), data.subarray(p, tk), compressed ? inflateSync(text) : Buffer.from(text));
    } else if (type === "eXIf") out.push(Buffer.from(data));
    off = end;
    if (type === "IEND") { sawEnd = true; break; }
  }
  if (!sawEnd) throw new Error("PNG without IEND");
  // anything appended after IEND is scanned too
  if (off < buf.length) out.push(buf.subarray(off));
  return out;
}

export function icoImages(buf) {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) throw new Error("not an ICO");
  const n = buf.readUInt16LE(4);
  if (n === 0 || 6 + 16 * n > buf.length) throw new Error("bad ICO directory");
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = 6 + 16 * i;
    const size = buf.readUInt32LE(e + 8);
    const at = buf.readUInt32LE(e + 12);
    if (at + size > buf.length || size < 8) throw new Error("ICO entry out of range");
    const img = buf.subarray(at, at + size);
    if (img.subarray(0, 8).equals(PNG_SIG)) out.push(...pngChunks(img));
  }
  return out;
}

function base128(buf, st) {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    if (st.p >= buf.length) throw new Error("truncated UIntBase128");
    const b = buf[st.p++];
    if (i === 0 && b === 0x80) throw new Error("bad UIntBase128");
    v = v * 128 + (b & 0x7f);
    if (!(b & 0x80)) return v;
  }
  throw new Error("bad UIntBase128");
}

export function woff2Data(buf) {
  if (buf.length < 48 || buf.toString("latin1", 0, 4) !== "wOF2") throw new Error("not a WOFF2");
  if (buf.readUInt32BE(8) !== buf.length) throw new Error("WOFF2 length mismatch");
  const numTables = buf.readUInt16BE(12);
  const compressed = buf.readUInt32BE(20);
  const metaOffset = buf.readUInt32BE(28), metaLength = buf.readUInt32BE(32);
  const privOffset = buf.readUInt32BE(40), privLength = buf.readUInt32BE(44);
  const flavor = buf.toString("latin1", 4, 8);
  const st = { p: 48 };
  for (let i = 0; i < numTables; i++) {
    if (st.p >= buf.length) throw new Error("truncated WOFF2 directory");
    const flags = buf[st.p++];
    const tagIdx = flags & 0x3f;
    if (tagIdx === 63) st.p += 4;
    base128(buf, st);
    const xform = (flags >> 6) & 3;
    const glyfLoca = tagIdx === 10 || tagIdx === 11;
    if ((glyfLoca && xform === 0) || (!glyfLoca && xform !== 0)) base128(buf, st);
  }
  if (flavor === "ttcf") throw new Error("WOFF2 collections are not supported");
  if (st.p + compressed > buf.length) throw new Error("WOFF2 data out of range");
  const out = [brotliDecompressSync(buf.subarray(st.p, st.p + compressed))];
  if (metaLength) {
    if (metaOffset + metaLength > buf.length) throw new Error("WOFF2 metadata out of range");
    out.push(brotliDecompressSync(buf.subarray(metaOffset, metaOffset + metaLength)));
  }
  if (privLength) {
    if (privOffset + privLength > buf.length) throw new Error("WOFF2 private data out of range");
    out.push(buf.subarray(privOffset, privOffset + privLength));
  }
  return out;
}

export function extract(kind, buf) {
  if (kind === "png") return pngChunks(buf);
  if (kind === "ico") return icoImages(buf);
  if (kind === "woff2") return woff2Data(buf);
  throw new Error(`no extractor ${kind}`);
}
