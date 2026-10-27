// Fetching, parsing and page-type detection for Sitecore items.

import { mergeParts, parseMppV2, stubFolders, topFolders } from "./mppv2.js";

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

const LOG = "[MPP v2]";
const API_DEPTH = 6;
// A by-id response can still end in empty folders; fetch those too, wave after wave, down to this many levels.
const MAX_WAVES = 6;
const redact = (url) => url.replace(/(x-bwin-accessid=)[^&]+/i, "$1***");

/** GET one item as XML by its Sitecore ID. */
async function fetchXml(id, signal) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  const accessId = process.env.NEXT_PUBLIC_API_ACCESS_ID;
  if (!base || !accessId) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE or NEXT_PUBLIC_API_ACCESS_ID in .env.local — restart the dev server after adding them.",
    );
  }

  const url = `${base}/${id}?depth=${API_DEPTH}&lang=en-US&culture=en-US&environment=prod&x-bwin-accessid=${accessId}&source=prod`;
  let res;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (err?.name !== "AbortError") console.error(LOG, "request failed", { id, url: redact(url), error: err });
    throw err;
  }
  console.log(LOG, `GET ${id} -> ${res.status}`, redact(url));
  if (!res.ok) {
    console.error(LOG, "bad response", { id, status: res.status, url: redact(url) });
    throw new Error(
      res.status === 404
        ? "No item found for that ID (404)."
        : `The request failed with status ${res.status}.`,
    );
  }
  return res.text();
}

/**
 * MPP v2 pages: the page response only lists its folders, so `content` and the CTA folders are fetched by id.
 * Whatever comes back can still end in empty folders (children, grandchildren, ...), so those are fetched by id
 * as well, wave after wave, until nothing is left. A part that fails to load is reported, not fatal.
 */
async function loadMppV2(xml, signal) {
  let tree = parseMppV2(xml);
  const asked = new Set();
  const loadNotes = [];
  const key = (id) => id.replace(/[{}-]/g, "").toLowerCase();

  for (let wave = 0; wave < MAX_WAVES; wave++) {
    const candidates = wave === 0 ? topFolders(tree) : topFolders(tree).flatMap(stubFolders);
    const todo = candidates.filter((n, i) => !asked.has(key(n.id)) && candidates.findIndex((m) => key(m.id) === key(n.id)) === i);
    if (!todo.length) break;
    todo.forEach((n) => asked.add(key(n.id)));
    console.log(LOG, `wave ${wave + 1}: fetching ${todo.length} folder(s) by id`, todo.map((n) => ({ name: n.name, key: n.key, id: n.id })));

    const results = await Promise.allSettled(todo.map((n) => fetchXml(cleanSitecoreId(n.id).toLowerCase(), signal).then(parseMppV2)));
    const parts = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        console.log(LOG, `fetched “${todo[i].name}”`, { items: countItems(r.value), tree: r.value });
        return parts.push(r.value);
      }
      if (r.reason?.name === "AbortError") throw r.reason;
      console.error(LOG, `couldn't load “${todo[i].name}”`, r.reason);
      loadNotes.push(`Couldn't load “${todo[i].name}”: ${r.reason?.message || "unknown error"}`);
    });
    tree = mergeParts(tree, parts);
  }

  console.log(LOG, "merged tree", { items: countItems(tree), loadNotes, tree });
  return { tree, loadNotes };
}

const countItems = (node) => 1 + node.children.reduce((n, c) => n + countItems(c), 0);

export async function fetchSitecoreItem(id, { signal } = {}) {
  const xml = await fetchXml(id, signal);
  const { fieldMap, itemMap, creatives, template, path } = parseSitecoreXml(xml);
  if (Object.keys(fieldMap).length === 0) {
    throw new Error("The item loaded but has no fields. Double-check the ID.");
  }
  // MPP v2 parses the whole item tree (the page plus its separately fetched folders), not the flat field map.
  const mppv2 = isMppV2Template(template) ? await loadMppV2(xml, signal) : null;
  return { fieldMap, itemMap, creatives, template, path, mppv2, fetchedAt: new Date() };
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
