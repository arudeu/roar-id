"use client";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Diff, Eraser, Play, Undo2 } from "lucide-react";
import { EditorView } from "@codemirror/view";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CodeField, { setActiveIssue } from "@/components/CodeField";
import IssuePanel from "@/components/IssuePanel";
import CompareModal from "@/components/CompareModal";
import { CODE_FIELDS, FIELD_LABELS, fieldsForView, fieldValues } from "@/lib/fields";
import { useSpell } from "@/components/SpellProvider";
import { analyzeFields, applyFixes, compareWithSource } from "@/lib/html-checks";

const RUN_TOAST = "html-check-run";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Check({ fieldMap, viewMode, sourceKey, title }) {
  const defs = useMemo(() => fieldsForView(viewMode, fieldMap), [viewMode, fieldMap]);
  // fetched values, including the generated per-step fields
  const values = useMemo(() => fieldValues(viewMode, fieldMap), [viewMode, fieldMap]);

  const defaults = useMemo(
    () =>
      Object.fromEntries(
        defs.map((d) => [d.key, d.prefill ? (values?.[d.source || d.key] ?? "") : ""]),
      ),
    [defs, values],
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

  // Spell check settings, dictionary and ignore list live in <SpellProvider> (opened from the navbar).
  const { spell, enabled: spellOn, ignoreWord } = useSpell();

  // Analysis runs on every edit (cheap), at low priority so typing stays smooth.
  const deferredInputs = useDeferredValue(inputs);
  const analysis = useMemo(() => analyzeFields(deferredInputs, { spell }), [deferredInputs, spell]);
  const { issues, summary } = analysis;

  const issuesByField = useMemo(() => {
    const map = {};
    issues.forEach((i) => (map[i.field] = [...(map[i.field] || []), i]));
    return map;
  }, [issues]);

  const [activeId, setActiveId] = useState(null);
  const [compareField, setCompareField] = useState(null); // { field, label, value } while the modal is open
  const closeCompare = useCallback(() => setCompareField(null), []);
  useEffect(() => setCompareField(null), [sourceKey]);
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

  // Spelling suggestions are guesses, so they are never part of "Fix all".
  const fixableIssues = useMemo(() => issues.filter((i) => i.fix && !i.noBulk), [issues]);

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

  const replaceWord = useCallback(
    (issue, word) =>
      applyTo(
        [{ ...issue, fix: [{ from: issue.from, to: issue.to, insert: word }] }],
        `Replaced “${issue.word}” with “${word}”`,
      ),
    [applyTo],
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
        description: `${plural(checked, "field")} checked — everything looks good.${spellOn && !spell ? " Spelling is still loading, so it wasn't included yet." : ""}`,
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
        <h5 className="m-0 mr-auto text-lg font-bold capitalize">{title ?? viewMode}</h5>
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
          onSuggest={replaceWord}
          onIgnore={ignoreWord}
          onFixAll={() => applyTo(fixableIssues)}
        />
      </div>

      {defs.map(({ key: field, source, tab, hint, label, code }) => {
        const fieldLabel = label || FIELD_LABELS[field] || field;
        const value = inputs[field] ?? "";
        const list = issuesByField[field] || [];
        const compare = compareWithSource(value, values?.[source || field]);
        const errors = list.filter((i) => i.severity === "error").length;

        return (
          <div
            key={field}
            ref={(el) => (wrappers.current[field] = el)}
            className="scroll-mt-40 space-y-1.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor={field}>{fieldLabel}:</Label>
              {tab && <Badge variant="outline">{tab}</Badge>}
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
              <div className="ml-auto flex items-center gap-2">
                {list.length > 0 && (
                  <Badge variant={errors ? "error" : "warning"}>{plural(list.length, "issue")}</Badge>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCompareField({
                      field,
                      label: fieldLabel,
                      value: values?.[source || field] ?? "",
                    })
                  }
                  title="Compare the fetched value with pasted text"
                >
                  <Diff /> Compare
                </Button>
              </div>
            </div>

            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

            <CodeField
              field={field}
              value={value}
              analyzedValue={deferredInputs[field] ?? ""}
              issues={list}
              compact={!(code ?? CODE_FIELDS.has(field))}
              placeholder={`Enter ${fieldLabel}`}
              onChange={(v) => setInputs((prev) => ({ ...prev, [field]: v }))}
              onView={registerView}
              onIgnoreWord={ignoreWord}
            />
          </div>
        );
      })}

      {compareField && (
        <CompareModal
          key={compareField.field}
          label={compareField.label}
          fetched={compareField.value}
          onClose={closeCompare}
        />
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Undo2 className="size-3" /> Hover a highlight for details and a one-click fix. Alt + ↑/↓ jumps between issues.
      </p>
    </div>
  );
}
