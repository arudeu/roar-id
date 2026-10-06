"use client";
import { GiLion } from "react-icons/gi";

export default function Navbar() {
  return (

    <nav className="sticky top-0 z-40 flex items-center bg-black px-6 py-3 text-white shadow-md md:px-10">
      <h3 className="m-0 flex items-center text-xl font-bold tracking-tight">
        <GiLion className="mr-1.5 mb-0.5" size={32} />
        ROAR<span className="logo-color">ID</span>
      </h3>
    </nav>
  );
}
