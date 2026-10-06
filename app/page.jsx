"use client";
import Home from "@/components/Home";
import Navbar from "@/components/Navbar";

export default function Page() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1800px] px-4 pb-16 md:px-8">
        <Home />
      </main>
    </>
  );
}
