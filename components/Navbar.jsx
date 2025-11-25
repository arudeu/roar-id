"use client";
import { GiLion } from "react-icons/gi";

export default function Navbar() {
  return (
    <nav className="navbar container-fluid text-white pt-3 px-5 top-0 position-sticky z-2">
      <h3 className="fw-bold">
        <GiLion className="mb-1 me-1" size={32} />
        ROAR<span className="logo-color">ID</span>
      </h3>
    </nav>
  );
}
