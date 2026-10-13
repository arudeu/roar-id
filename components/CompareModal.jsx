"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, Diff, Eraser, TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { compareTexts, htmlToText, tidyPaste } from "@/lib/text-compare";

const TEXTAREA_CLASS =
  "block h-52 w-full resize-y rounded-md border border-input bg-transparent p-3 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const MAX_ISSUES_SHOWN = 200;

/** Split the original text into styled runs: plain, differing, ignored bullets, and gap markers. */
function buildNodes(original, side) {
  const strippedIndex = new Int32Array(original.length).fill(-1);
  side.map.forEach((orig, k) => {
    strippedIndex[orig] = k;
  });

  const nodes = [];
  let cur = null;
  const push = (kind, hunk, ch) => {
    if (cur && cur.kind === kind && cur.hunk === hunk) cur.text += ch;
    else {
      cur = { kind, hunk, text: ch };
      nodes.push(cur);
    }
  };
  const gap = (k) => {
    nodes.push({ kind: "gap", hunk: side.gaps.get(k), text: "" });
    cur = null;
  };

  for (let o = 0; o < original.length; o++) {
    const k = strippedIndex[o];
    if (k === -1) {
      push("ignored", -1, original[o]);
      continue;
    }
    if (side.gaps.has(k)) gap(k);
    if (side.marks[k]) push("diff", side.hunkOf[k], original[o]);
    else push("plain", -1, original[o]);
  }
  if (side.gaps.has(side.map.length)) gap(side.map.length);
  return nodes;
}

const DiffText = React.forwardRef(function DiffText({ original, side, tone, activeHunk }, ref) {
  const nodes = useMemo(() => buildNodes(original, side), [original, side]);
  const diffColor =
    tone === "removed"
      ? "bg-red-200 text-red-950 dark:bg-red-500/40 dark:text-red-50"
      : "bg-green-200 text-green-950 dark:bg-green-500/40 dark:text-green-50";

  return (
    <div
      ref={ref}
      className="h-52 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap"
    >
      {original.length === 0 && <span className="text-muted-foreground">(empty)</span>}
      {nodes.map((n, i) => {
        const active = n.hunk === activeHunk && activeHunk !== null;
        if (n.kind === "gap") {
          return (
            <span
              key={i}
              data-hunk={n.hunk}
              title="Text is missing on this side here"
              className={cn(
                "mx-px inline-block h-[1.15em] w-1 translate-y-[0.2em] rounded-sm bg-orange-500",
                active && "outline-2 outline-offset-1 outline-blue-500",
              )}
            />
          );
        }
        if (n.kind === "diff") {
          return (
            <span
              key={i}
              data-hunk={n.hunk}
              className={cn(
                "rounded-[2px] px-px font-semibold",
                diffColor,
                active && "outline-2 outline-offset-1 outline-blue-500",
              )}
            >
              {n.text}
            </span>
          );
        }
        if (n.kind === "ignored") {
          return (
            <span key={i} className="text-muted-foreground/60" title="Bullet / numbering (ignored)">
              {n.text}
            </span>
          );
        }
        return <span key={i}>{n.text}</span>;
      })}
    </div>
  );
});

const TYPE_LABEL = { char: "Character", word: "Word", space: "Spacing" };
const SEVERITY_ICON = {
  error: { Icon: CircleAlert, className: "text-destructive" },
  warning: { Icon: TriangleAlert, className: "text-warning" },
};

function IssueList({ issues, activeHunk, onSelect }) {
  const counts = issues.reduce((acc, i) => ({ ...acc, [i.type]: (acc[i.type] || 0) + 1 }), {});
  const shown = issues.slice(0, MAX_ISSUES_SHOWN);

  return (
    <section aria-label="Issues" className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <h4 className="mr-auto text-sm font-bold">
          Issues <span className="font-normal text-muted-foreground">({issues.length})</span>
        </h4>
        {Object.entries(counts).map(([type, n]) => (
          <Badge key={type} variant={type === "space" ? "warning" : "error"}>
            {n} {TYPE_LABEL[type].toLowerCase()}
          </Badge>
        ))}
      </div>
      <ul className="max-h-64 divide-y overflow-y-auto">
        {shown.map((issue) => {
          const { Icon, className } = SEVERITY_ICON[issue.severity];
          const active = activeHunk === issue.id;
          return (
            <li key={issue.id}>
              <button
                type="button"
                onClick={() => onSelect(issue.id)}
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-2 text-left outline-none hover:bg-accent focus-visible:bg-accent",
                  active && "bg-accent",
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", className)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium break-words">{issue.message}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    …{issue.before}
                    <span className="mx-0.5 rounded bg-orange-200 px-0.5 text-orange-900">▸</span>
                    {issue.after}…
                  </span>
                </span>
                <Badge variant="outline" className="shrink-0">
                  {TYPE_LABEL[issue.type]}
                </Badge>
              </button>
            </li>
          );
        })}
      </ul>
      {issues.length > shown.length && (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          Showing the first {MAX_ISSUES_SHOWN} of {issues.length} issues.
        </p>
      )}
    </section>
  );
}

export default function CompareModal({ label, fetched: rawFetched = "", onClose }) {
  // Sitecore values are usually HTML; compare what a reader sees, not the markup.
  const { text: fetched, converted } = useMemo(() => htmlToText(rawFetched), [rawFetched]);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState(null);
  const [activeHunk, setActiveHunk] = useState(null);
  const dialogRef = useRef(null);
  const leftPane = useRef(null);
  const rightPane = useRef(null);

  // Escape closes, background doesn't scroll while the modal is open.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  // Scroll both panes to the selected difference.
  useEffect(() => {
    if (activeHunk === null) return;
    [leftPane, rightPane].forEach((pane) => {
      const el = pane.current?.querySelector(`[data-hunk="${activeHunk}"]`);
      if (el && pane.current) {
        const box = pane.current.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        pane.current.scrollTo({
          top: pane.current.scrollTop + (rect.top - box.top) - box.height / 2,
          behavior: "smooth",
        });
      }
    });
  }, [activeHunk]);

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData("text");
    if (text == null) return;
    e.preventDefault();
    const el = e.currentTarget;
    const before = pasted.slice(0, el.selectionStart);
    const after = pasted.slice(el.selectionEnd);

    // Both strings are trimmed the same way at the start, so the cursor lands right after the pasted text.
    const combined = tidyPaste(before + text + after);
    const cursor = Math.min(tidyPaste(before + text).length, combined.length);

    setPasted(combined);
    setResult(null);
    requestAnimationFrame(() => el.setSelectionRange(cursor, cursor));
  };

  const handleChange = (e) => {
    setPasted(e.target.value);
    setResult(null);
  };

  const runCompare = () => {
    if (!pasted.trim()) {
      toast.info("Paste some text on the right first", { id: "compare-modal" });
      return;
    }
    const next = compareTexts(fetched, pasted);
    setResult(next);
    setActiveHunk(next.issues.length ? next.issues[0].id : null);
  };

  const clearPasted = () => {
    setPasted("");
    setResult(null);
    setActiveHunk(null);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Compare ${label}`}
        tabIndex={-1}
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-2xl outline-none"
      >
        <header className="flex items-center gap-2 border-b px-5 py-3">
          <Diff className="size-5 text-muted-foreground" />
          <h3 className="mr-auto text-base font-bold">Compare: {label}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </header>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="compare-fetched">Fetched from Sitecore:</Label>
                {converted && <Badge variant="info">HTML converted to plain text</Badge>}
              </div>
              <textarea
                id="compare-fetched"
                readOnly
                value={fetched}
                placeholder="No value was fetched for this field"
                className={TEXTAREA_CLASS}
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compare-pasted">Paste text to compare:</Label>
              <textarea
                id="compare-pasted"
                value={pasted}
                onPaste={handlePaste}
                onChange={handleChange}
                placeholder="Paste here — extra spaces are removed, line breaks are kept"
                className={TEXTAREA_CLASS}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={runCompare}>
              <Diff /> Compare
            </Button>
            <Button variant="secondary" onClick={clearPasted} disabled={!pasted}>
              <Eraser /> Clear
            </Button>
            <p className="text-xs text-muted-foreground">
              Fetched HTML is converted to plain text first. Bullets and numbering are ignored, and line breaks count
              as spaces.
            </p>
          </div>

          {result && (
            <div className="space-y-4">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold",
                  result.identical
                    ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                    : "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
                )}
              >
                {result.identical ? <CircleCheck className="size-5" /> : <CircleAlert className="size-5" />}
                {result.identical
                  ? "The texts match."
                  : `${result.issues.length} difference${result.issues.length === 1 ? "" : "s"} found.`}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    Fetched
                    <Badge variant="error">in fetched only</Badge>
                  </div>
                  <DiffText
                    ref={leftPane}
                    original={fetched}
                    side={result.left}
                    tone="removed"
                    activeHunk={activeHunk}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    Pasted
                    <Badge variant="success">in pasted only</Badge>
                  </div>
                  <DiffText
                    ref={rightPane}
                    original={pasted}
                    side={result.right}
                    tone="added"
                    activeHunk={activeHunk}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                An orange bar marks where the other side has extra text. Greyed-out bullets and numbers are ignored.
              </p>

              {!result.identical && (
                <IssueList issues={result.issues} activeHunk={activeHunk} onSelect={setActiveHunk} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
