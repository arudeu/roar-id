"use client";
import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Rich, { getSrc } from "./Rich";
import { switchCtaDomain } from "@/lib/html-checks";

export default function MPPPreview({ fieldMap, brand }) {
  const [showTerms, setShowTerms] = useState(false);
  const Chevron = showTerms ? ChevronUp : ChevronDown;

  // CTA and game tile links go to the site this promotion is on (image and media URLs are left alone),
  // and CTA buttons use that brand's colours.
  const domain = brand?.domain;
  const description = useMemo(() => switchCtaDomain(fieldMap.detaileddescription, domain), [fieldMap.detaileddescription, domain]);
  const terms = useMemo(() => switchCtaDomain(fieldMap.termsandconditions, domain), [fieldMap.termsandconditions, domain]);
  const ctaColors = brand ? { "--cta-bg": brand.bg, "--cta-fg": brand.fg } : undefined;

  return (
    <div className="my-2" style={ctaColors}>
      {/* Header */}
      <header className="mb-4 flex border-b pb-2">
        <h5 className="m-0 text-lg font-bold">My Promotions</h5>
      </header>

      {/* Promo image */}
      <div className="mb-3 text-center">
        <img
          src={getSrc(fieldMap.image)}
          alt="Promo"
          className="mx-auto max-w-full rounded"
        />
      </div>

      {/* Promo details */}
      <Card className="mb-4 gap-0 py-0 shadow-sm">
        <CardContent className="p-4">
          <h5 className="text-[32px] text-[#63656a]">{fieldMap.imageheadline}</h5>
          <Separator className="my-4" />
          <Rich html={description} className="mb-1" />
        </CardContent>
      </Card>

      {/* Terms toggle (only when the item has terms and conditions) */}
      {fieldMap.termsandconditions && (
        <>
          <button
            type="button"
            aria-expanded={showTerms}
            onClick={() => setShowTerms(!showTerms)}
            className="mb-3 flex w-full items-center justify-between border-y py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span>{fieldMap.tactitle}</span>
            <Chevron className="size-4" />
          </button>

          {showTerms && <Rich html={terms} className="px-1" />}
        </>
      )}
    </div>
  );
}
