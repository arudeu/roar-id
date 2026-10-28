import test from "node:test";
import assert from "node:assert/strict";
import { parseMppV2, findSitePath } from "../lib/mppv2.js";
import { applyContentFilters, buildAcqDocument, compactHeader, extractAcqFields, extractElement, extractSection, cleanPageHtml, findItem, pageUrlPath } from "../lib/acqlp.js";
import { evalCondition } from "../lib/conditions.js";
import { detectBrand } from "../lib/brands.js";
import { detectPageType } from "../lib/sitecore.js";
import { ACQ_XML, HERO_PARAMS, STEPS_PARAMS, TERMS } from "./fixtures/acqlp-fixture.mjs";

const tree = parseMppV2(ACQ_XML);
const brand = detectBrand(findSitePath(tree));
const bodyOf = (html) => html.slice(html.indexOf("<body>")); // the CSS in <head> names every class of the page
const build = (o = {}) => buildAcqDocument(tree, { label: brand.domain, brand, year: 2026, ...o });

test("tree: the page fields and the hero / steps / terms items", () => {
  assert.equal(tree.template, "promosimplecontent");
  assert.ok(tree.fields.styleheader.startsWith("@font-face"));
  assert.deepEqual(tree.children.map((c) => c.key), ["hero", "steps", "terms"]);
  assert.deepEqual(findItem(tree, "hero").params, HERO_PARAMS); // entities decoded: "Spin & Score"
  assert.equal(findItem(tree, "steps").params["step-2-title"], "SET");
});

test("site: found from the item paths (the content field is HTML here, not a path list)", () => {
  assert.ok(findSitePath(tree).includes("m2.borgataonline.com"));
  assert.deepEqual([brand.domain, brand.name], ["borgataonline.com", "Borgata Online"]);
});

test("conditions: App.Label, Device.* and combinations", () => {
  const c = { label: "borgataonline.com", mobile: false };
  assert.equal(evalCondition("App.Label = 'borgataonline.com'", c), true);
  assert.equal(evalCondition("App.Label = 'pa.borgataonline.com'", c), false);
  assert.equal(evalCondition("App.Label IN ['pa.borgataonline.com']", c), false);
  assert.equal(evalCondition("App.Label IN ['x.com', 'BORGATAONLINE.com']", c), true);
  assert.equal(evalCondition("NOT Device.IsMobile", c), true);
  assert.equal(evalCondition("Device.IsMobile", { ...c, mobile: true }), true);
  assert.equal(evalCondition("Device.IsMobile AND Device.IsIOS", { mobile: true, ios: false }), false);
  assert.equal(evalCondition("Device.IsMobile AND NOT Device.IsIOS", { mobile: true, ios: false }), true);
  const unknown = [];
  assert.equal(evalCondition("Geo.Country = 'US'", c, unknown), true);
  assert.deepEqual(unknown, ["Geo.Country = 'US'"]);
});

test("filters: failing elements go with everything inside, passing ones lose the attribute, nesting works", () => {
  const html = '<div class="a" data-content-filter="Device.IsMobile"><div><p>m</p></div><img src="x"></div><p>keep</p><div data-content-filter=\'NOT Device.IsMobile\' id="d"><span data-content-filter="Device.IsMobile">no</span>yes</div><br data-content-filter="Device.IsMobile"><i>end</i>';
  assert.equal(applyContentFilters(html, { mobile: false }), '<p>keep</p><div id="d">yes</div><i>end</i>');
  assert.equal(applyContentFilters(html, { mobile: true }), '<div class="a"><div><p>m</p></div><img src="x"></div><p>keep</p><br><i>end</i>');
  assert.equal(applyContentFilters('<div data-content-filter="Device.IsMobile"><div>x</div></div>after', { mobile: false }), "after");
});

test("document: styleheader as CSS, a compact header, then the hero, steps and terms sections", () => {
  const { html } = build();
  assert.match(html, /^<!doctype html><html lang="en"><head><meta charset="utf-8">/);
  assert.ok(html.includes("<style>@font-face"));
  assert.match(html, /<body><header class="lp-header">[^]*<\/header><main class="lp-main"><section class="hero">/);
  assert.match(html, /<\/section> <section class="steps">[^]*<\/section> <section class="tyc">/); // page order
  assert.equal((html.match(/<section\b/g) || []).length, 3);
  // the footer and the sticky bar are gone
  assert.doesNotMatch(bodyOf(html), /<footer|class="sticky-bar"|Borgata Casino|Copyright/);
  assert.doesNotMatch(html, /<script|<link|<!--|\son[a-z]+=|data-content-filter/i);
  assert.ok(!html.includes(".lp-main{padding-top:0!important}"), "the mobile layout keeps the room for the fixed header");
});

test("header: exactly one logo, one log in and one sign up, with the header's own styles", () => {
  const body = bodyOf(build().html);
  const header = extractElement(body, "header");
  assert.equal((header.match(/<img\b/g) || []).length, 1);
  assert.match(header, /<img src="https:\/\/scmedia\.itsfogo\.com\/\$-\$\/8aa87cace9824f0e895d41fa8accbc35\.svg" alt="Borgata Online NJ">/);
  assert.equal((header.match(/<a\b/g) || []).length, 2);
  assert.match(header, />LOG IN<\/a>\s*<a class="button button-primary nav-button"[^>]*>SIGN UP<\/a>/);
  assert.match(header, /href="https:\/\/www\.borgataonline\.com\/en\/labelhost\/login"/);
  assert.match(header, /<style> \.lp-nav \{/);
  assert.doesNotMatch(header, /<img[^>]*mobile-logo|pa-only-rule/); // no second (PA) logo element, no PA-only rules
});

test("header: duplicates and extras are dropped, the logo stays visible on every screen", () => {
  const raw = '<header class="x"><style>.lp-nav{}</style><nav><div class="header-logos"><img src="a.svg" alt="A" class="mobile-logo"><img src="b.svg" alt="B" class="brand-logo"><img src="b2.svg" alt="B2" class="brand-logo"></div><ul><li><a href="/faq">FAQ</a></li></ul>' +
    '<a href="/login" class="button">Log In</a><a href="/login2" class="button">LOG IN</a><a href="/reg?x=1" class="button">Sign Up</a><a href="/reg2" class="button">SIGN UP</a></nav></header>';
  const { html, missing } = compactHeader(raw);
  assert.deepEqual(missing, []);
  assert.equal(html, '<header class="lp-header"><style>.lp-nav{}</style><nav class="lp-nav"><div class="header-logos"><img src="b.svg" alt="B"></div><div class="nav-button-container"><a href="/login" class="button">Log In</a><a href="/reg?x=1" class="button">Sign Up</a></div></nav></header>');
  assert.deepEqual(compactHeader("<header><nav></nav></header>").missing, ["logo", "log in button", "sign up button"]);
});

test("document: the terms section is whole, with its checkbox toggle", () => {
  const { html } = build();
  assert.ok(html.includes('<input class="tyc-toggle h-hide" aria-hidden="true" type="checkbox" name="tyc-checkbox" id="tyc-checkbox" />'));
  assert.ok(html.includes('<label class="tyc-title" for="tyc-checkbox">TERMS & CONDITIONS</label>'));
  assert.ok(html.includes(TERMS));
});

test("document: the steps section is whole, with its three steps", () => {
  const body = bodyOf(build().html);
  const steps = extractSection(body, "steps");
  assert.equal((steps.match(/class="steps-item"/g) || []).length, 3);
  for (const [n, title] of [[1, "READY"], [2, "SET"], [3, "GO"]]) assert.ok(steps.includes(`<span class="steps-circle">${n}</span>`) && steps.includes(`<p class="steps-title">${title}</p>`));
  assert.ok(steps.includes(STEPS_PARAMS["step-3-copy"]));
});

test("document: desktop vs mobile follows Device.IsMobile", () => {
  const ctas = (h) => bodyOf(h).split("button-cta").length - 1;
  const desktop = build({ mobile: false }).html;
  assert.match(desktop, /class="button button-primary button-cta">SIGN UP<\/a>/); // hero CTA shown on desktop
  assert.equal(ctas(desktop), 1);
  const mobile = build({ mobile: true }).html;
  assert.equal(ctas(mobile), 0, "the hero CTA is for desktop only; the mobile CTA lived in the removed sticky bar");
  assert.match(mobile, /class="hero-mobile-img"/); // the mobile image stays (the CSS decides which one shows)
});

test("document: links follow the site", () => {
  const { html } = build();
  assert.match(html, /href="https:\/\/www\.borgataonline\.com\/en\/mobileportal\/register\?productId=CASINO"/);
  assert.doesNotMatch(html, /nj\.betmgm\.com/);
});

test("sections: found by class, nested content kept, missing ones reported", () => {
  const page = '<header>h</header><section class="x hero"><div><section class="inner">i</section></div></section><section id="a" class="tyc">t</section>';
  assert.equal(extractSection(page, "hero"), '<section class="x hero"><div><section class="inner">i</section></div></section>');
  assert.equal(extractSection(page, "tyc"), '<section id="a" class="tyc">t</section>');
  assert.equal(extractSection(page, "steps"), "");
  const lone = { ...tree, fields: { ...tree.fields, content: '<section class="hero">only</section>' } };
  const { notes } = buildAcqDocument(lone, { label: "borgataonline.com", brand });
  assert.ok(notes.some((n) => /No “tyc” section/.test(n)));
});

test("document: an item without content is built from the hero / steps / terms parameters", () => {
  const bare = { ...tree, fields: { ...tree.fields, content: "" } };
  const { html, notes } = buildAcqDocument(bare, { label: "borgataonline.com", brand });
  assert.ok(notes.some((n) => /built from their parameters/.test(n)));
  assert.ok(html.includes(`<img src="${HERO_PARAMS.img}" class="hero-img" alt="Spin &amp; Score Up To 1,000 Bonus Spins, When You Pick Your Deposit Bonus">`));
  assert.ok(html.includes('<p class="steps-title">SET</p><p class="steps-copy">Choose your Deposit Bonus</p>'));
  assert.ok(html.includes('<label class="tyc-title" for="tyc-checkbox">TERMS &amp; CONDITIONS</label>'));
  assert.ok(html.includes(TERMS));
});

test("checker fields: hero, steps and terms, all prefilled from Sitecore", () => {
  const { defs, values } = extractAcqFields(tree);
  assert.deepEqual(defs.map((d) => [d.key, d.label]), [
    ["hero-bg", "Background Image"], ["hero-img", "PNG"], ["hero-img-alt", "Image Alt"], ["hero-mobile-bg", "Mobile BG"],
    ["step-1-title", "Step 1 Title"], ["step-1-copy", "Step 1 Copy"],
    ["step-2-title", "Step 2 Title"], ["step-2-copy", "Step 2 Copy"],
    ["step-3-title", "Step 3 Title"], ["step-3-copy", "Step 3 Copy"],
    ["terms", "Terms and Conditions"],
  ]);
  assert.ok(defs.every((d) => d.prefill));
  assert.deepEqual(defs.filter((d) => d.code).map((d) => d.key), ["terms"]);
  assert.equal(values["hero-bg"], HERO_PARAMS.bg);
  assert.equal(values["hero-img"], HERO_PARAMS.img);
  assert.equal(values["hero-img-alt"], "Spin & Score Up To 1,000 Bonus Spins, When You Pick Your Deposit Bonus");
  assert.equal(values["hero-mobile-bg"], HERO_PARAMS["mobile-bg"]);
  assert.equal(values["step-1-copy"], STEPS_PARAMS["step-1-copy"]);
  assert.equal(values["step-3-title"], "GO");
  assert.equal(values.terms, TERMS);
});

test("checker fields: follows the steps that exist, empty values for what's missing", () => {
  const two = { ...tree, children: tree.children.map((c) => (c.key === "steps" ? { ...c, params: { "step-1-title": "A", "step-2-copy": "B", "step-4-title": "D" } } : c.key === "hero" ? { ...c, params: {} } : c)) };
  const { defs, values } = extractAcqFields(two);
  assert.deepEqual(defs.filter((d) => d.key.startsWith("step-")).map((d) => d.key), ["step-1-title", "step-1-copy", "step-2-title", "step-2-copy", "step-4-title", "step-4-copy"]);
  assert.equal(values["step-2-title"], "");
  assert.equal(values["step-2-copy"], "B");
  assert.equal(values["hero-img"], "");
});

test("detect: promosimplecontent items are ACQ LP pages", () => {
  const d = detectPageType({}, {}, [], "promosimplecontent");
  assert.equal(d.type, "acqlp");
  assert.deepEqual(d.modes, ["acqlp"]);
  assert.equal(d.isAcqLp, true);
  assert.equal(detectPageType({}, {}, [], "pm1colpage").type, "mppv2");
});

test("clean: comments, scripts, stylesheet links and handlers are removed", () => {
  assert.equal(cleanPageHtml('<!-- c --><script>x()</script><link rel="stylesheet" href="a.css"><a onclick="x()" href="#">y</a>'), '<a href="#">y</a>');
});

test("conditions: Request.AbsolutePath CONTAINS / Request.Host MATCHES", () => {
  const c = { absolutePath: "/en/promo/lan/casino/thanksgiving", host: "www.borgataonline.com" };
  assert.equal(evalCondition("Request.AbsolutePath CONTAINS '/casino/'", c), true);
  assert.equal(evalCondition('Request.AbsolutePath CONTAINS "/casino/"', c), true);
  assert.equal(evalCondition("Request.AbsolutePath CONTAINS '/sports/'", c), false);
  assert.equal(evalCondition("Request.AbsolutePath CONTAINS '/poker/'", c), false);
  assert.equal(evalCondition("NOT Request.AbsolutePath CONTAINS '/sports/'", c), true);
  assert.equal(evalCondition("Request.AbsolutePath CONTAINS '/casino/' AND Request.AbsolutePath CONTAINS '/poker/'", c), false);
  assert.equal(evalCondition("Request.Host MATCHES 'promo.betmgm.com'", c), false);
  assert.equal(evalCondition("Request.Host MATCHES 'promo.nj.betmgm.com'", c), false);
  assert.equal(evalCondition("Request.Host MATCHES 'borgataonline\\.com$'", c), true);
  assert.equal(evalCondition("Request.Host MATCHES '(broken'", c), false); // bad pattern: falls back to equality
  const unknown = [];
  assert.equal(evalCondition("Request.AbsolutePath CONTAINS '/casino/'", c, unknown), true);
  assert.deepEqual(unknown, []);
});

test("page path: from the item path in the content tree", () => {
  assert.equal(pageUrlPath(findSitePath(tree)), "/en/promo/lan/casino/thanksgiving");
  assert.equal(pageUrlPath("/vanilla.mobile/m2.borgataonline.com/engage/lan/sports/nhl/hero"), "/en/promo/lan/sports/nhl");
});

test("document: product variants and Request.Host rules are resolved, only the hero and terms are kept, no noise from the header / footer", () => {
  const variant = (cond, name) => `<div data-content-filter="${cond}"><section class="hero" data-name="${name}"><div class="hero-container"><img class="hero-img" src="${name}.png" alt=""></div></section></div>`;
  const content =
    `<header class="lp-header"><div class="header-logos"><img src="logo.svg" alt="L"></div><div data-content-filter="Request.Host MATCHES 'promo.betmgm.com'">promo header</div><div data-content-filter="Geo.Region = 'NJ'">geo header</div><a href="/login">LOG IN</a><a href="/register">SIGN UP</a></header>` +
    `<main class="lp-main">` +
    variant("Request.AbsolutePath CONTAINS '/sports/'", "sports") + variant("Request.AbsolutePath CONTAINS '/casino/'", "casino") + variant('Request.AbsolutePath CONTAINS "/poker/"', "poker") +
    `<section class="steps">steps</section>` +
    `<section class="tyc"><div data-content-filter="Region.Code = 'XX'">regional terms</div><div class="tyc-content">${TERMS}</div></section></main>` +
    `<footer class="lp-footer"><div data-content-filter="Request.Host MATCHES 'promo.nj.betmgm.com'">promo footer</div></footer>`;
  const page = { ...tree, fields: { ...tree.fields, content } };
  const { html, notes } = buildAcqDocument(page, { label: "borgataonline.com", brand });
  const body = bodyOf(html);
  assert.equal((body.match(/<section\b/g) || []).length, 3); // hero (casino variant), steps, terms
  assert.match(body, /data-name="casino"/);
  assert.doesNotMatch(body, /data-name="sports"|data-name="poker"/);
  assert.doesNotMatch(body, /promo header|promo footer|geo header|data-unresolved-filter|data-content-filter/);
  assert.ok(body.includes("regional terms"), "an element with a condition that can't be evaluated is kept");
  // only the condition inside a shown section is reported, once
  assert.deepEqual(notes, ["Condition “Region.Code = 'XX'” isn't evaluated, the element is shown."]);
  assert.match(body, /^<body><header class="lp-header">/);
  // sports / poker pages pick their own variant
  const sports = buildAcqDocument(page, { label: "borgataonline.com", brand, absolutePath: "/en/promo/lan/sports/nhl" }).html;
  assert.match(bodyOf(sports), /data-name="sports"/);
  assert.doesNotMatch(bodyOf(sports), /data-name="casino"/);
});
