"use client";
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
    </>
  );
}
