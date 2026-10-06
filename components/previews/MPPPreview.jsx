"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Rich, { getSrc } from "./Rich";

export default function MPPPreview({ fieldMap }) {
  const [showTerms, setShowTerms] = useState(false);
  const Chevron = showTerms ? ChevronUp : ChevronDown;

  return (
    <div className="my-2">
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
          <h5 className="text-lg font-bold">{fieldMap.imageheadline}</h5>
          <Separator className="my-4" />
          <Rich html={fieldMap.detaileddescription} className="mb-1" />
        </CardContent>
      </Card>

      {/* Terms toggle */}
      <button
        type="button"
        aria-expanded={showTerms}
        onClick={() => setShowTerms(!showTerms)}
        className="mb-3 flex w-full items-center justify-between border-y py-3 text-left font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span>{fieldMap.tactitle}</span>
        <Chevron className="size-4" />
      </button>

      {showTerms && <Rich html={fieldMap.termsandconditions} className="px-1" />}
    </div>
  );
}
