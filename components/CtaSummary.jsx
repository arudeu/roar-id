"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ctaReport } from "@/lib/html-checks";

/**
 * Side-by-side view of the CTA in Fullview Description (last line), Overlay CTA and
 * Toaster CTA, with whether the link and the name are the same everywhere.
 * `sources` is [{ field, label, value, lastLine? }] (see CTA_SOURCES in lib/fields.js).
 */
export default function CtaSummary({ sources, activeField }) {
  const [open, setOpen] = useState(false); // collapsed by default; the badges stay visible
  const report = ctaReport(sources);
  if (!report.items.length) return null;

  const { items, comparable, hrefsMatch, namesMatch } = report;
  const allGood = comparable && hrefsMatch && namesMatch;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className={`flex flex-wrap items-center gap-2 px-4 py-2.5 ${open ? "border-b" : ""}`}>
        <h6 className="m-0 mr-1 text-sm font-bold">CTA consistency</h6>
        {!comparable ? (
          <Badge variant="outline">Only one CTA filled in — nothing to compare</Badge>
        ) : (
          <>
            <Badge variant={hrefsMatch ? "success" : "error"}>
              {hrefsMatch ? <CircleCheck /> : <CircleAlert />} Link {hrefsMatch ? "matches" : "differs"}
            </Badge>
            <Badge variant={namesMatch ? "success" : "error"}>
              {namesMatch ? <CircleCheck /> : <CircleAlert />} Name {namesMatch ? "matches" : "differs"}
            </Badge>
            {allGood && open && <span className="text-xs text-muted-foreground">Same CTA everywhere</span>}
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? "Hide" : "Show"}
        </Button>
      </div>

      {open && (
      <dl className="divide-y text-sm">
        {items.map(({ field, label, lastLine, cta }) => (
          <div
            key={field}
            className={`grid gap-x-3 px-4 py-2 sm:grid-cols-[10rem_1fr] ${field === activeField ? "bg-accent/50" : ""}`}
          >
            <dt className="font-semibold">
              {label}
              {lastLine && <span className="block text-[11px] font-normal text-muted-foreground">last line</span>}
            </dt>
            <dd className="m-0 min-w-0 space-y-0.5">
              {cta.missing ? (
                <span className="text-destructive">No CTA link found</span>
              ) : (
                <>
                  <div className="truncate">
                    <span className="text-muted-foreground">Name: </span>
                    {cta.name || <em className="text-destructive">(empty)</em>}
                  </div>
                  <div className="truncate font-mono text-[12px]" title={cta.href}>
                    <span className="font-sans text-[14px] text-muted-foreground">Link: </span>
                    {cta.href || <em className="font-sans text-destructive">(empty)</em>}
                  </div>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      )}
    </Card>
  );
}
