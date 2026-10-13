"use client";
import React, { useMemo, useState } from "react";
import { CircleCheck, CircleX, ImageOff } from "lucide-react";

import { CREATIVE_MAX_SIZE } from "@/lib/sitecore";
import { cn } from "@/lib/utils";

const CDN = "https://scmedia-us.itsfogo.com/$-$/original";

// Sizes arrive in bytes; show KB (1 KB = 1,000 B, so the 100,000 B limit is 100 KB).
const formatKB = (bytes) =>
  bytes === null ? "Unknown" : `${(bytes / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} KB`;
const LIMIT_KB = CREATIVE_MAX_SIZE / 1000;

// Missing / unparseable size counts as a failure so it never passes by accident.
const isOver = (c) => c.size === null || c.size >= CREATIVE_MAX_SIZE;

function CreativeTile({ creative }) {
  const [broken, setBroken] = useState(false);
  const over = isOver(creative);
  const pct = creative.size === null ? 100 : Math.min(100, Math.round((creative.size / CREATIVE_MAX_SIZE) * 100));
  const imageUrl = `${CDN}/${creative.blob}.${creative.template}`;

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-shadow hover:shadow-md",
        over ? "border-red-500" : "border-green-500",
      )}
    >
      {/* image area: checkerboard so transparent PNGs are easy to read */}
      <div
        className="relative flex h-36 items-center justify-center p-3"
        style={{
          backgroundColor: "#f4f5f7",
          backgroundImage:
            "linear-gradient(45deg,#e6e8ec 25%,transparent 25%),linear-gradient(-45deg,#e6e8ec 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e6e8ec 75%),linear-gradient(-45deg,transparent 75%,#e6e8ec 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
        }}
      >
        {broken ? (
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ImageOff className="size-6" />
            Preview unavailable
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={creative.alt}
            loading="lazy"
            onError={() => setBroken(true)}
            className="max-h-full max-w-full rounded object-contain shadow-sm"
          />
        )}
        <span
          className={cn(
            "absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow",
            over ? "bg-red-500" : "bg-green-600",
          )}
        >
          {over ? <CircleX className="size-3.5" /> : <CircleCheck className="size-3.5" />}
          {over ? "Too large" : "OK"}
        </span>
        <span className="absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
          {creative.template}
        </span>
      </div>

      {/* details */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-tight font-semibold break-words" title={creative.alt}>
          {creative.alt}
        </h3>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Size</span>
            <span className={cn("text-sm font-bold tabular-nums", over ? "text-red-600" : "text-green-600")}>
              {formatKB(creative.size)}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={CREATIVE_MAX_SIZE}
            aria-valuenow={creative.size ?? 0}
            aria-label="Size against the 100 KB limit"
          >
            <div className={cn("h-full rounded-full", over ? "bg-red-500" : "bg-green-500")} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{creative.size === null ? "No size found" : `${pct}% of limit`}</span>
            <span>Max {LIMIT_KB} KB</span>
          </div>
        </div>

        {creative.dimensions && (
          <div className="mt-auto border-t pt-2 text-xs text-muted-foreground">
            Dimensions: <span className="font-medium text-foreground">{creative.dimensions}</span>
          </div>
        )}
      </div>
    </article>
  );
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "over", label: "Too large" },
  { id: "ok", label: "OK" },
];

export default function CreativePreview({ creatives = [] }) {
  const [filter, setFilter] = useState("all");

  const { overCount, okCount, visible } = useMemo(() => {
    const over = creatives.filter(isOver).length;
    const shown = creatives.filter((c) =>
      filter === "all" ? true : filter === "over" ? isOver(c) : !isOver(c),
    );
    return { overCount: over, okCount: creatives.length - over, visible: shown };
  }, [creatives, filter]);

  if (creatives.length === 0) {
    return <p className="text-destructive">No creative items (jpeg / png) with a blob field were found.</p>;
  }

  const counts = { all: creatives.length, over: overCount, ok: okCount };

  return (
    <div className="space-y-4">
      {/* summary banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border-2 px-4 py-3",
          overCount ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800",
        )}
      >
        {overCount ? <CircleX className="size-6 shrink-0" /> : <CircleCheck className="size-6 shrink-0" />}
        <div className="text-sm">
          <div className="font-bold">
            {overCount
              ? `${overCount} of ${creatives.length} creative${creatives.length === 1 ? "" : "s"} over the limit`
              : `All ${creatives.length} creative${creatives.length === 1 ? "" : "s"} within the limit`}
          </div>
          <div className="opacity-80">Creatives must be under {LIMIT_KB} KB.</div>
        </div>
      </div>

      {/* filter */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter creatives">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              filter === id ? "border-gray-900 bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-100",
            )}
          >
            {label} · {counts[id]}
          </button>
        ))}
      </div>

      {/* tiles */}
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing to show for this filter.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {visible.map((c, i) => (
            <CreativeTile key={`${c.id || c.blob}-${i}`} creative={c} />
          ))}
        </div>
      )}
    </div>
  );
}
