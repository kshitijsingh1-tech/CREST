"use client";

import Image from "next/image";
import Link from "next/link";
import { User, ShieldCheck, Cpu, Globe, FileText, Zap } from "lucide-react";
import ColorBends from "@/components/ColorBends";

export default function RootLandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-white dark:bg-[#0a0a0f]">

      {/* Shared CREST background: ColorBends red+blue sweeps */}
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30 pointer-events-none">
        <ColorBends
          colors={["#ef4444", "#3b82f6"]}
          speed={0.06}
          warpStrength={0.4}
          iterations={2}
          bandWidth={5}
        />
      </div>

      {/* Dot-grid texture overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-10 dark:opacity-15 dark:text-white text-black"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "6px 6px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-14 pb-20 gap-10">

        {/* Logo — large */}
        <div className="relative w-80 h-32 drop-shadow-2xl">
          <Image
            src="/crest_logo.png"
            alt="CREST Logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Glassmorphism CREST info panel */}
        <div className="w-full max-w-3xl rounded-3xl border border-white/25 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(59,130,246,0.15)] p-8 text-center space-y-4">
          <h1
            className="text-4xl md:text-5xl font-black uppercase tracking-tight bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(to right, #0052ff, #4a22ff, #9b1aff, #e31837, #ff2200)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            CREST
          </h1>
          <p className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
            Centralized Resolution &amp; Escalation Smart Technology
          </p>
          <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto rounded-full shadow-[0_0_10px_rgba(227,24,55,0.5)]" />
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            AI-powered complaint resolution platform for Union Bank of India — intelligently routing grievances across channels with multilingual RAG, auto-triage, and real-time SLA enforcement.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              { icon: Cpu,      label: "AI Triage" },
              { icon: Globe,    label: "Multilingual" },
              { icon: Zap,      label: "Real-time SLA" },
              { icon: FileText, label: "RAG Draft Reply" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md text-gray-600 dark:text-gray-400"
              >
                <Icon className="w-3 h-3" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Portal cards */}
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Customer Portal */}
          <div className="rounded-2xl border border-white/25 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-2xl shadow-xl p-7 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-700/30 flex items-center justify-center text-blue-600">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">Customer Portal</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Submit complaints, track ticket status, and receive AI-drafted resolutions — across Email, WhatsApp, SMS and more.
              </p>
            </div>
            <Link
              href="/ub_publicPortal"
              className="mt-auto inline-block text-center bg-[#e50000] hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-full transition-colors text-sm shadow-md"
            >
              Access Portal
            </Link>
          </div>

          {/* Staff Login */}
          <div className="rounded-2xl border border-white/25 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-2xl shadow-xl p-7 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-800 dark:text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">UB CREST Staff Login</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Officers and admins: manage the live queue, review AI drafts, and enforce SLA with full audit trail visibility.
              </p>
            </div>
            <Link
              href="/ub_CREST/login"
              className="mt-auto inline-block text-center bg-[#e50000] hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-full transition-colors text-sm shadow-md"
            >
              Login Now
            </Link>
          </div>

        </div>

        {/* Footer note */}
        <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-bold">
          Union Bank of India · CREST Core · RBI Ombudsman 2021 Aligned
        </p>

      </div>
    </div>
  );
}
