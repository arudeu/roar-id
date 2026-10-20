// MPP v2: turns the Sitecore XML of a public page (pm1colpage with pctext / pcimage / pctoggle /
// pccomponentfolder items) into the HTML the live page renders (<vn-pc-component-folder>, <vn-pc-text>, ...).
//
//   parseMppV2(xmlText)            -> item tree      { name, key, template, id, path, fields, children }
//   renderMppV2(tree, options)     -> { html, notes } options: { loggedIn, brand }
//   applyBrand(html, brand)        -> links moved to the brand/state site, CTA buttons in the brand colours
//
// Pure JS (own small XML reader, no DOMParser) so it also runs in the tests.

import { ALL_BRAND_DOMAINS } from "./brands.js";

/* -------------------------------------------------------------------------- */
/* XML reading                                                                 */
/* -------------------------------------------------------------------------- */

const ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try {
        return String.fromCodePoint(cp);
      } catch {
        return m;
      }
    }
    return ENTITIES[e] ?? m;
  });
}

const TAG_RE = /<([^\s/>!?]+)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/y;
const ATTR_RE = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** Minimal XML reader: elements, attributes, text, CDATA, comments. Text outside the root is ignored. */
export function parseXml(source) {
  const src = String(source ?? "");
  const stack = [];
  let root = null;
  let pos = 0;

  const addText = (t) => {
    if (stack.length && t) stack[stack.length - 1].kids.push(t);
  };

  while (pos < src.length) {
    const lt = src.indexOf("<", pos);
    if (lt === -1) {
      addText(decode(src.slice(pos)));
      break;
    }
    addText(decode(src.slice(pos, lt)));
    pos = lt;

    if (src.startsWith("<!--", pos)) {
      const end = src.indexOf("-->", pos + 4);
      pos = end === -1 ? src.length : end + 3;
    } else if (src.startsWith("<![CDATA[", pos)) {
      const end = src.indexOf("]]>", pos + 9);
      if (end === -1) throw new Error("The XML has an unterminated CDATA section.");
      addText(src.slice(pos + 9, end));
      pos = end + 3;
    } else if (src.startsWith("<?", pos)) {
      const end = src.indexOf("?>", pos + 2);
      pos = end === -1 ? src.length : end + 2;
    } else if (src.startsWith("<!", pos)) {
      const end = src.indexOf(">", pos + 2);
      pos = end === -1 ? src.length : end + 1;
    } else if (src.startsWith("</", pos)) {
      const end = src.indexOf(">", pos + 2);
      if (end === -1) throw new Error("The XML ends inside a closing tag.");
      const name = src.slice(pos + 2, end).trim();
      const open = stack.pop();
      if (!open || open.name !== name) throw new Error(`The XML isn't well-formed (unexpected </${name}>).`);
      pos = end + 1;
    } else {
      TAG_RE.lastIndex = pos;
      const m = TAG_RE.exec(src);
      if (!m) throw new Error(`The XML isn't well-formed (bad tag near “${src.slice(pos, pos + 30)}”).`);
      const el = { name: m[1], attrs: {}, kids: [] };
      for (const a of m[2].matchAll(ATTR_RE)) el.attrs[a[1]] = decode(a[2] ?? a[3] ?? "");
      if (stack.length) stack[stack.length - 1].kids.push(el);
      else if (!root) root = el;
      if (!m[3]) stack.push(el);
      pos = TAG_RE.lastIndex;
    }
  }

  if (stack.length) throw new Error(`The XML isn't well-formed (<${stack[stack.length - 1].name}> is never closed).`);
  if (!root) throw new Error("No XML found in the response.");
  return root;
}

const elements = (el, name) => el.kids.filter((k) => typeof k !== "string" && (!name || k.name === name));
const textOf = (el) => el.kids.map((k) => (typeof k === "string" ? k : textOf(k))).join("");

/* -------------------------------------------------------------------------- */
/* Item tree                                                                   */
/* -------------------------------------------------------------------------- */

function toNode(el) {
  const fields = {};
  const types = {};
  for (const fieldsEl of elements(el, "fields")) {
    for (const f of elements(fieldsEl, "field")) {
      const key = (f.attrs.key || "").toLowerCase();
      if (!key || key in fields) continue;
      const content = elements(f, "content")[0];
      fields[key] = content ? textOf(content) : textOf(f);
      types[key] = f.attrs.type || "";
    }
  }

  // Sitecore can repeat the same item under one parent; keep the first of each id.
  const seen = new Set();
  const children = [];
  for (const child of elements(el, "item")) {
    const id = child.attrs.id;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    children.push(toNode(child));
  }

  return {
    name: el.attrs.name || "",
    key: (el.attrs.key || el.attrs.name || "").toLowerCase(),
    template: (el.attrs.template || "").toLowerCase(),
    id: el.attrs.id || "",
    path: el.attrs.path || "",
    fields,
    types,
    children,
  };
}

/** Parse the API response into the item tree of the requested (root) item. */
export function parseMppV2(xmlText) {
  const root = parseXml(xmlText);
  const rootItem = root.name === "item" ? root : findItem(root);
  if (!rootItem) throw new Error("The response has no <item>.");
  return toNode(rootItem);
}

function findItem(el) {
  for (const k of el.kids) {
    if (typeof k === "string") continue;
    if (k.name === "item") return k;
    const inner = findItem(k);
    if (inner) return inner;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Conditions (the "condition" field, e.g. "NOT User.LoggedIn")                */
/* -------------------------------------------------------------------------- */

/**
 * Evaluate a Sitecore display condition. Understands AND / OR / NOT, parentheses and User.LoggedIn.
 * Anything else counts as true (the item stays visible) and is added to `unknown`.
 */
export function evalCondition(expr, { loggedIn = false } = {}, unknown = []) {
  const text = (expr || "").trim();
  if (!text) return true;
  const tokens = text.match(/\(|\)|\bAND\b|\bOR\b|\bNOT\b|[^()\s][^()]*?(?=\s+(?:AND|OR)\b|\)|$)/gi) || [];
  let i = 0;

  const atom = (raw) => {
    const t = raw.trim();
    if (/^User\.LoggedIn$/i.test(t)) return loggedIn;
    unknown.push(t);
    return true;
  };
  const primary = () => {
    const t = tokens[i++];
    if (t === undefined) return true;
    if (/^NOT$/i.test(t)) return !primary();
    if (t === "(") {
      const v = or();
      if (tokens[i] === ")") i++;
      return v;
    }
    return atom(t);
  };
  const and = () => {
    let v = primary();
    while (/^AND$/i.test(tokens[i] || "")) {
      i++;
      const r = primary();
      v = v && r;
    }
    return v;
  };
  const or = () => {
    let v = and();
    while (/^OR$/i.test(tokens[i] || "")) {
      i++;
      const r = and();
      v = v || r;
    }
    return v;
  };
  return or();
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                   */
/* -------------------------------------------------------------------------- */

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Angular lists classes alphabetically, so the output does the same: "p-0 back-banner" -> "back-banner p-0 pc-component ...". */
const classes = (...parts) =>
  [...new Set(parts.flatMap((p) => String(p || "").split(/\s+/)).filter(Boolean))].sort().join(" ");

/** The page-level CTA folders are shown inside the content folder, after this item (as on the live page). */
export const CTA_AFTER = "howitworks";
const isCtaFolder = (n) => n.key.startsWith("cta");

// Item field names tried in order (Sitecore templates differ a little between sites).
const TEXT_KEYS = ["text", "content", "body", "description"];
const HEADER_KEYS = ["header", "headertext", "heading", "headline", "title"];
const TAG_KEYS = ["headertag", "headertype", "headinglevel", "headerlevel"];
const SIZE_KEYS = ["headerclass", "headersize", "headerstyle", "headingclass"];
const IMAGE_KEYS = ["image", "img", "picture", "src"];

const firstField = (node, keys) => {
  for (const k of keys) {
    const v = node.fields[k];
    if (v != null && String(v).trim()) return String(v);
  }
  return "";
};

// Header look when the item doesn't say (keyed by the parent folder, as on the live page).
const DEFAULT_HEADERS = {
  backbanner: { tag: 3, size: "h5-v2" },
  pagetitle: { tag: 3, size: "h4-v2 mb-2" },
  moreinfo: { tag: 1, size: "h6-v2 mb-2" },
  default: { tag: 3, size: "h6-v2 mb-2" },
};

/** Rich text from Sitecore with anything that would leak into the app removed (stylesheets, scripts, comments). */
export function cleanRichText(html) {
  return String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .trim();
}

function imageInfo(node) {
  for (const k of IMAGE_KEYS) {
    const v = node.fields[k];
    if (!v) continue;
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(v)?.[1] ?? (/^\s*(https?:)?\/\//i.test(v) ? v.trim() : "");
    if (!src) continue;
    const attr = (name) => new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(v)?.[1] ?? "";
    return { src: decode(src), alt: attr("alt") || node.fields.alt || "", width: attr("width") || node.fields.width || "" };
  }
  return null;
}

const PICTURE_WIDTHS = [320, 480, 640, 800, 1024];

function renderImage(node, cls) {
  const img = imageInfo(node);
  let inner = "";
  if (img) {
    const sources = PICTURE_WIDTHS.map((w) => `<source media="(max-width: ${w}px)" srcset="${esc(img.src)}?p=width${w}">`).join("");
    inner =
      `<vn-picture imgclass="pc-img"><picture>${sources}` +
      `<img class="pc-img" src="${esc(img.src)}" alt="${esc(img.alt)}"${img.width ? ` width="${esc(img.width)}"` : ""}>` +
      `</picture></vn-picture>`;
  }
  return `<vn-pc-image class="${cls}">${inner}</vn-pc-image>`;
}

/**
 * Render the page tree to the live page's HTML.
 *   options.loggedIn  – evaluates "User.LoggedIn" conditions (default: logged out)
 *   options.brand     – { domain, bg, fg } from lib/brands.js: links and CTA colours follow it
 * Returns { html, notes } — notes list anything that couldn't be mapped (unknown templates, conditions, ...).
 */
export function renderMppV2(tree, { loggedIn = false, brand = null } = {}) {
  const notes = [];
  const note = (msg) => {
    if (!notes.includes(msg)) notes.push(msg);
  };
  let toggles = 0;

  const rich = (html) => applyBrand(cleanRichText(html), brand);

  const visible = (node) => {
    const unknown = [];
    const ok = evalCondition(node.fields.condition, { loggedIn }, unknown);
    unknown.forEach((u) => note(`Condition “${u}” on ${node.name} isn't evaluated — the item is shown.`));
    return ok;
  };

  const kind = (node) => {
    const t = node.template.replace(/^pc/, "");
    if (/toggle/.test(t)) return "toggle";
    if (/image|picture/.test(t)) return "image";
    if (/folder/.test(t)) return "folder";
    if (t === "text" || /text|rich|html/.test(t)) return "text";
    // Unknown template: guess from what the item has.
    if (node.children.length) return "folder";
    if (imageInfo(node) && !firstField(node, TEXT_KEYS)) return "image";
    if (firstField(node, TEXT_KEYS) || firstField(node, HEADER_KEYS)) return "text";
    return "empty";
  };

  const renderHeader = (node, parent) => {
    const text = firstField(node, HEADER_KEYS).trim();
    if (!text) return "";
    const def = DEFAULT_HEADERS[parent?.key] ?? DEFAULT_HEADERS.default;
    const rawTag = firstField(node, TAG_KEYS).trim();
    const tag = Number(/^h?([1-6])$/i.exec(rawTag)?.[1]) || def.tag;
    let size = firstField(node, SIZE_KEYS).trim();
    size = size ? size.replace(/^(h[1-6])$/i, "$1-v2") : def.size;
    const idBase = parent && node.key.startsWith(parent.key) && node.key.length > parent.key.length ? node.key : (parent?.key ?? node.key);
    return (
      `<vn-pc-component-header-v2 class="pc-header"><h${tag} class="${classes("pc-h", size)}" id="default${esc(idBase)}"> ${esc(text)} </h${tag}></vn-pc-component-header-v2>`
    );
  };

  const renderNode = (node, parent) => {
    if (!visible(node)) return "";
    const own = node.fields.class || "";
    switch (kind(node)) {
      case "folder": {
        let kids = node.children.filter(visible);
        const max = parseInt(node.fields.maxitems, 10);
        if (max > 0) kids = kids.slice(0, max);
        return `<vn-pc-component-folder class="${classes(own, "pc-component", "pc-folder")}">${kids.map((k) => renderNode(k, node)).join("")}</vn-pc-component-folder>`;
      }
      case "text":
        return (
          `<vn-pc-text class="${classes(own, "pc-component", "pc-text")}">${renderHeader(node, parent)}` +
          `<div class="pc-txt">${rich(firstField(node, TEXT_KEYS))}</div></vn-pc-text>`
        );
      case "image":
        return renderImage(node, classes(own, "pc-component", "pc-image"));
      case "toggle": {
        const id = `pctoggle_chbx_${toggles++}`;
        const title = esc(firstField(node, HEADER_KEYS).trim());
        const icon = (name, extra, path) =>
          `<vn-icon name="${name}" extraclass="${extra}" class="vn-icon" aria-hidden="true"><svg class="${extra}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg></vn-icon>`;
        return (
          `<vn-pc-toggle class="${classes(own, "pc-component", "pc-toggle")}">` +
          `<input type="checkbox" class="pc-toggle-checker" id="${id}">` +
          `<label class="pc-toggle-label" for="${id}">${title} ${icon("theme-up", "pc-toggle__icon-up", "M6 15l6-6 6 6")}${icon("theme-down", "pc-toggle__icon-down", "M6 9l6 6 6-6")}</label>` +
          `<div class="pc-txt pc-toggle-txt">${rich(firstField(node, TEXT_KEYS))}</div></vn-pc-toggle>`
        );
      }
      default:
        note(`“${node.name}” (template ${node.template || "unknown"}) has nothing to show and was skipped.`);
        return "";
    }
  };

  /** Which page children are shown, and in which order: the page's `content` treelist says so. */
  const pageChildren = (page) => {
    const entries = (page.fields.content || "")
      .split("|")
      .map((p) => p.trim().replace(/\/+$/, "").split("/").pop().toLowerCase())
      .filter(Boolean);
    if (!entries.length) return page.children;

    const left = [...page.children];
    const picked = [];
    for (const entry of entries) {
      // "ctas-mobile" in the treelist is the item called "ctas" under the page.
      const at = left.findIndex((c) => c.key === entry || entry.startsWith(`${c.key}-`) || c.key.startsWith(`${entry}-`));
      if (at === -1) note(`The page lists “${entry}”, but no item with that name was found under it.`);
      else picked.push(...left.splice(at, 1));
    }
    left.forEach((c) => note(`“${c.name}” is under the page but not in its content list, so it isn't shown.`));
    return picked;
  };

  const renderPage = (page) => {
    let children = pageChildren(page);

    // Page-level CTAs are shown inside the content folder, right after "How It Works" (or at its end).
    const ctas = children.filter(isCtaFolder);
    const content = children.find((c) => c.key === "content");
    if (ctas.length && content) {
      children = children.filter((c) => !isCtaFolder(c));
      const kids = content.children;
      const at = kids.findIndex((k) => k.key === CTA_AFTER);
      const merged = at === -1 ? [...kids, ...ctas] : [...kids.slice(0, at + 1), ...ctas, ...kids.slice(at + 1)];
      children = children.map((c) => (c === content ? { ...c, children: merged } : c));
    }

    const cols = /^pm(\d+)col/.exec(page.template)?.[1] ?? "1";
    return (
      `<div id="main-content"><vn-public-page-loader class="public-page-container"><vn-page-matrix class="page-matrix">` +
      `<vn-pm-${cols}col-page class="pm-${cols}col pm-page pm-simple-layout">${children.map((c) => renderNode(c, page)).join("")}</vn-pm-${cols}col-page>` +
      `</vn-page-matrix></vn-public-page-loader></div>`
    );
  };

  return { html: renderPage(tree), notes };
}

/* -------------------------------------------------------------------------- */
/* Brand / state                                                               */
/* -------------------------------------------------------------------------- */

const HOST_ALTERNATION = [...new Set(ALL_BRAND_DOMAINS)]
  .sort((a, b) => b.length - a.length)
  .map((d) => d.replace(/\./g, "\\."))
  .join("|");
// Only the bare host (optionally with www.) counts, so media hosts like scmedia.borgataonline.com or
// casinogames.borgataonline.com keep pointing where they are.
const SITE_HOST_RE = new RegExp(`^(\\s*(?:https?:)?\\/\\/(?:www\\.)?)(?:${HOST_ALTERNATION})(?=[/:?#\\s]|$)`, "i");

/** `href` with the host of any known brand site replaced by `domain`; everything else is returned untouched. */
export function swapSiteHost(href, domain) {
  return domain ? href.replace(SITE_HOST_RE, (_, prefix) => `${prefix}${domain}`) : href;
}

function setButtonColors(tag, { bg, fg }) {
  const style = /\bstyle\s*=\s*"([^"]*)"/i.exec(tag);
  const kept = (style?.[1] ?? "")
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d && !/^(background(-color)?|color)\s*:/i.test(d));
  const next = `style="${[...kept, `background-color:${bg}`, `color:${fg}`].join("; ")};"`;
  return style ? tag.replace(style[0], next) : tag.replace(/\s*\/?>$/, (end) => ` ${next}${end}`);
}

/**
 * Point links at the chosen brand/state site and paint CTA buttons (links with class "btn") in its colours.
 * brand = { domain, bg, fg }. Only anchors are touched: images, media and text stay as they are.
 */
export function applyBrand(html, brand) {
  if (!html || !brand) return html;
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    let out = tag.replace(/(\bhref\s*=\s*)(["'])(.*?)\2/i, (_, pre, q, url) => `${pre}${q}${swapSiteHost(url, brand.domain)}${q}`);
    if (brand.bg && /\bclass\s*=\s*["'][^"']*\bbtn\b/i.test(out)) out = setButtonColors(out, brand);
    return out;
  });
}
