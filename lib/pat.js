// Helpers for the PAT / Promohub previews: reading the Steps JSON, SmartLinks,
// Image fields, and building the "More Info" URL.

const lower = (s) => String(s).toLowerCase();

const decodeBasic = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** A JSON value as text: strings, numbers, or { value: "..." } wrappers. */
function asText(v) {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const inner = Object.entries(v).find(([k]) => lower(k) === "value");
    if (inner) return asText(inner[1]);
  }
  return "";
}

const TITLE_KEYS = ["title", "name", "heading", "header", "label", "steptitle", "stepname", "headline"];
const TEXT_KEYS = ["text", "description", "desc", "content", "body", "message", "copy", "steptext", "stepdescription", "subtitle", "details"];

function pick(obj, keys) {
  const byLower = new Map(Object.entries(obj).map(([k, v]) => [lower(k), v]));
  for (const key of keys) {
    const text = asText(byLower.get(key));
    if (text) return text;
  }
  return "";
}

/** Find the array of steps in whatever shape the JSON field has. */
function findList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const entries = Object.entries(data);
    const named = entries.find(([k, v]) => lower(k) === "steps" && Array.isArray(v));
    if (named) return named[1];
    const anyArray = entries.find(([, v]) => Array.isArray(v));
    if (anyArray) return anyArray[1];
    // { "1": {...}, "2": {...} }
    const objects = entries.filter(([, v]) => v && typeof v === "object");
    if (objects.length && objects.length === entries.length) return objects.map(([, v]) => v);
  }
  return null;
}

/**
 * Read the Steps JsonField. Returns { steps: [{ title, text }], error }.
 * Accepts an array, or an object holding an array, with common key names
 * (title / name / heading, text / description / content ...).
 */
export function parseSteps(raw) {
  const source = (raw || "").trim();
  if (!source) return { steps: [], error: null };

  let data;
  try {
    data = JSON.parse(source);
  } catch (err) {
    return { steps: [], error: `The Steps value isn't valid JSON (${err.message}).` };
  }

  const list = findList(data);
  if (!list) return { steps: [], error: "No list of steps was found in the Steps JSON." };

  const steps = list
    .map((item) => {
      if (typeof item === "string") return { title: "", text: item.trim() };
      if (!item || typeof item !== "object") return null;
      let title = pick(item, TITLE_KEYS);
      let text = pick(item, TEXT_KEYS);
      if (!title && !text) {
        // Unknown key names: fall back to the first two text values, in order.
        const strings = Object.values(item).map(asText).filter(Boolean);
        [title = "", text = ""] = strings;
        if (strings.length === 1) [title, text] = ["", strings[0]];
      }
      return title || text ? { title, text } : null;
    })
    .filter(Boolean);

  return { steps, error: steps.length ? null : "The Steps JSON doesn't contain any steps." };
}

/** Read a SmartLink field: JSON, <link text="" url="" />, or a bare URL. */
export function parseSmartLink(raw) {
  const source = (raw || "").trim();
  if (!source) return { text: "", url: "" };

  if (/^[{[]/.test(source)) {
    try {
      let data = JSON.parse(source);
      if (Array.isArray(data)) data = data[0];
      if (data && typeof data === "object") {
        return {
          text: pick(data, ["text", "label", "title", "name", "linktext"]),
          url: pick(data, ["url", "href", "link", "path", "value"]),
        };
      }
    } catch {
      /* fall through to the other formats */
    }
  }

  const attr = (name) => {
    const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(source);
    return m ? decodeBasic(m[1] ?? m[2] ?? "") : "";
  };
  const text = attr("text") || attr("title");
  const url = attr("url") || attr("href");
  if (text || url) return { text, url };

  if (/^(https?:)?\/\//i.test(source) || source.startsWith("/")) return { text: "", url: source };
  return { text: source, url: "" };
}

/** src of an Image field (usually `<image ... src="..." />`), or a bare URL. */
export function getImageSrc(raw) {
  const source = (raw || "").trim();
  if (!source) return "";
  const m = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(source);
  if (m) return decodeBasic(m[1] ?? m[2] ?? "");
  return /^(https?:)?\/\//i.test(source) ? source : "";
}

/** Where "More Info" on a Promohub tile goes. */
export const moreInfoUrl = (patId) => {
  const id = (patId || "").trim();
  return id ? `https://www.nj.betmgm.com/en/promo/pa/${encodeURIComponent(id)}/overview` : "";
};
