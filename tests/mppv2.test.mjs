import test from "node:test";
import assert from "node:assert/strict";
import { parseXml, parseMppV2, renderMppV2, evalCondition, applyBrand, swapSiteHost } from "../lib/mppv2.js";
import { BRAND_OPTIONS, brandFor, detectBrand, pickState } from "../lib/brands.js";
import { detectPageType } from "../lib/sitecore.js";

/* ----------------------- fixture: the NHL Pick-A-Puck page ----------------------- */

const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const field = (key, type, value) => `<field key="${key}" type="${type}"><content>${x(value)}</content></field>`;
const item = (name, template, id, fields, kids = "") =>
  `<item name="${name}" key="${name.toLowerCase()}" template="${template}" id="${id}" version="1" language="en"><fields>${fields.join("")}</fields>${kids}</item>`;
const folder = (name, id, cls, max, kids = "") =>
  item(name, "pccomponentfolder", id, [field("maxitems", "Integer", max), field("class", "Single-Line Text", cls)], kids);
const text = (name, id, cls, html, header = "", extra = []) =>
  item(name, "pctext", id, [field("text", "Rich Text", html), field("class", "Single-Line Text", cls), ...(header ? [field("header", "Single-Line Text", header)] : []), ...extra]);

const BASE = "/vanilla.mobile/m2.borgataonline.com/mobileportal-v1.0/publicpages/promotions/sports/nhl-pick-a-puck";
const login = text("Login", "{C1638E61}", "d-inline-block py-2 px-1 cta",
  '<a style="background-color:#5ac8e8; color:#fff;" class="btn btn-primary btn-block" menu-action="gotoLogin">Log In</a>',
  "", [field("condition", "Single-Line Text", "NOT User.LoggedIn")]);
const optIn = text("OptIn", "{AAAA}", "d-inline-block py-2 px-1 cta",
  '<a style="background-color:#5ac8e8; color:#fff;" class="btn btn-primary btn-block" href="https://www.borgataonline.com/en/promo/offers">Bet Now</a>',
  "", [field("condition", "Single-Line Text", "User.LoggedIn")]);
const ctas = folder("CTAs", "{86A124E0}", "p-2 cta-container d-flex", 2, login + optIn);

const MORE_INFO = `<ul><li>Bonus Spins are valid for seven days.</li></ul>
<p><a href="https://www.borgataonline.com/en/casino/launchng/whitehatthegoonies"><img alt="The Goonies" src="https://casinogames.borgataonline.com/htmllobby/images/x.jpg" width="100"></a></p>
<p>Drop it <a href="https://www.borgataonline.com/en/promo/offers/grouped?filter=cb">here</a>.</p>`;

const XML = `This XML file does not appear to have any style information associated with it. The document tree is shown below.
<items xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
  item("nhl-pick-a-puck", "pm1colpage", "{A94A7117}", [
    field("content", "RelativeTreelist", `${BASE}/customstyles|${BASE}/backbanner|${BASE}/content|${BASE}/ctas-mobile`),
    field("pagetitle", "Single-Line Text", "NHL® Pick-A-Puck"),
  ], [
    text("CustomStyles", "{3581C880}", "", '<!--<div data-content-filter="x"> <link rel="stylesheet" href="http://localhost/styles.css"></div>--> <link rel="stylesheet" href="https://scmedia-us.itsfogo.com/$-$/2c03.css">'),
    folder("BackBanner", "{5706}", "p-0 back-banner mx-auto", 1,
      item("BackBannerDesktop", "pctext", "{BB01}", [
        field("class", "Single-Line Text", "back-banner-content"),
        field("header", "Single-Line Text", "My Promotions"),
        field("text", "Rich Text", '<a class="back-link" href="https://www.borgataonline.com/en/promo/offers"><img src="https://scmedia.borgataonline.com/$-$/0b09.svg"></a>'),
      ])),
    folder("Content", "{465B}", "mx-auto page-content", 10,
      folder("TopImage", "{7A5D}", "p-0 top-image m-0 mb-3", 1,
        item("Image", "pcimage", "{1111}", [field("class", "Single-Line Text", ""), field("image", "Image", '<image mediaid="x" src="https://scmedia.borgataonline.com/$-$/0749.jpg" alt="XSELL_BS_3861900_MPP-1080x486" width="1080" />')])) +
      folder("PageTitle", "{10F4}", "p-0 page-title bottom-divider", 1, text("PageTitle", "{2222}", "m-0 p-0 page-title-content", "", "NHL® Pick-A-Puck")) +
      folder("PromoDetails", "{631C}", "p-0 promo-details bottom-divider", 1, text("PromoDetails", "{3333}", "promo-details-content", "<p>Turn big moments on the ice into even bigger thrills!</p>")) +
      folder("HowItWorks", "{228C}", "p-0 m-0 how-it-works bottom-divider", 1, text("HowItWorks", "{4444}", "how-it-works-content list-icon-prize m-0 p-0", "<ol>\n<li>Bet $10 or more.</li>\n</ol>", "How It Works:")) +
      folder("TermsToQualify", "{CB19}", "p-0 m-0 terms-to-qualify bottom-divider", 1, text("TermsToQualify", "{5555}", "m-0 p-0 terms-to-qualify-content", "<ul><li>Read the Terms.</li></ul>", "Important Details:")) +
      folder("MoreInfo", "{6711}", "p-0 m-0 more-info", 1, text("MoreInfo", "{6666}", "m-0 more-info-content p-0", MORE_INFO, "More Info:")) +
      folder("FullTermsAndConditions", "{7A07}", "p-0 m-0 mt-4 full-terms", 1,
        item("Toggle", "pctoggle", "{7777}", [field("class", "Single-Line Text", "full-terms-content m-0 p-0"), field("header", "Single-Line Text", "Terms & Conditions"), field("text", "Rich Text", "<p><strong>DESCRIPTION OF PROMOTION:</strong></p>")]))) +
    ctas + ctas, // the same CTA folder twice, like the export
  ]) + "</items>";

const mk = (opts) => renderMppV2(parseMppV2(XML), opts);
const borgata = detectBrand(BASE);

/* --------------------------------- tests ---------------------------------------- */

test("xml: junk before the root, entities, CDATA and self-closing tags", () => {
  const root = parseXml('hello <a x="1 &amp; 2"><b/><![CDATA[<raw>]]>&#169; &lt;ok&gt;</a>');
  assert.equal(root.name, "a");
  assert.equal(root.attrs.x, "1 & 2");
  assert.deepEqual(root.kids.filter((k) => typeof k !== "string").map((k) => k.name), ["b"]);
  assert.equal(root.kids.filter((k) => typeof k === "string").join(""), "<raw>© <ok>");
  assert.throws(() => parseXml("<a><b></a>"), /well-formed/);
  assert.throws(() => parseXml("no xml here"), /No XML/);
});

test("tree: items, fields and de-duplicated siblings", () => {
  const tree = parseMppV2(XML);
  assert.equal(tree.template, "pm1colpage");
  assert.deepEqual(tree.children.map((c) => c.key), ["customstyles", "backbanner", "content", "ctas", "ctas"].filter((k, i, a) => a.indexOf(k) === i));
  assert.equal(tree.fields.pagetitle, "NHL® Pick-A-Puck");
});

test("render: same structure and classes as the live page", () => {
  const { html } = mk({ brand: borgata });
  assert.match(html, /^<div id="main-content"><vn-public-page-loader class="public-page-container"><vn-page-matrix class="page-matrix"><vn-pm-1col-page class="pm-1col pm-page pm-simple-layout">/);
  for (const cls of [
    "back-banner mx-auto p-0 pc-component pc-folder",
    "mx-auto page-content pc-component pc-folder",
    "m-0 mb-3 p-0 pc-component pc-folder top-image",
    "bottom-divider p-0 page-title pc-component pc-folder",
    "bottom-divider how-it-works m-0 p-0 pc-component pc-folder",
    "bottom-divider m-0 p-0 pc-component pc-folder terms-to-qualify",
    "full-terms m-0 mt-4 p-0 pc-component pc-folder",
    "cta-container d-flex p-2 pc-component pc-folder",
    "cta d-inline-block pc-component pc-text px-1 py-2",
    "how-it-works-content list-icon-prize m-0 p-0 pc-component pc-text",
    "full-terms-content m-0 p-0 pc-component pc-toggle",
  ]) assert.ok(html.includes(`class="${cls}"`), `missing class "${cls}"`);
  // headers: tag, size class and text
  assert.match(html, /<h3 class="h5-v2 pc-h" id="defaultbackbannerdesktop"> My Promotions <\/h3>/);
  assert.match(html, /<h3 class="h4-v2 mb-2 pc-h" id="defaultpagetitle"> NHL® Pick-A-Puck <\/h3>/);
  assert.match(html, /<h3 class="h6-v2 mb-2 pc-h" id="defaulthowitworks"> How It Works: <\/h3>/);
  assert.match(html, /<h1 class="h6-v2 mb-2 pc-h" id="defaultmoreinfo"> More Info: <\/h1>/);
});

test("render: order follows the treelist, the CTA sits after How It Works, duplicates are dropped", () => {
  const { html } = mk({ brand: borgata });
  const at = (s) => html.indexOf(s);
  const order = ["top-image", "page-title", "promo-details", "how-it-works", "cta-container", "terms-to-qualify", "more-info", "full-terms"].map((c) => at(`${c} `) > -1 ? at(`${c} `) : at(c));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.equal(html.split("cta-container").length - 1, 1);
  assert.equal(html.split("Log In").length - 1, 1);
  assert.ok(at("back-banner mx-auto") < at("page-content"));
});

test("render: image becomes the responsive <picture>", () => {
  const { html } = mk({});
  assert.match(html, /<source media="\(max-width: 320px\)" srcset="https:\/\/scmedia\.borgataonline\.com\/\$-\$\/0749\.jpg\?p=width320">/);
  assert.match(html, /<source media="\(max-width: 1024px\)" srcset="[^"]+\?p=width1024">/);
  assert.match(html, /<img class="pc-img" src="https:\/\/scmedia\.borgataonline\.com\/\$-\$\/0749\.jpg" alt="XSELL_BS_3861900_MPP-1080x486" width="1080">/);
});

test("render: toggle is a CSS checkbox with its label and hidden text", () => {
  const { html } = mk({});
  assert.match(html, /<input type="checkbox" class="pc-toggle-checker" id="pctoggle_chbx_0"><label class="pc-toggle-label" for="pctoggle_chbx_0">Terms &amp; Conditions /);
  assert.match(html, /<div class="pc-txt pc-toggle-txt"><p><strong>DESCRIPTION OF PROMOTION:/);
});

test("render: stylesheets and comments from the rich text never reach the page", () => {
  const { html } = mk({});
  assert.doesNotMatch(html, /<link|<style|<script|<!--|itsfogo|localhost/i);
});

test("conditions: logged-out shows Log In, logged-in shows the other CTA", () => {
  const out = mk({ loggedIn: false }).html;
  assert.match(out, />Log In</);
  assert.doesNotMatch(out, />Bet Now</);
  const inn = mk({ loggedIn: true }).html;
  assert.match(inn, />Bet Now</);
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

test("brand: detected from the path gives the Borgata sports CTA colour from the page", () => {
  assert.deepEqual([borgata.name, borgata.domain, borgata.category, borgata.bg, borgata.fg], ["Borgata Online", "borgataonline.com", "sports", "#5ac8e8", "#ffffff"]);
  const { html } = mk({ brand: borgata });
  assert.match(html, /<a style="background-color:#5ac8e8; color:#ffffff;" class="btn btn-primary btn-block" menu-action="gotoLogin">Log In<\/a>/);
});

test("brand: switching brand and state moves links and recolours CTAs, not media", () => {
  const betmgmOn = brandFor({ name: "BetMGM", domain: "on.betmgm.ca", category: "sports" });
  const { html } = mk({ brand: betmgmOn });
  assert.match(html, /href="https:\/\/www\.on\.betmgm\.ca\/en\/casino\/launchng\/whitehatthegoonies"/);
  assert.match(html, /href="https:\/\/www\.on\.betmgm\.ca\/en\/promo\/offers\/grouped\?filter=cb"/);
  assert.match(html, /style="background-color:#d4b962; color:#000000;"/);
  assert.match(html, /src="https:\/\/casinogames\.borgataonline\.com\/htmllobby\/images\/x\.jpg"/); // media host untouched
  assert.match(html, /src="https:\/\/scmedia\.borgataonline\.com\//);
  const pa = mk({ brand: brandFor({ name: "Borgata Online", domain: "pa.borgataonline.com", category: "sports" }) }).html;
  assert.match(pa, /href="https:\/\/www\.pa\.borgataonline\.com\/en\/promo\/offers\/grouped/);
});

test("brand: swapSiteHost only touches bare brand hosts", () => {
  assert.equal(swapSiteHost("https://www.borgataonline.com/en/x", "nj.betmgm.com"), "https://www.nj.betmgm.com/en/x");
  assert.equal(swapSiteHost("https://scmedia.borgataonline.com/a.jpg", "nj.betmgm.com"), "https://scmedia.borgataonline.com/a.jpg");
  assert.equal(swapSiteHost("https://example.com/", "nj.betmgm.com"), "https://example.com/");
  assert.equal(swapSiteHost("https://pa.borgataonline.com/x", "borgataonline.com"), "https://borgataonline.com/x");
  assert.equal(applyBrand("<a href='https://nj.betmgm.com'>x</a>", null), "<a href='https://nj.betmgm.com'>x</a>");
});

test("brand options: every brand has states, NJ-first defaults, state code kept when switching brand", () => {
  assert.deepEqual(BRAND_OPTIONS.find((b) => b.name === "BetMGM").states.map((s) => s.code).slice(0, 6), ["NJ", "PA", "MI", "WV", "ON", "AB"]);
  assert.equal(pickState("Borgata Online", "PA").domain, "pa.borgataonline.com");
  assert.equal(pickState("Borgata Online", "ON").domain, "borgataonline.com"); // no ON: first state
  assert.equal(pickState("Party Poker", "NJ").domain, "nj.partypoker.com");
});

test("detect: pm1colpage items are MPP v2 pages", () => {
  const d = detectPageType({}, {}, [], "pm1colpage");
  assert.equal(d.type, "mppv2");
  assert.deepEqual(d.modes, ["mppv2"]);
  assert.equal(detectPageType({}, {}, [], "PM2ColPage").type, "mppv2");
  assert.equal(detectPageType({}, {}, [], "mobilepromotion").type, "mpp");
});

test("render: unknown templates and unmatched treelist entries are reported, not fatal", () => {
  const xml = `<items>${item("p", "pm1colpage", "{1}", [field("content", "RelativeTreelist", "/a/p/ghost|/a/p/box")], item("Box", "weird", "{2}", [field("x", "Single-Line Text", "y")]))}</items>`;
  const { html, notes } = renderMppV2(parseMppV2(xml));
  assert.match(html, /<vn-pm-1col-page/);
  assert.ok(notes.some((n) => /ghost/.test(n)));
  assert.ok(notes.some((n) => /Box/.test(n)));
});
