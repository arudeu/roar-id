"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, SpellCheck, TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEFAULT_IGNORE, parseIgnoreList } from "@/lib/spellcheck";

function Checkbox({ id, checked, onChange, children, hint }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[#d4b962]"
      />
      <span>
        <span className="font-medium">{children}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

const STATUS = {
  loading: () => (
    <Badge variant="outline">
      <Loader2 className="animate-spin" /> Loading dictionary…
    </Badge>
  ),
  ready: () => <Badge variant="success">On</Badge>,
  off: () => <Badge variant="outline">Off</Badge>,
  error: () => (
    <Badge variant="error">
      <TriangleAlert /> Dictionary failed to load
    </Badge>
  ),
};

/** Spell check settings, shown as a modal (opened from the navbar button). */
export default function SpellModal({
  onClose,
  enabled,
  onEnabled,
  skipNames,
  onSkipNames,
  ignoreText,
  onIgnoreText,
  status, // "off" | "loading" | "ready" | "error"
  onRetry,
}) {
  const dialogRef = useRef(null);
  const terms = useMemo(() => parseIgnoreList(ignoreText), [ignoreText]);
  const Status = STATUS[status];

  // Escape closes; the page behind doesn't scroll while the modal is open.
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Spell check settings"
        tabIndex={-1}
        className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-2xl outline-none"
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <SpellCheck className="size-4" />
          <h2 className="m-0 mr-1 text-base font-bold">Spell check</h2>
          <Status />
          {status === "error" && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
          <Button size="icon-sm" variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <Checkbox id="spell-on" checked={enabled} onChange={onEnabled}>
            Check spelling
          </Checkbox>

          <div className={enabled ? "space-y-4" : "pointer-events-none space-y-4 opacity-50"}>
            <div className="space-y-1.5">
              <Label htmlFor="spell-ignore">Ignore list</Label>
              <textarea
                id="spell-ignore"
                value={ignoreText}
                onChange={(e) => onIgnoreText(e.target.value)}
                rows={7}
                spellCheck={false}
                disabled={!enabled}
                placeholder={"Promotion name, brand and product names — one per line or comma-separated\nMega Spin Bonanza"}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground">
                {terms.length} term{terms.length === 1 ? "" : "s"} ignored, plus {DEFAULT_IGNORE.length} built-in gaming
                terms. Not case-sensitive; plurals and possessives are covered. Saved in this browser. HTML tags,
                attributes, links and entities are never checked.
              </p>
            </div>

            <Checkbox
              id="spell-names"
              checked={skipNames}
              onChange={onSkipNames}
              hint="Capitalized words mid-sentence are only flagged when they look like a typo of a real word."
            >
              Skip names and brands
            </Checkbox>
          </div>
        </div>

        <div className="flex justify-end border-t px-4 py-3">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
