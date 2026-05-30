"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";

interface Props {
  email: string;
  name: string;
  phone?: string | null;
  role: string;
}

export default function OfficerIdentityLink({ email, name, phone, role }: Props) {
  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();

    let finalPassword = "";
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("crest_created_passwords");
        if (stored) {
          const mapping = JSON.parse(stored);
          const pass = mapping[email.toLowerCase()];
          if (pass) {
            finalPassword = pass;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!finalPassword) {
      const emailLower = email.toLowerCase();
      if (emailLower === "admin@unionbank.com" || emailLower === "mumbai_admin@unionbank.com") {
        finalPassword = "admin123";
      } else if (emailLower === "mumbai_officer@unionbank.com") {
        finalPassword = "officer123";
      } else {
        finalPassword = role === "EMPLOYEE" ? "officer123" : "admin123";
      }
    }

    // 1. Clear current session
    Cookies.remove("crest_token", { path: "/" });
    Cookies.remove("crest_token", { path: "/", sameSite: "lax" });
    Cookies.remove("crest_token", { path: "/", sameSite: "lax", secure: true });
    localStorage.removeItem("crest_user");

    // 2. Redirect to login with email and password pre-filled for showcase demo purposes
    const url = `/ub_CREST/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(finalPassword)}`;
    window.location.assign(url);
  };

  return (
    <a
      href="#"
      onClick={handleLinkClick}
      title={`Log in as ${name}`}
      className="flex flex-col hover:opacity-85 transition-opacity group-hover:text-blue-500"
    >
      <span className="text-sm font-black dark:text-white text-black group-hover:text-blue-600 transition-colors">
        {name}
      </span>
      <span className="text-[10px] font-bold dark:text-slate-500 text-gray-400 flex items-center gap-1.5 mt-0.5">
        <span className="underline">{email}</span>
        {phone ? `• ${phone}` : ""}
      </span>
    </a>
  );
}
