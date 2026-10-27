"use client";
import React, { useMemo, useState } from "react";

import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { detectBrand } from "@/lib/brands";
import { findSitePath, renderMppV2 } from "@/lib/mppv2";

/**
 * MPP v2: the page's item tree (the page plus its separately fetched folders, see lib/sitecore.js) rendered as
 * the live page's HTML (lib/mppv2.js). The site in the item's path decides where links and images point.
 *   tree      – parsed, merged item tree
 *   loadNotes – folders that could not be loaded
 */
export default function MPPv2Preview({ tree, loadNotes = [] }) {
  const [loggedIn, setLoggedIn] = useState(false);

  const brand = useMemo(() => (tree ? detectBrand(findSitePath(tree)) : null), [tree]);
  const rendered = useMemo(() => {
    if (!tree) return null;
    const out = renderMppV2(tree, { loggedIn, brand });
    console.log("[MPP v2] rendered", { loggedIn, site: brand?.domain ?? null, notes: out.notes, htmlLength: out.html.length });
    return out;
  }, [tree, loggedIn, brand]);
  if (!rendered) return null;

  const notes = rendered.notes;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Visitor">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Visitor</span>
        {[
          ["Logged out", false],
          ["Logged in", true],
        ].map(([label, value]) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={loggedIn === value ? "default" : "outline"}
            aria-pressed={loggedIn === value}
            onClick={() => setLoggedIn(value)}
            className="h-7 px-2.5"
          >
            {label}
          </Button>
        ))}
      </div>

      {loadNotes.length > 0 && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Part of this page could not be loaded</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {loadNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div
        className="theme-light preview-font rich mppv2 rounded-lg border bg-white p-4 text-[#212529]"
        aria-label="MPP v2 preview"
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />

      {notes.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
