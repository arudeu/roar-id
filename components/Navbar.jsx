"use client";
import { GiLion } from "react-icons/gi";

export default function Navbar() {
  return (
<<<<<<< HEAD
    <nav className="navbar container-fluid text-white pt-3 px-5 top-0 position-sticky z-2">
      <h3 className="fw-bold">
        <GiLion className="mb-1 me-1" size={32} />
=======
    <nav className="sticky top-0 z-40 flex items-center bg-black px-6 py-3 text-white shadow-md md:px-10">
      <h3 className="m-0 flex items-center text-xl font-bold tracking-tight">
        <GiLion className="mr-1.5 mb-0.5" size={32} />
>>>>>>> 8623917 (Updated overall look and improved code logic)
        ROAR<span className="logo-color">ID</span>
      </h3>
    </nav>
  );
}
