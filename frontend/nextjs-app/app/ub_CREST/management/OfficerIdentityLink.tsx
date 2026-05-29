"use client";

import Cookies from "js-cookie";

interface Props {
  email: string;
  name: string;
  phone?: string | null;
}

export default function OfficerIdentityLink({ email, name, phone }: Props) {
  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // 1. Clear current admin session — force a fresh login as the selected officer
    Cookies.remove("crest_token", { path: "/" });
    Cookies.remove("crest_token", { path: "/", sameSite: "lax" });
    Cookies.remove("crest_token", { path: "/", sameSite: "lax", secure: true });
    localStorage.removeItem("crest_user");

    // 2. Redirect to login with only the email pre-filled (password must be entered manually)
    const url = `/ub_CREST/login?email=${encodeURIComponent(email)}`;
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
