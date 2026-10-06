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
  default: [{ key: "manualtermsandconditions", prefill: true }],
};

export const fieldsForView = (viewMode) => VIEW_FIELDS[viewMode] || VIEW_FIELDS.default;
