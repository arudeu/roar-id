"use client";
import React, { useEffect, useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BrandSwitcher from "@/components/BrandSwitcher";
import { brandFor, detectBrand, pickState, stateLabel } from "@/lib/brands";
import { parseMppV2, renderMppV2 } from "@/lib/mppv2";

const FALLBACK = { name: "BetMGM", domain: "nj.betmgm.com" };

/**
 * MPP v2: the page's Sitecore XML parsed into the live page's HTML (see lib/mppv2.js).
 * The site and product come from the item path; the switcher overrides brand and state, which moves
 * the CTA / game tile links to that site and paints CTA buttons in its colours.
 *   xml      – raw API response
 *   path     – item path (brand detection)
 *   resetKey – changes when another item is loaded, which clears the manual brand/state choice
 */
export default function MPPv2Preview({ xml, path, resetKey }) {
  const detected = useMemo(() => detectBrand(path), [path]);
  const [choice, setChoice] = useState(null); // { name, domain } picked in the switcher, or null = follow the path
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => setChoice(null), [resetKey]);

  const current = choice ?? (detected ? { name: detected.name, domain: detected.domain } : FALLBACK);
  const category = detected?.category ?? "casino";
  const brand = useMemo(
    () => brandFor({ ...current, category, categoryDetected: detected?.categoryDetected ?? false }),
    [current.name, current.domain, category, detected],
  );

  const tree = useMemo(() => {
    try {
      return { value: parseMppV2(xml) };
    } catch (err) {
      return { error: err.message };
    }
  }, [xml]);

  const rendered = useMemo(
    () => (tree.value ? renderMppV2(tree.value, { loggedIn, brand }) : null),
    [tree, loggedIn, brand],
  );

  const pickBrand = (name) => {
    // keep the state (NJ, PA, ...) when the new brand has it
    setChoice({ name, domain: pickState(name, stateLabel(brand.domain)).domain });
  };

  return (
    <div className="space-y-3">
      <BrandSwitcher
        brandName={brand.name}
        domain={brand.domain}
        onBrand={pickBrand}
        onState={(domain) => setChoice({ name: brand.name, domain })}
        loggedIn={loggedIn}
        onLoggedIn={setLoggedIn}
      />

      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span>
          {choice ? "Switched to" : detected ? "Detected from path:" : "No known site in the path, using"}{" "}
          <strong>{brand.name}</strong> · {brand.domain} · {brand.categoryLabel}
          {!brand.categoryDetected && " (product not in path, using default colours)"}
        </span>
        <span className="inline-flex items-center gap-1">
          CTA
          <span className="inline-block size-3.5 rounded-sm border" style={{ backgroundColor: brand.bg }} aria-hidden="true" />
          {brand.bg} · text {brand.fg === "#ffffff" ? "white" : "black"}
        </span>
      </p>

      {tree.error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Couldn't read this item as an MPP v2 page</AlertTitle>
          <AlertDescription>{tree.error}</AlertDescription>
        </Alert>
      )}

      {rendered && (
        <>
          <div
            className="theme-light preview-font rich mppv2 rounded-lg border bg-white p-4 text-[#212529]"
            aria-label="MPP v2 preview"
            dangerouslySetInnerHTML={{ __html: rendered.html }}
          />
          {rendered.notes.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {rendered.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
