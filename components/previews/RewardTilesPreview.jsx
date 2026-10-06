"use client";
import React from "react";

<<<<<<< HEAD
export default function RewardTilesPreview({ fieldMap }) {
  const getSrc = (html) => html?.replace(/.*src="([^&]+)".*/, "$1");

  return (
    <div className="container-fluid mt-5 mx-auto w-50">
      <div className="card border-0 shadow-lg">
        <div className="row">
          <div className="col-12 text-center">
            <a href="#" target="_blank" rel="noopener noreferrer">
              {fieldMap.backgroundbannerimage && (
                <img
                  src={getSrc(fieldMap.backgroundbannerimage)}
                  className="img-fluid rounded"
                  alt="Bonus Offer"
                />
              )}
            </a>
          </div>

          <div className="col p-4">
            {fieldMap.bannertitle && (
              <h3 className="fw-bold mb-3">{fieldMap.bannertitle}</h3>
            )}
            {fieldMap.bannerkeyterms && (
              <p
                className="small mb-2"
                dangerouslySetInnerHTML={{
                  __html: fieldMap.bannerkeyterms,
                }}
              />
            )}
          </div>
=======
import Rich, { getSrc } from "./Rich";

export default function RewardTilesPreview({ fieldMap }) {
  return (
    <div className="mx-auto mt-4 w-full max-w-md">
      <div className="overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="text-center">
          <a href="#" target="_blank" rel="noopener noreferrer">
            {fieldMap.backgroundbannerimage && (
              <img
                src={getSrc(fieldMap.backgroundbannerimage)}
                className="mx-auto max-w-full rounded"
                alt="Bonus Offer"
              />
            )}
          </a>
        </div>

        <div className="p-4">
          {fieldMap.bannertitle && (
            <h3 className="mb-3 text-2xl font-bold">{fieldMap.bannertitle}</h3>
          )}
          <Rich html={fieldMap.bannerkeyterms} className="mb-2 text-sm" />
>>>>>>> 8623917 (Updated overall look and improved code logic)
        </div>
      </div>
    </div>
  );
}
