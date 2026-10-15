"use client";

import { SpellCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSpell } from "@/components/SpellProvider";

const DOT = {
  ready: "bg-emerald-400",
  loading: "animate-pulse bg-[#d4b962]",
  error: "bg-red-500",
};

/** Navbar button that opens the spell check settings modal. */
export default function SpellButton() {
  const { status, openSettings } = useSpell();
  const label = status === "off" ? "Spell check settings (off)" : "Spell check settings";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={openSettings}
      aria-label={label}
      title={label}
      className="relative text-white hover:bg-white/10 hover:text-white"
    >
      <SpellCheck />
      {DOT[status] && <span className={cn("absolute top-1.5 right-1.5 size-2 rounded-full ring-2 ring-black", DOT[status])} />}
    </Button>
  );
}
