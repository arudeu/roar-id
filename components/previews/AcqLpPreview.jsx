"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildAcqDocument } from "@/lib/acqlp";
import { detectBrand } from "@/lib/brands";
import { findSitePath } from "@/lib/mppv2";

// The page is shown in an iframe of the device's width, so its own media queries pick the desktop or mobile layout.
const DEVICES = {
  desktop: { label: "Desktop", icon: Monitor, width: 1200 },
  mobile: { label: "Mobile", icon: Smartphone, width: 390 },
};

/**
 * ACQ LP: the item's styleheader + content rendered like the live page (lib/acqlp.js).
 *   tree – parsed item tree of the landing page
 * The site (borgataonline.com, ...) comes from the item path and decides which App.Label sections show.
 */
export default function AcqLpPreview({ tree }) {
  const [device, setDevice] = useState("desktop");
  const { width } = DEVICES[device];

  const brand = useMemo(() => (tree ? detectBrand(findSitePath(tree)) : null), [tree]);
  const built = useMemo(() => {
    if (!tree) return null;
    const out = buildAcqDocument(tree, { mobile: device === "mobile", label: brand?.domain ?? "", brand });
    console.log("[ACQ LP] built", { device, site: brand?.domain ?? null, notes: out.notes, htmlLength: out.html.length, tree });
    return out;
  }, [tree, device, brand]);

  // Fit the frame into the available width without changing the width the page lays itself out for.
  const boxRef = useRef(null);
  const [available, setAvailable] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = available ? Math.min(1, available / width) : 1;

  // The frame is as tall as the page (it grows when the terms are opened).
  const frameRef = useRef(null);
  const [height, setHeight] = useState(240);
  const watcher = useRef(null);
  const fit = () => {
    watcher.current?.disconnect();
    const body = frameRef.current?.contentDocument?.body;
    if (!body) return;
    const measure = () => setHeight(Math.max(120, Math.ceil(body.getBoundingClientRect().height)));
    measure();
    watcher.current = new ResizeObserver(measure);
    watcher.current.observe(body);
  };
  useEffect(() => () => watcher.current?.disconnect(), []);

  if (!built) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Device">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Device</span>
        {Object.entries(DEVICES).map(([key, { label, icon: Icon }]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={device === key ? "default" : "outline"}
            aria-pressed={device === key}
            onClick={() => setDevice(key)}
            className="h-7 gap-1.5 px-2.5"
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </Button>
        ))}
        <span className="ml-1 text-xs text-muted-foreground">
          {width}px{brand ? ` · ${brand.domain}` : ""}
        </span>
      </div>

      <div ref={boxRef} className="w-full">
        <div className="mx-auto overflow-hidden rounded-lg border bg-black" style={{ width: width * scale, height: height * scale }}>
          <iframe
            ref={frameRef}
            onLoad={fit}
            title={`ACQ LP preview (${device})`}
            srcDoc={built.html}
            // no scripts: the page's CSS-only toggle and layout work, its tracking scripts don't run
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            style={{ width, height, border: 0, transform: `scale(${scale})`, transformOrigin: "top left", background: "#000" }}
          />
        </div>
      </div>

      {built.notes.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          {built.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
