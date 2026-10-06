"use client";
import React from "react";

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
        </div>
      </div>
    </div>
  );
}
