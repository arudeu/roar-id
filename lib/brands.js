// Brand detection for MPP (mobilepromotion) items.
//
// The Sitecore item path tells us which site the promotion lives on and which product it is for, e.g.
//   /vanilla.mobile/m2.on.betmgm.ca/mobileportal-v1.0/promotions/casino/50k-halloween-leaderboard/...
//                   ^^^^^^^^^^^^^^^                      ^^^^^^^^^ ^^^^^^
//                   domain (the "m2." mobile prefix is dropped)   category
// The domain picks the brand and where CTA links should point; brand + category pick the CTA colours.

export const CATEGORIES = ["casino", "arcade", "poker", "sports"];

// colors: per category, with a `default` for every category that has no entry of its own.
const BRAND_TABLE = [
  {
    name: "BetMGM",
    domains: ["playmgm.com", "nj.betmgm.com", "pa.betmgm.com", "mi.betmgm.com", "wv.betmgm.com", "on.betmgm.ca", "ab.betmgm.ca"],
    colors: {
      default: { bg: "#d4b962", fg: "#000000" }, // Casino, Arcade and Sports
      poker: { bg: "#00a35b", fg: "#ffffff" },
    },
  },
  {
    name: "Borgata Online",
    domains: ["borgataonline.com", "pa.borgataonline.com"],
    colors: {
      default: { bg: "#1F00AE", fg: "#ffffff" }, // Casino and Arcade
      poker: { bg: "#f47523", fg: "#ffffff" },
      sports: { bg: "#5ac8e8", fg: "#ffffff" },
    },
  },
  {
    name: "PartyCasino",
    domains: ["nj.partycasino.com"],
    colors: { default: { bg: "#f00a47", fg: "#ffffff" } },
  },
  {
    name: "Party Poker",
    domains: ["nj.partypoker.com"],
    colors: { default: { bg: "#e8490d", fg: "#ffffff" } },
  },
  {
    name: "Wheel of Fortune Casino",
    domains: ["wheeloffortunecasino.com", "on.wheeloffortunecasino.com"],
    colors: { default: { bg: "#efe700", fg: "#000000" } },
  },
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Known site for a path segment such as "m2.on.betmgm.ca" (mobile prefix optional), or null. */
function matchDomain(segment) {
  const s = segment.trim().toLowerCase();
  for (const candidate of [s, s.replace(/^m\d*\./, "")]) {
    const brand = BRAND_TABLE.find((b) => b.domains.includes(candidate));
    if (brand) return { brand, domain: candidate };
  }
  return null;
}

/** casino / arcade / poker / sports: the segment after "promotions", else the first one found. */
function matchCategory(segments) {
  const lower = segments.map((s) => s.toLowerCase());
  const after = lower[lower.indexOf("promotions") + 1];
  if (lower.includes("promotions") && CATEGORIES.includes(after)) return after;
  return lower.find((s) => CATEGORIES.includes(s)) ?? null;
}

/**
 * Work out the site, brand, product and CTA colours from a Sitecore item path.
 * Returns null when the path is empty or the site isn't one of the known brands.
 *   { domain, name, category, categoryDetected, bg, fg }
 * `category` falls back to "casino" (the brand's default colours) when the path has none.
 */
export function detectBrand(path) {
  const segments = (path || "").split("/").filter(Boolean);
  if (!segments.length) return null;

  let found = null;
  for (const segment of segments) {
    found = matchDomain(segment);
    if (found) break;
  }
  if (!found) return null;

  const detected = matchCategory(segments);
  const category = detected ?? "casino";
  const { bg, fg } = found.brand.colors[category] ?? found.brand.colors.default;
  return {
    domain: found.domain,
    name: found.brand.name,
    category,
    categoryLabel: cap(category),
    categoryDetected: detected !== null,
    bg,
    fg,
  };
}

/* -------------------------------------------------------------------------- */
/* Brand / state switcher (MPP v2)                                             */
/* -------------------------------------------------------------------------- */

// Bare domains have no state prefix; these are the labels shown for them.
const BARE_DOMAIN_LABELS = { "borgataonline.com": "NJ" };

/** Short label for a site: "nj.betmgm.com" -> "NJ", "on.betmgm.ca" -> "ON", "playmgm.com" -> "playmgm.com". */
export function stateLabel(domain) {
  const d = (domain || "").toLowerCase();
  if (BARE_DOMAIN_LABELS[d]) return BARE_DOMAIN_LABELS[d];
  const m = /^([a-z]{2})\./.exec(d);
  return m ? m[1].toUpperCase() : d;
}

/** [{ name, states: [{ code, domain }] }] for every known brand, in table order. */
export const BRAND_OPTIONS = BRAND_TABLE.map((b) => ({
  name: b.name,
  // Real states first (NJ, PA, ...); odd ones like "playmgm.com" go last so the first entry is a sensible default.
  states: b.domains
    .map((domain) => ({ code: stateLabel(domain), domain }))
    .sort((a, c) => Number(a.code.length > 2 && a.code !== "NJ") - Number(c.code.length > 2 && c.code !== "NJ")),
}));

/** Every known site domain (used to recognise links that belong to a brand site). */
export const ALL_BRAND_DOMAINS = BRAND_TABLE.flatMap((b) => b.domains);

/** The state of `brandName` to land on when switching brands: same code if it exists, else the first one. */
export function pickState(brandName, preferredCode) {
  const brand = BRAND_OPTIONS.find((b) => b.name === brandName) ?? BRAND_OPTIONS[0];
  return brand.states.find((s) => s.code === preferredCode) ?? brand.states[0];
}

/**
 * Same shape as detectBrand(), but for an explicit choice (brand name + domain) instead of an item path.
 * `category` picks the CTA colours (falls back to casino); returns null for an unknown brand.
 */
export function brandFor({ name, domain, category = "casino", categoryDetected = false }) {
  const brand = BRAND_TABLE.find((b) => b.name === name);
  if (!brand) return null;
  const site = brand.domains.includes(domain) ? domain : brand.domains[0];
  const { bg, fg } = brand.colors[category] ?? brand.colors.default;
  return { domain: site, name: brand.name, category, categoryLabel: cap(category), categoryDetected, bg, fg };
}
