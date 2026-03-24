"use client";

import { useEffect, useState } from "react";
import { getDashboardSummary } from "@/lib/api";
import Link from "next/link";

export default function LandingPage() {
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getDashboardSummary()
      .then((res) => { setData(res); setStatus("online"); })
      .catch((err) => { setStatus("offline"); });
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-16">
      
      {/* Hero Section */}
      <div className="space-y-6 max-w-4xl px-4 pointer-events-none">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter transition-all duration-500
          dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-blue-100 dark:to-blue-400 dark:drop-shadow-[0_0_40px_rgba(0,170,255,0.4)]
          text-black">
          CREST
        </h1>
        <p className="text-sm md:text-lg font-bold max-w-3xl mx-auto tracking-widest uppercase transition-colors duration-500 leading-relaxed
          dark:text-red-400 text-black">
          Complaint Resolution & Escalation Smart Technology
        </p>
      </div>

      {/* REST API Status Checker Card */}
      <div className="pointer-events-auto w-full max-w-md rounded-3xl p-6 transition-all duration-500 group
        dark:bg-black/80 dark:backdrop-blur-xl dark:border dark:border-white/10 dark:shadow-2xl dark:hover:bg-black dark:hover:border-white/20
        bg-white shadow-xl border border-gray-200 hover:border-black hover:shadow-2xl">
        <h2 className="text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 mb-6 transition-colors duration-500
          dark:text-white text-black">
          <svg className="w-5 h-5 transition-colors duration-500 dark:text-red-500 text-red-600 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Backend Systems Health
        </h2>

         <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border transition-all duration-500
            dark:bg-blue-950/40 dark:border-blue-500/20 dark:shadow-inner
            bg-gray-100 border-gray-200">
            <span className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border transition-all duration-500
              dark:bg-[#061026] dark:border-blue-500/50 dark:text-blue-200 dark:shadow-[0_0_15px_rgba(59,130,246,0.3)]
              bg-blue-50 border-blue-200 text-blue-700 shadow-sm relative group overflow-hidden">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]"></span>
              </span>
              Core Diagnostic Check
            </span>
            {status === "loading" && (
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-black dark:text-blue-500">
                <span className="w-2.5 h-2.5 rounded-full bg-black dark:bg-blue-500 animate-ping absolute opacity-75"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-black dark:bg-blue-500 relative"></span>
                Checking...
              </span>
            )}
            {status === "online" && (
              <span className="flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-md border uppercase tracking-widest transition-all duration-500
                dark:bg-blue-600/30 dark:text-white dark:border-blue-500/50
                bg-black text-white border-black">
                <span className="w-2 h-2 rounded-full dark:bg-blue-400 bg-white dark:shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                Online
              </span>
            )}
            {status === "offline" && (
              <span className="flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-md border uppercase tracking-widest transition-all duration-500
                dark:bg-red-600/30 dark:text-red-100 dark:border-red-500/50
                bg-red-600 text-white border-red-800">
                <span className="w-2 h-2 rounded-full dark:bg-red-500 bg-white dark:shadow-[0_0_8px_rgba(255,0,0,0.8)] animate-pulse"></span>
                Offline
              </span>
            )}
          </div>

          {status === "online" && data && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border p-4 text-left cursor-default transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group
                dark:bg-[#020b18]/80 dark:border-blue-500/30 dark:shadow-md dark:hover:border-blue-400 dark:hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]
                bg-white border-gray-200 shadow-sm hover:border-black hover:shadow-xl hover:-translate-y-1 hover:scale-[1.05]">
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-blue-500/10 dark:bg-blue-400/20 rounded-full blur-xl scale-0 group-hover:scale-[3] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
                <p className="text-[10px] uppercase tracking-widest font-bold transition-colors duration-500 dark:text-blue-300 text-gray-500 relative z-10">Total Open</p>
                <p className="text-2xl font-black mt-1 transition-colors duration-500 dark:text-white text-black dark:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] relative z-10">{data.total_open}</p>
              </div>
              <div className="rounded-xl border p-4 text-left cursor-default transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group
                dark:bg-[#020b18]/80 dark:border-blue-500/30 dark:shadow-md dark:hover:border-red-500/50 dark:hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)]
                bg-white border-gray-200 shadow-sm hover:border-black hover:shadow-xl hover:-translate-y-1 hover:scale-[1.05]">
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-red-500/10 dark:bg-red-500/20 rounded-full blur-xl scale-0 group-hover:scale-[3] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
                <p className="text-[10px] uppercase tracking-widest font-bold transition-colors duration-500 dark:text-blue-300 text-gray-500 relative z-10">P0 Critical</p>
                <p className="text-2xl font-black mt-1 transition-colors duration-500 dark:text-red-500 text-red-600 dark:drop-shadow-[0_0_5px_rgba(255,0,0,0.5)] relative z-10">{data.p0_open}</p>
              </div>
              <div className="rounded-xl border p-4 text-left cursor-default transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group
                dark:bg-[#020b18]/80 dark:border-blue-500/30 dark:shadow-md dark:hover:border-orange-500/50 dark:hover:shadow-[0_8px_30px_rgba(249,115,22,0.15)]
                bg-white border-gray-200 shadow-sm hover:border-black hover:shadow-xl hover:-translate-y-1 hover:scale-[1.05]">
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-xl scale-0 group-hover:scale-[3] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
                <p className="text-[10px] uppercase tracking-widest font-bold transition-colors duration-500 dark:text-blue-300 text-gray-500 relative z-10">SLA Breached</p>
                <p className="text-2xl font-black mt-1 transition-colors duration-500 dark:text-orange-500 text-orange-600 dark:drop-shadow-[0_0_5px_rgba(255,100,0,0.5)] relative z-10">{data.sla_breached}</p>
              </div>
              <div className="rounded-xl border p-4 text-left cursor-default transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group
                dark:bg-[#020b18]/80 dark:border-blue-500/30 dark:shadow-md dark:hover:border-green-500/50 dark:hover:shadow-[0_8px_30px_rgba(34,197,94,0.15)]
                bg-white border-gray-200 shadow-sm hover:border-black hover:shadow-xl hover:-translate-y-1 hover:scale-[1.05]">
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-green-500/10 dark:bg-green-500/20 rounded-full blur-xl scale-0 group-hover:scale-[3] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
                <p className="text-[10px] uppercase tracking-widest font-bold transition-colors duration-500 dark:text-blue-300 text-gray-500 relative z-10">Avg Res. Time</p>
                <p className="text-2xl font-black mt-1 transition-colors duration-500 dark:text-green-400 text-green-600 dark:drop-shadow-[0_0_5px_rgba(0,255,0,0.5)] relative z-10">{data.avg_resolution_hrs}h</p>
              </div>
            </div>
          )}

          {status === "offline" && (
             <div className="text-xs font-mono p-4 rounded-xl mt-2 text-left leading-relaxed border transition-all duration-500
              dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-200/90 dark:shadow-inner
              bg-gray-100 border-gray-300 text-black">
              <span className="px-2 py-0.5 rounded font-bold block mb-2 w-max text-[10px] uppercase tracking-wider
                dark:bg-red-600 dark:text-white bg-black text-white">Connection Refused</span>
              The FastAPI backend is not answering. Ensure it is running on <b>port 8000</b>. The system will use fallback data for dashboard pages.
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-auto z-10">
        <Link href="/dashboard" className="inline-flex items-center gap-3 px-10 py-5 font-black uppercase tracking-widest rounded-2xl transition-all border 
          dark:shadow-[0_10px_30px_rgba(255,0,0,0.3)] dark:bg-gradient-to-r dark:from-red-600 dark:to-red-500 dark:hover:from-red-500 dark:hover:to-red-400 dark:text-white dark:border-red-400
          shadow-xl bg-black text-white hover:bg-gray-900 hover:scale-105 border-black">
          Enter Dashboard
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </Link>
      </div>

    </div>
  );
}
