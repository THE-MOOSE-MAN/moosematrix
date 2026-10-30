// render.mjs + nav.json: parity, current marking, escaping, URL allowlist, schema agreement, snapshots.
// UPDATE_SNAPSHOTS=1 node --test tests/render.test.mjs rewrites tests/snapshots/ (review the diff).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderHeader, renderFooter, validateNav, escapeHtml, ORIGINS, SITES, SCOPES } from "../render.mjs";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(pkg, f), "utf8");
const nav = JSON.parse(read("nav.json"));
const schema = JSON.parse(read("nav.schema.json"));
const clone = () => structuredClone(nav);
const section = (html, cls) => html.slice(html.indexOf(`<nav class="${cls}"`), html.indexOf("</nav>", html.indexOf(`<nav class="${cls}"`)));
const links = (html) => [...html.matchAll(/<a[^>]* href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]);

test("nav.json validates and has the card's main list", () => {
  validateNav(nav);
  assert.deepEqual(nav.main.map((l) => l.id), ["research", "moose-mumbles", "money", "shop", "about"]);
  assert.deepEqual(nav.main.map((l) => l.tick), [3, 2, 1, 2, 3]);
  assert.equal(nav.main.find((l) => l.id === "moose-mumbles").href, "https://mooseman.moosematrix.com/moose-mumbles");
  assert.deepEqual(nav.research.children.map((l) => l.id), ["projects", "lab", "library"]);
  assert.ok(!nav.main.some((l) => /home/i.test(l.label)), "no Home item");
  assert.equal(nav.version, JSON.parse(read("package.json")).version);
});

test("desktop and mobile menus are the same main list, from one call", () => {
  for (const site of SITES) {
    const h = renderHeader({ site });
    const desk = links(section(h, "mm-nav"));
    const mob = links(section(h, "mm-menu-nav")).filter(([href]) => !nav.research.children.some((c) => c.href === href) && !nav.menuExtras.some((c) => c.href === href) && !href.endsWith("/search/"));
    assert.deepEqual(desk, nav.main.map((l) => [l.href, l.label.replace("&", "&amp;")]));
    assert.deepEqual(mob, desk, site);
  }
});

test("current marks aria-current=page in both navs; a research child marks Research true", () => {
  let h = renderHeader({ current: "about" });
  assert.equal((h.match(/aria-current="page"/g) || []).length, 2);
  assert.match(section(h, "mm-nav"), /href="https:\/\/moosematrix.com\/about\/" aria-current="page"/);
  assert.match(section(h, "mm-menu-nav"), /href="https:\/\/moosematrix.com\/about\/" aria-current="page"/);
  h = renderHeader({ current: "lab" });
  assert.equal((h.match(/aria-current="true"/g) || []).length, 2);
  assert.equal((h.match(/aria-current="page"/g) || []).length, 1, "the child itself, in the mobile menu");
  assert.equal((renderHeader({}).match(/aria-current/g) || []).length, 0);
  assert.throws(() => renderHeader({ current: '"><script>' }));
});

test("scope goes on the search trigger and only known scopes are accepted", () => {
  assert.match(renderHeader({ scope: "money" }), /data-mm-search-open data-mm-scope="money"/);
  assert.throws(() => renderHeader({ scope: "x\" onclick=" }));
  assert.throws(() => renderHeader({ site: "evil" }));
  assert.deepEqual(SCOPES, schema.properties.heroTopics.items.properties.scope.enum);
});

test("labels are escaped (<script>, quotes, ampersand)", () => {
  const n = clone();
  n.main[0].label = '<script>alert(1)</script>';
  n.main[1].label = 'Say "hi" & \'bye\'';
  n.siteRows.mooseman.label = "<b>row</b>";
  const h = renderHeader({ site: "mooseman", nav: n });
  assert.ok(!h.includes("<script>") && !h.includes("<b>row"));
  assert.ok(h.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(h.includes("Say &quot;hi&quot; &amp; &#39;bye&#39;"));
  assert.ok(h.includes('aria-label="&lt;b&gt;row&lt;/b&gt;"'));
  assert.ok(!renderFooter({ nav: n }).includes("<script>"));
  assert.equal(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
});

test("a tampered nav.json with foreign or non-https URLs is rejected", () => {
  const bad = ["http://moosematrix.com/", "javascript:alert(1)", "https://evil.com/", "https://moosematrix.com.evil.com/", "https://evil.com/https://moosematrix.com/",
    "https://user@moosematrix.com/", "https://moosematrix.com:8443/", "//moosematrix.com/", "/relative", "https://moosematrix.com/a b", "https://moosematrix.com/\"><x>",
    "https://MOOSEMATRIX.com/", "https://www.moosematrix.com/", "data:text/html,x", "https://moosematrix.com/?q=1", "https://moosematrix.com\\@evil.com/"];
  for (const href of bad) {
    for (const where of ["main", "child", "row", "extra"]) {
      const n = clone();
      if (where === "main") n.main[0].href = href;
      if (where === "child") n.research.children[0].href = href;
      if (where === "row") n.siteRows.m2.items[0].href = href;
      if (where === "extra") n.menuExtras[0].href = href;
      assert.throws(() => renderHeader({ nav: n }), /nav\.json/, `${where} ${href}`);
      assert.throws(() => renderFooter({ nav: n }), /nav\.json/);
    }
  }
  const n = clone();
  n.main[0].onclick = "x";
  assert.throws(() => validateNav(n), /unknown key/);
  const m = clone();
  m.extra = 1;
  assert.throws(() => validateNav(m), /unknown key/);
});

test("render.mjs allowlist and keys agree with nav.schema.json", () => {
  const re = new RegExp(schema.$defs.href.pattern);
  for (const o of ORIGINS) assert.ok(re.test(`https://${o}/`), o);
  const fromSchema = schema.$defs.href.pattern.match(/^\^https:\/\/\((.*?)\)/)[1].split("|").map((s) => s.replace(/\\\./g, "."));
  assert.deepEqual(fromSchema, ORIGINS);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties).sort(), ["$schema", "heroTopics", "main", "menuExtras", "research", "siteRows", "version"]);
  assert.deepEqual(Object.keys(schema.properties.siteRows.properties).sort(), ["m2", "merch", "mooseman"]);
  assert.deepEqual(Object.keys(schema.$defs.mainLink.properties).sort(), ["href", "id", "label", "tick"]);
  assert.deepEqual(Object.keys(schema.$defs.link.properties).sort(), ["href", "id", "label"]);
  for (const d of ["link", "mainLink", "row"]) assert.equal(schema.$defs[d].additionalProperties, false, d);
});

test("header.html and footer.html are the generated reference output", () => {
  assert.ok(read("header.html").endsWith(renderHeader({ site: "moosematrix" })));
  assert.ok(read("footer.html").endsWith(renderFooter()));
});

test("snapshots per site", () => {
  const dir = join(pkg, "tests", "snapshots");
  mkdirSync(dir, { recursive: true });
  const outs = Object.fromEntries([...SITES.map((s) => [`header-${s}.html`, renderHeader({ site: s })]), ["footer.html", renderFooter()]]);
  for (const [f, html] of Object.entries(outs)) {
    if (process.env.UPDATE_SNAPSHOTS) writeFileSync(join(dir, f), html);
    assert.equal(html, readFileSync(join(dir, f), "utf8"), `${f}: run UPDATE_SNAPSHOTS=1 and review`);
  }
});

test("footer columns come from nav data plus fixed Contact/Privacy/Terms", () => {
  const f = renderFooter();
  for (const l of [...nav.main, ...nav.research.children, ...nav.menuExtras]) assert.ok(f.includes(`href="${l.href}"`), l.id);
  for (const h of ["https://moosematrix.com/about/#contact", "https://moosematrix.com/privacy", "https://moosematrix.com/terms"]) assert.ok(f.includes(h));
  assert.ok(!/target=/.test(f) && !/target=/.test(renderHeader({})));
});
