"use client";

import { Toaster as Sonner } from "sonner";

/** shadcn-style Sonner wrapper. Dark toasts, same as the original app. */
function Toaster(props) {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!font-sans",
          actionButton: "!bg-primary !text-primary-foreground !font-semibold",
          cancelButton: "!bg-white/10 !text-white",
        },
      }}
      style={{
        "--normal-bg": "#111111",
        "--normal-text": "#ffffff",
        "--normal-border": "#2e2e2e",
        "--success-bg": "#0b2a1c",
        "--success-text": "#6ee7a8",
        "--success-border": "#14532d",
        "--warning-bg": "#2f1a0b",
        "--warning-text": "#ffb27a",
        "--warning-border": "#7c3a12",
        "--error-bg": "#2d1013",
        "--error-text": "#ff9aa3",
        "--error-border": "#7f1d25",
      }}
      {...props}
    />
  );
}

export { Toaster };
