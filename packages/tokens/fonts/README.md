# Fonts

Four self-hosted woff2 files, all under the SIL Open Font License 1.1. They are served from the same origin as the page (CSP `font-src 'self'`); no font CDN is used. `SHA256SUMS` covers the fonts and both licence files. Check it with:

```sh
cd fonts && sha256sum -c SHA256SUMS
```

| File | Family, weight | Licence | Upstream |
|---|---|---|---|
| `BarlowCondensed-ExtraBold-Latin1.woff2` (17,204 B) | Barlow Condensed 800 | `OFL-Barlow.txt` (no Reserved Font Name) | jpt/barlow tag 1.422 |
| `IBMPlexSans-Regular-Latin1.woff2` (20,984 B) | IBM Plex Sans 400 | `OFL-IBM-Plex.txt` (Reserved Font Name "Plex") | IBM/plex release `@ibm/plex-sans@1.1.0` |
| `IBMPlexSans-Bold-Latin1.woff2` (21,256 B) | IBM Plex Sans 700 | `OFL-IBM-Plex.txt` | IBM/plex release `@ibm/plex-sans@1.1.0` |
| `IBMPlexMono-Regular-Latin1.woff2` (17,544 B) | IBM Plex Mono 400 | `OFL-IBM-Plex.txt` | IBM/plex release `@ibm/plex-mono@2.5.0` |

## IBM Plex Sans and Mono

These are IBM's own Latin-1 split woff2 files, copied byte for byte from the official release assets. They are not re-subset here: Plex has the Reserved Font Name "Plex", so a modified copy could not keep the name.

- Sans: <https://github.com/IBM/plex/releases/download/%40ibm%2Fplex-sans%401.1.0/ibm-plex-sans.zip>
  - zip sha256 `fb365d910566e6d199cc2c15579a7dd9a267128e18431a394ed81f1970c69200` (the release API gives no digest for this asset, so each file was also checked against the git blob at the release tag)
  - `ibm-plex-sans/fonts/split/woff2/IBMPlexSans-Regular-Latin1.woff2`, git blob `a9c6407beda454c594b6f7c312e70e4c5d1ab99c` at tag `@ibm/plex-sans@1.1.0`
  - `ibm-plex-sans/fonts/split/woff2/IBMPlexSans-Bold-Latin1.woff2`, git blob `6e9387b0fc49529bfa7c6fc99210b86a2df0d065`
  - `ibm-plex-sans/LICENSE.txt` is `OFL-IBM-Plex.txt`
- Mono: <https://github.com/IBM/plex/releases/download/%40ibm%2Fplex-mono%402.5.0/ibm-plex-mono.zip>
  - zip sha256 `6d23f01257663d8cc49a0d64c22ced630b79e0e2a0ac08a0da86e9a38bbc481c` (matches the digest in the GitHub release API)
  - `ibm-plex-mono/fonts/split/woff2/IBMPlexMono-Regular-Latin1.woff2`, git blob `2fdc4b550f9be2dccb63b410adad1967bf6ed30d` at tag `@ibm/plex-mono@2.5.0`
  - `ibm-plex-mono/LICENSE.txt` is identical to the Sans licence

## Barlow Condensed

The 1.422 release on jpt/barlow (the project's own repository) has no binary assets, so the tagged source archive was used:

- <https://github.com/jpt/barlow/archive/refs/tags/1.422.tar.gz>, sha256 `f4bc7fd2802844deead4d19634b9c4d11710624a48fcfd7196821e353159c048`
- `fonts/ttf/BarlowCondensed-ExtraBold.ttf`, sha256 `26f359dfb9f15d8923de948d16a05990ffcb10adda9723b3d990ef8aa6299043`, git blob `ca56694fbfa3b452a418c9b179c03198cb4f33e9` at the tag
- `OFL.txt` is `OFL-Barlow.txt`

The woff2 was subset locally to the same Latin-1 range IBM uses, with fontTools 4.68.0 (plus brotli). The command is reproducible (same output hash on repeat runs):

```sh
pyftsubset BarlowCondensed-ExtraBold.ttf \
  --unicodes='U+0000,U+000D,U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201A,U+201C-201E,U+2020-2022,U+2026,U+2030,U+2039-203A,U+2044,U+20AC,U+2122,U+2212,U+FB01-FB02' \
  --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk' \
  --flavor=woff2 --no-hinting --desubroutinize \
  --output-file=BarlowCondensed-ExtraBold-Latin1.woff2
```

## Not included yet

- Characters outside Latin-1 (for example `↗`) fall back to the system fonts in the `tokens.css` stacks.
- No `size-adjust` metric-matched fallback faces yet; that is a follow-up.
