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

  // Shared card class — translucent glass, readable on both themes
  const cardClass = `rounded-3xl border p-8 flex flex-col justify-between min-h-[260px] transition-all duration-500 hover:-translate-y-1 backdrop-blur-xl
    dark:bg-black/60 dark:border-white/10 dark:shadow-2xl dark:hover:border-white/20
    bg-white/70 border-white/60 shadow-lg hover:shadow-xl hover:border-white/80`;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-transparent relative">
      
      {/* Sleek Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button onClick={toggleTheme} className="p-3 rounded-full transition-all duration-300 backdrop-blur-md shadow-lg border
          dark:bg-black/60 dark:hover:bg-black/80 dark:text-yellow-400 dark:border-white/10
          bg-white/80 hover:bg-white text-gray-700 border-gray-200" title="Toggle Theme">
          {theme === "dark" ? (
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
      </div>

      {/* Cover Banner */}
      <div className="backdrop-blur-2xl py-20 px-6 relative overflow-hidden border-b
        dark:bg-black/60 dark:border-white/10
        bg-white/60 border-white/60">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wider uppercase
            dark:border-white/10 dark:bg-white/5 dark:text-blue-300
            border-blue-200 bg-blue-100 text-blue-800">
            <ShieldCheck className="w-4 h-4 text-red-500 animate-pulse" /> Official Public Portal
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight uppercase
            dark:animate-shimmer dark:text-white text-gray-900">
            Customer Grievance & Care Hub
          </h1>
          <p className="text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed
            dark:text-slate-300 text-gray-700">
            Welcome to the secure Union Bank of India public service terminal. Register disputes, monitor active ticket pipelines, and access regional Nodal Directories instantly.
          </p>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <main className="max-w-6xl mx-auto w-full px-4 py-12 flex-grow">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          {/* Card 1: Lodge Complaint */}
          <div className={cardClass + " dark:hover:shadow-[0_0_30px_rgba(227,24,55,0.15)] dark:hover:border-red-500/30 hover:shadow-red-100"}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-2xl tracking-tight dark:text-white text-gray-900">Lodge a New Grievance</h3>
                <FileText className="w-8 h-8 dark:text-slate-500 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold mb-2 dark:text-red-400 text-red-600">
                Available: 24/7 Digital Intake
              </p>
              <p className="text-sm leading-relaxed max-w-[90%] dark:text-slate-400 text-gray-600">
                File a digital dispute or report transaction discrepancies online. Generates an instant secure UUID Reference Token.
              </p>
            </div>
            <div className="mt-8">
              <Link href="/submit" className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border shadow-md
                bg-[#e31837] border-red-700/20 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/10
                dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-900/50">
                Lodge Grievance
              </Link>
            </div>
          </div>

          {/* Card 2: Track Complaint */}
          <div className={cardClass + " dark:hover:shadow-[0_0_30px_rgba(0,85,255,0.15)] dark:hover:border-blue-500/30 hover:shadow-blue-100"}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-2xl tracking-tight dark:text-white text-gray-900">Track Active Grievance</h3>
                <Search className="w-8 h-8 dark:text-slate-500 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold mb-2 dark:text-blue-400 text-blue-700">
                Available: Real-Time Sync
              </p>
              <p className="text-sm leading-relaxed max-w-[90%] dark:text-slate-400 text-gray-600">
                Check dispute timeline, view resolution remarks, upload supplemental files, or appeal decision outputs.
              </p>
            </div>
            <div className="mt-8">
              <Link href="/track" className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border shadow-md
                bg-[#0055ff] border-blue-700/20 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/10
                dark:bg-blue-950/40 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-900/50">
                Track Status
              </Link>
            </div>
          </div>

          {/* Card 3: Learning Corner */}
          <div className={cardClass + " dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] dark:hover:border-emerald-500/30 hover:shadow-emerald-100"}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-2xl tracking-tight dark:text-white text-gray-900">Safety & Learning Corner</h3>
                <BookOpen className="w-8 h-8 dark:text-slate-500 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold mb-2 dark:text-emerald-400 text-emerald-700">
                Resources: RBI Protected
              </p>
              <p className="text-sm leading-relaxed max-w-[90%] dark:text-slate-400 text-gray-600">
                Discover customer liability limits, fraud prevention checklists, and official regulatory rights.
              </p>
            </div>
            <div className="mt-8">
              <button 
                onClick={() => setActiveSection(activeSection === "learning" ? "none" : "learning")}
                className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border shadow-md
                  bg-gray-900 hover:bg-gray-700 text-white border-gray-900
                  dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
              >
                {activeSection === "learning" ? "Close FAQs" : "View Resources"}
              </button>
            </div>
          </div>

          {/* Card 4: Contact Us */}
          <div className={cardClass + " dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] dark:hover:border-emerald-500/30 hover:shadow-emerald-100"}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-2xl tracking-tight dark:text-white text-gray-900">Contact Nodal Authorities</h3>
                <PhoneCall className="w-8 h-8 dark:text-slate-500 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold mb-2 dark:text-emerald-400 text-emerald-700">
                Available: Direct Support
              </p>
              <p className="text-sm leading-relaxed max-w-[90%] dark:text-slate-400 text-gray-600">
                Connect directly with regional escalation units or access emergency cyber fraud response desks.
              </p>
            </div>
            <div className="mt-8">
              <button 
                onClick={() => setActiveSection(activeSection === "contact" ? "none" : "contact")}
                className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 border shadow-md
                  bg-gray-900 hover:bg-gray-700 text-white border-gray-900
                  dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
              >
                {activeSection === "contact" ? "Close Directories" : "View Directories"}
              </button>
            </div>
          </div>
          
        </div>

        {/* Dynamic Section: Learning Corner */}
        {activeSection === "learning" && (
          <div className="backdrop-blur-xl rounded-3xl border shadow-2xl animate-fade-in-up mb-12 p-8
            dark:bg-black/60 dark:border-white/10
            bg-white/70 border-white/60">
            <div className="flex items-center gap-3 mb-6 border-b pb-4
              dark:border-white/10 border-gray-200">
              <ShieldAlert className="w-7 h-7 text-indigo-500" />
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight dark:text-white text-gray-900">Cyber Safety & Grievance FAQ</h2>
                <p className="text-xs font-bold uppercase tracking-wider mt-0.5 dark:text-slate-400 text-gray-500">Essential facts and RBI consumer protection guides</p>
              </div>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border rounded-2xl overflow-hidden transition-all duration-300
                  dark:border-white/10 dark:hover:bg-white/5
                  border-gray-200 hover:bg-gray-50/50">
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 font-bold text-left text-sm
                      dark:text-slate-200 text-gray-800"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp className="w-4 h-4 dark:text-slate-500 text-gray-400" /> : <ChevronDown className="w-4 h-4 dark:text-slate-500 text-gray-400" />}
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 pt-1 text-sm leading-relaxed border-t
                      dark:border-white/10 dark:text-slate-300 dark:bg-white/5
                      border-gray-100 text-gray-600 bg-gray-50/30">
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
          <div className="backdrop-blur-xl rounded-3xl border shadow-2xl animate-fade-in-up mb-12 p-8
            dark:bg-black/60 dark:border-white/10
            bg-white/70 border-white/60">
            <div className="flex items-center gap-3 mb-6 border-b pb-4
              dark:border-white/10 border-gray-200">
              <PhoneCall className="w-7 h-7 text-emerald-500" />
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight dark:text-white text-gray-900">Support Escalate Directories</h2>
                <p className="text-xs font-bold uppercase tracking-wider mt-0.5 dark:text-slate-400 text-gray-500">Contact active regional support units directly</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl border relative overflow-hidden
                dark:bg-white/5 dark:border-white/10
                bg-gray-50/80 border-gray-200">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl scale-150"></div>
                <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5 dark:text-white text-gray-900">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Fraud Helpline
                </h3>
                <p className="text-[11px] mb-4 leading-relaxed dark:text-slate-400 text-gray-600">
                  Call immediately to report cards, mobile banking, or UPI hacks.
                </p>
                <a href="tel:7905438724" className="text-base font-black text-red-500 hover:underline">
                  Hotline: 7905438724
                </a>
              </div>

              <div className="p-5 rounded-2xl border relative overflow-hidden
                dark:bg-white/5 dark:border-white/10
                bg-gray-50/80 border-gray-200">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl scale-150"></div>
                <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5 dark:text-white text-gray-900">
                  <Lock className="w-4 h-4 text-blue-600" /> Central PNO
                </h3>
                <p className="text-[11px] mb-4 leading-relaxed dark:text-slate-400 text-gray-600">
                  Escalate disputes directly to the central grievance department.
                </p>
                <a href="mailto:pno@unionbankofindia.bank" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  pno@unionbankofindia.bank
                </a>
              </div>

              <div className="p-5 rounded-2xl border relative overflow-hidden
                dark:bg-white/5 dark:border-white/10
                bg-gray-50/80 border-gray-200">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl scale-150"></div>
                <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5 dark:text-white text-gray-900">
                  <Clock className="w-4 h-4 text-indigo-600" /> GAC Committee
                </h3>
                <p className="text-[11px] mb-4 leading-relaxed dark:text-slate-400 text-gray-600">
                  Official government panel for direct secondary citizen appeals.
                </p>
                <a href="https://gac-portal.gov.in" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  gac-portal.gov.in →
                </a>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="backdrop-blur-xl border-t py-10 px-6 text-center text-xs
        dark:bg-black/60 dark:border-white/10 dark:text-slate-500
        bg-white/60 border-white/60 text-gray-500">
        <p className="max-w-2xl mx-auto leading-relaxed">
          Grievance Operations comply strictly with the Reserve Bank of India (RBI) Integrated Ombudsman Scheme. Secure sessions are monitored for safety. Union Bank of India will never ask for your passwords, transaction PINs, or security OTPs.
        </p>
      </footer>
      
    </div>
  );
}
