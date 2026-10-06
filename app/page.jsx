"use client";
<<<<<<< HEAD
import React, { useState } from "react";
import Home from "../components/Home";
import Navbar from "../components/Navbar";

export default function Page() {
  const [fieldMap, setFieldMap] = useState({});
  const [dateTimeToday, setDateToday] = useState("");

  return (
    <>
      <Navbar />
      <div className="container-fluid mb-5">
        {/* ✅ Also pass setters to Home */}
        <Home fieldMap={fieldMap} setFieldMap={setFieldMap} />
      </div>
=======
import Home from "@/components/Home";
import Navbar from "@/components/Navbar";

export default function Page() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1800px] px-4 pb-16 md:px-8">
        <Home />
      </main>
>>>>>>> 8623917 (Updated overall look and improved code logic)
    </>
  );
}
