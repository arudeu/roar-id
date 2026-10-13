import { isImageUrl, parseSteps } from "./pat.js";

// Field configuration for the HTML checker, per preview mode.
//   key      – the input name shown in the checker
//   source   – Sitecore field to compare against / prefill from (defaults to key)
//   prefill  – start with the Sitecore value filled in (otherwise blank, so you
//              type or paste the copy you want to verify)

export const FIELD_LABELS = {
  snippettitle: "Preview Title",
  snippetdescription: "Preview Description",
  detailtitle: "Fullview Title",
  detaildescription: "Fullview Description",
  overlaytitle: "Overlay Title",
  overlaydescription: "Overlay Description",
  overlaycta: "Overlay CTA",
  toastertitle: "Toaster Title",
  toasterdescription: "Toaster Description",
  toastercta: "Toaster CTA",
  rewardtitle: "Reward Title",
  rewarddescription: "Reward Description",
  promotiontitle: "Promo Title",
  imageheadline: "Promo Dates",
  detaileddescription: "Promo Description",
  termsandconditions: "Terms and Conditions",
  manualtermsandconditions: "Terms and Conditions",
  promoteaserinfo: "Introduction Text",
  prizemessage: "The Hook",
  steps: "Steps",
  fulltermsandconditions: "Terms and Conditions",
  winupto: "More Details",
  promoname: "Promo Name",
  keytermsandconditions: "Key Terms and Conditions",
};

// Fields that get the full code editor (the rest are single-line inputs).
export const CODE_FIELDS = new Set([
  "snippetdescription",
  "detaildescription",
  "overlaydescription",
  "toasterdescription",
  "rewardtitle",
  "rewarddescription",
  "detaileddescription",
  "termsandconditions",
  "manualtermsandconditions",
  "steps",
  "keytermsandconditions",
  "fulltermsandconditions",
]);

export const VIEW_FIELDS = {
  inbox: [
    { key: "snippettitle" },
    { key: "snippetdescription", prefill: true },
    { key: "detailtitle" },
    { key: "detaildescription", prefill: true },
    { key: "manualtermsandconditions", prefill: true },
  ],
  overlay: [
    { key: "overlaytitle" },
    { key: "overlaydescription", prefill: true },
    { key: "overlaycta", prefill: true },
    { key: "manualtermsandconditions", prefill: true },
  ],
  toaster: [
    { key: "toastertitle" },
    { key: "toasterdescription", prefill: true },
    { key: "toastercta", prefill: true },
  ],
  rewardtiles: [
    { key: "rewardtitle", source: "commontitle", prefill: true },
    { key: "rewarddescription", source: "commontermsandconditions", prefill: true },
  ],
  mpp: [
    { key: "promotiontitle" },
    { key: "imageheadline" },
    { key: "detaileddescription", prefill: true },
    { key: "termsandconditions", prefill: true },
  ],
  pat: [
    {
      key: "promoteaserinfo",
      tab: "Overview",
      hint: "Quick intro to the promotion.",
    },
    {
      key: "prizemessage",
      tab: "Overview",
      hint: "The “hook”: your main selling point, and the most prominent part of the page.",
    },
    // Expanded into "Step N Title" / "Step N Description" fields from the Steps JSON.
    { key: "steps", tab: "How It Works" },
    { key: "fulltermsandconditions", prefill: true },
  ],
  leaderboard: [
    { key: "promoname", tab: "Header" },
    { key: "promoteaserinfo", tab: "Overview", hint: "Quick intro to the promotion." },
    // Expanded into "Step N Icon" / "Step N Description" fields from the Steps JSON.
    { key: "steps", tab: "How It Works" },
    { key: "winupto" },
    { key: "fulltermsandconditions", prefill: true },
  ],
  promohub: [
    { key: "promoname", tab: "Promohub Tile" },
    { key: "keytermsandconditions", tab: "Promohub Tile", prefill: true },
  ],
  default: [{ key: "manualtermsandconditions", prefill: true }],
};

// Views whose Steps JSON is expanded into per-step fields.
const STEP_VIEWS = new Set(["pat", "leaderboard"]);

const STEPS_HINT = "Parsed from the Steps JSON. Minimum 2 steps to publish, ideally 4 maximum.";

/** One title + one description field per step found in the Steps JSON. */
function stepFieldDefs(rawSteps) {
  const { steps } = parseSteps(rawSteps);
  if (steps.length) {
    return steps.flatMap((step, i) => {
      const n = i + 1;
      // Leaderboard steps keep an icon URL in "title".
      const titleLabel = isImageUrl(step.title) ? `Step ${n} Icon` : `Step ${n} Title`;
      return [
        { key: `step${n}title`, label: titleLabel, tab: "How It Works", ...(i === 0 ? { hint: STEPS_HINT } : {}) },
        { key: `step${n}description`, label: `Step ${n} Description`, tab: "How It Works", prefill: true, code: true },
      ];
    });
  }
  // Unreadable JSON: show it as-is so it can still be checked.
  if ((rawSteps || "").trim()) {
    return [
      {
        key: "steps",
        label: "Steps (JSON)",
        tab: "How It Works",
        prefill: true,
        code: true,
        hint: "The steps couldn't be read from this JSON, so it is shown as-is.",
      },
    ];
  }
  return [];
}

/** Fields for a view. PAT's Steps JSON is expanded into per-step fields. */
export const fieldsForView = (viewMode, fieldMap = {}) =>
  (VIEW_FIELDS[viewMode] || VIEW_FIELDS.default).flatMap((def) =>
    STEP_VIEWS.has(viewMode) && def.key === "steps" ? stepFieldDefs(fieldMap.steps) : [def],
  );

/** The fetched values for a view: the field map plus a value for each generated step field. */
export function fieldValues(viewMode, fieldMap = {}) {
  if (!STEP_VIEWS.has(viewMode)) return fieldMap;
  const extra = {};
  parseSteps(fieldMap.steps).steps.forEach((step, i) => {
    extra[`step${i + 1}title`] = step.title;
    extra[`step${i + 1}description`] = step.text;
  });
  return { ...fieldMap, ...extra };
}
