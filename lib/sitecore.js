// Fetching, parsing and page-type detection for Sitecore items.

// Template that makes an item an MPP page.
export const MPP_TEMPLATES = ["mobilepromotion"];
export const isMppTemplate = (template) => MPP_TEMPLATES.includes((template || "").trim().toLowerCase());

// MPP v2: public pages built from pctext / pcimage / pctoggle / pccomponentfolder items (template pm1colpage, pm2colpage, ...).
export const isMppV2Template = (template) => /^pm\d+col\w*page$/i.test((template || "").trim());

// Fallback when the template name isn't available: an item is MPP when it has all of
// these fields. "showtacs" and "termsandconditions" are optional.
export const MPP_FIELDS = [
  "detaileddescription",
  "image",
  "imageheadline",
  "promotiontitle",
  "tactitle",
  "visibleinlist",
];

export const PAT_FIELDS = [
  "allowedlabels",
  "allowedlanguages",
  "assetsroot",
  "carouselbackgroundimage",
  "firstslabimage",
  "fulltermsandconditions",
  "image",
  "keytermsandconditions",
  "manualdatapoints",
  "playnow",
  "prizemessage",
  "prizes",
  "promocreatedate",
  "promodisplayenddate",
  "promoenddate",
  "promoid",
  "promoname",
  "promostartdate",
  "promoteaserinfo",
  "promotype",
  "slabimage",
  "stepimage",
  "steps",
  "teaserimage",
  "transactiondescription",
];

// Templates that make an item a PAT page. "leaderboard" gets its own preview.
export const PAT_TEMPLATES = ["playeractivity", "leaderboard"];

export const CREATIVE_FIELDS = [
  "height",
  "width",
  "dimensions",
  "extension",
  "mediahash",
  "mime type",
  "size",
  "blob",
  "alt",
];

export const CREATIVE_TEMPLATES = ["jpeg", "image"];
export const CREATIVE_MAX_SIZE = 100000;

export const DEFAULT_MODES = ["inbox", "overlay", "toaster", "rewardtiles"];

const GUID_RE = /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i;

/**
 * Turn whatever was pasted into a plain Sitecore ID. Accepts a bare ID, an ID in
 * curly braces, or a DirectLink URL such as
 * https://cms-us.prod.env.works/sitecore/DirectLink.aspx?fo={ID}&la=
 * (with or without https://, or wrapped in a markdown link).
 */
export const cleanSitecoreId = (raw) => {
  const text = (raw || "").trim();
  if (!text) return "";

  const match = text.match(GUID_RE);
  if (match) {
    const hex = match[0].replace(/-/g, "");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // A link with no ID in it (e.g. the {site-core-id} placeholder) counts as nothing entered.
  if (/[/?=&]|https?:/i.test(text)) return "";
  return text.replace(/[{}]/g, "");
};

const lowerKeys = (obj) => new Set(Object.keys(obj).map((k) => k.toLowerCase()));
const hasAll = (keys, required) => required.every((k) => keys.has(k));

/**
 * Decide which preview modes apply.
 * Priority matches the original app: MPP, then PAT, then Creative, else the
 * generic inbox/overlay/toaster/rewardtiles set.
 */
export function detectPageType(fieldMap, itemMap = {}, creatives = [], template = "") {
  const keys = lowerKeys(fieldMap);
  const items = Object.values(itemMap);

  // PAT is decided by the root item's template, not by which fields it happens to have.
  const templateName = (template || "").trim().toLowerCase();
  // MPP: by template name, or (fallback) by having all the MPP fields.
  const isMPP = MPP_TEMPLATES.includes(templateName) || hasAll(keys, MPP_FIELDS);
  const isPAT = PAT_TEMPLATES.includes(templateName);
  const isLeaderboard = templateName === "leaderboard";
  // A media item carries the creative fields itself, or every nested <item> does.
  // (The old check was vacuously true for any response with no <item> children,
  // which made ordinary inbox items look like creatives.)
  const isCreative =
    hasAll(keys, CREATIVE_FIELDS) ||
    (items.length > 0 && items.every((item) => hasAll(lowerKeys(item), CREATIVE_FIELDS)));

  // Any item whose template is jpeg/png makes this a Creative page, ahead of
  // MPP / PAT / Inbox / Overlay / Toaster.
  const hasCreativeTemplate = creatives.length > 0;

  const isMppV2 = isMppV2Template(templateName);

  let type = "generic";
  if (hasCreativeTemplate) type = "creative";
  else if (isMppV2) type = "mppv2";
  else if (isMPP) type = "mpp";
  else if (isPAT) type = "pat";
  else if (isCreative) type = "creative";

  // PAT has two previews: the promotion page and the Promohub tile.
  const modes = type === "generic" ? DEFAULT_MODES : type === "pat" ? ["pat", "promohub"] : [type];
  return { type, modes, isMPP, isMppV2: type === "mppv2", isPAT, isLeaderboard, isCreative: type === "creative" };
}

/** Parse the XML response into a flat field map plus a map of nested items. */
export function parseSitecoreXml(text) {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.querySelector("parsererror")) {
    throw new Error("The response wasn't valid XML. Check the ID and the API settings.");
  }

  const fieldMap = {};
  const nestedFallback = {};
  xml.querySelectorAll("field").forEach((node) => {
    const key = node.getAttribute("key");
    if (!key) return;
    // Fields on the root item win over fields of nested <item>s with the same key.
    const owner = node.closest("item");
    const isRoot = !owner || owner === xml.documentElement;
    if (isRoot) {
      if (!(key in fieldMap)) fieldMap[key] = node.textContent;
    } else if (!(key in nestedFallback)) {
      nestedFallback[key] = node.textContent;
    }
  });
  for (const [key, value] of Object.entries(nestedFallback)) {
    if (!(key in fieldMap)) fieldMap[key] = value;
  }

  const itemMap = {};
  xml.querySelectorAll("item").forEach((item, index) => {
    const fields = {};
    item.querySelectorAll("field").forEach((f) => {
      fields[f.getAttribute("key")] = f.textContent.trim();
    });
    itemMap[fields.alt || `item-${index}`] = fields;
  });

  // Every item (root or nested, any depth) whose template is jpeg or image (the "image" template covers PNGs).
  const creatives = [];
  xml.querySelectorAll("item").forEach((item) => {
    const template = (item.getAttribute("template") || "").trim().toLowerCase();
    if (!CREATIVE_TEMPLATES.includes(template)) return;
    // Only this item's own fields, not those of nested child items.
    const own = {};
    Array.from(item.children)
      .filter((c) => c.tagName === "fields")
      .forEach((fieldsNode) => {
        Array.from(fieldsNode.children).forEach((f) => {
          const key = f.getAttribute("key");
          if (key && !(key in own)) own[key] = f.textContent.trim();
        });
      });
    if (!own.blob) return;
    const size = parseInt(own.size, 10);
    creatives.push({
      id: item.getAttribute("id") || "",
      name: item.getAttribute("name") || "",
      template,
      blob: own.blob,
      alt: own.alt || item.getAttribute("name") || "",
      size: Number.isNaN(size) ? null : size,
      dimensions: own.dimensions || "",
      extension: (own.extension || "").toLowerCase(),
    });
  });

  // Template of the item that was requested (the root <item>).
  const rootItem =
    xml.documentElement.tagName.toLowerCase() === "item" ? xml.documentElement : xml.querySelector("item");
  const template = rootItem?.getAttribute("template") || "";
  // Where the item lives, e.g. /vanilla.mobile/m2.on.betmgm.ca/mobileportal-v1.0/promotions/casino/...
  const path = rootItem?.getAttribute("path") || "";

  return { fieldMap, itemMap, creatives, template, path };
}

export async function fetchSitecoreItem(id, { signal } = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  const accessId = process.env.NEXT_PUBLIC_API_ACCESS_ID;
  if (!base || !accessId) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE or NEXT_PUBLIC_API_ACCESS_ID in .env.local — restart the dev server after adding them.",
    );
  }

  const url = `${base}/${id}?depth=4&lang=en-US&culture=en-US&environment=prod&x-bwin-accessid=${accessId}&source=prod`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "No item found for that ID (404)."
        : `The request failed with status ${res.status}.`,
    );
  }

  const xml = await res.text();
  const { fieldMap, itemMap, creatives, template, path } = parseSitecoreXml(xml);
  if (Object.keys(fieldMap).length === 0) {
    throw new Error("The item loaded but has no fields. Double-check the ID.");
  }
  // `xml` is kept as-is: MPP v2 parses the whole item tree from it.
  return { fieldMap, itemMap, creatives, template, path, xml, fetchedAt: new Date() };
}

export const formatFetchedAt = (date) =>
  date
    ? date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "";
