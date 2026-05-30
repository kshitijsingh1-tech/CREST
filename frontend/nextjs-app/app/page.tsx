"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  User, 
  ShieldCheck, 
  Cpu, 
  Globe, 
  FileText, 
  Zap, 
  BookOpen, 
  Sun, 
  Moon, 
  ChevronDown,
  MessageSquare,
  Mail,
  Send
} from "lucide-react";
import ColorBends from "@/components/ColorBends";
import CrestScrollHero from "@/components/CrestScrollHero";

export default function RootLandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Synchronize with the document theme class on mount
    const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(currentTheme);

    // Watch for theme changes dispatched from other parts of the app
    const handleThemeChange = (e: Event) => {
      const newTheme = (e as CustomEvent).detail;
      if (newTheme === "light" || newTheme === "dark") {
        setTheme(newTheme);
      }
    };
    window.addEventListener("crest-theme-change", handleThemeChange);
    return () => window.removeEventListener("crest-theme-change", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.dispatchEvent(new CustomEvent("crest-theme-change", { detail: nextTheme }));
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-transparent">

      {/* Floating Theme Toggle in Top Right */}
      <div className="absolute top-6 right-6 z-50 pointer-events-auto">
        <button 
          onClick={toggleTheme} 
          className="p-3 rounded-full transition-all duration-300 backdrop-blur-xl border shadow-lg hover:scale-105 active:scale-95
            dark:bg-black/40 dark:border-white/10 dark:text-yellow-400 dark:hover:bg-white/5
            bg-white/60 border-gray-200 text-black hover:bg-gray-100"
          title="Toggle color theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Shared Background Sweeps */}
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30 pointer-events-none">
        <ColorBends
          colors={["#ef4444", "#3b82f6"]}
          speed={0.06}
          warpStrength={0.4}
          iterations={2}
          bandWidth={5}
        />
      </div>

      {/* Crest Interactive Scroll Hero Wrapper */}
      <CrestScrollHero
        heroImage="/crest_internal_hero.png"
        title="CREST"
        subtitle="Centralized Resolution & Escalation Smart Technology"
        badgeText="Union Bank Grievance Intel System"
        italicText="“हर शिकायत, हर बार हल”"
        subText={
          <span className="flex flex-wrap items-center justify-center gap-1.5">
            <Link href="/ub_CREST/docs#compliance" className="hover:text-blue-500 dark:hover:text-blue-300 transition-colors underline decoration-dotted decoration-blue-500/40">Bhashini AI</Link>
            {" • "}
            <Link href="/ub_CREST/docs#compliance" className="hover:text-blue-500 dark:hover:text-blue-300 transition-colors underline decoration-dotted decoration-blue-500/40">India AI Mission</Link>
            {" • "}
            <Link href="/ub_CREST/docs#compliance" className="hover:text-blue-500 dark:hover:text-blue-300 transition-colors underline decoration-dotted decoration-blue-500/40">RBI Integrated Ombudsman</Link>
            {" • "}
            <Link href="/ub_CREST/docs#compliance" className="hover:text-blue-500 dark:hover:text-blue-300 transition-colors underline decoration-dotted decoration-blue-500/40">DPDP Aligned</Link>
          </span>
        }
      >
        <div className="flex-grow p-6 md:p-10 space-y-12 max-w-[90rem] mx-auto w-full relative z-10 animate-fade-in">

          {/* Section 1: Entry Portals (Three Translucent Cards - Zoomed In styling) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Customer Portal Box */}
            <div className="rounded-[2.5rem] p-8 md:p-10 border transition-all duration-500 relative overflow-hidden flex flex-col justify-between hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_30px_70px_rgba(59,130,246,0.2)]
              dark:bg-black/85 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl dark:hover:border-blue-500/40
              bg-white/70 backdrop-blur-xl border-gray-200/60 shadow-xl hover:border-blue-500/40">
              <div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border
                  dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400
                  bg-blue-50 border-blue-200 text-blue-600">
                  <User size={28} />
                </div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider mb-3 dark:text-white text-gray-900">Customer Portal</h3>
                <p className="text-xs md:text-sm font-semibold leading-relaxed dark:text-slate-400 text-gray-500">
                  Lodge grievances directly, verify status securely using CAPTCHA &amp; OTP verification, and review response history.
                </p>
              </div>
              <Link
                href="/ub_publicPortal"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 w-full text-center bg-gradient-to-r from-[#e50000] to-[#ff7b00] hover:from-[#c40000] hover:to-[#e56b00] text-white font-black py-3.5 px-6 rounded-full transition-all duration-300 text-xs uppercase tracking-widest shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span>Access Portal</span>
                <Send size={12} className="relative top-px" />
              </Link>
            </div>

            {/* Staff Login Box */}
            <div className="rounded-[2.5rem] p-8 md:p-10 border transition-all duration-500 relative overflow-hidden flex flex-col justify-between hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_30px_70px_rgba(239,68,68,0.15)]
              dark:bg-black/85 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl dark:hover:border-red-500/40
              bg-white/70 backdrop-blur-xl border-gray-200/60 shadow-xl hover:border-red-500/40">
              <div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border
                  dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400
                  bg-red-50 border-red-200 text-red-600">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider mb-3 dark:text-white text-gray-900">Staff Dashboard</h3>
                <p className="text-xs md:text-sm font-semibold leading-relaxed dark:text-slate-400 text-gray-500">
                  For branch officers and regional administrators to triage, assign, audit, and approve AI-generated draft responses.
                </p>
              </div>
              <Link
                href="/ub_CREST/login"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 w-full text-center bg-gradient-to-r from-[#e50000] to-[#ff7b00] hover:from-[#c40000] hover:to-[#e56b00] text-white font-black py-3.5 px-6 rounded-full transition-all duration-300 text-xs uppercase tracking-widest shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span>Officer Login</span>
                <Send size={12} className="relative top-px" />
              </Link>
            </div>

            {/* Platform Documentation Box */}
            <div className="rounded-[2.5rem] p-8 md:p-10 border transition-all duration-500 relative overflow-hidden flex flex-col justify-between hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_30px_70px_rgba(6,182,212,0.15)]
              dark:bg-black/85 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl dark:hover:border-cyan-500/40
              bg-white/70 backdrop-blur-xl border-gray-200/60 shadow-xl hover:border-cyan-500/40">
              <div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border
                  dark:bg-cyan-500/10 dark:border-cyan-500/20 dark:text-cyan-400
                  bg-cyan-50 border-cyan-200 text-cyan-600">
                  <BookOpen size={28} />
                </div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider mb-3 dark:text-white text-gray-900">Platform Docs</h3>
                <p className="text-xs md:text-sm font-semibold leading-relaxed dark:text-slate-400 text-gray-500">
                  Understand core RAG mechanics, pipeline topology, security configurations, and API ingestion guides.
                </p>
              </div>
              <Link
                href="/ub_CREST/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 w-full text-center bg-gradient-to-r from-[#e50000] to-[#ff7b00] hover:from-[#c40000] hover:to-[#e56b00] text-white font-black py-3.5 px-6 rounded-full transition-all duration-300 text-xs uppercase tracking-widest shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span>View Guide</span>
                <Send size={12} className="relative top-px" />
              </Link>
            </div>

          </div>

          {/* Professional Scrolling Hint */}
          <div className="text-center py-6">
            <div className="inline-flex flex-col items-center gap-1 group">
              <span className="text-[10px] uppercase tracking-widest font-black text-gray-500 dark:text-slate-400">
                Omnichannel Ingestion Status
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Scroll down to preview live communication interfaces
                <ChevronDown size={14} className="animate-bounce" />
              </span>
            </div>
          </div>

          {/* Section 2: Omnichannel Ingestion Channels */}
          <div className="rounded-[2rem] border p-8 md:p-10 transition-all duration-500 space-y-8
            dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
            bg-white/60 backdrop-blur-xl border-gray-200 shadow-xl">
            
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase tracking-wider dark:text-white text-gray-900">
                How Complaints Reach CREST
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest dark:text-indigo-400 text-indigo-600">
                Omnichannel Ingestion Gateway
              </p>
              <p className="text-xs md:text-sm font-medium leading-relaxed dark:text-slate-400 text-gray-500 max-w-3xl pt-2">
                Customers don't need to know anything about CREST. They simply use the channels they are most comfortable with — CREST automatically captures and triages grievances everywhere.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {[
                { 
                  icon: <Mail className="w-6 h-6 text-blue-500" />, 
                  ch: "Email", 
                  desc: "Send grievances directly to the bank's dedicated inbox. Auto-classified and triaged in seconds.",
                  href: "mailto:crestsupport247@gmail.com"
                },
                { 
                  icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="5" fill="#25D366" /><path fillRule="evenodd" clipRule="evenodd" d="M12.03 5C8.15 5 5 8.15 5 12.03c0 1.27.34 2.5.98 3.58L5 20l4.52-.95c1.04.57 2.2.87 3.5.87 3.88 0 7.03-3.15 7.03-7.03C20.06 8.15 16.9 5 12.03 5zm3.62 10.05c-.15.42-.76.81-1.05.86-.29.05-.65.08-1.89-.43-1.6-.66-2.61-2.28-2.69-2.39-.08-.11-.68-.9-.68-1.72s.43-1.22.58-1.37c.15-.15.34-.19.45-.19.1 0 .26 0 .4.3.15.35.53 1.27.57 1.35.04.09.07.19.02.3-.06.11-.09.19-.17.28-.08.09-.18.21-.25.29-.08.08-.17.18-.08.35.1.18.46.76.99 1.23.68.6 1.25.79 1.43.87.18.08.28-.02.39-.13.1-.11.45-.52.57-.7.12-.18.24-.15.41-.09.17.06 1.07.5 1.25.6.18.09.3.14.34.22.04.08.04.44-.1.86z" fill="white" /></svg>, 
                  ch: "WhatsApp", 
                  desc: "Connect with Cresty at +1 (415) 523-8886. Use sandboxed code to begin active chat logs.",
                  href: "https://wa.me/14155238886"
                },
                { 
                  icon: (
                    <svg className="w-6 h-6 text-[#2AABEE]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="5" fill="#2AABEE" />
                      <path d="M18.8 6.2c-.1-.1-.3-.1-.4 0l-14 5.4c-.2.1-.3.3-.3.5s.1.4.3.4l3.5 1.1 1.3 4.1c.1.2.2.3.4.3.1 0 .2 0 .3-.1l2.2-1.8 3.5 2.6c.1.1.3.1.4 0 .1-.1.2-.2.2-.4l3-11.5c0-.2-.1-.4-.2-.5zm-10 6.6l6.8-4.2-5.3 4.9v2.2l-1.5-2.9z" fill="white" />
                    </svg>
                  ),
                  ch: "Telegram", 
                  desc: "Direct messages sent to t.me/Crest_ubBot are automatically converted and queued.",
                  href: "https://t.me/Crest_ubBot"
                },
                { 
                  icon: (
                    <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="5" fill="#5865F2" />
                      <path d="M17.842 8.73c-.856-.395-1.782-.693-2.762-.876a.048.048 0 0 0-.05.023c-.119.213-.251.488-.344.71-.105-.015-.208-.023-.31-.023a8.91 8.91 0 0 0-.62 0c-.093 0-.197.008-.302.023-.093-.222-.225-.497-.344-.71a.048.048 0 0 0-.05-.023c-.98.183-1.906.48-2.762.876a.047.047 0 0 0-.022.018c-1.764 2.64-2.247 5.215-2.01 7.75a.05.05 0 0 0 .019.035c1.168.86 2.302 1.381 3.414 1.724a.05.05 0 0 0 .054-.017c.267-.367.508-.758.71-1.173a.048.048 0 0 0-.026-.067 6.07 6.07 0 0 1-.84-.403.048.048 0 0 1-.005-.08c.058-.043.113-.089.167-.134a.047.047 0 0 1 .049-.007c2.246 1.03 4.685 1.03 6.9 0a.047.047 0 0 1 .05.006c.053.046.108.092.167.135a.048.048 0 0 1-.006.08 5.86 5.86 0 0 1-.84.403.048.048 0 0 0-.025.068c.203.415.444.805.71 1.172a.05.05 0 0 0 .055.018c1.115-.343 2.25-.865 3.415-1.724a.05.05 0 0 0 .019-.035c.291-3.003-.497-5.556-2.015-7.75a.047.047 0 0 0-.022-.018zM10.74 13.918c-.663 0-1.21-.61-1.21-1.356 0-.747.537-1.356 1.21-1.356.677 0 1.218.615 1.21 1.356 0 .747-.533 1.356-1.21 1.356zm4.52 0c-.663 0-1.21-.61-1.21-1.356 0-.747.537-1.356 1.21-1.356.677 0 1.218.615 1.21 1.356 0 .747-.533 1.356-1.21 1.356z" fill="white" />
                  </svg>
                ),
                ch: "Discord", 
                desc: "Send DM to our verified support bot. Instantly parsed and matched with customer records.",
                href: "https://discord.gg/invite"
              },
              { 
                icon: <Globe className="w-6 h-6 text-emerald-500" />, 
                ch: "Web Portal", 
                desc: "Log details directly through the browser portal. Complete self-service form.",
                href: "/ub_publicPortal"
              }
            ].map(({ icon, ch, desc, href }) => (
              <a
                key={ch}
                href={href}
                target={href.startsWith("http") || href.startsWith("mailto") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="relative rounded-2xl border p-5 flex flex-col justify-between group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5
                  dark:bg-white/5 dark:backdrop-blur-md dark:border-white/10 dark:hover:border-indigo-500/30
                  bg-white/50 backdrop-blur-md border-gray-200/50 hover:border-indigo-500/30 hover:shadow-md"
              >
                <div>
                  <div className="mb-4">{icon}</div>
                  <h4 className="text-xs font-black uppercase tracking-widest mb-1.5 dark:text-white text-gray-900">
                    {ch}
                  </h4>
                  <p className="text-[10px] leading-relaxed dark:text-slate-400 text-gray-500">
                    {desc}
                  </p>
                </div>
              </a>
            ))}
          </div>

          <div className="relative rounded-2xl border border-l-4 border-gray-200 dark:border-white/10 border-l-indigo-500 dark:border-l-indigo-400 p-5 bg-white/60 dark:bg-white/5 backdrop-blur-md shadow-sm">
            <p className="text-xs font-semibold dark:text-slate-300 text-gray-700 leading-relaxed">
              <strong className="dark:text-indigo-300 text-indigo-700 font-bold">Conversational Assistance &amp; Intelligent Intent Detection</strong> — You can chat and converse with <strong>Cresty</strong> naturally through any of these integration platforms! Our AI models inspect incoming messages in real-time. If you are lodging a complaint, it will automatically register a new grievance ticket, route it to the correct nodal region, and reply with your tracking details. For general inquiries, greetings, or questions, Cresty will simply chat with you and assist you directly.
            </p>
          </div>

          </div>

          {/* Footer Note */}
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-bold">
              Union Bank of India · CREST Core · RBI Integrated Ombudsman Scheme 2021 Aligned
            </p>
          </div>

        </div>
      </CrestScrollHero>

    </div>
  );
}
