"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { toast, ToastContainer, ToastContentProps } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { html } from "@codemirror/lang-html";
import { monokai, monokaiInit } from "@uiw/codemirror-theme-monokai";

// ✅ Load CodeMirror dynamically (Next.js-safe)
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
});
import {
  EditorView,
  Decoration,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { StateEffect, StateField } from "@codemirror/state";

const setFlashDecoration = StateEffect.define();
const clearFlashDecoration = StateEffect.define();

const flashField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setFlashDecoration)) {
        return Decoration.set([
          Decoration.line({
            attributes: { class: "cm-error-flash" },
          }).range(e.value),
        ]);
      } else if (e.is(clearFlashDecoration)) {
        return Decoration.none;
      }
    }
    return value.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

function highlightErrorsPlugin(errors = []) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = this.buildDecorations(view);
      }

      update(update) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view) {
        const builder = new RangeSetBuilder();
        const text = view.state.doc.toString();

        errors.forEach(({ errorText }) => {
          const regex = new RegExp(
            errorText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "gi"
          );
          for (const match of text.matchAll(regex)) {
            const start = match.index;
            const end = start + match[0].length;
            builder.add(
              start,
              end,
              Decoration.mark({
                class: "cm-error-highlight",
                attributes: { title: "⚠️ " + errorText },
              })
            );
          }
        });

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}

export default function Check({ fieldMap, viewMode }) {
  const stripHTML = (str) => {
    if (!str) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, "text/html");
    return doc.body.textContent || "";
  };

  const cleanFieldMap = Object.fromEntries(
    Object.entries(fieldMap || {}).map(([key, val]) => {
      let cleanVal = val.trim();
      return [key, cleanVal];
    })
  );

  const fieldLabels = {
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

  const [inputs, setInputs] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [showWarnings, setShowWarnings] = useState(false);

  const fieldRefs = useRef({});

  // Initialize fields based on viewMode
  useEffect(() => {
    let defaultInputs = {};

    switch (viewMode) {
      case "inbox":
        defaultInputs = {
          snippettitle: "",
          snippetdescription: fieldMap.snippetdescription || "",
          detailtitle: "",
          detaildescription: fieldMap.detaildescription || "",
          manualtermsandconditions: fieldMap.manualtermsandconditions || "",
        };
        break;
      case "overlay":
        defaultInputs = {
          overlaytitle: "",
          overlaydescription: fieldMap.overlaydescription || "",
          overlaycta: fieldMap.overlaycta || "",
          manualtermsandconditions: fieldMap.manualtermsandconditions || "",
        };
        break;
      case "toaster":
        defaultInputs = {
          toastertitle: "",
          toasterdescription: fieldMap.toasterdescription || "",
          toastercta: fieldMap.toastercta || "",
        };
        break;
      case "rewardtiles":
        defaultInputs = {
          rewardtitle: fieldMap.commontitle || "",
          rewarddescription: fieldMap.commontermsandconditions || "",
        };
        break;
      case "mpp":
        defaultInputs = {
          promotiontitle: "",
          imageheadline: "",
          detaileddescription: fieldMap.detaileddescription || "",
          termsandconditions: fieldMap.termsandconditions || "",
        };
        break;
      default:
        defaultInputs = {
          manualtermsandconditions: fieldMap.manualtermsandconditions || "",
        };
    }

    setInputs(defaultInputs);
  }, [viewMode, fieldMap]);

  const handleChange = (name, value) => {
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setInputs(Object.fromEntries(Object.keys(inputs).map((k) => [k, ""])));
  };

  const getBorderClass = (field) => {
    if (!inputs[field]) return "";
    return inputs[field] === cleanFieldMap[field] ? "is-valid" : "is-invalid";
  };

  const getTextareaBorderClass = (field) => {
    if (!inputs[field]) return "";
    const hasWarning = warnings.some((w) => w.field === field);
    if (hasWarning) return "is-invalid";
    return inputs[field] === cleanFieldMap[field] ? "is-valid" : "is-invalid";
  };

  // ✨ HTML Validation Logic
  const checkHTML = (field, value) => {
    const issues = [];
    const pushMatch = (regex, message) => {
      const matches = [...value.matchAll(regex)];
      matches.forEach((m) => issues.push(`${message} → “${m[0]}”`));
    };
    // ✅ Time format validation
    const timePattern = /\b\d{1,2}(:\d{2}(:\d{2})?)?\s?[AaPp]\.?[Mm]\.?\b/g;
    [...value.matchAll(timePattern)].forEach((m) => {
      if (
        !/\b(0?[1-9]|1[0-2]):[0-5][0-9](?::[0-5][0-9])?\s(AM|PM)\b/.test(m[0])
      ) {
        issues.push(
          `Incorrect time format. Use HH:MM AM/PM (e.g., 10:00 AM) → “${m[0]}”`
        );
      }
    });
    // Detect 24 hour time format
    pushMatch(
      /\b([01]\d|2[0-3]):[0-5]\d\sEST\b/g,
      "Contains time with EST (e.g., 12:00 EST)"
    );
    pushMatch(
      /\b([01]\d|2[0-3]):[0-5]\d\sET\b/g,
      "Contains time with EST (e.g., 12:00 ET)"
    );

    pushMatch(
      /[\u200B\u200A\u2002\u2003\u2009\u202F]/g,
      "Contains invisible special space"
    );
    pushMatch(/\$\$/g, "Contains double dollar signs ($$). Use a single $");
    pushMatch(/%%/g, "Contains double percent signs (%%). Use a single %");
    pushMatch(
      /[!?]{2,}/g,
      "Contains multiple punctuation marks (e.g., !!, ??)"
    );
    pushMatch(/\$\s+\d|\d\s+\$/g, "Space detected between $ and number");
    pushMatch(/&nbsp;/g, "Contains non-breaking space (&nbsp;)");
    pushMatch(/<(\w+)>\s*<\/\1>/gi, "Contains empty HTML tag");
    pushMatch(
      /<br\s*\/?>/gi,
      "Contains line break tag (<br>). Use spaces instead"
    );
    pushMatch(/[a-zA-Z],[A-Za-z]/g, "Missing space after comma");
    pushMatch(/\S {2,}/g, "Contains multiple consecutive spaces");
    pushMatch(/regulations\(s\)/gi, "Incorrect plural form: 'regulations(s)'");
    pushMatch(/rewards\(s\)/gi, "Incorrect plural form: 'rewards(s)'");
    pushMatch(
      /OLG\s+Internal\s+Control\s+Trigger\s+Based/gi,
      "Contains OLG line (remove for non-NJ states)"
    );
    pushMatch(
      /\b(\d+)(st|nd|rd|th)\b(?!<\/sup>)/gi,
      "Ordinal missing <sup> tag (e.g., 3<sup>rd</sup>)"
    );
    pushMatch(
      /[™®©]/g,
      "Use HTML entities for ™, ®, and © (e.g., &trade;, &reg;, &copy;)"
    );
    // Detects any double words like bonus bonus or free free. Ignore if btn btn or table table (common in HTML)
    pushMatch(
      /\b(?!btn\b)(?!table\b)([a-zA-Z]+)\s+\1\b/g,
      "Contains repeated word"
    );

    // Detects missing comma in numbers $1000 instead of $1,000
    pushMatch(
      /\$\d{4,}/g,
      "Large number missing comma (e.g., use $1,000 instead of $1000)"
    );

    // Detects amount tier (e.g. $XX/$XX/$XX/$XX) but not dates (e.g. 10/20/2024)
    pushMatch(
      /\$\d+(\/\$\d+){2,}/g,
      "Use 'up to $XX, $XX, $XX' instead of slashes for amount tiers"
    );
    //Detects amount tier with dollar sign only on first amount (e.g. $XX/XX/XX)
    pushMatch(
      /\$\d+(\/\d+){2,}/g,
      "Use 'up to $XX, $XX, $XX' instead of slashes for amount tiers"
    );
    // Detects "(Link to...)" patterns
    pushMatch(
      /\(Link to [^)]+\)/gi,
      'Contains placeholder "(Link to ...)", please replace with actual link text or remove'
    );

    try {
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(value, "text/html");
      const parseError = parsedDoc.querySelector("parsererror");

      if (parseError) {
        const errorText = parseError.textContent
          .replace(/.+error:|\n/g, "")
          .trim();
        issues.push(`Unclosed or malformed HTML tag detected → “${errorText}”`);
      } else {
        // Match opening tags without attributes (e.g., <div>, <p>)
        const tagPattern = /<([a-z]+)>(?![^>]*\/>)/gi;
        const allTags = [...value.matchAll(tagPattern)].map((m) => m[1]);

        // Tags that should be ignored completely (wrappers or structured tags)
        const ignoreTags = ["tr", "td", "th", "tbody", "thead", "tfoot"];

        allTags.forEach((tag) => {
          if (
            ["br", "hr", "img", "input", "meta", "link"].includes(tag) ||
            ignoreTags.includes(tag)
          )
            return;

          // Only count tags without attributes
          const openCount = (value.match(new RegExp(`<${tag}>`, "gi")) || [])
            .length;
          const closeCount = (value.match(new RegExp(`</${tag}>`, "gi")) || [])
            .length;

          if (openCount !== closeCount) {
            issues.push(`Unclosed or mismatched <${tag}> tag`);
          }
        });
      }
    } catch {
      issues.push("Error while checking for unclosed tags");
    }

    return issues.length ? { field, issues } : null;
  };

  const runValidation = () => {
    // close toast if open
    toast.dismiss();
    const foundWarnings = [];
    Object.entries(inputs).forEach(([key, val]) => {
      if (!val) return;
      const issue = checkHTML(key, val);
      if (issue) foundWarnings.push(issue);
    });
    setWarnings(foundWarnings);

    if (foundWarnings.length === 0) {
      toast.success(successMessage, {
        position: `bottom-center`,
        autoClose: 3000,
        theme: "dark",
      });
      setShowWarnings(false);
    } else {
      toast.warn(warningMessage, {
        position: `bottom-center`,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        theme: "dark",
        //adjust width
        style: { width: "auto", maxWidth: "1000px" },
      });
      setShowWarnings(true);
    }
  };

  const successMessage = () => (
    <div>
      <h6 className="fw-bold mb-2">No issues found!</h6>
      <p>All fields look good.</p>
    </div>
  );

  const warningMessage = ({ closeToast }) => (
    <div>
      <h6 className="fw-bold mb-2">Detected Warnings:</h6>
      <ul className="mb-0">
        {warnings.map((w, i) => (
          <li key={i}>
            <button
              type="button"
              className="btn btn-link p-0 m-0 align-baseline"
              onClick={() => {
                scrollToField(w.field);
                closeToast();
              }}
            >
              {fieldLabels[w.field] || w.field}
            </button>
            <ul>
              {w.issues.map((issue, j) => (
                <li key={j}>
                  <button
                    type="button"
                    className="btn btn-link p-0 m-0 align-baseline text-danger"
                    onClick={() => {
                      const match = issue.match(/→ “(.*?)”/);
                      if (match) scrollToError(w.field, match[1]);
                      scrollToField(w.field);
                      closeToast();
                    }}
                  >
                    {issue}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );

  const scrollToField = (field) => {
    const element = fieldRefs.current[field];
    if (element?.scrollIntoView) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const scrollToError = (field, errorText) => {
    const editor = fieldRefs.current[field];
    const view = editor?.view;
    if (!view) return;

    const text = view.state.doc.toString();
    const regex = new RegExp(
      errorText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    const match = regex.exec(text);

    if (match) {
      const pos = match.index;

      // Scroll into view
      view.dispatch({
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });

      // Highlight that line
      view.dispatch({
        effects: setFlashDecoration.of(pos),
      });

      // Remove flash after 1.2 seconds
      setTimeout(() => {
        view.dispatch({
          effects: clearFlashDecoration.of(null),
        });
      }, 1200);
    }
  };

  return (
    <div className="container check-container position-sticky">
      <div className="row">
        <div className="col">
          <h5 className="fw-bold text-capitalize mb-3">{viewMode}</h5>

          {Object.keys(inputs).map((field) => {
            const isDescriptionField = [
              "snippetdescription",
              "detaildescription",
              "overlaydescription",
              "toasterdescription",
              "rewardtitle",
              "rewarddescription",
              "detaileddescription",
              "termsandconditions",
              "manualtermsandconditions",
            ].includes(field);

            return (
              <div key={field} className="mb-3">
                <label htmlFor={field} className="fw-bold">
                  {fieldLabels[field] || field.replace(/([A-Z])/g, " $1")}:
                </label>

                {isDescriptionField ? (
                  <div className="codemirror-wrapper border rounded">
                    <CodeMirror
                      ref={(el) => (fieldRefs.current[field] = el)}
                      value={inputs[field]}
                      height="200px"
                      theme={monokaiInit({
                        settings: {
                          caret: "#c6c6c6",
                          fontFamily: "Fira Code",
                        },
                      })}
                      extensions={[
                        html(),
                        flashField, // ← add this
                        highlightErrorsPlugin(
                          warnings
                            .filter((w) => w.field === field)
                            .flatMap((w) =>
                              w.issues
                                .map((issue) => {
                                  const match = issue.match(/→ “(.*?)”/);
                                  return match ? { errorText: match[1] } : null;
                                })
                                .filter(Boolean)
                            )
                        ),
                      ]}
                      onChange={(value) => handleChange(field, value)}
                      className={getTextareaBorderClass(field)}
                    />
                  </div>
                ) : (
                  <input
                    ref={(el) => (fieldRefs.current[field] = el)}
                    type="text"
                    className={`form-control ${getBorderClass(field)}`}
                    name={field}
                    placeholder={`Enter ${fieldLabels[field] || field}`}
                    value={inputs[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                  />
                )}
              </div>
            );
          })}

          <div className="d-flex gap-2 mt-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={runValidation}
            >
              Run HTML Check
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClear}
            >
              Clear All
            </button>
          </div>

          {(!showWarnings || warnings.length > 0) && <ToastContainer />}
        </div>
      </div>
    </div>
  );
}
