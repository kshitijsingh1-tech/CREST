"use client";

import { useEffect, useState } from "react";

interface Props {
  email: string;
  name: string;
  phone?: string | null;
  role: string;
}

export default function OfficerIdentityLink({ email, name, phone, role }: Props) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("crest_created_passwords");
        if (stored) {
          const mapping = JSON.parse(stored);
          const pass = mapping[email.toLowerCase()];
          if (pass) {
            setPassword(pass);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Fallbacks
    const emailLower = email.toLowerCase();
    if (emailLower === "admin@unionbank.com" || emailLower === "mumbai_admin@unionbank.com") {
      setPassword("admin123");
    } else if (emailLower === "mumbai_officer@unionbank.com") {
      setPassword("officer123");
    } else {
      setPassword(role === "EMPLOYEE" ? "officer123" : "admin123");
    }
  }, [email, role]);

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `/ub_CREST/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    window.location.assign(url);
  };

  return (
    <a
      href="#"
      onClick={handleLinkClick}
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
