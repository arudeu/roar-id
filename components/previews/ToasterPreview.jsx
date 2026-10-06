"use client";
import React from "react";
import { X } from "lucide-react";

import Rich, { getSrc } from "./Rich";

export default function ToasterPreview({ fieldMap }) {
  return (
    <div className="my-4">
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="mx-auto flex w-full max-w-md items-start rounded-lg border bg-[#f8f9fa] shadow-lg"
      >
        {fieldMap.tosterimage && (
          <div className="shrink-0 pt-3 pr-3 pl-3">
            <img
              src={getSrc(fieldMap.tosterimage)}
              className="max-w-full rounded"
              alt="Toaster Icon"
            />
          </div>
        )}

        <div className="min-w-0 flex-1 p-3">
          {fieldMap.toastertitle && (
            <h6 className="mb-1 font-bold">{fieldMap.toastertitle}</h6>
          )}
          <Rich html={fieldMap.toasterdescription} className="mb-2" />
          <Rich html={fieldMap.toastercta} className="text-center" />
        </div>

        <button type="button" aria-label="Close" className="m-2 rounded p-1 opacity-50 hover:opacity-100">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
