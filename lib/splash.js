import { useReducedMotion } from "motion/react";

/** How long the loading screen stays up, in milliseconds. */
export const SPLASH_MS = 2400;

/** Smooth "expo in-out" curve used across the intro animations. */
export const EASE = [0.76, 0, 0.24, 1];

/**
 * Seconds to wait before the app itself fades in, so it lands just as the loading
 * screen's curtain lifts. No wait when the visitor prefers reduced motion.
 */
export function useRevealDelay() {
  const reduce = useReducedMotion();
  return reduce ? 0 : SPLASH_MS / 1000 - 0.4;
}
