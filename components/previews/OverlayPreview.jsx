"use client";
import React from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Rich, { getSrc } from "./Rich";

export default function OverlayPreview({ fieldMap }) {
  return (
    <div className="my-2">
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-lg border bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between bg-black px-4 py-2 text-white">
          {fieldMap.overlaytitle && (
            <h5 className="m-0 truncate text-lg font-medium">{fieldMap.overlaytitle}</h5>
          )}
          <span className="ml-auto text-3xl leading-none text-white/50" aria-hidden="true">
            &times;
          </span>
        </div>

        {/* Body */}
        <div className="p-4">
          {fieldMap.overlayimage && (
            <img
              src={getSrc(fieldMap.overlayimage)}
              className="mb-3 w-full"
              alt="Promo Banner"
            />
          )}
          <Rich html={fieldMap.overlaydescription} className="mx-3" />

          {fieldMap.manualtermsandconditions && (
            <Accordion type="single" collapsible className="mx-2 mt-3">
              <AccordionItem value="terms" className="border-y">
                <AccordionTrigger>Terms and Conditions</AccordionTrigger>
                <AccordionContent>
                  <Rich html={fieldMap.manualtermsandconditions} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        {/* Footer */}
        {fieldMap.overlaycta && (
          <div className="px-4 py-6 text-center">
            <Rich html={fieldMap.overlaycta} className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
