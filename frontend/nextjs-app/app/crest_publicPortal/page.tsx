"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, 
  Search, 
  BookOpen, 
  PhoneCall, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  ShieldAlert,
  Clock,
  Lock
} from "lucide-react";

export default function PublicPortalHub() {
  const [activeSection, setActiveSection] = useState<"none" | "learning" | "contact">("none");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("crest-theme");
    let currentTheme: "light" | "dark" = "light";
    if (savedTheme === "light" || savedTheme === "dark") {
      currentTheme = savedTheme;
    } else {
      const isDark = document.documentElement.classList.contains("dark");
      currentTheme = isDark ? "dark" : "light";
    }
    setTheme(currentTheme);
    window.dispatchEvent(new CustomEvent("crest-theme-change", { detail: currentTheme }));
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("crest-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new CustomEvent("crest-theme-change", { detail: nextTheme }));
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "What is the average timeline for resolving grievances?",
      a: "Union Bank of India is committed to resolving all general complaints within 7-10 working days. Highly complex transactions or technical disputes are guaranteed to be resolved within 30 days, as per standard RBI guidance."
    },
    {
      q: "Is my personal data (PII) safe on the public tracking portal?",
      a: "Yes. Our public tracking portal enforces strict PII masking protocols. Supporting officer names, contact details, and account numbers are fully masked. Detailed status logs are only revealed after double-layered OTP verification."
    },
    {
      q: "What is my liability limit for unauthorized bank transactions?",
      a: "Per RBI Zero-Liability Guidelines, if you report unauthorized electronic banking transactions within 3 working days of the incident, your liability is strictly zero. Reporting within 4-7 days caps liability between ₹5,000 to ₹10,000."
    },
    {
      q: "Can I appeal if I am not satisfied with the resolution remarks?",
      a: "Absolutely. Once a Support Desk resolves a complaint, a 'File Appeal' action becomes active on your status tracking screen. Clicking this reopens the case and escalates it directly to the Principal Nodal Officer."
    }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-transparent relative">
      
      {/* Sleek Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button onClick={toggleTheme} className="p-3 rounded-full transition-all duration-300 backdrop-blur-md shadow-lg border
          dark:bg-slate-950/60 dark:hover:bg-slate-900 dark:text-yellow-400 dark:border-slate-800
          bg-white/80 hover:bg-white text-black border-gray-200" title="Toggle Theme">
          {theme === "dark" ? (
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
      </div>

      {/* Dynamic Cover Banner */}
      <div className="dark:bg-slate-950/50 bg-blue-900/10 backdrop-blur-2xl py-20 px-6 relative overflow-hidden border-b dark:border-slate-800/80 border-blue-900/10">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border dark:border-slate-800/60 border-blue-200 dark:bg-slate-900/40 bg-blue-100 text-xs font-semibold tracking-wider dark:text-blue-200 text-blue-800 uppercase">
            <ShieldCheck className="w-4 h-4 text-red-500 animate-pulse" /> Official Public Portal
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight dark:text-white text-slate-900 animate-shimmer uppercase">
            Customer Grievance & Care Hub
          </h1>
          <p className="text-sm md:text-base dark:text-slate-300 text-slate-700 max-w-2xl mx-auto font-medium leading-relaxed">
            Welcome to the secure Union Bank of India public service terminal. Register disputes, monitor active ticket pipelines, and access regional Nodal Directories instantly.
          </p>
        </div>
      </div>

      {/* Main Interactive Grid - Samsung Style Layout */}
      <main className="max-w-6xl mx-auto w-full px-4 py-12 flex-grow">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          {/* Card 1: Lodge Complaint */}
          <div className="dark:bg-slate-950/40 bg-white rounded-3xl border dark:border-slate-800 border-gray-200 p-8 flex flex-col justify-between min-h-[260px] shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(227,24,55,0.15)] dark:hover:bg-slate-900/60 dark:hover:border-red-500/30 transition-all duration-500 hover:-translate-y-1">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold dark:text-white text-black text-2xl tracking-tight">Lodge a New Grievance</h3>
                <FileText className="w-8 h-8 dark:text-slate-500 text-slate-200" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold dark:text-red-400 text-slate-800 mb-2">
                Available: 24/7 Digital Intake
              </p>
              <p className="text-sm dark:text-slate-400 text-slate-500 leading-relaxed max-w-[90%]">
                File a digital dispute or report transaction discrepancies online. Generates an instant secure UUID Reference Token.
              </p>
            </div>
            <div className="mt-8">
              <Link href="/submit" className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border shadow-md
                bg-[#e31837] border-red-700/20 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/10
                dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-900/50 dark:hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                Lodge Grievance
              </Link>
            </div>
          </div>

          {/* Card 2: Track Complaint */}
          <div className="dark:bg-slate-950/40 bg-white rounded-3xl border dark:border-slate-800 border-gray-200 p-8 flex flex-col justify-between min-h-[260px] shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(0,85,255,0.15)] dark:hover:bg-slate-900/60 dark:hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-1">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold dark:text-white text-black text-2xl tracking-tight">Track Active Grievance</h3>
                <Search className="w-8 h-8 dark:text-slate-500 text-slate-200" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold dark:text-blue-400 text-slate-800 mb-2">
                Available: Real-Time Sync
              </p>
              <p className="text-sm dark:text-slate-400 text-slate-500 leading-relaxed max-w-[90%]">
                Check dispute timeline, view resolution remarks, upload supplemental files, or appeal decision outputs.
              </p>
            </div>
            <div className="mt-8">
              <Link href="/track" className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border shadow-md
                bg-[#0055ff] border-blue-700/20 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/10
                dark:bg-blue-950/40 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                Track Status
              </Link>
            </div>
          </div>

          {/* Card 3: Learning Corner */}
          <div className="dark:bg-slate-950/40 bg-white rounded-3xl border dark:border-slate-800 border-gray-200 p-8 flex flex-col justify-between min-h-[260px] shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] dark:hover:bg-slate-900/60 dark:hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-1">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold dark:text-white text-black text-2xl tracking-tight">Safety & Learning Corner</h3>
                <BookOpen className="w-8 h-8 dark:text-slate-500 text-slate-200" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold dark:text-emerald-400 text-slate-800 mb-2">
                Resources: RBI Protected
              </p>
              <p className="text-sm dark:text-slate-400 text-slate-500 leading-relaxed max-w-[90%]">
                Discover customer liability limits, fraud prevention checklists, and official regulatory rights.
              </p>
            </div>
            <div className="mt-8">
              <button 
                onClick={() => setActiveSection(activeSection === "learning" ? "none" : "learning")}
                className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border shadow-md
                  bg-black hover:bg-slate-800 text-white border-slate-900
                  dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 dark:hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {activeSection === "learning" ? "Close FAQs" : "View Resources"}
              </button>
            </div>
          </div>

          {/* Card 4: Contact Us */}
          <div className="dark:bg-slate-950/40 bg-white rounded-3xl border dark:border-slate-800 border-gray-200 p-8 flex flex-col justify-between min-h-[260px] shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] dark:hover:bg-slate-900/60 dark:hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-1">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold dark:text-white text-black text-2xl tracking-tight">Contact Nodal Authorities</h3>
                <PhoneCall className="w-8 h-8 dark:text-slate-500 text-slate-200" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold dark:text-emerald-400 text-slate-800 mb-2">
                Available: Direct Support
              </p>
              <p className="text-sm dark:text-slate-400 text-slate-500 leading-relaxed max-w-[90%]">
                Connect directly with regional escalation units or access emergency cyber fraud response desks.
              </p>
            </div>
            <div className="mt-8">
              <button 
                onClick={() => setActiveSection(activeSection === "contact" ? "none" : "contact")}
                className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border shadow-md
                  bg-black hover:bg-slate-800 text-white border-slate-900
                  dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 dark:hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {activeSection === "contact" ? "Close Directories" : "View Directories"}
              </button>
            </div>
          </div>
          
        </div>

        {/* Dynamic Section: Learning Corner */}
        {activeSection === "learning" && (
          <div className="dark:bg-slate-950/80 bg-white/80 backdrop-blur-xl rounded-3xl border dark:border-slate-800 border-gray-200 p-8 shadow-2xl animate-fade-in-up mb-12">
            <div className="flex items-center gap-3 mb-6 border-b dark:border-slate-800/80 border-slate-100 pb-4">
              <ShieldAlert className="w-7 h-7 text-indigo-500" />
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight dark:text-white text-slate-800">Cyber Safety & Grievance FAQ</h2>
                <p className="text-xs dark:text-slate-400 text-slate-500 font-bold uppercase tracking-wider mt-0.5">Essential facts and RBI consumer protection guides</p>
              </div>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border dark:border-slate-800/60 border-slate-100 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 font-bold dark:text-slate-200 text-slate-700 text-left text-sm"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 pt-1 dark:text-slate-300 text-slate-600 text-sm leading-relaxed border-t dark:border-slate-800/50 border-slate-50 dark:bg-slate-900/20 bg-slate-50/30">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Section: Contact Directory */}
        {activeSection === "contact" && (
          <div className="dark:bg-slate-950/80 bg-white/80 backdrop-blur-xl rounded-3xl border dark:border-slate-800 border-gray-200 p-8 shadow-2xl animate-fade-in-up mb-12">
            <div className="flex items-center gap-3 mb-6 border-b dark:border-slate-800/80 border-slate-100 pb-4">
              <PhoneCall className="w-7 h-7 text-emerald-500" />
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight dark:text-white text-slate-800">Support Escalate Directories</h2>
                <p className="text-xs dark:text-slate-400 text-slate-500 font-bold uppercase tracking-wider mt-0.5">Contact active regional support units directly</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 dark:bg-slate-900/50 bg-slate-50 border dark:border-slate-800/60 border-slate-200 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl scale-150"></div>
                <h3 className="font-bold text-sm dark:text-white text-slate-800 mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Fraud Helpline
                </h3>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 mb-4 leading-relaxed">
                  Call immediately to report cards, mobile banking, or UPI hacks.
                </p>
                <a href="tel:7905438724" className="text-base font-black text-red-500 hover:underline">
                  Hotline: 7905438724
                </a>
              </div>

              <div className="p-5 dark:bg-slate-900/50 bg-slate-50 border dark:border-slate-800/60 border-slate-200 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl scale-150"></div>
                <h3 className="font-bold text-sm dark:text-white text-slate-800 mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-600" /> Central PNO
                </h3>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 mb-4 leading-relaxed">
                  Escalate disputes directly to the central grievance department.
                </p>
                <a href="mailto:pno@unionbankofindia.bank" className="text-xs font-bold text-blue-500 dark:text-blue-400 hover:underline">
                  pno@unionbankofindia.bank
                </a>
              </div>

              <div className="p-5 dark:bg-slate-900/50 bg-slate-50 border dark:border-slate-800/60 border-slate-200 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl scale-150"></div>
                <h3 className="font-bold text-sm dark:text-white text-slate-800 mb-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" /> GAC Committee
                </h3>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 mb-4 leading-relaxed">
                  Official government panel for direct secondary citizen appeals.
                </p>
                <a href="https://gac-portal.gov.in" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  gac-portal.gov.in &rarr;
                </a>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer Branding disclaimers */}
      <footer className="dark:bg-slate-950/80 bg-slate-100/80 backdrop-blur-xl border-t dark:border-slate-800/80 border-slate-200 py-10 px-6 text-center text-xs dark:text-slate-500 text-slate-500">
        <p className="max-w-2xl mx-auto leading-relaxed">
          Grievance Operations comply strictly with the Reserve Bank of India (RBI) Integrated Ombudsman Scheme. Secure sessions are monitored for safety. Union Bank of India will never ask for your passwords, transaction PINs, or security OTPs.
        </p>
      </footer>
      
    </div>
  );
}
