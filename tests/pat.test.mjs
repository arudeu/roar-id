import test from "node:test";
import assert from "node:assert/strict";
import { getImageSrc, moreInfoUrl, parseSmartLink, parseSteps } from "../lib/pat.js";

test("steps: array of title/text objects", () => {
  const { steps, error } = parseSteps(
    JSON.stringify([
      { title: "OPT IN", text: "Opt in daily." },
      { title: "BET", text: "Wager at least $40." },
    ]),
  );
  assert.equal(error, null);
  assert.deepEqual(steps, [
    { title: "OPT IN", text: "Opt in daily." },
    { title: "BET", text: "Wager at least $40." },
  ]);
});

test("steps: wrapped in an object, other key names, value wrappers", () => {
  const a = parseSteps(JSON.stringify({ steps: [{ Title: "GET", Description: "Receive a bonus" }] }));
  assert.deepEqual(a.steps, [{ title: "GET", text: "Receive a bonus" }]);
  const b = parseSteps(JSON.stringify({ items: [{ heading: { value: "BET" }, content: { value: "Play" } }] }));
  assert.deepEqual(b.steps, [{ title: "BET", text: "Play" }]);
  const c = parseSteps(JSON.stringify({ 1: { a: "OPT IN", b: "Do it" } }));
  assert.deepEqual(c.steps, [{ title: "OPT IN", text: "Do it" }]);
  assert.deepEqual(parseSteps('["Just text"]').steps, [{ title: "", text: "Just text" }]);
});

test("steps: empty, invalid and unusable input", () => {
  assert.deepEqual(parseSteps(""), { steps: [], error: null });
  assert.match(parseSteps("{nope").error, /isn't valid JSON/);
  assert.match(parseSteps('{"a":1}').error, /No list of steps/);
  assert.match(parseSteps("[]").error, /doesn't contain any steps/);
});

test("smart link formats", () => {
  assert.deepEqual(parseSmartLink('<link text="Play Now" linktype="external" url="https://x.com/a?b=1&amp;c=2" />'), {
    text: "Play Now",
    url: "https://x.com/a?b=1&c=2",
  });
  assert.deepEqual(parseSmartLink('{"text":"Play","url":"/casino"}'), { text: "Play", url: "/casino" });
  assert.deepEqual(parseSmartLink("https://x.com"), { text: "", url: "https://x.com" });
  assert.deepEqual(parseSmartLink(""), { text: "", url: "" });
});

test("image src and More Info url", () => {
  assert.equal(
    getImageSrc('<image mediaid="{1}" src="https://scmedia.com/$-$/abc.jpg?a=1&amp;b=2" alt="x" />'),
    "https://scmedia.com/$-$/abc.jpg?a=1&b=2",
  );
  assert.equal(getImageSrc("https://x.com/a.png"), "https://x.com/a.png");
  assert.equal(getImageSrc("nothing"), "");
  assert.equal(moreInfoUrl(" 26152203 "), "https://www.nj.betmgm.com/en/promo/pa/26152203/overview");
  assert.equal(moreInfoUrl(""), "");
});

import { fieldsForView, fieldValues } from "../lib/fields.js";
import { detectPageType } from "../lib/sitecore.js";

const stepsJson = JSON.stringify([
  { title: "OPT IN", text: "Opt in daily." },
  { title: "BET", text: "Wager $40." },
]);

test("PAT fields: one title + description per step, then full T&C", () => {
  const defs = fieldsForView("pat", { steps: stepsJson });
  assert.deepEqual(
    defs.map((d) => d.key),
    ["promoteaserinfo", "prizemessage", "step1title", "step1description", "step2title", "step2description", "fulltermsandconditions"],
  );
  assert.equal(defs.find((d) => d.key === "step2description").label, "Step 2 Description");
  const values = fieldValues("pat", { steps: stepsJson, fulltermsandconditions: "<p>T&C</p>" });
  assert.equal(values.step1title, "OPT IN");
  assert.equal(values.step2description, "Wager $40.");
  assert.equal(values.fulltermsandconditions, "<p>T&C</p>");
});

test("PAT fields: unreadable or empty steps", () => {
  assert.deepEqual(
    fieldsForView("pat", { steps: "{oops" }).map((d) => d.key),
    ["promoteaserinfo", "prizemessage", "steps", "fulltermsandconditions"],
  );
  assert.deepEqual(
    fieldsForView("pat", {}).map((d) => d.key),
    ["promoteaserinfo", "prizemessage", "fulltermsandconditions"],
  );
});

test("PAT is detected only for the playeractivity template", () => {
  const fields = { promoname: "x" };
  assert.equal(detectPageType(fields, {}, [], "playeractivity").type, "pat");
  assert.deepEqual(detectPageType(fields, {}, [], "PlayerActivity").modes, ["pat", "promohub"]);
  assert.notEqual(detectPageType(fields, {}, [], "somethingelse").type, "pat");
  assert.notEqual(detectPageType(fields, {}, []).type, "pat");
});

import { formatSitecoreDate, isImageUrl, parsePrizes } from "../lib/pat.js";

test("leaderboard is a PAT page with its own checker fields", () => {
  const d = detectPageType({ promoname: "x" }, {}, [], "leaderboard");
  assert.equal(d.type, "pat");
  assert.ok(d.isLeaderboard);
  assert.deepEqual(d.modes, ["pat", "promohub"]);
  assert.ok(!detectPageType({ promoname: "x" }, {}, [], "playeractivity").isLeaderboard);

  const icon = "https://scmedia-us.itsfogo.com/$-$/f9a2b0ad132145f5a4c3a5d0f2cadb22.svg";
  const steps = JSON.stringify([{ title: icon, description: "Opt in." }, { title: icon, description: "Earn." }]);
  const defs = fieldsForView("leaderboard", { steps });
  assert.deepEqual(
    defs.map((d) => d.key),
    ["promoname", "promoteaserinfo", "step1title", "step1description", "step2title", "step2description", "winupto", "fulltermsandconditions"],
  );
  assert.equal(defs.find((d) => d.key === "step1title").label, "Step 1 Icon");
  assert.equal(fieldValues("leaderboard", { steps }).step2description, "Earn.");
});

test("icon URLs, dates and prize brackets", () => {
  assert.ok(isImageUrl("https://scmedia-us.itsfogo.com/$-$/f9a2.svg"));
  assert.ok(isImageUrl("https://x.com/a/b.png?x=1"));
  assert.ok(!isImageUrl("OPT IN"));
  assert.ok(!isImageUrl("https://example.com/page"));
  assert.equal(formatSitecoreDate("20260924T150000"), "09/24/26 3:00 PM");
  assert.equal(formatSitecoreDate("20261026T000500"), "10/26/26 12:05 AM");
  assert.equal(formatSitecoreDate(""), "");

  const prizes = parsePrizes(
    JSON.stringify([
      { SlabNo: "2", SlabType: "RANK", Min: "2", Max: "3", AwardDescription: "$5,000 Bonus Dollars" },
      { SlabNo: "1", SlabType: "RANK", Min: "1", Max: "2", AwardDescription: "$10,000 Bonus Dollars" },
      { SlabNo: "3", SlabType: "RANK", Min: "5", Max: "15", AwardDescription: "$500 Bonus Dollars" },
    ]),
  );
  assert.deepEqual(prizes, [
    { label: "#1", prize: "$10,000 Bonus Dollars" },
    { label: "#2", prize: "$5,000 Bonus Dollars" },
    { label: "#5 - #14", prize: "$500 Bonus Dollars" },
  ]);
  assert.deepEqual(parsePrizes("[]"), []);
  assert.deepEqual(parsePrizes("nope"), []);
});

import { MPP_FIELDS } from "../lib/sitecore.js";

test("MPP is detected by template or by fields, without terms and conditions", () => {
  assert.equal(detectPageType({ promotiontitle: "x" }, {}, [], "mobilepromotion").type, "mpp");
  assert.equal(detectPageType({ promotiontitle: "x" }, {}, [], "MobilePromotion").isMPP, true);
  const fields = Object.fromEntries(MPP_FIELDS.map((k) => [k, "x"]));
  assert.equal(detectPageType(fields, {}, []).type, "mpp");
  assert.notEqual(detectPageType({ promotiontitle: "x" }, {}, [], "other").type, "mpp");
});
