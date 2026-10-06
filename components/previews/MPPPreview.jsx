"use client";
import React, { useState } from "react";
<<<<<<< HEAD

export default function MPPPreview({ fieldMap }) {
  const [showTerms, setShowTerms] = useState(false);

  const getSrc = (html) => html?.replace(/.*src="([^&]+)".*/, "$1");

  return (
    <div className="container">
      {/* Header */}
      <header className="d-flex mb-4 border-bottom pb-2">
        <h5 className="m-0 fw-bold">My Promotions</h5>
      </header>

      {/* Promo Image */}
      <div className="text-center mb-3">
        <img
          src={getSrc(fieldMap.image)}
          alt="Sender"
          className="rounded"
          style={{ maxWidth: "94.3vh" }}
        />
      </div>

      {/* Promo Details Card */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title fw-bold">{fieldMap.imageheadline}</h5>
          <hr className="mb-4" />
          <div className="mb-3">
            {fieldMap.detaileddescription && (
              <div
                dangerouslySetInnerHTML={{
                  __html: fieldMap.detaileddescription,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Terms & Conditions Toggle */}
      <div className="mb-3 border py-2 border-start-0 border-end-0 d-flex">
        <button
          className="btn w-100 btn-link fw-bold text-decoration-none d-flex align-items-center text-dark"
          onClick={() => setShowTerms(!showTerms)}
        >
          {fieldMap.tactitle}
        </button>
        <i
          className={`bi ms-2 my-auto ${
            showTerms ? "bi-chevron-up" : "bi-chevron-down"
          }`}
        ></i>
      </div>

      {/* Terms & Conditions Body */}
      {showTerms && (
        <div className="card card-body border-0 text-dark">
          {fieldMap.termsandconditions && (
            <div
              dangerouslySetInnerHTML={{
                __html: fieldMap.termsandconditions,
              }}
            />
          )}
        </div>
      )}
=======
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
>>>>>>> 8623917 (Updated overall look and improved code logic)
    </div>
  );
}
