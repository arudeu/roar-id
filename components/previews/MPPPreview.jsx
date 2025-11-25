"use client";
import React, { useState } from "react";

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
    </div>
  );
}
