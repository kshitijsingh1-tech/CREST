"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default function RootRedirector() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect root visitors to the customer portal hub
    router.replace("/ub_publicPortal");
  }, [router]);

  return (
    <div className="flex-grow min-h-screen bg-[#0f2347] flex flex-col justify-center items-center text-white">
      <div className="text-center space-y-4 animate-pulse">
        <ShieldCheck className="w-12 h-12 text-red-500 mx-auto" />
        <h1 className="text-xl font-bold tracking-tight">Redirecting to Customer Care Center...</h1>
        <p className="text-xs text-blue-200/60 uppercase tracking-widest font-semibold">Please wait</p>
      </div>
    </div>
  );
}
