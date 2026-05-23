"use client";

import { useState, useEffect, useRef } from "react";
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
  Lock,
  MessageSquare,
  Send,
  X,
  Sparkles
} from "lucide-react";
import ColorBends from "@/components/ColorBends";
import GoogleTranslate from "@/components/GoogleTranslate";
import { FAQ_CATEGORIES } from "@/constants/faqs";

export default function PublicPortalHub() {
  const [activeSection, setActiveSection] = useState<"none" | "learning" | "contact">("none");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<number | null>(null);

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [alertVisible, setAlertVisible] = useState(true);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: "assistant", content: "Hello! I am Cresty, your Union Bank support assistant. How can I help you resolve a dispute or find policy details today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatOpen]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", content: "I apologize, but I failed to reach the AI engine. Please try again!" }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Failed to connect to assistant. Please check your internet connection." }]);
    } finally {
      setChatLoading(false);
    }
  };
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let active = true;
    let currentScroll = window.scrollY;
    let targetScroll = window.scrollY;

    const handleScroll = () => {
      targetScroll = window.scrollY;
    };

    const update = () => {
      if (!active) return;

      // Cushioned linear interpolation (lerp) formula:
      // Moves 12% of the remaining distance per frame, creating an ultra-smooth, premium liquid slide!
      const diff = targetScroll - currentScroll;
      if (Math.abs(diff) > 0.05) {
        currentScroll += diff * 0.12;
        setScrollY(currentScroll);
      } else if (currentScroll !== targetScroll) {
        currentScroll = targetScroll;
        setScrollY(currentScroll);
      }

      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    requestAnimationFrame(update);

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

    return () => {
      active = false;
      window.removeEventListener("scroll", handleScroll);
    };
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

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const toggleCategory = (idx: number) => {
    setOpenCategory(openCategory === idx ? null : idx);
    setOpenFaq(null);
  };

  // Shared card class — translucent glass, readable on both themes
  const cardClass = `rounded-3xl border p-8 flex flex-col justify-between min-h-[260px] transition-all duration-500 hover:-translate-y-1 backdrop-blur-xl
    dark:bg-black/60 dark:border-white/10 dark:shadow-2xl dark:hover:border-white/20
    bg-white/70 border-white/60 shadow-lg hover:shadow-xl hover:border-white/80`;

  // Smooth Quadratic Ease-out Easing over 400px of scroll for an incredibly fluid, luxury transition!
  const rawPercent = Math.min(1, scrollY / 400);
  const expandPercent = rawPercent * (2 - rawPercent);
  const containerRadius = (1 - expandPercent) * 40; // shrinks from 40px to 0px
  const imgScale = 1.0; // Restored static 1.0 scale to guarantee 100% crop-free display with zero boundary clipping!

  // Dynamic Scroll Variables for Card/Button Undissolve (synchronized to start as expansion completes)
  const cardsScrollPercent = Math.min(1, Math.max(0, (scrollY - 150) / 250));

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-transparent relative">

      {/* Floating Controls Bar (top-right) — Theme Toggle + Language Selector */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        {/* Language Selector Pill */}
        <div className="flex items-center px-3 py-2 rounded-full backdrop-blur-md shadow-lg border transition-all duration-300
          dark:bg-black/60 dark:hover:bg-black/80 dark:border-white/10
          bg-white/80 hover:bg-white border-gray-200">
          <GoogleTranslate />
        </div>

        {/* Theme Toggle */}
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

      {/* 1. The Widescreen Title Banner with WebGL Red & Blue neon sweeps (Single Unified Classy Card) */}
      <div className="w-full max-w-6xl mx-auto px-6 mt-6 mb-10 relative overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-white/10 h-[260px] flex items-center justify-center shadow-[0_25px_60px_-15px_rgba(59,130,246,0.12),0_15px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl bg-white/12 dark:bg-black/25">
        {/* ColorBends rendering beautiful WebGL neon red/blue sweeps in background */}
        <div className="absolute inset-0 opacity-45 pointer-events-none z-0">
          <ColorBends
            colors={["#ef4444", "#3b82f6"]}
            speed={0.12}
            warpStrength={0.6}
            iterations={2}
            bandWidth={4.5}
          />
        </div>

        {/* Title Details floating directly inside the single unified glassmorphic canvas */}
        <div className="relative z-10 text-center space-y-3 max-w-4xl px-4 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm
            dark:border-white/10 dark:bg-white/5 dark:text-blue-300
            border-white/20 bg-white/10 text-gray-700">
            Bhashini AI • RBI Ombudsman 2021 • India AI Mission Aligned
          </div>

          {/* Centered Premium Logo */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg border dark:border-white/10 border-gray-200 mt-2 bg-white dark:bg-black/60 backdrop-blur-xl">
            <img src="/crest_logo.png" alt="CREST Logo" className="w-full h-full object-cover" />
          </div>

          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none drop-shadow-sm bg-clip-text text-transparent mt-2 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]" style={{ backgroundImage: "linear-gradient(to right, #0052ff, #4a22ff, #9b1aff, #e31837, #ff2200)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            CREST
          </h2>

          <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-gray-600/90 dark:text-slate-400 drop-shadow-sm mt-1 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]">
            Union Bank Citizen Grievance Hub & Redressal Matrix
          </p>

          {/* Laser-style glowing neon-gradient underline replacing static solid line */}
          <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[#e31837] to-transparent shadow-[0_0_10px_rgba(227,24,55,0.6)] mx-auto mt-3 rounded-full" />
        </div>
      </div>

      {/* 2. Anthropic-style Scroll-Expanding Showcase Banner (Aspect-locked 16:9 with zero height caps to guarantee 100% full-bleed, crop-free display!) */}
      <div className="w-full flex justify-center items-center my-12 bg-transparent relative z-20">
        <div
          className="w-full aspect-[16/9] bg-[#002261] dark:bg-black overflow-hidden relative flex justify-center items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-white/10"
          style={{
            width: `calc(100% - ${(1 - expandPercent) * 48}px)`,
            maxWidth: `calc(1152px + ${expandPercent} * (100vw - 1152px))`,
            borderRadius: `${containerRadius}px`,
          }}
        >
          <img
            src="/crest_public_hero.png"
            alt="CREST Platform System Preview"
            className="w-full h-full object-cover object-center transition-transform duration-300 ease-out"
            style={{
              transform: `scale(${imgScale})`,
            }}
          />
          {/* Ambient soft glow overlays */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/15 dark:from-[#0a0a0a]/20 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* 3. Main Content Section - UNDISSOLVES (fades, slides & unblurs) smoothly onto screen as we scroll! */}
      <main
        className="max-w-6xl mx-auto w-full px-4 py-16 flex-grow transition-all duration-700 ease-out"
        style={{
          opacity: cardsScrollPercent,
          transform: `translateY(${(1 - cardsScrollPercent) * 45}px)`,
          filter: `blur(${(1 - cardsScrollPercent) * 10}px)`,
        }}
      >

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Card 1: Lodge Complaint */}
          <div className={cardClass + " dark:hover:shadow-[0_0_30px_rgba(227,24,55,0.08)] dark:hover:border-white/20 hover:shadow-red-500/5 hover:border-gray-300"}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-2xl tracking-tight dark:text-white text-gray-900">Lodge a New Grievance</h3>
                <FileText className="w-8 h-8 dark:text-slate-400 text-gray-800" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold mb-2 dark:text-amber-400 text-[#e31837]">
                Available: 24/7 Digital Intake
              </p>
              <p className="text-sm leading-relaxed max-w-[90%] dark:text-slate-400 text-gray-600">
                File a digital dispute or report transaction discrepancies online. Generates an instant secure UUID Reference Token.
              </p>
            </div>
            <div className="mt-8">
              <Link href="/submit" className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 shadow-md border
                bg-black border-black text-white hover:bg-gray-800 hover:border-gray-800 hover:shadow-lg
                dark:bg-white dark:border-white dark:text-black dark:hover:bg-gray-200">
                Lodge Grievance
              </Link>
            </div>
          </div>

          {/* Card 2: Track Complaint */}
          <div className={cardClass + " dark:hover:shadow-[0_0_30px_rgba(0,85,255,0.08)] dark:hover:border-white/20 hover:shadow-blue-500/5 hover:border-gray-300"}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-2xl tracking-tight dark:text-white text-gray-900">Track Active Grievance</h3>
                <Search className="w-8 h-8 dark:text-slate-400 text-gray-800" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold mb-2 dark:text-amber-400 text-blue-700">
                Available: Real-Time Sync
              </p>
              <p className="text-sm leading-relaxed max-w-[90%] dark:text-slate-400 text-gray-600">
                Check dispute timeline, view resolution remarks, upload supplemental files, or appeal decision outputs.
              </p>
            </div>
            <div className="mt-8">
              <Link href="/track" className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 shadow-md border
                bg-black border-black text-white hover:bg-gray-800 hover:border-gray-800 hover:shadow-lg
                dark:bg-white dark:border-white dark:text-black dark:hover:bg-gray-200">
                Track Status
              </Link>
            </div>
          </div>

          {/* Card 3: Learning Corner */}
          <div className={cardClass + " dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] dark:hover:border-white/20 hover:shadow-emerald-500/5 hover:border-gray-300"}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-2xl tracking-tight dark:text-white text-gray-900">Safety & Learning Corner</h3>
                <BookOpen className="w-8 h-8 dark:text-slate-400 text-gray-800" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold mb-2 dark:text-amber-400 text-emerald-700">
                Resources: RBI Protected
              </p>
              <p className="text-sm leading-relaxed max-w-[90%] dark:text-slate-400 text-gray-600">
                Discover customer liability limits, fraud prevention checklists, and official regulatory rights.
              </p>
            </div>
            <div className="mt-8">
              <button
                onClick={() => setActiveSection(activeSection === "learning" ? "none" : "learning")}
                className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 shadow-md border
                  bg-black border-black text-white hover:bg-gray-800 hover:border-gray-800 hover:shadow-lg
                  dark:bg-white dark:border-white dark:text-black dark:hover:bg-gray-200"
              >
                {activeSection === "learning" ? "Close FAQs" : "View Resources"}
              </button>
            </div>
          </div>

          {/* Card 4: Contact Us */}
          <div className={cardClass + " dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] dark:hover:border-white/20 hover:shadow-emerald-500/5 hover:border-gray-300"}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-2xl tracking-tight dark:text-white text-gray-900">Contact Admin</h3>
                <PhoneCall className="w-8 h-8 dark:text-slate-400 text-gray-800" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold mb-2 dark:text-amber-400 text-emerald-700">
                Available: Direct Support
              </p>
              <p className="text-sm leading-relaxed max-w-[90%] dark:text-slate-400 text-gray-600">
                Connect directly with regional escalation units or access emergency cyber fraud response desks.
              </p>
            </div>
            <div className="mt-8">
              <button
                onClick={() => setActiveSection(activeSection === "contact" ? "none" : "contact")}
                className="inline-block px-6 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300 shadow-md border
                  bg-black border-black text-white hover:bg-gray-800 hover:border-gray-800 hover:shadow-lg
                  dark:bg-white dark:border-white dark:text-black dark:hover:bg-gray-200"
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
              {FAQ_CATEGORIES.map((cat, catIdx) => (
                <div key={catIdx} className="border rounded-2xl overflow-hidden transition-all duration-300 dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50/50">
                  <button
                    onClick={() => toggleCategory(catIdx)}
                    className="w-full flex items-center justify-between p-5 font-bold text-left text-lg
                      dark:text-white text-gray-900 bg-gray-50 dark:bg-white/5"
                  >
                    <span>{cat.category}</span>
                    {openCategory === catIdx ? <ChevronUp className="w-5 h-5 dark:text-slate-400 text-gray-500" /> : <ChevronDown className="w-5 h-5 dark:text-slate-400 text-gray-500" />}
                  </button>

                  {openCategory === catIdx && (
                    <div className="p-5 border-t dark:border-white/10 border-gray-200 space-y-3 bg-white dark:bg-black/20">
                      {cat.faqs.map((faq, faqIdx) => {
                        const faqId = `${catIdx}-${faqIdx}`;
                        return (
                          <div key={faqId} className="border rounded-xl overflow-hidden transition-all duration-300
                            dark:border-white/10 dark:hover:bg-white/5
                            border-gray-200 hover:bg-gray-50/50">
                            <button
                              onClick={() => toggleFaq(faqId)}
                              className="w-full flex items-center justify-between p-4 font-bold text-left text-sm
                                dark:text-slate-200 text-gray-800"
                            >
                              <span>{faq.q}</span>
                              {openFaq === faqId ? <ChevronUp className="w-4 h-4 dark:text-slate-500 text-gray-400" /> : <ChevronDown className="w-4 h-4 dark:text-slate-500 text-gray-400" />}
                            </button>
                            {openFaq === faqId && (
                              <div className="px-4 pb-4 pt-1 text-sm leading-relaxed border-t
                                dark:border-white/10 dark:text-slate-300 dark:bg-transparent
                                border-gray-100 text-gray-600 bg-transparent">
                                {faq.a}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


        {activeSection === "contact" && (
          <div className="backdrop-blur-xl rounded-[2rem] border shadow-2xl animate-fade-in-up mb-12 p-8 md:p-12
            dark:bg-black/60 dark:border-white/10
            bg-white/70 border-white/60">
            <div className="flex items-center gap-3 mb-8 border-b pb-5
              dark:border-white/10 border-gray-200">
              <PhoneCall className="w-7 h-7 dark:text-amber-300 text-black" />
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight dark:text-white text-gray-900">Escalation Directories</h2>
                <p className="text-xs font-bold uppercase tracking-wider mt-1 dark:text-slate-400 text-gray-500">Contact active regional support units directly</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {/*Card 1 */}
              <div className="p-8 rounded-[1.5rem] border flex flex-col justify-between min-h-[300px] relative transition-all duration-300 hover:shadow-md
                dark:bg-white/5 dark:border-white/10
                bg-[#f4f4f4] border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-xl tracking-tight dark:text-white text-gray-900">Cyber Fraud Helpline</h3>
                    <p className="text-xs font-semibold dark:text-red-400 text-red-600">Available: 24/7 Hotline Support</p>
                  </div>
                  <ShieldAlert className="w-6 h-6 dark:text-slate-400 text-gray-800" strokeWidth={1.5} />
                </div>
                <p className="text-xs leading-relaxed dark:text-slate-400 text-gray-600 my-4">
                  Call immediately to freeze debit cards, suspend mobile banking access, or report unauthorized electronic transaction discrepancies.
                </p>
                <div className="flex flex-col gap-2 mt-4">
                  <a href="tel:7905438724" className="w-full text-center py-2.5 rounded-full font-extrabold text-xs tracking-wider transition-all duration-300 shadow-sm border
                    bg-black border-black text-white hover:bg-gray-800 hover:border-gray-800
                    dark:bg-white dark:border-white dark:text-black dark:hover:bg-gray-200">
                    Call Hotline (7905438724)
                  </a>
                  <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="w-full text-center py-2.5 rounded-full font-extrabold text-xs tracking-wider transition-all duration-300 shadow-sm border
                    bg-white border-gray-300 text-black hover:bg-gray-100
                    dark:bg-white/10 dark:border-white/10 dark:text-white dark:hover:bg-white/20">
                    Report Cyber Crime
                  </a>
                </div>
              </div>

              {/*Card 2 */}
              <div className="p-8 rounded-[1.5rem] border flex flex-col justify-between min-h-[300px] relative transition-all duration-300 hover:shadow-md
                dark:bg-white/5 dark:border-white/10
                bg-[#f4f4f4] border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-xl tracking-tight dark:text-white text-gray-900">Admin: Ayushi not aayush</h3>
                    <p className="text-xs font-semibold dark:text-blue-400 text-blue-700">Response: Within 48 Hours</p>
                  </div>
                  <Lock className="w-6 h-6 dark:text-slate-400 text-gray-800" strokeWidth={1.5} />
                </div>
                <p className="text-xs leading-relaxed dark:text-slate-400 text-gray-600 my-4">
                  Escalate unresolved support tickets directly to the central grievance redressal committee or regional ombudsman officers.
                </p>
                <div className="flex flex-col gap-2 mt-4">
                  <a href="mailto:pno@unionbankofindia.bank" className="w-full text-center py-2.5 rounded-full font-extrabold text-xs tracking-wider transition-all duration-300 shadow-sm border
                    bg-black border-black text-white hover:bg-gray-800 hover:border-gray-800
                    dark:bg-white dark:border-white dark:text-black dark:hover:bg-gray-200">
                    Email Central PNO
                  </a>
                  <Link href="/ub_CREST/docs" className="w-full text-center py-2.5 rounded-full font-extrabold text-xs tracking-wider transition-all duration-300 shadow-sm border
                    bg-white border-gray-300 text-black hover:bg-gray-100
                    dark:bg-white/10 dark:border-white/10 dark:text-white dark:hover:bg-white/20">
                    View Escalation Matrix
                  </Link>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-8 rounded-[1.5rem] border flex flex-col justify-between min-h-[300px] relative transition-all duration-300 hover:shadow-md
                dark:bg-white/5 dark:border-white/10
                bg-[#f4f4f4] border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-xl tracking-tight dark:text-white text-gray-900">GAC Committee</h3>
                    <p className="text-xs font-semibold dark:text-indigo-400 text-indigo-700">Available: Secondary Appeals</p>
                  </div>
                  <Clock className="w-6 h-6 dark:text-slate-400 text-gray-800" strokeWidth={1.5} />
                </div>
                <p className="text-xs leading-relaxed dark:text-slate-400 text-gray-600 my-4">
                  Official government grievance appellate committee for direct appeals if you are unsatisfied with internal bank decisions.
                </p>
                <div className="flex flex-col gap-2 mt-4">
                  <a href="https://gac.gov.in/" target="_blank" rel="noopener noreferrer" className="w-full text-center py-2.5 rounded-full font-extrabold text-xs tracking-wider transition-all duration-300 shadow-sm border
                    bg-black border-black text-white hover:bg-gray-800 hover:border-gray-800
                    dark:bg-white dark:border-white dark:text-black dark:hover:bg-gray-200">
                    Visit GAC Portal
                  </a>
                  <a href="https://gac.gov.in/" target="_blank" rel="noopener noreferrer" className="w-full text-center py-2.5 rounded-full font-extrabold text-xs tracking-wider transition-all duration-300 shadow-sm border
                    bg-white border-gray-300 text-black hover:bg-gray-100
                    dark:bg-white/10 dark:border-white/10 dark:text-white dark:hover:bg-white/20">
                    Appeal Guidelines
                  </a>
                </div>
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

      {/* Floating Chatbot Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end group">
        {/* Expanded Chat Box */}
        {chatOpen && (
          <div className="w-80 md:w-96 h-[460px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden mb-4 animate-in fade-in slide-in-from-bottom-5 duration-300 backdrop-blur-2xl
            dark:bg-black/90 dark:border-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]
            bg-white/95 border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
            
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-[#0052ff] via-[#9b1aff] to-[#ff2200] text-white rounded-t-3xl dark:border-white/10 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center relative border border-white/20 shadow-sm">
                  <img src="/cresty.png" alt="Cresty Avatar" className="w-full h-full object-contain scale-[1.3]" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
                </div>
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider leading-none text-white/95">Cresty</h3>
                  <span className="text-[10px] text-white/80 font-medium">RBI Assistant Bot</span>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin dark:bg-black/30">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed font-medium shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'dark:bg-white/5 dark:text-slate-300 dark:border-white/5 bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200/50'
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none px-4 py-3 dark:bg-white/5 bg-gray-100 text-gray-400 text-xs border dark:border-white/5 border-gray-200/50 flex items-center gap-1.5 font-bold uppercase tracking-widest text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-150"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-300"></span>
                    Cresty typing...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t dark:border-white/10 dark:bg-black/40 bg-gray-50 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask Cresty about bank policies, refunds..."
                className="flex-1 bg-white dark:bg-black border dark:border-white/10 border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors flex items-center justify-center"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tooltip Alert Bubble */}
        {!chatOpen && alertVisible && (
          <div className="mb-1 mr-1 bg-white/95 dark:bg-slate-900/95 border dark:border-white/10 border-gray-200/80 px-4 py-3 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.1)] flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-300 relative max-w-[280px] group/alert border-b-2 border-r-2 border-b-indigo-500/20 border-r-indigo-500/20">
            {/* Pulsing indicator */}
            <span className="flex h-2.5 w-2.5 shrink-0 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2200] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff2200]"></span>
            </span>
            <div className="text-left select-none">
              <p className="text-[9px] font-black uppercase tracking-widest text-black dark:text-white opacity-60 leading-none mb-0.5">Assistant</p>
              <p className="text-xs font-black bg-gradient-to-r from-[#0052ff] via-[#9b1aff] to-[#ff2200] bg-clip-text text-transparent leading-tight">
                Chat with Cresty
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setAlertVisible(false);
              }}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              title="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {/* Arrow pointing down at the button */}
            <div className="absolute right-5 -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-900 border-r border-b dark:border-white/10 border-gray-200 rotate-45"></div>
          </div>
        )}

        {/* Custom CSS Hover Tooltip (rendered only after alert is dismissed) */}
        {!chatOpen && !alertVisible && (
          <div className="absolute right-0 bottom-16 bg-white dark:bg-slate-900/95 px-3.5 py-2 rounded-xl shadow-lg border border-gray-200 dark:border-white/10 text-[11px] font-extrabold whitespace-nowrap opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50 select-none">
            <span className="bg-gradient-to-r from-[#0052ff] via-[#9b1aff] to-[#ff2200] bg-clip-text text-transparent font-black">
              Chat with Cresty
            </span>
            {/* Tiny arrow pointing down */}
            <div className="absolute right-6 -bottom-1 w-2 h-2 bg-white dark:bg-slate-900 border-r border-b border-gray-200 dark:border-white/10 rotate-45"></div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-[#0052ff] via-[#9b1aff] to-[#ff2200] shadow-[0_4px_25px_rgba(79,70,229,0.35)] hover:shadow-[0_8px_30px_rgba(79,70,229,0.5)] hover:scale-110 active:scale-95 text-white flex items-center justify-center transition-all duration-300 relative overflow-hidden border border-white/10"
        >
          {chatOpen ? (
            <X className="w-6 h-6 animate-in spin-in duration-200" />
          ) : (
            <div className="w-full h-full p-1.5 flex items-center justify-center bg-white">
              <img src="/cresty.png" alt="Cresty logo" className="w-full h-full object-contain scale-[1.2] group-hover:scale-[1.3] transition-transform duration-300" />
            </div>
          )}
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ff2200] border-2 border-white rounded-full flex items-center justify-center text-[7px] text-white font-black animate-bounce shadow-sm">1</span>
        </button>
      </div>

    </div>
  );
}
