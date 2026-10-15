"use client";
import { motion } from "motion/react";
import { GiLion } from "react-icons/gi";
import { EASE, useRevealDelay } from "@/lib/splash";
import SpellButton from "./SpellButton";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const delay = useRevealDelay();
  return (

    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className="sticky top-0 z-40 flex items-center bg-black px-6 py-3 text-white shadow-md md:px-10"
    >
      <h3 className="m-0 flex items-center text-xl font-bold tracking-tight">
        <GiLion className="mr-1.5 mb-0.5" size={32} />
        ROAR<span className="logo-color">ID</span>
      </h3>
      <div className="ml-auto flex items-center gap-1">
        <SpellButton />
        <ThemeToggle />
      </div>
    </motion.nav>
  );
}
