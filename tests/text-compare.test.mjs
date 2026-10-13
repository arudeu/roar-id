import test from "node:test";
import assert from "node:assert/strict";
import { collapseWhitespace, compareTexts, diffOps, stripMarkers } from "../lib/text-compare.js";
import { cleanSitecoreId } from "../lib/sitecore.js";

const messages = (a, b) => compareTexts(a, b).issues.map((i) => `${i.type}: ${i.message}`);

test("collapseWhitespace removes excess whitespace everywhere", () => {
  assert.equal(collapseWhitespace("  a \n\n b\t\tc  "), "a b c");
});

test("identical text has no issues", () => {
  assert.ok(compareTexts("Deposit $10 today", "Deposit $10 today").identical);
});

test("line breaks and spaces are treated as the same", () => {
  assert.ok(compareTexts("Line one\nLine two", "Line one Line two").identical);
});

test("bullets and numbering are ignored", () => {
  assert.ok(compareTexts("• Foo\n• Bar", "Foo Bar").identical);
  assert.ok(compareTexts("1. Foo\n2. Bar", "Foo Bar").identical);
  assert.ok(compareTexts("- Foo\n- Bar", "• Foo • Bar").identical);
  assert.ok(compareTexts("a) Foo b) Bar", "Foo Bar").identical);
  assert.equal(stripMarkers("• Foo").text, "Foo");
});

test("hyphens inside words are not bullets", () => {
  assert.ok(!compareTexts("sign-up now", "signup now").identical);
});

test("missing word", () => {
  assert.deepEqual(messages("the quick brown fox", "the brown fox"), ["word: Missing word: “quick”"]);
});

test("added word", () => {
  assert.deepEqual(messages("the brown fox", "the quick brown fox"), ["word: Added word: “quick”"]);
});

test("missing multiple words", () => {
  assert.deepEqual(messages("a very big dog", "a dog"), ["word: Missing words: “very big”"]);
});

test("character change", () => {
  assert.deepEqual(messages("colour", "color"), ["char: Missing character: “u”"]);
  assert.deepEqual(messages("cat sat", "cot sat"), ["char: Character change: “a” → “o”"]);
});

test("transposed letters are one issue", () => {
  assert.equal(compareTexts("receive", "recieve").issues.length, 1);
});

test("removed and added spaces", () => {
  assert.deepEqual(messages("a  b", "a b"), ["space: Removed space"]);
  assert.deepEqual(messages("a b", "a  b"), ["space: Added space"]);
  assert.deepEqual(messages("ab cd", "abcd"), ["space: Removed space"]);
});

test("whole word replaced", () => {
  assert.deepEqual(messages("win big now", "win huge now"), ["word: Word changed: “big” → “huge”"]);
});

test("marks and gaps point at the right characters", () => {
  const r = compareTexts("abc def", "abc xdef");
  assert.equal(r.issues.length, 1);
  assert.equal(r.right.marks.reduce((s, v) => s + v, 0), 1);
  const missing = compareTexts("abc def", "abcdef");
  assert.equal(missing.left.marks[3], 1);
  assert.equal(missing.right.gaps.size, 1);
});

test("diff ops reproduce both strings (random)", () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gen = (n) => Array.from({ length: n }, () => "abc "[Math.floor(rnd() * 4)]).join("");
  for (let t = 0; t < 300; t++) {
    const a = gen(Math.floor(rnd() * 30));
    const b = gen(Math.floor(rnd() * 30));
    const ops = diffOps(a, b);
    let ra = "";
    let rb = "";
    let i = 0;
    let j = 0;
    for (const op of ops) {
      if (op === "e") {
        assert.equal(a[i], b[j]);
        ra += a[i++];
        rb += b[j++];
      } else if (op === "d") ra += a[i++];
      else rb += b[j++];
    }
    assert.equal(ra, a);
    assert.equal(rb, b);
  }
});

test("large texts with few edits stay fast", () => {
  const base = Array.from({ length: 4000 }, (_, i) => `word${i}`).join(" ");
  const edited = base.replace("word1000", "wurd1000").replace(" word3000", "");
  const t0 = Date.now();
  const r = compareTexts(base, edited);
  assert.ok(Date.now() - t0 < 1500);
  assert.equal(r.issues.length, 2);
});

test("completely different long texts fall back without hanging", () => {
  const a = "a".repeat(6000);
  const b = "b".repeat(6000);
  assert.equal(compareTexts(a, b).issues.length, 1);
});

test("Sitecore ID accepts DirectLink URLs and plain ids", () => {
  const id = "AE4B65D1-CC5E-4B9A-ACC9-2B1FEEEA1594";
  assert.equal(cleanSitecoreId(`{${id}}`), id);
  assert.equal(cleanSitecoreId(id), id);
  assert.equal(
    cleanSitecoreId(`https://cms-us.prod.env.works/sitecore/DirectLink.aspx?fo={${id}}&la=`),
    id,
  );
  assert.equal(cleanSitecoreId(`cms-us.prod.env.works/sitecore/DirectLink.aspx?fo={${id}}&la=`), id);
  assert.equal(
    cleanSitecoreId(`[https://x.works/sitecore/DirectLink.aspx?fo={site-core-id}&la=](https://x.works/sitecore/DirectLink.aspx?fo={${id}}&la=)`),
    id,
  );
  assert.equal(cleanSitecoreId("ae4b65d1cc5e4b9aacc92b1feeea1594"), "ae4b65d1-cc5e-4b9a-acc9-2b1feeea1594");
  assert.equal(cleanSitecoreId("https://x.works/sitecore/DirectLink.aspx?fo={site-core-id}&la="), "");
  assert.equal(cleanSitecoreId("  "), "");
});

import { htmlToText } from "../lib/text-compare.js";

test("HTML is converted to the text a reader sees", () => {
  const { text, converted } = htmlToText(
    "<p>Win <b>big</b>   now</p>\n<p>Terms &amp; conditions&nbsp;apply &rsquo;ok&#39;</p>",
  );
  assert.ok(converted);
  assert.equal(text, "Win big now\nTerms & conditions apply ’ok'");
});

test("lists, breaks, comments and scripts", () => {
  assert.equal(htmlToText("<ul><li>One</li><li>Two<br/>Three</li></ul>").text, "One\nTwo\nThree");
  assert.equal(htmlToText("a<!-- hidden -->b<script>var x=1;</script><style>p{}</style>c").text, "abc");
  assert.equal(htmlToText('<a href="https://x.com/?a=1&b=2" title="a > b">Link</a> text').text, "Link text");
});

test("escaped markup stays as text, plain text is untouched", () => {
  assert.equal(htmlToText("1 &lt; 2 &amp;&amp; 3 &gt; 2").text, "1 < 2 && 3 > 2");
  const plain = htmlToText("Just  plain text");
  assert.equal(plain.converted, false);
  assert.equal(plain.text, "Just  plain text");
});

test("converted HTML compares cleanly against copy", () => {
  const html = "<ul><li>Deposit <strong>$10</strong></li><li>Get &quot;$50&quot; free</li></ul>";
  assert.ok(compareTexts(htmlToText(html).text, "Deposit $10 Get \"$50\" free").identical);
  assert.deepEqual(
    compareTexts(htmlToText(html).text, "Deposit $10 Get \"$50\" fre").issues.map((i) => i.message),
    ["Missing character: “e”"],
  );
});

import { tidyPaste } from "../lib/text-compare.js";

test("pasting removes excess spaces but keeps line breaks", () => {
  assert.equal(tidyPaste("  Line one   here \t\n\nLine   two  \r\n  Line three  "), "Line one here\n\nLine two\nLine three");
});

test("blank lines and spaces around line breaks are not differences", () => {
  assert.ok(compareTexts("Para one\nPara two", "Para one\n\nPara two").identical);
  assert.ok(compareTexts("Para one\nPara two", "Para one \n  Para two").identical);
  assert.ok(compareTexts("Para one\nPara two", "Para one Para two").identical);
  assert.ok(!compareTexts("Para one\nPara two", "Para one\nPara  two").identical);
});
