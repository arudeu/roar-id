"use client";

import { Button } from "@/components/ui/button";
import { BRAND_OPTIONS } from "@/lib/brands";

function Group({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      <span className="mr-1 w-14 text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Choice({ active, onClick, children, title }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className="h-7 px-2.5"
    >
      {children}
    </Button>
  );
}

/**
 * Brand + state (+ logged in/out) switcher for MPP v2.
 *   brandName / domain  – the current choice
 *   onBrand(name)       – a brand was picked (the parent keeps the state code when the brand has it)
 *   onState(domain)     – a state was picked
 *   loggedIn / onLoggedIn – shows the logged-in or logged-out version of conditional items (CTAs)
 */
export default function BrandSwitcher({ brandName, domain, onBrand, onState, loggedIn, onLoggedIn }) {
  const brand = BRAND_OPTIONS.find((b) => b.name === brandName) ?? BRAND_OPTIONS[0];

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3" aria-label="Brand and state">
      <Group label="Brand">
        {BRAND_OPTIONS.map((b) => (
          <Choice key={b.name} active={b.name === brand.name} onClick={() => onBrand(b.name)}>
            {b.name}
          </Choice>
        ))}
      </Group>
      <Group label="State">
        {brand.states.map((s) => (
          <Choice key={s.domain} active={s.domain === domain} onClick={() => onState(s.domain)} title={s.domain}>
            {s.code}
          </Choice>
        ))}
      </Group>
      <Group label="Visitor">
        <Choice active={!loggedIn} onClick={() => onLoggedIn(false)}>
          Logged out
        </Choice>
        <Choice active={loggedIn} onClick={() => onLoggedIn(true)}>
          Logged in
        </Choice>
      </Group>
    </div>
  );
}
