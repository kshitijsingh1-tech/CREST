"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, ShieldCheck, Zap, Users, Globe, Mail, MessageSquare, BarChart3, ChevronRight, CheckCircle2, AlertTriangle, Clock, Star } from "lucide-react";
import Cookies from "js-cookie";

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-3xl border p-8 transition-all duration-500
      dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
      bg-white/70 backdrop-blur-xl border-white/60 shadow-xl">
      <h2 className="text-base font-black uppercase tracking-widest mb-1 dark:text-white text-gray-900">{title}</h2>
      {subtitle && <p className="text-[10px] uppercase tracking-widest font-bold mb-6 dark:text-blue-400 text-blue-600">{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}
      {children}
    </section>
  );
}

function Card({ icon: Icon, color, title, body }: { icon: any; color: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1
      dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/10 dark:hover:border-white/20
      bg-white/60 backdrop-blur-md border-white/50 hover:border-white/80 hover:shadow-md">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-black uppercase tracking-wide mb-2 dark:text-white text-gray-900">{title}</h3>
      <p className="text-xs leading-relaxed dark:text-slate-400 text-gray-500">{body}</p>
    </div>
  );
}

function RoleRow({ badge, role, who, can }: { badge: string; role: string; who: string; can: string[] }) {
  return (
    <div className="rounded-2xl border p-5 dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl border-white/50 bg-white/60 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <code className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300 bg-blue-50 border-blue-200 text-blue-700">{badge}</code>
        <span className="text-sm font-black dark:text-white text-gray-900">{role}</span>
        <span className="text-[10px] dark:text-slate-500 text-gray-400 ml-auto">{who}</span>
      </div>
      <ul className="space-y-1.5">
        {can.map(c => (
          <li key={c} className="flex items-start gap-2 text-xs dark:text-slate-400 text-gray-600">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />{c}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DocsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!Cookies.get("crest_token"));
  }, []);

  return (
    <div className="flex-1 bg-transparent p-6 md:p-10 max-w-[90rem] mx-auto w-full animate-fade-in-up">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase dark:text-white text-gray-900">Platform Guide</h1>
          <p className="text-xs uppercase tracking-widest mt-2 font-bold dark:text-blue-400 text-blue-600">
            CREST · Complaint Resolution & Escalation Smart Technology
          </p>
        </div>
        <Link 
          href={isAuthenticated ? "/ub_CREST/home" : "/crest_publicPortal"} 
          className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-500 border shadow-sm
            dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10
            bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200"
        >
          {isAuthenticated ? "← Back to Home" : "← Back to Portal"}
        </Link>
      </div>

      {/* TOC */}
      <div className="rounded-3xl border p-6 mb-8 transition-all duration-500
        dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10
        bg-white/70 backdrop-blur-xl border-white/60">
        <p className="text-[10px] font-black uppercase tracking-widest dark:text-slate-400 text-gray-500 mb-4 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" /> On This Page
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ["#problem", "The Problem"],
            ["#solution", "How CREST Solves It"],
            ["#channels", "Complaint Channels"],
            ["#journey", "Complaint Journey"],
            ["#roles", "Who Uses CREST"],
            ["#public", "Public Portal"],
            ["#security", "Security & Compliance"],
            ["#compliance", "AI Governance & Mandates"],
            ["#team", "Built By"],
          ].map(([href, label]) => (
            <a key={href} href={href as string} className="text-xs font-bold flex items-center gap-1.5 dark:text-blue-300 dark:hover:text-white text-blue-700 hover:text-black transition-colors">
              <ChevronRight className="w-3 h-3" />{label}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-8">

        {/* The Problem */}
        <Section id="problem" title="The Problem We're Solving" subtitle="Why CREST exists">
          <p className="text-sm dark:text-slate-300 text-gray-700 leading-relaxed mb-6">
            Union Bank of India serves <strong className="dark:text-white text-gray-900">millions of customers</strong> across every region of India. When something goes wrong — an ATM fails, a KYC application stalls, a loan query gets lost — customers expect fast, transparent, and consistent resolution. Traditional grievance systems fall short in three critical ways:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: MessageSquare,
                color: "dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 bg-red-50 border-red-200 text-red-600",
                title: "The Duplicate Storm",
                body: "The same complaint arrives via Email, WhatsApp, and the app simultaneously. Agents spend up to 30% of their time handling the exact same issue multiple times — wasted effort, frustrated customers.",
              },
              {
                icon: Clock,
                color: "dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 bg-amber-50 border-amber-200 text-amber-600",
                title: "Static, Unfair Queues",
                body: "Standard systems use FIFO — first in, first out. A low-urgency query from 9 AM blocks a P0 account-freeze emergency from 9:30 AM. High-emotion, time-sensitive cases decay unnoticed.",
              },
              {
                icon: AlertTriangle,
                color: "dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400 bg-purple-50 border-purple-200 text-purple-600",
                title: "Inconsistent Responses",
                body: "Every officer drafts replies manually, leading to varying tone, missing compliance clauses, and quality risks. No two responses are the same even for identical issues.",
              },
            ].map(p => <Card key={p.title} {...p} />)}
          </div>
        </Section>

        {/* How CREST Solves It */}
        <Section id="solution" title="How CREST Solves It" subtitle="Three core innovations">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Zap,
                color: "dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 bg-blue-50 border-blue-200 text-blue-600",
                title: "Complaint DNA Fingerprinting",
                body: "Every complaint is converted into a unique 768-dimensional AI fingerprint. When a new complaint arrives, CREST instantly checks if a near-identical one already exists — automatically flagging duplicates and linking them. Agents never handle the same case twice.",
              },
              {
                icon: BarChart3,
                color: "dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 bg-emerald-50 border-emerald-200 text-emerald-600",
                title: "Emotion-Decay Priority Queue",
                body: "CREST scores every complaint using anger intensity, severity, and how long the customer has been waiting. The longer a high-urgency case waits, the more its priority multiplies. P0 emergencies always rise to the top automatically — no manual triage needed.",
              },
              {
                icon: Star,
                color: "dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 bg-amber-50 border-amber-200 text-amber-600",
                title: "AI-Grounded Auto Drafts",
                body: "Before an officer even opens a complaint, CREST has already generated a compliant draft reply — grounded strictly in the Union Bank Service Manual. Officers review, edit if needed, and approve. Response quality is always consistent and RBI-aligned.",
              },
            ].map(p => <Card key={p.title} {...p} />)}
          </div>
          <div className="mt-6 rounded-2xl border p-5 dark:bg-blue-500/5 dark:border-blue-500/20 bg-blue-50 border-blue-200">
            <p className="text-xs font-bold dark:text-blue-300 text-blue-700 leading-relaxed">
              🌐 <strong>Multilingual by Default</strong> — Powered by the MeitY Digital India Bhashini gateway, CREST automatically detects regional Indian languages (Hindi, Tamil, Bengali, Telugu, and more). Complaints are translated for AI processing and replies are sent back in the customer's own language — no manual effort required.
            </p>
          </div>
        </Section>

        {/* Channels */}
        <Section id="channels" title="How Complaints Reach CREST" subtitle="Omnichannel ingestion">
          <p className="text-sm dark:text-slate-400 text-gray-600 mb-6">Customers don't need to know anything about CREST. They simply use the channel they're most comfortable with — CREST listens everywhere.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ["📧", "Email", "Send a grievance to the bank's dedicated email address. CREST reads, classifies, and queues it within seconds."],
              ["💬", "SMS", "Text a short message to the bank's SMS helpline. Works even on basic phones with no internet."],
              ["🐦", "Twitter / X", "Mention or DM the bank's handle. Social complaints are captured instantly."],
              ["🌐", "Web Portal", "Fill out the online complaint form at the public portal. No account needed — just your contact details."],
            ].map(([emoji, ch, desc]) => (
              <div key={ch as string} className="rounded-2xl border p-4 dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/10 bg-white/60 backdrop-blur-md border-white/50">
                <p className="text-2xl mb-2">{emoji}</p>
                <p className="text-xs font-black uppercase tracking-widest mb-1 dark:text-white text-gray-900">{ch}</p>
                <p className="text-[11px] leading-relaxed dark:text-slate-400 text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Journey */}
        <Section id="journey" title="What Happens to Your Complaint" subtitle="Step-by-step lifecycle">
          <ol className="space-y-4">
            {[
              ["Received", "Your complaint arrives via any channel and enters CREST within seconds."],
              ["Understood", "AI reads the complaint, identifies the category (e.g. ATM / Loan / KYC), detects the language, extracts key entities like account numbers, and scores urgency and emotion."],
              ["Deduplicated", "CREST checks if the same issue was already reported. If it's a duplicate, it's linked — so the original gets resolved faster and you're not left in a separate queue."],
              ["Prioritised", "Your complaint is placed in a live queue ranked by urgency, anger score, and waiting time. Critical issues always surface to the top."],
              ["Assigned", "The least-busy available officer in your regional branch is automatically assigned to your case."],
              ["Draft Generated", "An AI draft response is prepared from the bank's official service manual — consistent, compliant, and ready for the officer."],
              ["Reviewed & Resolved", "The officer reviews, personalises if needed, and sends the approved response. The case is marked resolved and logged in an immutable audit trail."],
              ["Tracked", "At any point, you can track your complaint status using the reference ID and OTP verification on the public portal."],
            ].map(([step, desc], i) => (
              <li key={step as string} className="flex items-start gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full border text-[10px] font-black flex items-center justify-center
                  dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400
                  bg-blue-50 border-blue-200 text-blue-700">{i + 1}</span>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-0.5 dark:text-white text-gray-900">{step}</p>
                  <p className="text-xs leading-relaxed dark:text-slate-400 text-gray-600">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Roles */}
        <Section id="roles" title="Who Uses CREST" subtitle="Role-based access hierarchy">
          <p className="text-sm dark:text-slate-400 text-gray-600 mb-6">CREST is a staff-facing platform with strict role-based access. Every officer sees only what they're authorised to see.</p>
          <div className="space-y-4">
            <RoleRow
              badge="SUPER_ADMIN"
              role="Super Administrator"
              who="National HQ"
              can={[
                "Global visibility across all regions and branches",
                "Create, manage, and suspend Sub-Admins and Officers",
                "Take over any unresolved complaint anywhere in the country",
                "Access full analytics and predictive spike signals",
              ]}
            />
            <RoleRow
              badge="SUB_ADMIN"
              role="Regional Sub-Administrator"
              who="State / Regional office"
              can={[
                "Manages complaints and officers within their assigned region only",
                "Can create and supervise Regional Officers in their area",
                "Can claim and takeover any unresolved complaint in their region",
                "Regional analytics scoped to their jurisdiction",
              ]}
            />
            <RoleRow
              badge="EMPLOYEE"
              role="Regional Officer"
              who="Branch level"
              can={[
                "Sees only their personally assigned queue — no overload or distraction",
                "New complaints are automatically distributed based on workload",
                "Reviews, edits, and approves AI-generated draft replies",
                "Can escalate complex cases upward to their Sub-Admin at any time",
              ]}
            />
          </div>
        </Section>

        {/* Public Portal */}
        <Section id="public" title="For Customers — The Public Portal" subtitle="No login required">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Globe,
                color: "dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 bg-emerald-50 border-emerald-200 text-emerald-600",
                title: "Lodge a Complaint",
                body: "Visit the public portal and fill in your name, contact, and a description of your issue. No account or login needed. You'll receive a reference ID immediately.",
              },
              {
                icon: ShieldCheck,
                color: "dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 bg-blue-50 border-blue-200 text-blue-600",
                title: "Track Your Status",
                body: "Use your reference ID and an OTP sent to your registered contact to check the live status of your complaint — at any time, from any device.",
              },
              {
                icon: BookOpen,
                color: "dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400 bg-purple-50 border-purple-200 text-purple-600",
                title: "Knowledge Corner",
                body: "Browse a searchable FAQ covering your consumer rights, fraud prevention guidelines, and how to escalate if your complaint isn't resolved to your satisfaction.",
              },
            ].map(p => <Card key={p.title} {...p} />)}
          </div>
          <div className="mt-6">
            <Link href="/ub_publicPortal" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300
              dark:bg-emerald-500/10 dark:border dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/20
              bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
              Open Public Portal →
            </Link>
          </div>
        </Section>

        {/* Security */}
        <Section id="security" title="Security & RBI Compliance" subtitle="Built to banking standards">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {([
              { icon: ShieldCheck, label: "Role-Based Access Control",   body: "Every officer sees only what they are authorised to see. Access is gated at every level — regional, functional, and data." },
              { icon: BookOpen,    label: "Immutable Audit Trail",        body: "Every action — assignment, escalation, draft approval, resolution — is permanently logged. Fully RBI-compliant and exportable." },
              { icon: Users,       label: "PII Redaction",                body: "Account numbers and phone numbers are automatically masked before any AI processing — your sensitive data never reaches an external model." },
              { icon: Clock,       label: "SLA Monitoring",               body: "Every complaint has a service-level deadline. CREST tracks, warns, and escalates cases approaching or breaching their SLA automatically." },
              { icon: Globe,       label: "Dual-Factor Public Tracking",  body: "Public complaint tracking uses a visual CAPTCHA combined with OTP verification — preventing unauthorised status access." },
              { icon: BarChart3,   label: "Predictive Spike Signals",     body: "AI monitors complaint volume patterns and alerts administrators before a surge becomes a crisis — proactive, not reactive." },
            ] as const).map(({ icon: Icon, label, body }) => (
              <div key={label} className="flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300
                dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/10 dark:hover:border-white/20
                bg-white/60 backdrop-blur-md border-white/50 hover:border-white/80 hover:shadow-sm">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border
                  dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400
                  bg-blue-50 border-blue-200 text-blue-600">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-1 dark:text-white text-gray-900">{label}</p>
                  <p className="text-[11px] leading-relaxed dark:text-slate-400 text-gray-500">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Compliance Mandates */}
        <Section id="compliance" title="Regulatory Mandates & AI Governance" subtitle="What they dictate & their technical integration in CREST">
          <div className="space-y-6">
            <p className="text-sm dark:text-slate-300 text-gray-700 leading-relaxed">
              CREST is architected from the ground up to align with the core regulatory frameworks set by the Government of India and the Reserve Bank of India. Here is exactly what these frameworks mandate, and how CREST technically implements them:
            </p>
            
            <div className="grid grid-cols-1 gap-6">
              {[
                {
                  badge: "Bhashini AI",
                  framework: "National Language Translation Mission (NLTM)",
                  what: "Mandates that public services and citizen redressal portals must be accessible to all Indians in their preferred native regional language.",
                  how: "Automatically integrates with the Bhashini API to detect regional languages (e.g. Hindi, Tamil, Telugu) from inbound channels, translating them into English for standardized vector semantic analysis, and translating the approved draft replies back into the customer's native language."
                },
                {
                  badge: "India AI Mission",
                  framework: "Sovereign & Ethical AI Deployment",
                  what: "Dictates the secure, unbiased, and responsible deployment of artificial intelligence inside critical national infrastructure (such as banking and financial systems).",
                  how: "Uses local SBERT semantic sentence embeddings, fine-tuned classification nodes, and strictly sandboxed LLM prompts to prevent hallucination, eliminate decision bias, and ensure absolute model reproducibility."
                },
                {
                  badge: "RBI Integrated Ombudsman Scheme 2021",
                  framework: "Integrated Consumer Redressal Mandate",
                  what: "Requires all commercial banks to maintain clear grievance redressal structures, cap resolution times under 30 days, implement clear escalation routes, and protect users with Zero-Liability rules.",
                  how: "Powers our dynamic Emotion-Decay Priority Queue. P0 fraud reports trigger automatic SMS alerts, and unresolved branch complaints automatically escalate to regional Sub-Admins and HQ Nodal Officers prior to SLA breach."
                },
                {
                  badge: "DPDP Act 2023",
                  framework: "Digital Personal Data Protection",
                  what: "Enforces strict customer data privacy, informed consent, immutable data trails, and the complete masking/protection of Personally Identifiable Information (PII).",
                  how: "Pre-processes incoming text to redact and mask sensitive elements (such as debit card numbers, account numbers, and personal IDs) before dispatching any data to API gateways. Access to unmasked records is gated strictly by active JWT clearances."
                },
                {
                  badge: "MeitY Aligned",
                  framework: "IT Security & Certified Data Hosting Standards",
                  what: "Specifies certified secure local database hosting, standardized web accessibility, active cyber threat tracking, and data encryption standards.",
                  how: "Hosts all complaint databases locally in India with encrypted schema storage, implements secure two-factor public status tracking (CAPTCHA + SMS OTP), and records every staff action in an immutable audit trail."
                }
              ].map(({ badge, framework, what, how }) => (
                <div key={badge} className="rounded-2xl border p-6 transition-all duration-300
                  dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/10 dark:hover:border-blue-500/20
                  bg-white/60 backdrop-blur-md border-white/50 hover:shadow-md hover:border-gray-300">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300 bg-blue-50 border-blue-200 text-blue-700">
                      {badge}
                    </span>
                    <span className="text-xs font-black dark:text-slate-400 text-gray-500 uppercase tracking-wider">
                      {framework}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-500 dark:text-red-400 mb-1">What It Dictates</p>
                      <p className="text-xs leading-relaxed dark:text-slate-300 text-gray-700 font-semibold">{what}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mb-1">Technical Implementation in CREST</p>
                      <p className="text-xs leading-relaxed dark:text-slate-400 text-gray-600">{how}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Team */}
        <Section id="team" title="Built By Team Gen Forge" subtitle="Union Bank iDEA 2.0 · Phase 2 · PS5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ["Kshitij Singh", "Lead Backend & AI"],
              ["Aayush Jaiswal", "Frontend & UI/UX"],
              ["Laxya Gaba", "AI Logic"],
              ["Saanvi Aggarwal", "Database, Deployment & Audit"],
            ].map(([name, role]) => (
              <div key={name} className="rounded-2xl border p-4 text-center dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/10 bg-white/60 backdrop-blur-md border-white/50">
                <div className="w-10 h-10 rounded-full dark:bg-blue-500/20 bg-blue-100 flex items-center justify-center mx-auto mb-3 text-base font-black dark:text-blue-300 text-blue-700">
                  {(name as string)[0]}
                </div>
                <p className="text-xs font-black dark:text-white text-gray-900 mb-0.5">{name}</p>
                <p className="text-[10px] dark:text-slate-500 text-gray-400">{role}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer note */}
        <div className="rounded-2xl border p-5 text-center dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl bg-white/60 backdrop-blur-md border-white/50">
          <p className="text-xs font-bold dark:text-slate-500 text-gray-400">
            CREST · Complaint Resolution & Escalation Smart Technology · Union Bank of India · iDEA 2.0 Hackathon · Team Gen Forge
          </p>
        </div>

      </div>
    </div>
  );
}
