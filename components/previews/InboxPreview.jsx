"use client";
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
              </div>
            </div>
          </div>

          {/* Message Detail */}
          <div className="col-sm-7 p-3">
            {fieldMap.detailimage && (
              <div className="text-center mb-3">
                <img
                  src={getSrc(fieldMap.detailimage)}
                  className="img-fluid rounded"
                  alt="Preview"
                />
              </div>
            )}

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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
