// @moosematrix/search 0.1.0 — reference core-side index builder.
// Core imports this (or ports it 1:1) to build each site's search-index.json.
// Every rule here is default-deny:
//   - published only: status "published", published_at <= now, no deleted_at,
//     not unlisted, not noindex (anything other than false/absent excludes);
//   - tier allowlist {public, premium} by exact equality;
//   - field allowlist; premium items carry only title + editor teaser (<=160),
//     never tags, body, excerpt or summary;
//   - no mooseman item in any non-mooseman index; mooseman's index is
//     its own items only;
//   - the result must pass the strict client validator, or the build fails.
import { ORIGINS, isSite, isTier, parseIndex, CAPS, INDEX_VERSION } from "../search-core.mjs";

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function isPublished(r, now) {
  if (!r || r.status !== "published") return false;
  if (typeof r.published_at !== "string") return false;
  const t = Date.parse(r.published_at);
  if (!Number.isFinite(t) || t > now.getTime()) return false;
  if (hasOwn(r, "deleted_at") && r.deleted_at !== null && r.deleted_at !== undefined) return false;
  if (hasOwn(r, "unlisted") && r.unlisted !== false) return false;
  if (hasOwn(r, "noindex") && r.noindex !== false) return false;
  return true;
}

export function belongsTo(recordSite, indexSite) {
  if (!isSite(recordSite)) return false;
  if (indexSite === "mooseman") return recordSite === "mooseman";
  return recordSite !== "mooseman";
}

/** Projects one source record to an index item (or null when excluded). */
export function projectRecord(r, indexSite, now) {
  if (!isPublished(r, now)) return null;
  if (!isTier(r.tier)) return null; // default deny: private, notes, "", "Public ", arrays, null, missing
  if (!belongsTo(r.site, indexSite)) return null;
  const item = {
    id: r.id,
    title: r.title,
    site: r.site,
    section: r.section,
    type: r.type,
    url: r.url,
  };
  if (r.tier === "premium") {
    if (hasOwn(r, "teaser")) {
      if (typeof r.teaser !== "string" || r.teaser.length > CAPS.summaryPremium) {
        throw new Error(`premium teaser over ${CAPS.summaryPremium} chars (id ${String(r.id)})`);
      }
      item.summary = r.teaser;
    }
  } else {
    if (typeof r.summary === "string") item.summary = r.summary;
    if (Array.isArray(r.tags)) item.tags = r.tags.slice();
  }
  if (typeof r.date === "string") item.date = r.date;
  item.access = r.tier;
  return item;
}

/**
 * @param {object[]} records  source records from core
 * @param {{ site?: string, now?: Date, generated?: string }} opts
 * @returns {{ version, site, generated, items }}
 */
export function buildIndex(records, { site, now = new Date(), generated } = {}) {
  if (!isSite(site)) throw new Error("buildIndex: unknown site");
  if (!Array.isArray(records)) throw new Error("buildIndex: records must be an array");
  const items = [];
  for (const r of records) {
    const it = projectRecord(r, site, now);
    if (it) items.push(it);
  }
  const env = {
    version: INDEX_VERSION,
    site,
    generated: generated ?? now.toISOString().replace(/\.\d{3}Z$/, "Z"),
    items,
  };
  const check = parseIndex(env, site, { strict: true });
  if (!check.ok) {
    const why = check.dropped.length ? check.dropped.map((d) => `#${d.index} ${d.reason}`).join(", ") : check.reason;
    throw new Error("buildIndex: index fails validation: " + why);
  }
  if (site !== "mooseman" && items.some((i) => i.site === "mooseman")) throw new Error("buildIndex: mooseman item off mooseman");
  return env;
}

export const SITE_ORIGINS = ORIGINS;
