"use client";
import React from "react";

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
      </div>
    </div>
  );
}
