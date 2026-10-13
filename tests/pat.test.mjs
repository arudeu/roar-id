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
