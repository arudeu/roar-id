"use client";
import React from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Rich, { getSrc } from "./Rich";

export default function InboxPreview({ fieldMap, dateTimeToday }) {
  return (
    <div className="@container my-2">
      <div className="overflow-hidden rounded-lg border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between bg-black text-center text-white">
          <div className="w-10" />
          <h5 className="m-0 text-lg font-medium">My Inbox</h5>
          <button type="button" className="w-10 text-white/50 hover:text-white" aria-label="Close">
            <span className="text-3xl leading-none">&times;</span>
          </button>
        </div>

        <div className="grid grid-cols-1 @lg:grid-cols-12">
          {/* Sidebar */}
          <div className="border-b @lg:col-span-5 @lg:border-r @lg:border-b-0">
            <div className="flex items-center gap-3 border-b p-3">
              <input type="checkbox" className="size-4 accent-black" aria-label="Select message" />
              {fieldMap.shortimage && (
                <img
                  src={getSrc(fieldMap.shortimage)}
                  alt="Sender"
                  className="size-[50px] rounded"
                />
              )}
              <div className="min-w-0 flex-1">
                <small className="block text-xs text-[#6c757d]">{dateTimeToday}</small>
                {fieldMap.snippettitle && (
                  <strong className="block">{fieldMap.snippettitle}</strong>
                )}
                <Rich as="small" html={fieldMap.snippetdescription} className="text-sm" />
              </div>
            </div>
          </div>

          {/* Message detail */}
          <div className="p-4 @lg:col-span-7">
            {fieldMap.detailimage && (
              <div className="mb-3 text-center">
                <img
                  src={getSrc(fieldMap.detailimage)}
                  className="mx-auto max-w-full rounded"
                  alt="Preview"
                />
              </div>
            )}

            <small className="text-xs text-[#6c757d]">{dateTimeToday}</small>

            {fieldMap.detailtitle && (
              <h4 className="mt-2 text-2xl font-bold">{fieldMap.detailtitle}</h4>
            )}
            <Rich html={fieldMap.detaildescription} />

            {fieldMap.manualtermsandconditions && (
              <Accordion type="single" collapsible className="mt-4 rounded-md border px-3">
                <AccordionItem value="tnc">
                  <AccordionTrigger>Terms and Conditions</AccordionTrigger>
                  <AccordionContent>
                    <Rich html={fieldMap.manualtermsandconditions} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
