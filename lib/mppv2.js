// MPP v2: turns the Sitecore XML of a public page (pm1colpage with pctext / pcimage / pctoggle /
// pccomponentfolder items) into the HTML the live page renders (<vn-pc-component-folder>, <vn-pc-text>, ...).
//
//   parseMppV2(xmlText)            -> item tree      { name, key, template, id, path, fields, params, children }
//   topFolders / stubFolders / mergeParts -> which folders to fetch by id, and putting what came back into the tree
//   renderMppV2(tree, options)     -> { html, notes } options: { loggedIn, brand }
//   extractMppV2Fields(tree)       -> the text fields of the page for the HTML checker
//   applyBrand(html, brand)        -> links moved to the site the page is on (brand.domain)
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

/** The "parameters" field: <bwinnamevalue><entry key="title-class">h4-v2 mb-2</entry>...</bwinnamevalue> -> { "title-class": "h4-v2 mb-2" }. */
export function parseParams(raw) {
  const out = {};
  for (const m of String(raw ?? "").matchAll(/<entry\s+key\s*=\s*"([^"]*)"\s*(?:\/>|>([\s\S]*?)<\/entry>)/gi)) out[m[1].toLowerCase()] = decode((m[2] ?? "").trim());
  return out;
}

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
    params: parseParams(fields.parameters),
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

const isFolderNode = (n) => /folder/.test(n.template);

const idKey = (id) => String(id || "").replace(/[{}-]/g, "").toLowerCase();

/** The page folders that hold the copy and the buttons: `content` and the CTA folders. These are fetched by id. */
export function topFolders(page) {
  return page.children.filter((c) => isFolderNode(c) && c.id && (c.key === "content" || c.key.startsWith("cta")));
}

/**
 * Folders anywhere below `root` (children, grandchildren, ...) that came back without items. The by-id responses
 * are cut off at a certain depth, so these are fetched by their own id to get the rest of the branch.
 */
export function stubFolders(root) {
  const out = [];
  const walk = (n) => {
    for (const c of n.children) {
      if (isFolderNode(c) && !c.children.length && c.id) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

/** The tree with every fetched part (the root item of a by-id response) put in place of the item with the same id, at any depth. */
export function mergeParts(node, parts) {
  return {
    ...node,
    children: node.children.map((c) => {
      const part = parts.find((p) => p.id && c.id && idKey(p.id) === idKey(c.id));
      return mergeParts(part ?? c, parts);
    }),
  };
}

/**
 * Where the page lives, e.g. /vanilla.mobile/m2.borgataonline.com/mobileportal-v1.0/publicpages/... The root item's own
 * path is only /id/<guid>, so this looks at the paths in its content list and in its items.
 */
export function findSitePath(tree) {
  const real = (p) => p && !/^\/id\//i.test(p);
  if (real(tree.path)) return tree.path;
  const listed = (tree.fields.content || "").split("|").map((p) => p.trim()).find(real);
  if (listed) return listed;
  const dfs = (n) => {
    for (const c of n.children) {
      if (real(c.path)) return c.path;
      const inner = dfs(c);
      if (inner) return inner;
    }
    return "";
  };
  return dfs(tree);
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

/** The page-level CTA folders are shown inside the content folder, right after this item (as on the live page). */
export const CTA_AFTER = "howitworks";
const isCtaFolder = (n) => n.key.startsWith("cta");

// Item field names tried in order.
const TEXT_KEYS = ["text", "content", "body", "description"];
const HEADER_KEYS = ["title", "header", "headertext", "heading", "headline"];
const IMAGE_KEYS = ["image", "img", "picture", "src"];

const firstField = (node, keys) => {
  for (const k of keys) {
    const v = node.fields[k];
    if (v != null && String(v).trim()) return String(v);
  }
  return "";
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

/** What an item is rendered as. The "render" parameter wins (a pctext with render=pc-toggle is a toggle). */
function kindOf(node) {
  if (/toggle/i.test(node.params.render || "")) return "toggle";
  const t = node.template.replace(/^pc/, "");
  if (/toggle/.test(t)) return "toggle";
  if (/image|picture/.test(t)) return "image";
  if (/folder/.test(t)) return "folder";
  if (/text|rich|html/.test(t)) return "text";
  // Unknown template: guess from what the item has.
  if (node.children.length) return "folder";
  if (imageInfo(node) && !firstField(node, TEXT_KEYS)) return "image";
  if (firstField(node, TEXT_KEYS) || firstField(node, HEADER_KEYS)) return "text";
  return "empty";
}

/**
 * Which page children are shown, in which order (the page's `content` list says so), with the page-level CTAs
 * moved into the content folder after "How It Works" (or to its end).
 */
function layoutPage(page, note) {
  const entries = (page.fields.content || "")
    .split("|")
    .map((p) => p.trim().replace(/\/+$/, "").split("/").pop().toLowerCase())
    .filter(Boolean);

  let children = page.children;
  if (entries.length) {
    const left = [...page.children];
    const picked = [];
    for (const entry of entries) {
      // "ctas-mobile" in the content list is the item called "ctas" under the page.
      const at = left.findIndex((c) => c.key === entry || entry.startsWith(`${c.key}-`) || c.key.startsWith(`${entry}-`));
      if (at === -1) note(`The page lists “${entry}”, but no item with that name was found under it.`);
      else picked.push(...left.splice(at, 1));
    }
    left.forEach((c) => note(`“${c.name}” is under the page but not in its content list, so it isn't shown.`));
    children = picked;
  }

  const ctas = children.filter(isCtaFolder);
  const content = children.find((c) => c.key === "content");
  if (ctas.length && content) {
    const kids = content.children;
    const at = kids.findIndex((k) => k.key === CTA_AFTER);
    const merged = at === -1 ? [...kids, ...ctas] : [...kids.slice(0, at + 1), ...ctas, ...kids.slice(at + 1)];
    children = children.filter((c) => !isCtaFolder(c)).map((c) => (c === content ? { ...c, children: merged } : c));
  }
  return children;
}

const PICTURE_WIDTHS = [320, 480, 640, 800, 1024];

/**
 * Render the page tree to the live page's HTML.
 *   options.loggedIn  – evaluates "User.LoggedIn" conditions (default: logged out)
 *   options.brand     – { domain } from lib/brands.js: links and images move to that site
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

  // <h3 class="pc-h h4-v2 mb-2" id="defaultpagetitle"> Title </h3>: text from `title`, tag and classes from the
  // "title-tag" / "title-class" parameters, id from the item's key.
  const renderHeader = (node) => {
    const text = firstField(node, HEADER_KEYS).trim();
    if (!text) return "";
    const tag = Number(/^h?([1-6])$/i.exec(node.params["title-tag"] || "")?.[1]) || 3;
    const cls = ["pc-h", node.params["title-class"]].filter(Boolean).join(" ");
    return `<vn-pc-component-header-v2 class="pc-header"><h${tag} class="${esc(cls)}" id="${esc(node.key)}"> ${esc(text)} </h${tag}></vn-pc-component-header-v2>`;
  };

  const renderImage = (node, cls) => {
    const img = imageInfo(node);
    let inner = "";
    if (img) {
      const src = swapMediaHost(img.src, brand?.domain);
      const sources = PICTURE_WIDTHS.map((w) => `<source media="(max-width: ${w}px)" srcset="${esc(src)}?p=width${w}">`).join("");
      inner =
        `<vn-picture imgclass="pc-img"><picture>${sources}` +
        `<img class="pc-img" src="${esc(src)}" alt="${esc(img.alt)}"${img.width ? ` width="${esc(img.width)}"` : ""}>` +
        `</picture></vn-picture>`;
    }
    return `<vn-pc-image class="${cls}">${inner}</vn-pc-image>`;
  };

  const renderNode = (node) => {
    if (!visible(node)) return "";
    const own = node.fields.class || "";
    switch (kindOf(node)) {
      case "folder": {
        let kids = node.children.filter(visible);
        const max = parseInt(node.fields.maxitems, 10);
        if (max > 0) kids = kids.slice(0, max);
        return `<vn-pc-component-folder class="${classes(own, "pc-component", "pc-folder")}">${kids.map(renderNode).join("")}</vn-pc-component-folder>`;
      }
      case "text":
        return (
          `<vn-pc-text class="${classes(own, "pc-component", "pc-text")}">${renderHeader(node)}` +
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

  const cols = /^pm(\d+)col/.exec(tree.template)?.[1] ?? "1";
  const html =
    `<div id="main-content"><vn-public-page-loader class="public-page-container"><vn-page-matrix class="page-matrix">` +
    `<vn-pm-${cols}col-page class="pm-${cols}col pm-page pm-simple-layout">${layoutPage(tree, note).map(renderNode).join("")}</vn-pm-${cols}col-page>` +
    `</vn-page-matrix></vn-public-page-loader></div>`;
  return { html, notes };
}

/* -------------------------------------------------------------------------- */
/* Checker fields                                                              */
/* -------------------------------------------------------------------------- */

/** "DefaultHowItWorks" -> "How It Works" */
const labelOf = (name) => name.replace(/^Default/, "").replace(/([a-z])([A-Z])/g, "$1 $2").trim() || name;

/**
 * The text fields of the page (the items under its content folder, in page order) for the HTML checker.
 *   defs   – [{ key, label, prefill?, code? }] in the checker's format
 *   values – { key: value } as authored in Sitecore (links still on nj.betmgm.com)
 * Naming: an item's text is stored under the item's key ("defaulthowitworks"); its title under "<key>title" — or
 * under the key itself when the item has no text (the page title).
 */
export function extractMppV2Fields(tree) {
  const top = layoutPage(tree, () => {});
  const content = top.find((c) => c.key === "content");
  const roots = content ? [content] : top.filter((c) => !isCtaFolder(c) && !["customstyles", "backbanner"].includes(c.key));

  const defs = [];
  const values = {};
  const walk = (node) => {
    const kind = kindOf(node);
    if (isCtaFolder(node)) return; // buttons, not copy to check
    if (kind === "folder") return node.children.forEach(walk);
    if (kind !== "text" && kind !== "toggle") return;
    const title = firstField(node, HEADER_KEYS).trim();
    const text = firstField(node, TEXT_KEYS);
    const label = labelOf(node.name);
    if (title && text) {
      defs.push({ key: `${node.key}title`, label: `${label} Title` });
      values[`${node.key}title`] = title;
    } else if (title) {
      defs.push({ key: node.key, label });
      values[node.key] = title;
    }
    if (text) {
      defs.push({ key: node.key, label, prefill: true, code: true });
      values[node.key] = text;
    }
  };
  roots.forEach(walk);
  return { defs, values };
}

/* -------------------------------------------------------------------------- */
/* Site (links and images follow the site the page is on)                      */
/* -------------------------------------------------------------------------- */

const HOST_ALTERNATION = [...new Set(ALL_BRAND_DOMAINS)]
  .sort((a, b) => b.length - a.length)
  .map((d) => d.replace(/\./g, "\\."))
  .join("|");
// Only the bare host (optionally with www.) counts, so media hosts like casinogames.borgataonline.com keep pointing where they are.
const SITE_HOST_RE = new RegExp(`^(\\s*(?:https?:)?\\/\\/(?:www\\.)?)(?:${HOST_ALTERNATION})(?=[/:?#\\s]|$)`, "i");

/** `href` with the host of any known brand site replaced by `domain`; everything else is returned untouched. */
export function swapSiteHost(href, domain) {
  return domain ? href.replace(SITE_HOST_RE, (_, prefix) => `${prefix}${domain}`) : href;
}

/** Page images are authored on scmedia.nj.betmgm.com; the live page serves them from scmedia.<site>. */
export function swapMediaHost(src, domain) {
  return domain ? src.replace(/^(\s*(?:https?:)?\/\/)scmedia\.nj\.betmgm\.com(?=[/:?#\s]|$)/i, `$1scmedia.${domain}`) : src;
}

/** Point links at the site the page is on (brand.domain). Only anchors are touched: images, media and text stay as they are. */
export function applyBrand(html, brand) {
  if (!html || !brand?.domain) return html;
  return html.replace(/<a\b[^>]*>/gi, (tag) =>
    tag.replace(/(\bhref\s*=\s*)(["'])(.*?)\2/i, (_, pre, q, url) => `${pre}${q}${swapSiteHost(url, brand.domain)}${q}`),
  );
}
