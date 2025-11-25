"use client";
import React from "react";

export default function OverlayPreview({ fieldMap }) {
  const getSrc = (html) => html?.replace(/.*src="([^&]+)".*/, "$1");

  return (
    <div className="container my-4">
      <div className="overlay modal-dialog modal-dialog-centered mx-auto">
        <div className="modal-content shadow">
          {/* Header */}
          <div className="overlay-header modal-header py-2 px-4 d-flex justify-content-between align-items-center">
            {fieldMap.overlaytitle && (
              <h5 className="modal-title text-truncate">
                {fieldMap.overlaytitle}
              </h5>
            )}
            <span className="inbox-close text-white" aria-hidden="true">
              &times;
            </span>
          </div>

          {/* Body */}
          <div className="modal-body">
            {fieldMap.overlayimage && (
              <img
                src={getSrc(fieldMap.overlayimage)}
                className="img-fluid mb-3"
                alt="Promo Banner"
              />
            )}
            {fieldMap.overlaydescription && (
              <div className="mx-3"
                dangerouslySetInnerHTML={{
                  __html: fieldMap.overlaydescription,
                }}
              />
            )}

            {/* Terms */}
            {fieldMap.manualtermsandconditions && (
              <div className="accordion mx-2" id="termsAccordion">
                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button overlay-terms collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseTerms"
                    >
                      Terms and Conditions
                    </button>
                  </h2>
                  <div
                    id="collapseTerms"
                    className="accordion-collapse collapse overlay-terms"
                  >
                    <div
                      className="accordion-body"
                      dangerouslySetInnerHTML={{
                        __html: fieldMap.manualtermsandconditions,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer text-center my-3">
            {fieldMap.overlaycta && (
              <div
                className="w-100"
                dangerouslySetInnerHTML={{ __html: fieldMap.overlaycta }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
