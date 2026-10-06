"use client";
import React from "react";
<<<<<<< HEAD

export default function ToasterPreview({ fieldMap }) {
  const getSrc = (html) => html?.replace(/.*src="([^&]+)".*/, "$1");

  return (
    <div className="container mt-4">
      <div
        className="toast show align-items-center text-bg-light border shadow-lg mx-auto"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="d-flex">
          {/* Image */}
          {fieldMap.tosterimage && (
            <div className="me-3 pt-3 ps-3">
              <img
                src={getSrc(fieldMap.tosterimage)}
                className="img-fluid rounded"
                alt="Toaster Icon"
              />
            </div>
          )}

          {/* Content */}
          <div className="toast-body">
            {fieldMap.toastertitle && (
              <h6 className="fw-bold mb-1">{fieldMap.toastertitle}</h6>
            )}
            {fieldMap.toasterdescription && (
              <div
                className="mb-2"
                dangerouslySetInnerHTML={{
                  __html: fieldMap.toasterdescription,
                }}
              />
            )}

            {/* CTA */}
            {fieldMap.toastercta && (
              <div
                className="text-center"
                dangerouslySetInnerHTML={{
                  __html: fieldMap.toastercta,
                }}
              />
            )}
          </div>

          {/* Close */}
          <button
            type="button"
            className="btn-close me-2 m-auto"
            data-bs-dismiss="toast"
            aria-label="Close"
          ></button>
        </div>
=======
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
>>>>>>> 8623917 (Updated overall look and improved code logic)
      </div>
    </div>
  );
}
