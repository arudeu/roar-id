// Fetching, parsing and page-type detection for Sitecore items.

export const MPP_FIELDS = [
  "detaileddescription",
  "image",
  "imageheadline",
  "promotiontitle",
  "showtacs",
  "tactitle",
  "termsandconditions",
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

export const DEFAULT_MODES = ["inbox", "overlay", "toaster", "rewardtiles"];

/** Strip whitespace and the curly braces Sitecore GUIDs are usually pasted with. */
export const cleanSitecoreId = (raw) => (raw || "").trim().replace(/[{}]/g, "");

const lowerKeys = (obj) => new Set(Object.keys(obj).map((k) => k.toLowerCase()));
const hasAll = (keys, required) => required.every((k) => keys.has(k));

/**
 * Decide which preview modes apply.
 * Priority matches the original app: MPP, then PAT, then Creative, else the
 * generic inbox/overlay/toaster/rewardtiles set.
 */
export function detectPageType(fieldMap, itemMap = {}) {
  const keys = lowerKeys(fieldMap);
  const items = Object.values(itemMap);

  const isMPP = hasAll(keys, MPP_FIELDS);
  const isPAT = hasAll(keys, PAT_FIELDS);
  // A media item carries the creative fields itself, or every nested <item> does.
  // (The old check was vacuously true for any response with no <item> children,
  // which made ordinary inbox items look like creatives.)
  const isCreative =
    hasAll(keys, CREATIVE_FIELDS) ||
    (items.length > 0 && items.every((item) => hasAll(lowerKeys(item), CREATIVE_FIELDS)));

  let type = "generic";
  if (isMPP) type = "mpp";
  else if (isPAT) type = "pat";
  else if (isCreative) type = "creative";

  const modes = type === "generic" ? DEFAULT_MODES : [type];
  return { type, modes, isMPP, isPAT, isCreative };
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

  return { fieldMap, itemMap };
}

export async function fetchSitecoreItem(id, { signal } = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  const accessId = process.env.NEXT_PUBLIC_API_ACCESS_ID;
  if (!base || !accessId) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE or NEXT_PUBLIC_API_ACCESS_ID in .env.local — restart the dev server after adding them.",
    );
  }

  const url = `${base}/${id}?depth=2&lang=en-US&culture=en-US&environment=prod&x-bwin-accessid=${accessId}&source=prod`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "No item found for that ID (404)."
        : `The request failed with status ${res.status}.`,
    );
  }

  const { fieldMap, itemMap } = parseSitecoreXml(await res.text());
  if (Object.keys(fieldMap).length === 0) {
    throw new Error("The item loaded but has no fields. Double-check the ID.");
  }
  return { fieldMap, itemMap, fetchedAt: new Date() };
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
