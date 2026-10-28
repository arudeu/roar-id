// ACQ LP: acquisition landing pages (Sitecore template "promosimplecontent").
//
// The item holds the whole page: `styleheader` (CSS), `content` (header + hero + steps + terms + footer as HTML) and
// the child items hero / steps / terms whose "parameters" and text feed the sections.
//
//   buildAcqDocument(tree, opts)  -> { html, notes }  a complete HTML document for an <iframe srcdoc>
//   extractAcqFields(tree)        -> { defs, values }  the fields for the HTML checker
//   applyContentFilters(html, ctx) evaluates data-content-filter="..." like the live page does
//
// Pure JS (no DOM), so it also runs in the tests.

import { applyBrand, findSitePath } from "./mppv2.js";
import { evalCondition } from "./conditions.js";

/* -------------------------------------------------------------------------- */
/* data-content-filter                                                         */
/* -------------------------------------------------------------------------- */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const TAG_SOURCE = String.raw`<([a-zA-Z][\w:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>`;
const FILTER_RE = /\s+data-content-filter\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

/** Index just after the closing tag of the element opened right before `from` (or `from` itself when it never closes). */
function elementEnd(html, name, from) {
  const re = new RegExp(`<(/?)${name}\\b[^>]*?(/?)>`, "gi");
  re.lastIndex = from;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) depth -= 1;
    else if (!m[2]) depth += 1;
    if (depth === 0) return re.lastIndex;
  }
  return from;
}

/**
 * Keeps elements whose data-content-filter holds (dropping the attribute) and removes the others with everything in them.
 * ctx = { label, mobile, android, ios, loggedIn } — see lib/conditions.js. Unevaluable conditions keep the element.
 */
export function applyContentFilters(html, ctx = {}, unknown = []) {
  const re = new RegExp(TAG_SOURCE, "g");
  let out = "";
  let pos = 0;
  let m;
  while ((m = re.exec(html))) {
    const filter = FILTER_RE.exec(m[2]);
    if (!filter) continue;
    out += html.slice(pos, m.index);
    const expr = filter[1] ?? filter[2];
    const unresolved = [];
    if (evalCondition(expr, ctx, unresolved)) {
      // A condition that can't be evaluated keeps its element; the expression stays on it as data-unresolved-filter
      // so the caller can report it (only if the element ends up in the page).
      out += m[0].replace(FILTER_RE, unresolved.length ? ` data-unresolved-filter="${expr.replace(/"/g, "&quot;")}"` : "");
      unknown.push(...unresolved);
      pos = re.lastIndex;
    } else {
      pos = m[3] || VOID.has(m[1].toLowerCase()) ? re.lastIndex : elementEnd(html, m[1], re.lastIndex);
      re.lastIndex = pos;
    }
  }
  return out + html.slice(pos);
}

/** Page HTML without anything that would run or load outside the preview: comments, scripts, stylesheet links, inline handlers. */
export function cleanPageHtml(html) {
  return String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "");
}

/* -------------------------------------------------------------------------- */
/* Item lookups                                                                */
/* -------------------------------------------------------------------------- */

/** The first item called `key` anywhere in the tree. */
export function findItem(node, key) {
  for (const c of node.children) {
    if (c.key === key) return c;
    const inner = findItem(c, key);
    if (inner) return inner;
  }
  return null;
}

const stepNumbers = (params) =>
  [...new Set(Object.keys(params).map((k) => /^step-(\d+)-(?:title|copy)$/.exec(k)?.[1]).filter(Boolean).map(Number))].sort((a, b) => a - b);

/* -------------------------------------------------------------------------- */
/* Sections                                                                    */
/* -------------------------------------------------------------------------- */

/** The page sections the preview shows, by class, in page order (the page also has a footer and a sticky bar, which are left out). */
export const PREVIEW_SECTIONS = ["hero", "steps", "tyc"];

/** The first <section> whose class list has `cls`, whole (nested sections included), or "". */
export function extractSection(html, cls) {
  const re = /<section\b[^>]*?\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (!(m[1] ?? m[2]).split(/\s+/).includes(cls)) continue;
    const end = elementEnd(html, "section", re.lastIndex);
    return end > re.lastIndex ? html.slice(m.index, end) : "";
  }
  return "";
}

/** The first <name>…</name> element of `html` (nested ones included), or "". */
export function extractElement(html, name) {
  const open = new RegExp(`<${name}\\b[^>]*>`, "i").exec(html);
  if (!open) return "";
  const from = open.index + open[0].length;
  const end = elementEnd(html, name, from);
  return end > from ? html.slice(open.index, end) : "";
}

const attrOf = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  return m ? (m[1] ?? m[2]) : "";
};
const textOf = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/**
 * A compact header from the page's own header (filters already applied): ONE site logo, ONE log in button and ONE
 * sign up button, plus the header's own <style> blocks. Everything else in the header is dropped.
 * Returns { html, missing } — `missing` names what couldn't be found.
 */
export function compactHeader(headerHtml) {
  const styles = [...headerHtml.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0]);
  const plain = headerHtml.replace(/<style\b[\s\S]*?<\/style>/gi, "");

  const imgs = [...plain.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const logoTag = imgs.find((t) => attrOf(t, "class").split(/\s+/).includes("brand-logo")) ?? imgs[0];
  // Plain <img>: the page hides one of its logos per screen size with classes, and a single copy must always show.
  const logo = logoTag ? `<img src="${attrOf(logoTag, "src")}" alt="${attrOf(logoTag, "alt")}">` : "";

  const anchors = [...plain.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map((m) => m[0]);
  const login = anchors.find((a) => /log\s*-?\s*in/i.test(textOf(a)) || /login/i.test(attrOf(a, "href")));
  const signup = anchors.find((a) => a !== login && (/sign\s*-?\s*up|register|join/i.test(textOf(a)) || /register/i.test(attrOf(a, "href"))));

  const missing = [!logo && "logo", !login && "log in button", !signup && "sign up button"].filter(Boolean);
  const html =
    `<header class="lp-header">${styles.join("")}<nav class="lp-nav"><div class="header-logos">${logo}</div>` +
    `<div class="nav-button-container">${login ?? ""}${signup ?? ""}</div></nav></header>`;
  return { html, missing };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** hero + steps + terms built from the child items' parameters, for an item whose `content` field is empty. */
function pageFromParameters(tree) {
  const hero = findItem(tree, "hero")?.params ?? {};
  const steps = findItem(tree, "steps")?.params ?? {};
  const terms = findItem(tree, "terms");

  const heroBg = hero.bg ? ` style="background-image:url('${esc(hero.bg)}')"` : "";
  return (
    `<section class="hero"${heroBg}><div class="hero-container">` +
    (hero.img ? `<img src="${esc(hero.img)}" class="hero-img" alt="${esc(hero["img-alt"])}">` : "") +
    `</div>${hero["mobile-bg"] ? `<img src="${esc(hero["mobile-bg"])}" class="hero-mobile-img" alt="">` : ""}</section>` +
    `<section class="steps"><div class="l-wrapper"><div class="steps-list">` +
    stepNumbers(steps)
      .map(
        (n) =>
          `<div class="steps-item"><span class="steps-circle">${n}</span><div class="steps-content">` +
          `<p class="steps-title">${esc(steps[`step-${n}-title`])}</p><p class="steps-copy">${esc(steps[`step-${n}-copy`])}</p></div></div>`,
      )
      .join("") +
    `</div></div></section>` +
    `<section class="tyc"><div class="l-wrapper"><div class="tyc-container">` +
    `<input class="tyc-toggle h-hide" aria-hidden="true" type="checkbox" name="tyc-checkbox" id="tyc-checkbox">` +
    `<label class="tyc-title" for="tyc-checkbox">${esc(terms?.fields.title)}</label>` +
    `<div class="tyc-content">${terms?.fields.text ?? ""}</div></div></div></section>`
  );
}

/**
 * Request.AbsolutePath of the live page, from the item's path in the content tree:
 * ".../m2.borgataonline.com/engage/lan/casino/thanksgiving/hero" -> "/en/promo/lan/casino/thanksgiving"
 * (the product folder — sports, casino, poker — is what the page's conditions look at).
 */
export function pageUrlPath(sitePath) {
  const parts = String(sitePath || "").split("/").filter(Boolean);
  const at = parts.indexOf("engage");
  const rest = at >= 0 ? parts.slice(at + 1) : parts.slice(-3);
  if (rest.length > 2 && ["hero", "steps", "terms"].includes(rest[rest.length - 1])) rest.pop(); // a child item's path
  return `/en/promo/${rest.join("/")}`;
}

/**
 * A complete HTML document for an iframe: the item's `styleheader` as CSS and its `content` as the body.
 *   options.mobile  – Device.IsMobile (the mobile version of the page)
 *   options.label   – App.Label, the site the page is on (e.g. "borgataonline.com")
 *   options.brand   – { domain }: links to a brand site follow the site the page is on
 *   options.year    – replaces {year} (the page's own script does this in the browser)
 * Kept: a compact header (one logo, log in, sign up) and the PREVIEW_SECTIONS (hero, terms).
 */
export function buildAcqDocument(tree, options = {}) {
  const { mobile = false, label = "", brand = null, year = new Date().getFullYear() } = options;
  const absolutePath = options.absolutePath ?? pageUrlPath(findSitePath(tree));
  const host = options.host ?? (label ? `www.${label}` : "");
  const notes = [];

  let body = tree.fields.content || "";
  if (!body.trim()) {
    body = pageFromParameters(tree);
    notes.push("The item has no content, so the hero, steps and terms are built from their parameters.");
  }
  // Variants of a section (per product, device or site) are resolved first, then the sections are cut out.
  body = applyContentFilters(cleanPageHtml(body), { label, mobile, absolutePath, host }, []);

  // The header is cut down to a logo and two buttons; of the rest only the hero, steps and terms stay (no footer or sticky bar).
  const headerSource = extractElement(body, "header");
  let header = "";
  if (headerSource) {
    const compact = compactHeader(headerSource);
    header = compact.html;
    if (compact.missing.length) notes.push(`No ${compact.missing.join(", ")} found in the header.`);
  } else if (tree.fields.content?.trim()) {
    notes.push("No header found in the content.");
  }
  const sections = PREVIEW_SECTIONS.map((cls) => {
    const html = extractSection(body, cls);
    if (!html) notes.push(`No “${cls}” section found in the content.`);
    return html;
  }).filter(Boolean);
  body = applyBrand(`${header}<main class="lp-main">${sections.join(" ")}</main>`, brand).replace(/\{year\}/g, String(year));
  // Report conditions that couldn't be evaluated, but only those inside the sections that are shown.
  const unresolved = new Set([...body.matchAll(/\sdata-unresolved-filter="([^"]*)"/g)].map((m) => m[1].replace(/&quot;/g, '"')));
  unresolved.forEach((u) => notes.push(`Condition “${u}” isn't evaluated, the element is shown.`));
  body = body.replace(/\sdata-unresolved-filter="[^"]*"/g, "");
  if (!tree.fields.styleheader) notes.push("The item has no styleheader, so the page is unstyled.");

  const css = String(tree.fields.styleheader || "").replace(/<\/style/gi, "<\\/style");
  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank">` +
    `<style>${css}</style>${header ? "" : "<style>.lp-main{padding-top:0!important}</style>"}</head><body>${body}</body></html>`;
  return { html, notes };
}

/* -------------------------------------------------------------------------- */
/* Checker fields                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Fields for the HTML checker, all prefilled from Sitecore:
 *   hero  (parameters): bg, img, img-alt, mobile-bg
 *   steps (parameters): step-N-title / step-N-copy for every step found (1-3 when none)
 *   terms (text)
 */
export function extractAcqFields(tree) {
  const hero = findItem(tree, "hero")?.params ?? {};
  const steps = findItem(tree, "steps")?.params ?? {};
  const terms = findItem(tree, "terms");

  const defs = [];
  const values = {};
  const add = (key, label, value, extra = {}) => {
    defs.push({ key, label, prefill: true, ...extra });
    values[key] = value ?? "";
  };

  add("hero-bg", "Background Image", hero.bg);
  add("hero-img", "PNG", hero.img);
  add("hero-img-alt", "Image Alt", hero["img-alt"]);
  add("hero-mobile-bg", "Mobile BG", hero["mobile-bg"]);

  const nums = stepNumbers(steps);
  for (const n of nums.length ? nums : [1, 2, 3]) {
    add(`step-${n}-title`, `Step ${n} Title`, steps[`step-${n}-title`]);
    add(`step-${n}-copy`, `Step ${n} Copy`, steps[`step-${n}-copy`]);
  }

  add("terms", "Terms and Conditions", terms?.fields.text, { code: true });
  return { defs, values };
}
