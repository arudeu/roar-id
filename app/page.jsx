"use client";
import { motion } from "motion/react";
import Home from "@/components/Home";
import Navbar from "@/components/Navbar";
import { EASE, useRevealDelay } from "@/lib/splash";

export default function Page() {
  const delay = useRevealDelay();
  return (
    <>
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: delay + 0.1 }}
        className="mx-auto w-full max-w-[1800px] px-4 pb-16 md:px-8"
      >
        <Home />
      </motion.main>
    </>
  );
}
