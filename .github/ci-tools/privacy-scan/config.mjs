// Fixed scanner config (card §F6-X / PR-1 "T1 whole-tree name scan", VB N1 + R2).
//
// Every scanned file is either decodable text or a binary whose extension is listed here.
// For each profile the expected COUNT per binary extension is fixed: the scan prints actual vs
// expected and fails on any difference, so adding or removing a tracked binary needs a reviewed
// change to this file. A binary whose extension is not listed fails the scan.
//
// Note: no CODEOWNERS protection is claimed for this file (CODEOWNERS enforcement is a separate owner OK).

export const BINARY_PROFILES = Object.freeze({
  // `git ls-files` of the whole repo
  tree: Object.freeze({ png: 6, woff2: 4, ico: 1 }),
  // `npm pack` of packages/tokens
  "tokens-tarball": Object.freeze({ woff2: 4 }),
  // build output or fixture directories with no binaries
  none: Object.freeze({}),
});

// How each allowlisted binary is handled. All three are also run through a metadata extractor;
// an extractor error fails closed ("term-scan error in <path>").
//   png   - tEXt / iTXt / zTXt / eXIf chunks
//   ico   - embedded PNG images (their text chunks); BMP entries carry no metadata
//   woff2 - the brotli font data stream (name table etc.) and the optional metadata block
export const EXTRACTORS = Object.freeze({ png: "png", ico: "ico", woff2: "woff2" });

// Compressed containers are decompressed and their content scanned (not counted as binaries).
export const CONTAINERS = Object.freeze({ gz: "gzip", br: "brotli" });
