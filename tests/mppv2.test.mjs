import test from "node:test";
import assert from "node:assert/strict";
import {
  parseXml, parseMppV2, parseParams, mergeParts, stubFolders, topFolders, findSitePath,
  renderMppV2, extractMppV2Fields, evalCondition, applyBrand, swapSiteHost, swapMediaHost,
} from "../lib/mppv2.js";
import { detectBrand } from "../lib/brands.js";
import { detectPageType } from "../lib/sitecore.js";

/* ------- fixtures: the NHL Pick-A-Puck page as the API returns it -------------------- */

const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const field = (key, type, value) => `<field key="${key}" type="${type}"><content>${x(value)}</content></field>`;
const params = (o) =>
  field("parameters", "Bwin Name Value List Sorted", `<bwinnamevalue>${Object.entries(o).map(([k, v]) => `<entry key="${k}">${v}</entry>`).join("")}</bwinnamevalue>`);
const item = (name, template, id, path, fields, kids = "") =>
  `<item name="${name}" key="${name.toLowerCase()}" template="${template}" id="${id}" path="${path}">` +
  `<fields>${fields.join("")}</fields>${kids}</item>`;
const folder = (name, id, cls, max, kids = "") =>
  item(name, "pccomponentfolder", id, `/id/${id}`, [field("maxitems", "Integer", max), field("class", "Single-Line Text", cls)], kids);
const text = (name, id, cls, html, extra = []) =>
  item(name, "pctext", id, `${BASE}/x/${name}`, [field("text", "Rich Text", html), field("class", "Single-Line Text", cls), ...extra]);

const BASE = "/vanilla.mobile/m2.borgataonline.com/mobileportal-v1.0/publicpages/promotions/sports/nhl-pick-a-puck";
const IDS = { content: "{465BD449-282A-47F2-A3D4-10E2C14D927F}", ctas: "{86A124E0-0263-4D92-BF1B-727724433057}", back: "{57066018-8CCF-4A76-BED7-6BFD988E0EA3}" };

const GAMES = `<ul><li>Bonus Spins are valid for seven days.</li></ul> <p> <a href="https://www.nj.betmgm.com/en/casino/launchng/whitehatthegoonies"><img alt="The Goonies" src="https://casinogames.borgataonline.com/x/goonies.jpg" width="100"></a> <a href="https://www.nj.betmgm.com/en/engage/pub/launchmgc?gd=a&amp;gm=b"><img alt="G" src="https://casinogames.borgataonline.com/x/g.jpg"></a> </p>`;

// 1) the page: its folders come back empty
const PAGE_XML = `This XML file does not appear to have any style information associated with it. The document tree is shown below.
<items>` + item("nhl-pick-a-puck", "pm1colpage", "{A94A7117-EE1D-470A-A13F-65CEE8830A4F}", "/id/a94a7117-ee1d-470a-a13f-65cee8830a4f", [
  field("content", "RelativeTreelist", `${BASE}/customstyles|${BASE}/backbanner|${BASE}/content|${BASE}/ctas-mobile`),
  field("pagetitle", "Single-Line Text", "NHL® Pick-A-Puck"),
], [
  text("CustomStyles", "{3581C880}", "", '<!--<div> <link rel="stylesheet" href="http://localhost/x.css"> </div>--> <link rel="stylesheet" href="https://scmedia-us.itsfogo.com/$-$/2c03.css">'),
  folder("BackBanner", IDS.back, "p-0 back-banner mx-auto", 1),
  folder("Content", IDS.content, "mx-auto page-content", 10),
  folder("CTAs", IDS.ctas, "p-2 cta-container d-flex", 2),
  folder("CTAs", IDS.ctas, "p-2 cta-container d-flex", 2), // the export repeats it
]) + "</items>";

// 2) Content, fetched by its id
const CONTENT_XML = `<items>` + item("Content", "pccomponentfolder", IDS.content, "/id/465bd449", [field("maxitems", "Integer", 10), field("class", "Single-Line Text", "mx-auto page-content")],
  folder("TopImage", "{7A5D}", "p-0 top-image m-0 mb-3", 1,
    item("Default", "pcimage", "{16FA}", `${BASE}/content/topimage/default`, [field("image", "Image", '<img src="https://scmedia.nj.betmgm.com/$-$/0749a9158baa4e4aa60b28d3796afa5a.jpg" alt="XSELL_BS_3861900_MPP-1080x486" width="1080" height="486" />'), params({})])) +
  folder("PageTitle", "{10F4}", "p-0 page-title bottom-divider", 1,
    item("DefaultPageTitle", "pctext", "{BCC5}", `${BASE}/content/pagetitle/defaultpagetitle`, [field("class", "Single-Line Text", "p-0 m-0 page-title-content"), field("title", "Single-Line Text", "NHL® Pick-A-Puck"), params({ "expiry-date": "04/10/27, 11:59 PM", "title-class": "h4-v2 mb-2", "title-tag": "" })])) +
  folder("PromoDetails", "{631C}", "p-0 promo-details bottom-divider", 1,
    text("DefaultPromoDetails", "{81E8}", "promo-details-content", "<p>Turn big moments on the ice into even bigger thrills at the casino!</p>", [params({ "title-class": "d-none", "title-tag": "" })])) +
  folder("HowItWorks", "{228C}", "p-0 m-0 how-it-works bottom-divider", 1,
    text("DefaultHowItWorks", "{4098}", "how-it-works-content p-0 m-0 list-icon-prize", "<ol> <li>Bet $10 or more on NHL&reg; games.</li> </ol>", [field("title", "Single-Line Text", "How It Works:"), params({ "title-class": "h6-v2 mb-2", "title-tag": "" })])) +
  folder("TermsToQualify", "{CB19}", "p-0 m-0 terms-to-qualify bottom-divider", 1,
    text("DefaultTermsToQualify", "{6BED}", "terms-to-qualify-content p-0 m-0", "<ul> <li><strong>Prizes include:</strong></li> </ul>", [field("title", "Single-Line Text", "Important Details:"), params({ "title-class": "h6-v2 mb-2", "title-tag": "" })])) +
  folder("MoreInfo", "{6711}", "p-0 m-0 more-info", 1,
    text("DefaultMoreInfo", "{75D6}", "more-info-content p-0 m-0", GAMES, [field("title", "Single-Line Text", "More Info:"), params({ "title-class": "h6-v2 mb-2", "title-tag": "h1" })])) +
  folder("FullTermsAndConditions", "{7A07}", "p-0 m-0 mt-4 full-terms", 1,
    text("DefaultFullTerms", "{3ED8}", "full-terms-content p-0 m-0", '<p><strong>DESCRIPTION OF PROMOTION:</strong></p> <ul><li>Read <a style="color: #1f00ae;" href="https://www.nj.betmgm.com/en/promo/offers/grouped?filter=cb">here</a>.</li></ul>', [field("title", "Single-Line Text", "Terms & Conditions"), params({ render: "pc-toggle", "title-class": "mt-0" })]))
) + `</items>`;

// 3) CTAs, fetched by its id
const LOGIN = '<a style="background-color:#5ac8e8; color:#fff;" class="btn btn-primary btn-block" menu-action="gotoLogin">Log In</a>';
const CTAS_XML = `<items>` + item("CTAs", "pccomponentfolder", IDS.ctas, "/id/86a124e0", [field("maxitems", "Integer", 2), field("class", "Single-Line Text", "p-2 cta-container d-flex")],
  text("Login", "{C163}", "d-inline-block py-2 px-1 cta", LOGIN, [params({ "button-type": "primary" }), field("condition", "Single-Line Text", "NOT User.LoggedIn")]) +
  text("Play", "{AAAA}", "d-inline-block py-2 px-1 cta", '<a class="btn btn-primary btn-block" href="https://www.nj.betmgm.com/en/promo/offers">Play Now</a>', [field("condition", "Single-Line Text", "User.LoggedIn")])
) + `</items>`;

const BACK_XML = `<items>` + item("BackBanner", "pccomponentfolder", IDS.back, "/id/57066018", [field("maxitems", "Integer", 1), field("class", "Single-Line Text", "p-0 back-banner mx-auto")],
  text("DefaultBackBannerDesktop", "{BB01}", "back-banner-content", '<a class="back-link" href="https://www.nj.betmgm.com/en/promo/offers"><img src="https://scmedia.nj.betmgm.com/$-$/0b09.svg"></a>', [field("title", "Single-Line Text", "My Promotions"), params({ "title-class": "h5-v2" })])
) + `</items>`;

const page = parseMppV2(PAGE_XML);
const tree = mergeParts(page, [parseMppV2(CONTENT_XML), parseMppV2(CTAS_XML), parseMppV2(BACK_XML)]);
const borgata = detectBrand(findSitePath(tree));
const render = (o = {}) => renderMppV2(tree, { brand: borgata, ...o });

/* --------------------------------- tests ---------------------------------------- */

test("xml: junk before the root, entities, CDATA and self-closing tags", () => {
  const root = parseXml('hello <a x="1 &amp; 2"><b/><![CDATA[<raw>]]>&#169; &lt;ok&gt;</a>');
  assert.equal(root.name, "a");
  assert.equal(root.attrs.x, "1 & 2");
  assert.equal(root.kids.filter((k) => typeof k === "string").join(""), "<raw>© <ok>");
  assert.throws(() => parseXml("<a><b></a>"), /well-formed/);
  assert.throws(() => parseXml("no xml here"), /No XML/);
});

test("params: the parameters field becomes a map", () => {
  assert.deepEqual(parseParams('<bwinnamevalue><entry key="title-class">h4-v2 mb-2</entry><entry key="title-tag"></entry><entry key="render">pc-toggle</entry><entry key="x"/></bwinnamevalue>'),
    { "title-class": "h4-v2 mb-2", "title-tag": "", render: "pc-toggle", x: "" });
  assert.deepEqual(parseParams(""), {});
});

test("fetch plan: content and the CTA folders are fetched by id (not the back banner)", () => {
  assert.deepEqual(topFolders(page).map((s) => s.key), ["content", "ctas"]);
  assert.equal(stubFolders(tree).length, 0); // nothing left to fetch once merged
  assert.equal(tree.children.find((c) => c.key === "content").children.length, 7);
});

test("fetch plan: empty folders at any depth below are found and merged back in place", () => {
  const inner = folder("Inner", "{AAAA-1}", "inner", 1); // came back cut off
  const mid = folder("Mid", "{BBBB-2}", "mid", 1, inner);
  const top = parseMppV2(`<items>${folder("Content", "{C0C0}", "c", 5, mid)}</items>`);
  const withTop = { ...page, children: [top] };
  assert.deepEqual(stubFolders(withTop).map((f) => f.key), ["inner"]);
  // the by-id response for Inner (ids compared without braces/case)
  const innerFull = parseMppV2(`<items>${folder("Inner", "{aaaa-1}", "inner", 1, text("Leaf", "{L1}", "leaf", "<p>deep</p>"))}</items>`);
  const merged = mergeParts(withTop, [innerFull]);
  assert.equal(stubFolders(merged).length, 0);
  assert.equal(merged.children[0].children[0].children[0].children[0].fields.text, "<p>deep</p>");
  // the original is not mutated
  assert.equal(stubFolders(withTop).length, 1);
});

test("site: the root path is only /id/..., so the site comes from the content list", () => {
  assert.equal(page.path.startsWith("/id/"), true);
  assert.ok(findSitePath(page).includes("m2.borgataonline.com"));
  assert.deepEqual([borgata.domain, borgata.category], ["borgataonline.com", "sports"]);
  assert.equal(findSitePath(parseMppV2(`<items>${item("p", "pm1colpage", "{1}", "/id/1", [])}</items>`)), "");
});

test("render: structure, classes, headers and ids as on the live page", () => {
  const { html } = render();
  assert.match(html, /^<div id="main-content"><vn-public-page-loader class="public-page-container"><vn-page-matrix class="page-matrix"><vn-pm-1col-page class="pm-1col pm-page pm-simple-layout">/);
  for (const cls of [
    "back-banner mx-auto p-0 pc-component pc-folder",
    "mx-auto page-content pc-component pc-folder",
    "m-0 mb-3 p-0 pc-component pc-folder top-image",
    "bottom-divider p-0 page-title pc-component pc-folder",
    "m-0 p-0 page-title-content pc-component pc-text",
    "pc-component pc-text promo-details-content",
    "bottom-divider how-it-works m-0 p-0 pc-component pc-folder",
    "how-it-works-content list-icon-prize m-0 p-0 pc-component pc-text",
    "m-0 p-0 pc-component pc-text terms-to-qualify-content",
    "m-0 more-info-content p-0 pc-component pc-text",
    "full-terms m-0 mt-4 p-0 pc-component pc-folder",
    "full-terms-content m-0 p-0 pc-component pc-toggle",
    "cta-container d-flex p-2 pc-component pc-folder",
    "cta d-inline-block pc-component pc-text px-1 py-2",
  ]) assert.ok(html.includes(`class="${cls}"`), `missing class "${cls}"`);
  assert.match(html, /<h3 class="pc-h h4-v2 mb-2" id="defaultpagetitle"> NHL® Pick-A-Puck <\/h3>/);
  assert.match(html, /<h3 class="pc-h h6-v2 mb-2" id="defaulthowitworks"> How It Works: <\/h3>/);
  assert.match(html, /<h3 class="pc-h h6-v2 mb-2" id="defaulttermstoqualify"> Important Details: <\/h3>/);
  assert.match(html, /<h1 class="pc-h h6-v2 mb-2" id="defaultmoreinfo"> More Info: <\/h1>/);
  assert.match(html, /<h3 class="pc-h h5-v2" id="defaultbackbannerdesktop"> My Promotions <\/h3>/);
  // page title item has no text -> empty pc-txt, like the live page
  assert.match(html, /id="defaultpagetitle"[^]*?<\/vn-pc-component-header-v2><div class="pc-txt"><\/div><\/vn-pc-text>/);
  // promo details has no title -> no header
  assert.match(html, /promo-details-content"><div class="pc-txt"><p>Turn big moments/);
});

test("render: order follows the content list, CTA sits after How It Works, repeated CTA folder is dropped", () => {
  const { html } = render();
  const at = (c) => html.indexOf(c);
  const order = ["back-banner mx-auto", "top-image", "page-title", "promo-details", "how-it-works", "cta-container", "terms-to-qualify", "more-info", "full-terms"].map(at);
  assert.ok(order.every((n) => n > -1), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.equal(html.split("cta-container").length - 1, 1);
  assert.doesNotMatch(html, /customstyles/i);
});

test("render: image is the responsive <picture> from the image field, on the page's site", () => {
  const { html } = render();
  assert.match(html, /<source media="\(max-width: 320px\)" srcset="https:\/\/scmedia\.borgataonline\.com\/\$-\$\/0749a9158baa4e4aa60b28d3796afa5a\.jpg\?p=width320">/);
  assert.match(html, /<img class="pc-img" src="https:\/\/scmedia\.borgataonline\.com\/\$-\$\/0749a9158baa4e4aa60b28d3796afa5a\.jpg" alt="XSELL_BS_3861900_MPP-1080x486" width="1080">/);
});

test("render: links follow the page's site; media hosts and CTA styling are left as authored", () => {
  const { html } = render();
  assert.match(html, /href="https:\/\/www\.borgataonline\.com\/en\/casino\/launchng\/whitehatthegoonies"/);
  assert.match(html, /href="https:\/\/www\.borgataonline\.com\/en\/engage\/pub\/launchmgc\?gd=a&amp;gm=b"/);
  assert.match(html, /<a style="color: #1f00ae;" href="https:\/\/www\.borgataonline\.com\/en\/promo\/offers\/grouped\?filter=cb">/);
  assert.match(html, /src="https:\/\/casinogames\.borgataonline\.com\/x\/goonies\.jpg"/);
  assert.match(html, /<a style="background-color:#5ac8e8; color:#fff;" class="btn btn-primary btn-block" menu-action="gotoLogin">Log In<\/a>/);
  // no known site -> nothing is rewritten
  const plain = renderMppV2(tree, {}).html;
  assert.match(plain, /href="https:\/\/www\.nj\.betmgm\.com\/en\/casino\/launchng/);
  assert.match(plain, /src="https:\/\/scmedia\.nj\.betmgm\.com\//);
});

test("render: the terms item is a CSS toggle (render=pc-toggle), label from its title", () => {
  const { html } = render();
  assert.match(html, /<input type="checkbox" class="pc-toggle-checker" id="pctoggle_chbx_0"><label class="pc-toggle-label" for="pctoggle_chbx_0">Terms &amp; Conditions /);
  assert.match(html, /<div class="pc-txt pc-toggle-txt"><p><strong>DESCRIPTION OF PROMOTION:/);
});

test("render: stylesheets and comments never reach the page", () => {
  assert.doesNotMatch(render().html, /<link|<style|<script|<!--|itsfogo|localhost/i);
});

test("visitor: logged out shows Log In, logged in shows the other CTA", () => {
  const out = render({ loggedIn: false }).html;
  assert.match(out, />Log In</);
  assert.doesNotMatch(out, />Play Now</);
  const inn = render({ loggedIn: true }).html;
  assert.match(inn, />Play Now</);
  assert.match(inn, /href="https:\/\/www\.borgataonline\.com\/en\/promo\/offers"/);
  assert.doesNotMatch(inn, />Log In</);
});

test("conditions: AND / OR / NOT / parentheses, unknown atoms stay visible and are reported", () => {
  assert.equal(evalCondition("NOT User.LoggedIn", { loggedIn: false }), true);
  assert.equal(evalCondition("User.LoggedIn AND NOT User.LoggedIn", { loggedIn: true }), false);
  assert.equal(evalCondition("(User.LoggedIn OR NOT User.LoggedIn) AND User.LoggedIn", { loggedIn: false }), false);
  const unknown = [];
  assert.equal(evalCondition("User.Country = 'NJ'", {}, unknown), true);
  assert.deepEqual(unknown, ["User.Country = 'NJ'"]);
  assert.equal(evalCondition("", {}), true);
});

test("site hosts: only bare brand hosts move", () => {
  assert.equal(swapSiteHost("https://www.nj.betmgm.com/en/x", "borgataonline.com"), "https://www.borgataonline.com/en/x");
  assert.equal(swapSiteHost("https://casinogames.borgataonline.com/a.jpg", "nj.betmgm.com"), "https://casinogames.borgataonline.com/a.jpg");
  assert.equal(swapSiteHost("https://example.com/", "nj.betmgm.com"), "https://example.com/");
  assert.equal(swapMediaHost("https://scmedia.nj.betmgm.com/$-$/a.jpg", "on.betmgm.ca"), "https://scmedia.on.betmgm.ca/$-$/a.jpg");
  assert.equal(swapMediaHost("https://other.com/a.jpg", "on.betmgm.ca"), "https://other.com/a.jpg");
  assert.equal(applyBrand("<a href='https://nj.betmgm.com'>x</a>", null), "<a href='https://nj.betmgm.com'>x</a>");
});

test("checker fields: the text items under content, in page order, as authored", () => {
  const { defs, values } = extractMppV2Fields(tree);
  assert.deepEqual(defs.map((d) => d.key), [
    "defaultpagetitle", "defaultpromodetails", "defaulthowitworkstitle", "defaulthowitworks",
    "defaulttermstoqualifytitle", "defaulttermstoqualify", "defaultmoreinfotitle", "defaultmoreinfo",
    "defaultfulltermstitle", "defaultfullterms",
  ]);
  assert.deepEqual(defs.find((d) => d.key === "defaultpagetitle"), { key: "defaultpagetitle", label: "Page Title", prefill: true });
  assert.deepEqual(defs.find((d) => d.key === "defaulthowitworks"), { key: "defaulthowitworks", label: "How It Works", prefill: true, code: true });
  assert.deepEqual(defs.find((d) => d.key === "defaulthowitworkstitle"), { key: "defaulthowitworkstitle", label: "How It Works Title", prefill: true });
  assert.ok(defs.every((d) => d.prefill), "every field starts filled from Sitecore");
  assert.equal(values.defaultpagetitle, "NHL® Pick-A-Puck");
  assert.match(values.defaultmoreinfo, /href="https:\/\/www\.nj\.betmgm\.com\/en\/casino\/launchng/); // not switched
  assert.match(values.defaulthowitworks, /NHL&reg; games/); // raw entities kept
  assert.ok(!("login" in values) && !defs.some((d) => /login|play|backbanner|customstyles/.test(d.key)));
});

test("detect: pm1colpage items are MPP v2 pages", () => {
  const d = detectPageType({}, {}, [], "pm1colpage");
  assert.equal(d.type, "mppv2");
  assert.deepEqual(d.modes, ["mppv2"]);
  assert.equal(detectPageType({}, {}, [], "PM2ColPage").type, "mppv2");
  assert.equal(detectPageType({}, {}, [], "mobilepromotion").type, "mpp");
});

test("render: unknown templates and unmatched content-list entries are reported, not fatal", () => {
  const xml = `<items>${item("p", "pm1colpage", "{1}", "/id/1", [field("content", "RelativeTreelist", "/a/p/ghost|/a/p/box")], item("Box", "weird", "{2}", "/a/p/box", [field("x", "Single-Line Text", "y")]))}</items>`;
  const { html, notes } = renderMppV2(parseMppV2(xml));
  assert.match(html, /<vn-pm-1col-page/);
  assert.ok(notes.some((n) => /ghost/.test(n)));
  assert.ok(notes.some((n) => /Box/.test(n)));
});
