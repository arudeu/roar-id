import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { analyzeField, analyzeFields, applyFixes } from "../lib/html-checks.js";
import { createDictionary, parseIgnoreList, DEFAULT_IGNORE } from "../lib/spellcheck.js";

const dict = createDictionary(
  fs.readFileSync(new URL("../public/dictionaries/en_US.aff", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/dictionaries/en_US.dic", import.meta.url), "utf8"),
);

const spelling = (html, spell = {}) =>
  analyzeField("f", html, { spell: { dict, ...spell } }).filter((i) => i.rule === "spelling");
const words = (html, spell) => spelling(html, spell).map((i) => i.word);

test("dictionary: affixes are expanded and case rules follow hunspell", () => {
  for (const w of ["deposit", "deposits", "deposited", "wagering", "unlimited", "don't", "Don’t", "London", "NJ"]) {
    assert.ok(dict.has(w), w);
  }
  assert.ok(!dict.has("teh"));
  assert.ok(!dict.has("london"), "a lowercase 'london' is a typo");
  assert.ok(dict.has("LONDON"));
  assert.deepEqual(dict.suggest("recieve").slice(0, 1), ["receive"]);
  assert.deepEqual(dict.suggest("Recieve").slice(0, 1), ["Receive"]);
  assert.deepEqual(dict.suggest("ELIGIBILTY"), ["ELIGIBILITY"]);
});

test("flags real typos with exact offsets, suggestions and a fix", () => {
  const html = "<p>You must recieve the bonus before it expires, eligibilty applies.</p>";
  const found = spelling(html);
  assert.deepEqual(found.map((i) => i.word), ["recieve", "eligibilty"]);
  const first = found[0];
  assert.equal(html.slice(first.from, first.to), "recieve");
  assert.equal(first.suggestions[0], "receive");
  assert.equal(first.severity, "warning");
  assert.equal(first.noBulk, true);
  assert.equal(applyFixes(html, [first]).value, html.replace("recieve", "receive"));
});

test("correct copy produces no spelling issues", () => {
  const clean =
    "<p>New customers can claim a bonus when they deposit $10 or more. Wagering requirements apply, and the offer ends on October 12th. Players’ funds aren’t at risk.</p>";
  assert.deepEqual(words(clean), []);
});

test("HTML is ignored: tags, attributes, entities, comments, script and style", () => {
  const html =
    '<div class="btn-primry" data-teh="x" title="recieve"><a href="https://example.com/recieve?x=teh" target="_blank">Join</a>' +
    "<!-- a commment --><style>.fooo { color: red }</style><script>var teh = 1;</script>" +
    "Terms&nbsp;&amp;&nbsp;Conditions&nbsp;apply&mdash;see&nbsp;details.</div>";
  assert.deepEqual(words(html), []);
});

test("HTML is ignored: only visible text is checked, and the offsets still point into the HTML", () => {
  const html = '<p class="x"><strong>Welcom</strong> back</p>';
  const [issue] = spelling(html);
  assert.equal(issue.word, "Welcom");
  assert.equal(html.slice(issue.from, issue.to), "Welcom");
  assert.equal(applyFixes(html, [issue]).value, '<p class="x"><strong>Welcome</strong> back</p>');
});

test("a word split by inline tags is one word", () => {
  assert.deepEqual(words("Terms and Condi<b>tions</b> apply"), []);
  assert.deepEqual(words("Terms and <em>Condi</em><em>tions</em> apply"), []);
  const html = "Terms and Condi<b>tons</b> apply";
  const [issue] = spelling(html);
  assert.equal(issue.word, "Conditons");
  assert.equal(html.slice(issue.from, issue.to), "Condi<b>tons", "the range covers the word, tag included");
  assert.equal(issue.fix, undefined, "never rewrite across markup");
  assert.deepEqual(issue.suggestions, []);
});

test("block tags separate words", () => {
  assert.deepEqual(words("<p>deposit</p><p>bonus</p><ul><li>wager</li><li>spin</li></ul>"), []);
  assert.deepEqual(words("<p>depositbonus</p>"), ["depositbonus"]);
});

test("entities: apostrophes and accents are decoded, others are separators", () => {
  assert.deepEqual(words("Don&rsquo;t miss it &amp; don&#8217;t wait"), []);
  assert.deepEqual(words("Visit our caf&eacute; today"), []);
});

test("URLs, e-mail addresses, domains, numbers and tokens are skipped", () => {
  const html =
    "<p>Visit https://www.betmgm.com/promo/recieve or www.example.org/teh, email support@betmgm.com, " +
    "see 1st, 2nd and 21st, 50x, {{promoNaem}} and betmgm.com.</p>";
  assert.deepEqual(words(html), []);
});

test("acronyms, mixed-case brands and short words are skipped", () => {
  assert.deepEqual(words("NJ PA MI WV FAQ T&Cs BetMGM iPhone PayPal DraftKings"), []);
});

test("ignore list: single terms are case-insensitive and cover plurals and possessives", () => {
  const html = "Join the zorbo promo. Zorbo's rules: two zorbos win.";
  assert.deepEqual(words(html, { skipNames: false }), ["zorbo", "Zorbo's", "zorbos"]);
  assert.deepEqual(words(html, { ignore: ["Zorbo"] }), []);
  assert.deepEqual(words(html, { ignore: ["zorbo"], skipNames: false }), []);
});

test("ignore list: multi-word phrases are masked as a unit", () => {
  const html = "<p>Play <b>Mega</b> Spin  Bonanzza now. The Mega Spin Bonanzza's jackpot.</p>";
  assert.deepEqual(words(html, { skipNames: false }), ["Bonanzza", "Bonanzza's"]);
  assert.deepEqual(words(html, { ignore: ["Mega Spin Bonanzza"], skipNames: false }), []);
  // the phrase must match as a whole: a longer word that merely contains it is still checked
  assert.deepEqual(words("Mega Spin Bonanzzas", { ignore: ["Mega Spin Bonanzza"], skipNames: false }), ["Bonanzzas"]);
});

test("ignore list: built-in gaming terms are never flagged", () => {
  assert.ok(DEFAULT_IGNORE.includes("sportsbook"));
  assert.deepEqual(words("The sportsbook offers parlays and a moneyline."), []);
});

test("parseIgnoreList accepts lines and commas, trims and de-duplicates", () => {
  assert.deepEqual(parseIgnoreList("Mega Spin,  Zorbo\n\nzorbo ;  Big   Win \n"), ["Mega Spin", "Zorbo", "Big Win"]);
  assert.deepEqual(parseIgnoreList(""), []);
});

test("names: capitalized mid-sentence words are only flagged when they look like a typo", () => {
  assert.deepEqual(words("Visit Zyxland today."), []);
  assert.deepEqual(words("Check your Elligible games."), ["Elligible"]);
  assert.deepEqual(words("Zyxland is open."), ["Zyxland"], "sentence starts are always checked");
  assert.deepEqual(words("Visit Zyxland today.", { skipNames: false }), ["Zyxland"]);
});

test("spelling is opt-in and never part of bulk fixes", () => {
  const html = "<p>You must recieve it</p>";
  assert.deepEqual(analyzeField("f", html).filter((i) => i.rule === "spelling"), []);
  const { issues } = analyzeFields({ a: html }, { spell: { dict } });
  assert.equal(issues.filter((i) => i.rule === "spelling" && i.noBulk).length, 1);
});

test("works next to the existing checks and across fields", () => {
  const { issues, summary } = analyzeFields(
    { a: "<p>Get a $ 50 bonuss</p>", b: "<p>All good here</p>" },
    { spell: { dict } },
  );
  const rules = issues.map((i) => i.rule);
  assert.ok(rules.includes("dollar-space"));
  assert.ok(rules.includes("spelling"));
  assert.equal(issues.find((i) => i.rule === "spelling").field, "a");
  assert.equal(summary.total, issues.length);
});

test("handles a long terms-and-conditions document quickly", () => {
  const para = "<p>Eligible customers must deposit at least $10 and wager the bonus within 7 days. Winnings are credited to your account; see the full terms &amp; conditions at https://example.com/terms.</p>\n";
  const doc = para.repeat(400) + "<p>This sentance has one typo.</p>";
  const t = Date.now();
  const found = spelling(doc);
  const ms = Date.now() - t;
  assert.deepEqual(found.map((i) => i.word), ["sentance"]);
  assert.ok(ms < 1500, `took ${ms}ms`);
});
