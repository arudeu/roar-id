"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, CircleAlert, CircleCheck, Diff, Eraser, TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { buildPairs, mapScroll } from "@/lib/scroll-sync";
import { compareTexts, htmlToText, tidyPaste } from "@/lib/text-compare";

const TEXTAREA_CLASS =
  "block h-52 w-full resize-y overflow-auto rounded-md border border-input bg-transparent p-3 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

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
      className="h-[26rem] min-h-40 resize-y overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap"
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

/* ------------------------------ scroll sync ------------------------------ */

/**
 * Scrolling one pane scrolls the other. Only the pane you are using drives, so the
 * two never fight. `getPairs(a, b)` returns matching scroll positions (see
 * lib/scroll-sync.js); without it the panes scroll proportionally.
 */
function useScrollSync(aRef, bRef, enabled, getPairs) {
  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!enabled || !a || !b) return;

    let driver = a;
    const claim = (el) => () => {
      driver = el;
    };
    const follow = (src, dst, srcIsA) => () => {
      if (driver !== src) return;
      const srcMax = src.scrollHeight - src.clientHeight;
      const dstMax = dst.scrollHeight - dst.clientHeight;
      const pairs = getPairs?.(a, b);
      const target = pairs
        ? mapScroll(pairs, src.scrollTop, srcIsA)
        : srcMax > 0
          ? (src.scrollTop / srcMax) * dstMax
          : 0;
      if (Math.abs(dst.scrollTop - target) > 0.5) dst.scrollTop = target;
    };

    const onA = follow(a, b, true);
    const onB = follow(b, a, false);
    const claimA = claim(a);
    const claimB = claim(b);
    const events = ["pointerenter", "pointerdown", "wheel", "touchstart", "focus", "keydown"];
    events.forEach((e) => {
      a.addEventListener(e, claimA, { passive: true });
      b.addEventListener(e, claimB, { passive: true });
    });
    a.addEventListener("scroll", onA, { passive: true });
    b.addEventListener("scroll", onB, { passive: true });
    return () => {
      events.forEach((e) => {
        a.removeEventListener(e, claimA);
        b.removeEventListener(e, claimB);
      });
      a.removeEventListener("scroll", onA);
      b.removeEventListener("scroll", onB);
    };
  }, [aRef, bRef, enabled, getPairs]);
}

/** Top of each difference inside a pane, in scroll coordinates. */
function hunkTops(pane) {
  const box = pane.getBoundingClientRect();
  const tops = new Map();
  pane.querySelectorAll("[data-hunk]").forEach((el) => {
    const id = Number(el.dataset.hunk);
    if (!tops.has(id)) tops.set(id, el.getBoundingClientRect().top - box.top + pane.scrollTop);
  });
  return tops;
}

/* --------------------------------- inline -------------------------------- */

const FOLD_OVER = 180; // unchanged runs longer than this are folded in "changes only" mode
const FOLD_KEEP = 70; // ...keeping this much context next to each change

// Whitespace-only changes are invisible, so draw them.
const visible = (t) => (/^\s+$/.test(t) ? t.replace(/\n/g, "↵").replace(/[^\S↵]/g, "␣") : t);

const InlineDiff = React.forwardRef(function InlineDiff({ segments, activeHunk, onSelect, onlyChanges }, ref) {
  const [open, setOpen] = useState(() => new Set());
  useEffect(() => setOpen(new Set()), [segments]);
  const last = segments.length - 1;

  return (
    <div
      ref={ref}
      className="h-[26rem] min-h-40 resize-y overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap"
    >
      {segments.map((seg, i) => {
        if (seg.kind === "equal") {
          const fold = onlyChanges && seg.text.length > FOLD_OVER && !open.has(i);
          if (!fold) return <span key={i}>{seg.text}</span>;
          const head = i === 0 ? "" : seg.text.slice(0, FOLD_KEEP);
          const tail = i === last ? "" : seg.text.slice(-FOLD_KEEP);
          const hidden = seg.text.length - head.length - tail.length;
          return (
            <React.Fragment key={i}>
              {head}
              <button
                type="button"
                onClick={() => setOpen((prev) => new Set(prev).add(i))}
                className="mx-1 my-0.5 inline-block rounded border border-dashed px-1.5 py-px text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Show the unchanged text"
              >
                ⋯ {hidden} unchanged characters ⋯
              </button>
              {tail}
            </React.Fragment>
          );
        }
        const active = seg.id === activeHunk;
        return (
          <span
            key={i}
            data-hunk={seg.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(seg.id)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(seg.id))}
            className={cn(
              "cursor-pointer rounded-[2px] outline-none focus-visible:outline-2 focus-visible:outline-blue-500",
              active && "outline-2 outline-offset-2 outline-blue-500",
            )}
          >
            {seg.del && (
              <span className="bg-red-200 px-px text-red-950 line-through decoration-red-700/70 dark:bg-red-500/40 dark:text-red-50">
                {visible(seg.del)}
              </span>
            )}
            {seg.ins && (
              <span className="bg-green-200 px-px font-semibold text-green-950 dark:bg-green-500/40 dark:text-green-50">
                {visible(seg.ins)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
});

/* ---------------------------------- modal -------------------------------- */

export default function CompareModal({ label, fetched: rawFetched = "", onClose }) {
  // Sitecore values are usually HTML; compare what a reader sees, not the markup.
  const { text: fetched, converted } = useMemo(() => htmlToText(rawFetched), [rawFetched]);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState(null);
  const [runId, setRunId] = useState(0);
  const [activeHunk, setActiveHunk] = useState(null);
  const [view, setView] = useState("side"); // "side" | "inline"
  const [onlyChanges, setOnlyChanges] = useState(true);
  const [ticks, setTicks] = useState([]);

  const dialogRef = useRef(null);
  const fetchedBox = useRef(null);
  const pastedBox = useRef(null);
  const leftPane = useRef(null);
  const rightPane = useRef(null);
  const inlinePane = useRef(null);
  const pairCache = useRef({ key: "", pairs: null });

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

  /* ----------------------------- scroll syncing ---------------------------- */

  // Matching scroll positions for the two result panes, measured from the real layout.
  const getPanePairs = useCallback(
    (left, right) => {
      const key = [runId, left.scrollHeight, right.scrollHeight, left.clientWidth, right.clientWidth, left.clientHeight, right.clientHeight].join("|");
      if (pairCache.current.key === key) return pairCache.current.pairs;
      const l = hunkTops(left);
      const r = hunkTops(right);
      const margin = 24; // keep a little context above the difference
      const anchors = [...l.keys()]
        .filter((id) => r.has(id))
        .sort((x, y) => x - y)
        .map((id) => ({ a: l.get(id) - margin, b: r.get(id) - margin }));
      const pairs = buildPairs(
        anchors,
        left.scrollHeight - left.clientHeight,
        right.scrollHeight - right.clientHeight,
      );
      pairCache.current = { key, pairs };
      return pairs;
    },
    [runId],
  );

  useScrollSync(fetchedBox, pastedBox, true); // the two text boxes, line for line as far as possible
  useScrollSync(leftPane, rightPane, !!result && view === "side", getPanePairs);

  // Bring the selected difference into view (both panes line up on it).
  useEffect(() => {
    if (activeHunk === null || !result) return;
    if (view === "side") {
      const left = leftPane.current;
      const right = rightPane.current;
      const el = left?.querySelector(`[data-hunk="${activeHunk}"]`);
      if (!left || !right || !el) return;
      const pairs = getPanePairs(left, right);
      const y = hunkTops(left).get(activeHunk) - left.clientHeight / 2;
      const max = left.scrollHeight - left.clientHeight;
      const target = Math.max(0, Math.min(y, max));
      left.scrollTop = target;
      right.scrollTop = mapScroll(pairs, target, true);
    } else {
      const pane = inlinePane.current;
      const el = pane?.querySelector(`[data-hunk="${activeHunk}"]`);
      if (!pane || !el) return;
      const box = pane.getBoundingClientRect();
      const top = el.getBoundingClientRect().top - box.top + pane.scrollTop - pane.clientHeight / 2;
      pane.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, [activeHunk, view, result, getPanePairs]);

  // Rail of difference markers next to the side-by-side panes.
  useLayoutEffect(() => {
    const pane = leftPane.current;
    if (!result || view !== "side" || !pane) {
      setTicks([]);
      return;
    }
    const measure = () => {
      const tops = hunkTops(pane);
      setTicks(
        result.issues.map((issue) => ({
          id: issue.id,
          type: issue.type,
          message: issue.message,
          pct: Math.min(100, ((tops.get(issue.id) ?? 0) / Math.max(1, pane.scrollHeight)) * 100),
        })),
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    return () => ro.disconnect();
  }, [result, view, runId]);

  /* -------------------------------- actions -------------------------------- */

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData("text");
    if (text == null) return;
    e.preventDefault();
    const el = e.currentTarget;
    const before = pasted.slice(0, el.selectionStart);
    const after = pasted.slice(el.selectionEnd);

    // Both strings are tidied the same way at the start, so the cursor lands right after the pasted text.
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
    setRunId((n) => n + 1);
    setActiveHunk(next.issues.length ? next.issues[0].id : null);
  };

  const clearPasted = () => {
    setPasted("");
    setResult(null);
    setActiveHunk(null);
  };

  const step = (dir) => {
    if (!result?.issues.length) return;
    const n = result.issues.length;
    const at = activeHunk === null ? (dir > 0 ? -1 : 0) : activeHunk;
    setActiveHunk((at + dir + n) % n);
  };

  const total = result?.issues.length ?? 0;

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
                ref={fetchedBox}
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
                ref={pastedBox}
                value={pasted}
                onPaste={handlePaste}
                onChange={handleChange}
                placeholder="Paste here — extra spaces and blank lines are removed, line breaks are kept"
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
              as spaces. The two boxes scroll together.
            </p>
          </div>

          {result && (
            <div className="space-y-4">
              <div
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold",
                  result.identical
                    ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                    : "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
                )}
              >
                {result.identical ? <CircleCheck className="size-5" /> : <CircleAlert className="size-5" />}
                <span className="mr-auto">
                  {result.identical
                    ? "The texts match."
                    : `${total} difference${total === 1 ? "" : "s"} found.`}
                </span>
                {!result.identical && (
                  <span className="flex items-center gap-1 font-normal text-foreground">
                    <span className="px-1 font-mono text-xs tabular-nums">
                      {activeHunk === null ? "–" : activeHunk + 1} / {total}
                    </span>
                    <Button size="icon-sm" variant="outline" onClick={() => step(-1)} aria-label="Previous difference">
                      <ChevronUp />
                    </Button>
                    <Button size="icon-sm" variant="outline" onClick={() => step(1)} aria-label="Next difference">
                      <ChevronDown />
                    </Button>
                  </span>
                )}
              </div>

              {!result.identical && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Tabs value={view} onValueChange={setView}>
                    <TabsList className="h-8">
                      <TabsTrigger value="side">Side by side</TabsTrigger>
                      <TabsTrigger value="inline">Inline changes</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {view === "inline" && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={onlyChanges}
                        onChange={(e) => setOnlyChanges(e.target.checked)}
                        className="size-4 accent-[#d4b962]"
                      />
                      Fold unchanged text
                    </label>
                  )}
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-red-200 px-1 text-red-950 line-through dark:bg-red-500/40 dark:text-red-50">
                      fetched only
                    </span>
                    <span className="rounded bg-green-200 px-1 font-semibold text-green-950 dark:bg-green-500/40 dark:text-green-50">
                      pasted only
                    </span>
                  </span>
                </div>
              )}

              {(result.identical || view === "side") && (
                <>
                  <div className="grid gap-4 md:grid-cols-[1fr_0.75rem_1fr]">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      Fetched
                      <Badge variant="error">in fetched only</Badge>
                    </div>
                    <span className="hidden md:block" />
                    <div className="flex items-center gap-2 text-sm font-bold">
                      Pasted
                      <Badge variant="success">in pasted only</Badge>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[1fr_0.75rem_1fr]">
                    <DiffText ref={leftPane} original={fetched} side={result.left} tone="removed" activeHunk={activeHunk} />
                    <div
                      className="relative hidden rounded-full bg-muted md:block"
                      role="group"
                      aria-label="Where the differences are"
                    >
                      {ticks.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveHunk(t.id)}
                          title={t.message}
                          aria-label={`Go to difference ${t.id + 1}`}
                          style={{ top: `${t.pct}%` }}
                          className={cn(
                            "absolute left-0 h-1.5 w-full -translate-y-1/2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            t.type === "space" ? "bg-amber-500" : "bg-red-500",
                            activeHunk === t.id && "ring-2 ring-blue-500",
                          )}
                        />
                      ))}
                    </div>
                    <DiffText ref={rightPane} original={pasted} side={result.right} tone="added" activeHunk={activeHunk} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The two panes scroll together and stay lined up on each difference. An orange bar marks where the
                    other side has extra text. The strip in the middle shows where every difference is — click one to
                    jump to it. Greyed-out bullets and numbers are ignored.
                  </p>
                </>
              )}

              {!result.identical && view === "inline" && (
                <>
                  <InlineDiff
                    ref={inlinePane}
                    segments={result.segments}
                    activeHunk={activeHunk}
                    onSelect={setActiveHunk}
                    onlyChanges={onlyChanges}
                  />
                  <p className="text-xs text-muted-foreground">
                    One merged text: struck-through red is only in the fetched text, green is only in the pasted text.
                    A ␣ marks a space and ↵ a line break. Click a change to select it.
                  </p>
                </>
              )}

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
