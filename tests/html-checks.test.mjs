import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeField,
  analyzeFields,
  applyFixes,
  compareWithSource,
} from "../lib/html-checks.js";

const rules = (html) => analyzeField("f", html).map((i) => i.rule);
const has = (html, rule) => assert.ok(rules(html).includes(rule), `expected "${rule}" in ${JSON.stringify(rules(html))} for: ${html}`);
const lacks = (html, rule) => assert.ok(!rules(html).includes(rule), `did not expect "${rule}" for: ${html}`);
const find = (html, rule) => analyzeField("f", html).find((i) => i.rule === rule);

test("clean markup produces no issues", () => {
  const clean = '<p>Get a <strong>$50 bonus</strong> on your 1<sup>st</sup> deposit of $10 or more. Ends 10/12/2026 at 11:59 PM ET.</p><ul><li>One</li><li>Two</li></ul><a href="https://example.com/x" target="_blank" rel="noopener">Join BetMGM</a>';
  assert.deepEqual(rules(clean), []);
});

test("structure: unclosed, stray and overlapping tags have exact positions", () => {
  const unclosed = find("<div><p>Hello</div>", "overlap");
  assert.equal(unclosed.text, "<p>");
  assert.equal(unclosed.from, 5);
  has("<p>Hello", "unclosed-tag");
  const stray = find("Hello</p>", "stray-close");
  assert.equal(stray.from, 5);
  has("<b><i>x</b></i>", "overlap");
});

test("structure: lists", () => {
  has("<li>x</li>", "li-outside-list");
  has("<ul></ul>", "empty-list");
  has("<ul><div>x</div><li>a</li></ul>", "list-child");
  has('<ol><li>a</li><li>b</li></ol><ol start="2"><li>c</li></ol>', "ol-numbering");
  lacks('<ol><li>a</li><li>b</li></ol><ol start="3"><li>c</li></ol>', "ol-numbering");
  const fixed = applyFixes('<ol><li>a</li><li>b</li></ol><ol start="2"><li>c</li></ol>', analyzeField("f", '<ol><li>a</li><li>b</li></ol><ol start="2"><li>c</li></ol>'));
  assert.match(fixed.value, /start="3"/);
});

test("syntax: quote-aware tags, missing brackets, stray symbols", () => {
  lacks('<a href="x" title="a > b">hi</a>', "stray-gt");
  has("<p>Hello <b", "unterminated-tag");
  has('<a href="https://x.com>Click</a> and <b class="y">more</b>', "swallowed-tags");
  has('<a href="https://x.com>Click</a> and <b>more</b>', "unclosed-quote");
  lacks('<a href="https://x.com>Click</a> and <b>more</b>', "unclosed-tag");
  has("Hello p>world", "missing-lt");
  has("Hello </p> and /p>", "missing-lt");
  has("Bet > $10", "stray-gt");
  has("5 <3 bets", "stray-lt");
  has("<!-- never closed <p>x</p>", "unclosed-comment");
  has("<strng>Hi</strng>", "unknown-tag");
  assert.equal(find("<strng>Hi</strng>", "unknown-tag").fix[0].insert, "strong");
  has("<o:p></o:p>", "word-markup");
});

test("brackets and quotes", () => {
  has("Terms (apply", "unclosed-symbol");
  has("Terms apply)", "unmatched-closer");
  lacks("1) First 2) Second", "unmatched-closer");
  has('He said "hello', "unbalanced-quotes");
  lacks('<a href="x">He said "hi"</a>', "unbalanced-quotes");
});

test("attributes and links", () => {
  has('<a href="#">x</a>', "link-placeholder");
  has('<a href="">x</a>', "link-placeholder");
  has('<div id="a"></div><p id="a">x</p>', "duplicate-id");
  has('<p class="a" class="b">x</p>', "duplicate-attr");
  has("<p id class='x'>x</p>", "attr-no-value");
  has("<p class=foo>x</p>", "attr-unquoted");
  has('<img src="a.png">', "img-alt");
  lacks('<img src="a.png" alt="">', "img-alt");
  has('<a href=" https://x.com ">x</a>', "link-padding");
  has('<a href="javascript:void(0)">x</a>', "link-protocol");
  has('<a href="https://x.com" target="_blank">x</a>', "unsafe-blank");
  has('<a href="https://x.com"></a>', "link-empty");
  has('<p class="MsoNormal">x</p>', "word-attr");
});

test("money and number formatting with auto-fix", () => {
  const cases = [
    ["Get $ 50 now", "double-dollar", false],
    ["Win $$50", "double-dollar", true],
    ["Get $ 50 now", "dollar-space", true],
    ["Win $1000 today", "large-number", true],
    ["Save 50 % today", "percent-space", true],
    ["Save 50 percent today", "percent-word", true],
    ["Win $5k today", "k-shorthand", true],
    ["Win up to $10/$20/$30", "amount-tier", true],
    ["Win up to $10/20/30", "amount-tier", true],
    ["Deposit 100 and get a bonus", "missing-dollar", true],
  ];
  for (const [html, rule, fixable] of cases) {
    if (rule === "double-dollar" && !fixable) continue;
    has(html, rule);
    if (fixable) {
      const { value } = applyFixes(html, analyzeField("f", html));
      assert.notEqual(value, html, `fix should change: ${html}`);
    }
  }
  assert.equal(applyFixes("Win $1000000 now", analyzeField("f", "Win $1000000 now")).value, "Win $1,000,000 now");
  assert.equal(applyFixes("Save 50 % now", analyzeField("f", "Save 50 % now")).value, "Save 50% now");
  assert.equal(applyFixes("Deposit 100 now", analyzeField("f", "Deposit 100 now")).value, "Deposit $100 now");
  lacks("Bonus 100 free spins", "missing-dollar");
  lacks("Deposit 10x your bonus 5X", "missing-dollar");
  lacks("Bonus 50%", "missing-dollar");
  lacks("Get 3 $10 bets", "dollar-space");
  has("Use 10x and 5X", "multiplier-case");
});

test("dates and times", () => {
  has("Friday, October 5, 2026", "date-weekday");
  lacks("Monday, October 5, 2026", "date-weekday");
  const fixed = applyFixes("Friday, October 5, 2026", analyzeField("f", "Friday, October 5, 2026"));
  assert.equal(fixed.value, "Monday, October 5, 2026");
  has("February 30, 2026", "date-invalid");
  has("13/45/2026", "date-invalid");
  has("Ends 10/12/2026 or October 20, 2026", "date-mixed");
  has("Ends at 10am", "time-format");
  has("Ends at 10 AM", "time-format");
  has("Ends at 13:00 PM", "time-format");
  lacks("Ends at 10:00 AM", "time-format");
  assert.equal(applyFixes("at 10am", analyzeField("f", "at 10am")).value, "at 10:00 AM");
  has("Ends at 14:00 EST", "time-no-meridiem");
  lacks("Ends at 2:00 PM EST", "time-no-meridiem");
  lacks("you may 5 times", "date-invalid");
});

test("ordinals", () => {
  has("Your 1st deposit", "ordinal-sup");
  lacks("Your 1<sup>st</sup> deposit", "ordinal-sup");
  lacks("Your <sup>1st</sup> deposit", "ordinal-sup");
  has("Your 1th deposit", "ordinal-suffix");
  has("the 11st", "ordinal-suffix");
  lacks("the 11th <sup>x</sup>", "ordinal-suffix");
});

test("text hygiene", () => {
  has("a  b", "multi-space");
  lacks("<p>a</p>   <p>b</p>", "multi-space");
  has("one,two", "comma-space");
  has("hello !!", "multi-punct");
  has("bonus bonus", "repeated-word");
  has("Free FREE", "repeated-word");
  lacks('<a class="btn btn-primary" href="x">go</a>', "repeated-word");
  has("regulations(s) apply", "plural");
  lacks("class(s) apply", "plural");
  has("betmgm rocks", "brand-casing");
  has("Bet MGM rocks", "brand-casing");
  lacks("Visit betmgm.com today", "brand-casing");
  lacks('<a href="https://betmgm.com/x">BetMGM</a>', "brand-casing");
  has("hello™ world", "trademark-entity");
  has("a\u200Bb", "special-space");
  has("a&nbsp;b", "nbsp");
  has("<p></p>", "empty-tag");
  has("<strong>.</strong>", "strong-dot");
  lacks("<strong>$</strong>5", "strong-dot");
  has("a<br>b", "br-tag");
  has("(Link to terms)", "link-placeholder-text");
  has("This is great. This is great. And more.", "repeated-sentence");
  lacks("<p>This is great.</p><p>This is great.</p>", "repeated-sentence");
});

test("tile header matches tile count", () => {
  const two = '<p>Click Tile Below To Play Eligible Game</p><a href="https://x/launchng/1">a</a><a href="https://x/launchng/2">b</a>';
  has(two, "tile-header");
  assert.match(applyFixes(two, analyzeField("f", two)).value, /Click Tiles Below To Play Eligible Games/);
  const one = '<p>Click Tiles Below To Play Eligible Games</p><a href="https://x/launchng/1">a</a>';
  has(one, "tile-header");
  lacks('<p>Click Tile Below To Play Eligible Game</p><a href="https://x/launchng/1">a</a>', "tile-header");
});

test("issue offsets point at the flagged text", () => {
  const html = "<p>Win $ 50 and  more</p>";
  for (const issue of analyzeField("f", html)) {
    assert.equal(html.slice(issue.from, issue.to), issue.text.slice(0, issue.to - issue.from));
    assert.ok(issue.line >= 1 && issue.col >= 1);
  }
  const multi = find("line one\nline  two", "multi-space");
  assert.equal(multi.line, 2);
});

test("cross-field emphasis consistency", () => {
  const { issues } = analyzeFields({ a: "<strong>x</strong>", b: "<b>y</b><b>z</b>" , c: "<strong>q</strong><strong>r</strong>"});
  const mixed = issues.filter((i) => i.rule === "emphasis-mix");
  assert.equal(mixed.length, 2);
  assert.ok(mixed.every((i) => i.field === "b"));
  const fixed = applyFixes("<b>y</b>", mixed.filter((i) => i.text === "<b>"));
  assert.ok(fixed.applied >= 1);
  const icons = analyzeFields({ a: "<em>x</em>", b: '<i class="bi bi-x"></i>' });
  assert.equal(icons.issues.filter((i) => i.rule === "emphasis-mix").length, 0);
});

test("compare with source", () => {
  assert.equal(compareWithSource("abc", "abc").status, "match");
  assert.equal(compareWithSource("a\nb", "a\r\nb").status, "match");
  assert.equal(compareWithSource("", "abc").status, "empty");
  const diff = compareWithSource("hello wurld", "hello world");
  assert.equal(diff.status, "diff");
  assert.equal(diff.from, 7);
  assert.equal(compareWithSource("abc ", "abc").whitespaceOnly, true);
});

test("fixes never overlap and are idempotent", () => {
  const html = "Win $$1000   now,fast !! 10am";
  const first = applyFixes(html, analyzeField("f", html));
  const second = applyFixes(first.value, analyzeField("f", first.value));
  const third = applyFixes(second.value, analyzeField("f", second.value));
  assert.equal(third.value, second.value);
  assert.ok(first.value.length > 0);
});
