"use client";
<<<<<<< HEAD
import React, { useState } from "react";

export default function InboxPreview({ fieldMap, dateTimeToday }) {
  const [openTerms, setOpenTerms] = useState(false);
  const getSrc = (html) => html?.replace(/.*src="([^&]+)".*/, "$1");

  return (
    <div className="container my-4">
      <div className="border rounded shadow">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center border-bottom text-white text-center inbox-header">
          <div></div>
          <h5 className="mb-0">My Inbox</h5>
          <button className="btn btn-sm btn-outline-secondary border-0">
            <span className="inbox-close text-white">&times;</span>
          </button>
        </div>

        <div className="row g-0">
          {/* Sidebar */}
          <div className="col-sm-5 border-end">
            <div className="list-group list-group-flush">
              <div className="list-group-item d-flex align-items-center">
                <div className="form-check me-2">
                  <input className="form-check-input" type="checkbox" />
                </div>
                {fieldMap.shortimage && (
                  <img
                    src={getSrc(fieldMap.shortimage)}
                    alt="Sender"
                    className="rounded me-3"
                    style={{ width: 50, height: 50 }}
                  />
                )}
                <div className="flex-fill">
                  <small className="text-muted d-block">{dateTimeToday}</small>
                  {fieldMap.snippettitle && (
                    <strong className="d-block">{fieldMap.snippettitle}</strong>
                  )}
                  {fieldMap.snippetdescription && (
                    <small
                      dangerouslySetInnerHTML={{
                        __html: fieldMap.snippetdescription,
                      }}
                    />
                  )}
                </div>
=======
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
>>>>>>> 8623917 (Updated overall look and improved code logic)
              </div>
            </div>
          </div>

<<<<<<< HEAD
          {/* Message Detail */}
          <div className="col-sm-7 p-3">
            {fieldMap.detailimage && (
              <div className="text-center mb-3">
                <img
                  src={getSrc(fieldMap.detailimage)}
                  className="img-fluid rounded"
=======
          {/* Message detail */}
          <div className="p-4 @lg:col-span-7">
            {fieldMap.detailimage && (
              <div className="mb-3 text-center">
                <img
                  src={getSrc(fieldMap.detailimage)}
                  className="mx-auto max-w-full rounded"
>>>>>>> 8623917 (Updated overall look and improved code logic)
                  alt="Preview"
                />
              </div>
            )}

<<<<<<< HEAD
            <small className="text-muted">{dateTimeToday}</small>

            {fieldMap.detailtitle && (
              <h4 className="fw-bold mt-2">{fieldMap.detailtitle}</h4>
            )}
            {fieldMap.detaildescription && (
              <div
                dangerouslySetInnerHTML={{
                  __html: fieldMap.detaildescription,
                }}
              />
            )}

            {/* Terms Accordion */}
            {fieldMap.manualtermsandconditions && (
              <div className="accordion mt-4" id="accordionTnC">
                <div className="accordion-item">
                  <h2 className="accordion-header" id="headingTnC">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseTnC"
                      onClick={() => setOpenTerms(!openTerms)}
                    >
                      Terms and Conditions
                    </button>
                  </h2>
                  <div id="collapseTnC" className="accordion-collapse collapse">
                    <div
                      className="accordion-body"
                      dangerouslySetInnerHTML={{
                        __html: fieldMap.manualtermsandconditions,
                      }}
                    />
                  </div>
                </div>
              </div>
=======
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
>>>>>>> 8623917 (Updated overall look and improved code logic)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
