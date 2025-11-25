"use client";
import React from "react";

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
        </div>
      </div>
    </div>
  );
}
