"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { GiLion } from "react-icons/gi";

import { EASE, SPLASH_MS } from "@/lib/splash";

const WORD = "ROAR".split("");
const LETTER_DELAY = 0.55;
const LETTER_STAGGER = 0.07;

// Full-screen loading page shown when the app opens, then lifted away like a curtain.
export default function Splash() {
  const [visible, setVisible] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), reduce ? 600 : SPLASH_MS);
    return () => clearTimeout(timer);
  }, [reduce]);

  // No scrolling behind the loading page.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  const idDelay = LETTER_DELAY + WORD.length * LETTER_STAGGER;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="splash"
            role="status"
            aria-live="polite"
            aria-label="Loading RoarID"
            initial={false}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.3 } }
                : { y: "-100%", transition: { duration: 0.85, ease: EASE } }
            }
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-9 overflow-hidden bg-black text-white"
          >
            {/* drifting ambient glow */}
            <motion.div
              aria-hidden
              className="absolute size-[30rem] rounded-full bg-[#d4b962]/15 blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.95, 0.5] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute size-[22rem] rounded-full bg-[#5ac8e8]/10 blur-3xl"
              animate={{ x: [-90, 90, -90], y: [40, -40, 40], opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* emblem: lion inside a ring that draws itself and slowly turns */}
            <div className="relative grid size-32 place-items-center">
              <motion.div
                aria-hidden
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, ease: "linear", repeat: Infinity }}
              >
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="#d4b962"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 0.82 }}
                    transition={{ duration: 1.5, ease: EASE, delay: 0.1 }}
                  />
                </svg>
              </motion.div>

              <motion.div
                initial={{ scale: 0.4, opacity: 0, rotate: -14 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 140, damping: 13, delay: 0.2 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.07, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <GiLion className="size-16" />
                </motion.div>
              </motion.div>
            </div>

            {/* wordmark */}
            <div className="text-center">
              <div className="flex items-baseline justify-center text-5xl font-bold tracking-tight">
                {WORD.map((letter, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.65, ease: EASE, delay: LETTER_DELAY + i * LETTER_STAGGER }}
                  >
                    {letter}
                  </motion.span>
                ))}
                <motion.span
                  className="logo-color ml-1 inline-block"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 12, delay: idDelay }}
                >
                  ID
                </motion.span>
              </div>

              <motion.p
                className="mt-3 text-[0.7rem] tracking-[0.35em] text-white/50 uppercase"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: idDelay + 0.25 }}
              >
                Preview · Check · Compare
              </motion.p>
            </div>

            {/* progress */}
            <motion.div
              aria-hidden
              className="h-[3px] w-56 overflow-hidden rounded-full bg-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full origin-left rounded-full bg-gradient-to-r from-[#d4b962] via-[#efe700] to-[#d4b962]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: SPLASH_MS / 1000 - 0.5, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
