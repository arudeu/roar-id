"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { isImageUrl, parseSteps } from "@/lib/pat";
import Rich from "./Rich";

const MIN_STEPS = 2;
const MAX_STEPS = 4;

// The "How it works" list: a numbered, vertical stepper built from the Steps JSON.
export default function HowItWorks({ steps: raw }) {
  const { steps, error } = useMemo(() => parseSteps(raw), [raw]);

  if (error || steps.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        {error || "No steps were found in the Steps field."}
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      <ol className="m-0 list-none p-0">
        {steps.map((step, i) => (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <span aria-hidden className="absolute top-9 bottom-0 left-4 w-px bg-[#d4b962]/50" />
            )}
            <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d4b962] text-sm font-bold text-black">
              {i + 1}
            </span>
            <div className="min-w-0 pt-1">
              {step.title &&
                (isImageUrl(step.title) ? (
                  <img src={step.title} alt="" className="mb-1 size-6" />
                ) : (
                  <div className="text-sm font-bold tracking-wide uppercase">{step.title}</div>
                ))}
              {step.text && <Rich html={step.text} className="text-sm text-[#63656a]" />}
            </div>
          </li>
        ))}
      </ol>

      {steps.length < MIN_STEPS && (
        <Badge variant="warning">Only {steps.length} step. {MIN_STEPS} are needed to publish.</Badge>
      )}
      {steps.length > MAX_STEPS && (
        <Badge variant="warning">
          {steps.length} steps. {MAX_STEPS} is the recommended maximum.
        </Badge>
      )}
    </div>
  );
}
