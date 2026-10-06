"use client";
<<<<<<< HEAD
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
            "gi",
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
              }),
            );
          }
        });

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    },
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
    }),
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
          `Incorrect time format. Use HH:MM AM/PM (e.g., 10:00 AM) → “${m[0]}”`,
        );
      }
    });
    // Detect 24 hour time format
    pushMatch(
      /\b([01]\d|2[0-3]):[0-5]\d\sEST\b/g,
      "Contains time with EST (e.g., 12:00 EST)",
    );
    pushMatch(
      /\b([01]\d|2[0-3]):[0-5]\d\sET\b/g,
      "Contains time with EST (e.g., 12:00 ET)",
    );

    pushMatch(
      /[\u200B\u200A\u2002\u2003\u2009\u202F]/g,
      "Contains invisible special space",
    );
    pushMatch(/\$\$/g, "Contains double dollar signs ($$). Use a single $");
    pushMatch(/%%/g, "Contains double percent signs (%%). Use a single %");
    pushMatch(
      /[!?]{2,}/g,
      "Contains multiple punctuation marks (e.g., !!, ??)",
    );
    pushMatch(/\$\s+\d|\d\s+\$/g, "Space detected between $ and number");
    pushMatch(/&nbsp;/g, "Contains non-breaking space (&nbsp;)");
    pushMatch(/<(\w+)>\s*<\/\1>/gi, "Contains empty HTML tag");
    pushMatch(
      /<br\s*\/?>/gi,
      "Contains line break tag (<br>). Use spaces instead",
    );
    pushMatch(/[a-zA-Z],[A-Za-z]/g, "Missing space after comma");
    pushMatch(/\S {2,}/g, "Contains multiple consecutive spaces");
    pushMatch(/regulations\(s\)/gi, "Incorrect plural form: 'regulations(s)'");
    pushMatch(/rewards\(s\)/gi, "Incorrect plural form: 'rewards(s)'");
    pushMatch(
      /OLG\s+Internal\s+Control\s+Trigger\s+Based/gi,
      "Contains OLG line (remove for non-NJ states)",
    );
    pushMatch(
      /\b(\d+)(st|nd|rd|th)\b(?!<\/sup>)/gi,
      "Ordinal missing <sup> tag (e.g., 3<sup>rd</sup>)",
    );
    // Detects <strong>.</strong> (a common issue when copying from Word with bold formatting)
    pushMatch(
      /<strong>\s*.\s*<\/strong>/gi,
      "Contains <strong> tag with only a dot inside, likely from copying from Word. Consider removing the tags.",
    );
    pushMatch(
      /[™®©]/g,
      "Use HTML entities for ™, ®, and © (e.g., &trade;, &reg;, &copy;)",
    );
    // Detects any double words like bonus bonus or free free. Ignore if btn btn or table table (common in HTML)
    pushMatch(
      /\b(?!btn\b)(?!table\b)([a-zA-Z]+)\s+\1\b/g,
      "Contains repeated word",
    );

    // Detects missing comma in numbers $1000 instead of $1,000
    pushMatch(
      /\$\d{4,}/g,
      "Large number missing comma (e.g., use $1,000 instead of $1000)",
    );

    // Detects amount tier (e.g. $XX/$XX/$XX/$XX) but not dates (e.g. 10/20/2024)
    pushMatch(
      /\$\d+(\/\$\d+){2,}/g,
      "Use 'up to $XX, $XX, $XX' instead of slashes for amount tiers",
    );
    //Detects amount tier with dollar sign only on first amount (e.g. $XX/XX/XX)
    pushMatch(
      /\$\d+(\/\d+){2,}/g,
      "Use 'up to $XX, $XX, $XX' instead of slashes for amount tiers",
    );
    // Detects "(Link to...)" patterns
    pushMatch(
      /\(Link to [^)]+\)/gi,
      'Contains placeholder "(Link to ...)", please replace with actual link text or remove',
    );
    // Check if there are multiple tiles. If multiple tiles, the header should be
    //  "Click Tiles Below To Play Eligible Games" else "Click Tile Below To Play Eligible Game"
    // To determine if tile, href should contain "launchng".
    const tileLinks = [...value.matchAll(/href="([^"]*launchng[^"]*)"/gi)];
    if (tileLinks.length > 1) {
      const singleTileHeaderPattern =
        /Click\s+Tile\s+Below\s+To\s+Play\s+Eligible\s+Game/gi;
      if (singleTileHeaderPattern.test(value)) {
        issues.push(
          'Multiple tiles detected, but header says "Click Tile Below To Play Eligible Game". Consider changing to "Click Tiles Below To Play Eligible Games".',
        );
      }
    } else if (tileLinks.length === 1) {
      const multiTileHeaderPattern =
        /Click\s+Tiles\s+Below\s+To\s+Play\s+Eligible\s+Games/gi;
      if (multiTileHeaderPattern.test(value)) {
        issues.push(
          'Single tile detected, but header says "Click Tiles Below To Play Eligible Games". Consider changing to "Click Tile Below To Play Eligible Game".',
        );
      }
    }
    if (issues.length === 0) return null;

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
      "i",
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
                                .filter(Boolean),
                            ),
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
=======

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Eraser, Play, Undo2 } from "lucide-react";
import { EditorView } from "@codemirror/view";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CodeField, { setActiveIssue } from "@/components/CodeField";
import IssuePanel from "@/components/IssuePanel";
import { CODE_FIELDS, FIELD_LABELS, fieldsForView } from "@/lib/fields";
import { analyzeFields, applyFixes, compareWithSource } from "@/lib/html-checks";

const RUN_TOAST = "html-check-run";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Check({ fieldMap, viewMode, sourceKey }) {
  const defs = useMemo(() => fieldsForView(viewMode), [viewMode]);

  const defaults = useMemo(
    () =>
      Object.fromEntries(
        defs.map((d) => [d.key, d.prefill ? (fieldMap?.[d.source || d.key] ?? "") : ""]),
      ),
    [defs, fieldMap],
  );

  // Keep what you typed per view, so switching tabs doesn't wipe your work.
  const [drafts, setDrafts] = useState({});
  useEffect(() => setDrafts({}), [sourceKey]);
  const inputs = drafts[viewMode] ?? defaults;

  const setInputs = useCallback(
    (updater) =>
      setDrafts((prev) => {
        const current = prev[viewMode] ?? defaults;
        return { ...prev, [viewMode]: typeof updater === "function" ? updater(current) : updater };
      }),
    [viewMode, defaults],
  );

  // Analysis runs on every edit (cheap), at low priority so typing stays smooth.
  const deferredInputs = useDeferredValue(inputs);
  const analysis = useMemo(() => analyzeFields(deferredInputs), [deferredInputs]);
  const { issues, summary } = analysis;

  const issuesByField = useMemo(() => {
    const map = {};
    issues.forEach((i) => (map[i.field] = [...(map[i.field] || []), i]));
    return map;
  }, [issues]);

  const [activeId, setActiveId] = useState(null);
  useEffect(() => {
    if (activeId && !issues.some((i) => i.id === activeId)) setActiveId(null);
  }, [issues, activeId]);

  const views = useRef({});
  const wrappers = useRef({});
  const clearTimer = useRef(null);
  const registerView = useCallback((field, view) => {
    views.current[field] = view;
  }, []);

  /* ------------------------------ navigation ----------------------------- */

  const flash = useCallback((view, from, to) => {
    clearTimeout(clearTimer.current);
    const len = view.state.doc.length;
    const f = Math.min(from, Math.max(0, len - 1));
    const t = Math.min(Math.max(to, f + 1), len);
    view.dispatch({
      selection: { anchor: f, head: t },
      effects: [EditorView.scrollIntoView(f, { y: "center", yMargin: 40 }), setActiveIssue.of({ from: f, to: t })],
    });
    view.focus();
    clearTimer.current = setTimeout(() => {
      try {
        view.dispatch({ effects: setActiveIssue.of(null) });
      } catch {}
    }, 4500);
  }, []);

  const goTo = useCallback(
    (issue) => {
      setActiveId(issue.id);
      wrappers.current[issue.field]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const view = views.current[issue.field];
      if (view) flash(view, issue.from, issue.to);
    },
    [flash],
  );

  const step = useCallback(
    (dir, list = issues) => {
      if (!list.length) return;
      const idx = list.findIndex((i) => i.id === activeId);
      const next = idx === -1 ? (dir > 0 ? 0 : list.length - 1) : (idx + dir + list.length) % list.length;
      goTo(list[next]);
    },
    [issues, activeId, goTo],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
      e.preventDefault();
      step(e.key === "ArrowDown" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  /* -------------------------------- fixing ------------------------------- */

  const fixableIssues = useMemo(() => issues.filter((i) => i.fix), [issues]);

  const applyTo = useCallback(
    (targets, label) => {
      const before = inputs;
      let total = 0;
      const next = { ...inputs };
      const byField = {};
      targets.forEach((i) => (byField[i.field] = [...(byField[i.field] || []), i]));
      Object.entries(byField).forEach(([field, list]) => {
        // analysis may lag the editor by a render; only fix text we analysed
        if (deferredInputs[field] !== inputs[field]) return;
        const res = applyFixes(inputs[field], list);
        next[field] = res.value;
        total += res.applied;
      });
      if (!total) {
        toast.info("Nothing could be fixed automatically", { id: RUN_TOAST });
        return;
      }
      setInputs(next);
      toast.success(label ?? `Applied ${plural(total, "fix")}`, {
        id: RUN_TOAST,
        description: "Review the result — some issues may still need a manual edit.",
        duration: 6000,
        action: { label: "Undo", onClick: () => setInputs(before) },
      });
    },
    [inputs, deferredInputs, setInputs],
  );

  /* ------------------------------ run + clear ----------------------------- */

  const hasContent = Object.values(inputs).some((v) => v && v.trim());

  const runValidation = () => {
    if (!hasContent) {
      toast.info("Nothing to check yet", {
        id: RUN_TOAST,
        description: "Paste or type some copy into a field first.",
      });
      return;
    }
    if (summary.total === 0) {
      const checked = Object.values(inputs).filter((v) => v && v.trim()).length;
      toast.success("No issues found", {
        id: RUN_TOAST,
        description: `${plural(checked, "field")} checked — everything looks good.`,
        duration: 3500,
      });
      setActiveId(null);
      return;
    }
    const first = issues.find((i) => i.severity === "error") || issues[0];
    const parts = [
      summary.error && plural(summary.error, "error"),
      summary.warning && plural(summary.warning, "warning"),
      summary.info && plural(summary.info, "tip"),
    ].filter(Boolean);
    const show = summary.error ? toast.error : toast.warning;
    show(parts.join(" · "), {
      id: RUN_TOAST,
      description: `${fixableIssues.length} can be fixed automatically. Use Alt + ↑/↓ to move between issues.`,
      duration: Infinity,
      action: { label: "Go to first", onClick: () => goTo(first) },
    });
    goTo(first);
  };

  const handleClear = () => {
    const before = inputs;
    setInputs(Object.fromEntries(Object.keys(inputs).map((k) => [k, ""])));
    setActiveId(null);
    toast("Fields cleared", {
      id: RUN_TOAST,
      duration: 5000,
      action: { label: "Undo", onClick: () => setInputs(before) },
    });
  };

  /* --------------------------------- UI ---------------------------------- */

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h5 className="m-0 mr-auto text-lg font-bold capitalize">{viewMode}</h5>
        <Button onClick={runValidation}>
          <Play /> Run HTML Check
        </Button>
        <Button variant="secondary" onClick={handleClear} disabled={!hasContent}>
          <Eraser /> Clear All
        </Button>
      </div>

      <div className="sticky top-[4.25rem] z-30">
        <IssuePanel
          issues={issues}
          summary={summary}
          activeId={activeId}
          hasContent={hasContent}
          fixableCount={fixableIssues.length}
          onSelect={goTo}
          onStep={step}
          onFix={(issue) => applyTo([issue], "Fix applied")}
          onFixAll={() => applyTo(fixableIssues)}
        />
      </div>

      {defs.map(({ key: field, source }) => {
        const value = inputs[field] ?? "";
        const list = issuesByField[field] || [];
        const compare = compareWithSource(value, fieldMap?.[source || field]);
        const errors = list.filter((i) => i.severity === "error").length;

        return (
          <div
            key={field}
            ref={(el) => (wrappers.current[field] = el)}
            className="scroll-mt-40 space-y-1.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor={field}>{FIELD_LABELS[field] || field}:</Label>
              {compare.status === "match" && <Badge variant="success">Matches Sitecore</Badge>}
              {compare.status === "diff" && compare.whitespaceOnly && (
                <Badge variant="success">Matches Sitecore (extra whitespace)</Badge>
              )}
              {compare.status === "diff" && !compare.whitespaceOnly && (
                <button
                  type="button"
                  className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => {
                    const view = views.current[field];
                    if (view) flash(view, compare.from, compare.to);
                    toast.info(compare.message, { id: RUN_TOAST });
                  }}
                  title={compare.message}
                >
                  <Badge variant="warning">Differs from Sitecore · jump to first difference</Badge>
                </button>
              )}
              {list.length > 0 && (
                <Badge variant={errors ? "error" : "warning"} className="ml-auto">
                  {plural(list.length, "issue")}
                </Badge>
              )}
            </div>

            <CodeField
              field={field}
              value={value}
              analyzedValue={deferredInputs[field] ?? ""}
              issues={list}
              compact={!CODE_FIELDS.has(field)}
              placeholder={`Enter ${FIELD_LABELS[field] || field}`}
              onChange={(v) => setInputs((prev) => ({ ...prev, [field]: v }))}
              onView={registerView}
            />
          </div>
        );
      })}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Undo2 className="size-3" /> Hover a highlight for details and a one-click fix. Alt + ↑/↓ jumps between issues.
      </p>
>>>>>>> 8623917 (Updated overall look and improved code logic)
    </div>
  );
}
