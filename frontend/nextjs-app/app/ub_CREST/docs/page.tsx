import Link from "next/link";
import { BookOpen, Zap, Shield, Users, Mail, MessageSquare, BarChart3, Key, ChevronRight, Terminal, Globe, Lock } from "lucide-react";

function Section({ id, icon: Icon, color, title, children }: { id: string; icon: any; color: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-3xl border p-8 transition-all duration-500 dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl bg-white border-gray-200 shadow-xl">
      <h2 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-3 ${color}`}>
        <Icon className="w-4 h-4" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Endpoint({ method, path, desc, auth, body, response }: { method: string; path: string; desc: string; auth?: string; body?: string; response?: string }) {
  const mc: Record<string, string> = {
    GET:   "dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 bg-blue-50 text-blue-700 border-blue-200",
    POST:  "dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 bg-emerald-50 text-emerald-700 border-emerald-200",
    PATCH: "dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 bg-amber-50 text-amber-700 border-amber-200",
    DELETE:"dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30 bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className="border rounded-2xl overflow-hidden dark:border-white/10 border-gray-200 mb-4">
      <div className="flex flex-wrap items-center gap-3 p-4 dark:bg-slate-900/50 bg-gray-50 border-b dark:border-white/10 border-gray-200">
        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${mc[method] ?? mc.GET}`}>{method}</span>
        <code className="text-sm font-mono font-bold dark:text-white text-black">{path}</code>
        {auth && <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 bg-gray-100 border-gray-200 text-gray-500 flex items-center gap-1"><Lock className="w-3 h-3"/>{auth}</span>}
      </div>
      <div className="p-4 space-y-3">
        <p className="text-xs font-medium dark:text-slate-400 text-gray-600">{desc}</p>
        {body && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest dark:text-slate-500 text-gray-400 mb-1">Request Body</p>
            <pre className="text-xs rounded-xl p-3 dark:bg-slate-900 bg-gray-50 border dark:border-slate-800 border-gray-200 overflow-x-auto dark:text-emerald-300 text-emerald-700">{body}</pre>
          </div>
        )}
        {response && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest dark:text-slate-500 text-gray-400 mb-1">Response</p>
            <pre className="text-xs rounded-xl p-3 dark:bg-slate-900 bg-gray-50 border dark:border-slate-800 border-gray-200 overflow-x-auto dark:text-blue-300 text-blue-700">{response}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleCard({ role, badge, color, perms }: { role: string; badge: string; color: string; perms: string[] }) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4" />
        <span className="text-xs font-black uppercase tracking-widest">{role}</span>
        <code className="ml-auto text-[9px] font-mono font-bold px-2 py-0.5 rounded border dark:bg-black/40 bg-white/60">{badge}</code>
      </div>
      <ul className="space-y-1.5">
        {perms.map(p => (
          <li key={p} className="flex items-start gap-2 text-[11px] font-medium opacity-80">
            <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />{p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="flex-1 bg-transparent p-6 md:p-10 max-w-[90rem] mx-auto w-full animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase dark:text-white text-black">Platform Docs</h1>
          <p className="text-xs uppercase tracking-widest mt-2 font-bold dark:text-blue-300 text-gray-600">CREST · Complaint Resolution & Escalation Smart Technology</p>
        </div>
        <Link href="/ub_CREST/home" className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-500 border shadow-sm dark:bg-blue-900/30 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-900/50 bg-gray-100 border-gray-300 text-black hover:bg-gray-200">
          ← Command Center
        </Link>
      </div>

      {/* TOC */}
      <div className="rounded-3xl border p-6 mb-8 dark:bg-slate-900/60 dark:border-white/10 bg-gray-50 border-gray-200">
        <p className="text-[10px] font-black uppercase tracking-widest dark:text-slate-400 text-gray-500 mb-4 flex items-center gap-2"><BookOpen className="w-3.5 h-3.5"/>Table of Contents</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ["#overview","Platform Overview"],["#quickstart","Quick Start"],["#roles","User Hierarchy"],
            ["#channels","Ingest Channels"],["#complaints","Complaints API"],["#analytics","Analytics API"],
            ["#admin","Admin API"],["#auth","Authentication"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="text-xs font-bold flex items-center gap-1.5 dark:text-blue-300 dark:hover:text-white text-blue-700 hover:text-black transition-colors">
              <ChevronRight className="w-3 h-3"/>{label}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-8">

        {/* Overview */}
        <Section id="overview" icon={Zap} color="dark:text-blue-400 text-blue-600" title="Platform Overview">
          <p className="text-sm dark:text-slate-400 text-gray-600 leading-relaxed mb-4">
            CREST is India's first RBI-aligned, Gen-AI powered grievance intelligence platform for Union Bank of India. It ingests complaints from <strong className="dark:text-white text-black">Email, SMS, Twitter, and Web</strong>, then runs a full AI pipeline: NER extraction → sentiment classification → 768-dim SBERT vectorization → semantic deduplication → Emotion-Decay priority scoring → RAG-grounded auto-draft generation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ["Complaint DNA", "Complaints converted to 768-dim vectors. Cosine similarity > 0.92 flags duplicates via pgvector instantly."],
              ["Emotion-Decay Queue", "priority = severity × anger × MIN(3.0, 1 + LN(1 + hours_waiting/8)) — P0 cases rise to the top automatically."],
              ["RAG Auto-Draft", "Grounded responses generated strictly from the Union Bank Service Manual PDF knowledge base."],
            ].map(([t, d]) => (
              <div key={t as string} className="rounded-2xl p-4 border dark:bg-slate-900/40 dark:border-slate-800 bg-gray-50 border-gray-200">
                <p className="text-[10px] font-black uppercase tracking-widest dark:text-blue-400 text-blue-600 mb-2">{t}</p>
                <p className="text-xs dark:text-slate-400 text-gray-600">{d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Quick Start */}
        <Section id="quickstart" icon={Terminal} color="dark:text-emerald-400 text-emerald-600" title="Quick Start">
          <div className="space-y-4">
            <p className="text-xs font-bold dark:text-slate-400 text-gray-500 uppercase tracking-widest">1 — Start the Backend</p>
            <pre className="rounded-xl p-4 text-xs dark:bg-slate-900 bg-gray-900 text-emerald-400 overflow-x-auto border dark:border-slate-800 border-gray-700">
{`# From project root
uvicorn backend.main:socket_app --port 8000 --reload

# Swagger UI available at:
http://localhost:8000/docs`}
            </pre>
            <p className="text-xs font-bold dark:text-slate-400 text-gray-500 uppercase tracking-widest">2 — Start the Frontend</p>
            <pre className="rounded-xl p-4 text-xs dark:bg-slate-900 bg-gray-900 text-blue-400 overflow-x-auto border dark:border-slate-800 border-gray-700">
{`cd frontend/nextjs-app
npm run dev
# App runs at http://localhost:3000`}
            </pre>
            <p className="text-xs font-bold dark:text-slate-400 text-gray-500 uppercase tracking-widest">3 — Seed Demo Data</p>
            <pre className="rounded-xl p-4 text-xs dark:bg-slate-900 bg-gray-900 text-amber-400 overflow-x-auto border dark:border-slate-800 border-gray-700">
{`python -m backend.utils.reset_db
# Seeds 50+ realistic grievances with pre-calculated sentiment metrics`}
            </pre>
            <p className="text-xs font-bold dark:text-slate-400 text-gray-500 uppercase tracking-widest">4 — Default Login</p>
            <div className="rounded-xl p-4 border dark:bg-slate-900/40 dark:border-slate-800 bg-gray-50 border-gray-200 font-mono text-xs space-y-1">
              <p><span className="dark:text-slate-500 text-gray-400">Email: </span><span className="dark:text-white text-black">admin@unionbank.com</span></p>
              <p><span className="dark:text-slate-500 text-gray-400">Password: </span><span className="dark:text-white text-black">admin123</span></p>
              <p><span className="dark:text-slate-500 text-gray-400">Role: </span><span className="dark:text-purple-400 text-purple-600">SUPER_ADMIN</span></p>
            </div>
          </div>
        </Section>

        {/* Roles */}
        <Section id="roles" icon={Shield} color="dark:text-purple-400 text-purple-600" title="User Hierarchy & RBAC">
          <p className="text-xs dark:text-slate-400 text-gray-600 mb-6">All endpoints enforce role-based access control at the FastAPI middleware layer. Claims are verified via JWT Bearer tokens.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RoleCard role="Super Administrator" badge="SUPER_ADMIN" color="dark:bg-purple-900/20 dark:border-purple-500/20 dark:text-purple-300 bg-purple-50 border-purple-200 text-purple-800" perms={[
              "Global visibility — all regions, all complaints",
              "Create / delete Sub-Admins and Employees",
              "Claim (takeover) any unresolved complaint globally",
              "View full analytics and spike signals",
            ]}/>
            <RoleCard role="Regional Sub-Admin" badge="SUB_ADMIN" color="dark:bg-blue-900/20 dark:border-blue-500/20 dark:text-blue-300 bg-blue-50 border-blue-200 text-blue-800" perms={[
              "Scoped to their designated region_id only",
              "Create / manage Employees in their region",
              "Regional superior takeover of open complaints",
              "Regional analytics and team supervision",
            ]}/>
            <RoleCard role="Regional Employee" badge="EMPLOYEE" color="dark:bg-emerald-900/20 dark:border-emerald-500/20 dark:text-emerald-300 bg-emerald-50 border-emerald-200 text-emerald-800" perms={[
              "Auto-assigned complaints via load balancing",
              "Sees only their own assigned queue",
              "Review & approve RAG-generated draft replies",
              "Escalate complex cases to Sub-Admin",
            ]}/>
          </div>
        </Section>

        {/* Channels */}
        <Section id="channels" icon={Mail} color="dark:text-amber-400 text-amber-600" title="Ingest Channels">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              ["📧 Email", "IMAP listener polls the grievance inbox (iscuteayushi@gmail.com). Unread emails are auto-parsed and POSTed to /api/complaints/ingest."],
              ["💬 SMS", "Webhook at /api/integrations/sms/webhook. Supports Kafka-buffered ingest with direct fallback."],
              ["🐦 Twitter/X", "Webhook at /api/integrations/twitter/webhook. Mentions and DMs auto-ingested."],
              ["🌐 Web Portal", "Public form at /ub_publicPortal. Customers file complaints without login. OTP-protected live tracking included."],
            ].map(([t, d]) => (
              <div key={t as string} className="rounded-2xl p-4 border dark:bg-slate-900/40 dark:border-slate-800 bg-gray-50 border-gray-200">
                <p className="text-sm font-black dark:text-white text-black mb-1">{t}</p>
                <p className="text-xs dark:text-slate-400 text-gray-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-4 border dark:bg-amber-900/10 dark:border-amber-500/20 bg-amber-50 border-amber-200">
            <p className="text-[10px] font-black uppercase tracking-widest dark:text-amber-400 text-amber-700 mb-1">🌐 Bhashini Multilingual Gateway</p>
            <p className="text-xs dark:text-slate-400 text-gray-600">All ingest channels support automatic language detection. Regional Indian languages (Hindi, Tamil, Bengali, etc.) are pivot-translated to English for AI processing via the MeitY Bhashini ULCA API, then back-translated for the customer reply draft.</p>
          </div>
        </Section>

        {/* Complaints API */}
        <Section id="complaints" icon={MessageSquare} color="dark:text-blue-400 text-blue-600" title="Complaints API  ·  /api/complaints">
          <Endpoint method="POST" path="/api/complaints/ingest" auth="Public" desc="Synchronous complaint ingest. Runs full AI pipeline: classify → embed → dedup → priority → RAG draft."
            body={`{
  "channel":       "email" | "sms" | "twitter" | "web",
  "customer_id":   "user@example.com",
  "customer_name": "John Doe",          // optional
  "subject":       "ATM not working",
  "body":          "Full complaint text...",
  "region_id":     1,                   // optional
  "language":      "hi",               // optional, ISO 639-1
  "sla_hours":     72                  // optional, default 72
}`}
            response={`{
  "complaint_id":   "uuid",
  "category":       "ATM / Cash",
  "severity":       2,
  "priority_score": 4.82,
  "is_duplicate":   false,
  "duplicate_of":   null,
  "sla_deadline":   "2026-05-22T14:30:00"
}`}
          />
          <Endpoint method="GET" path="/api/complaints/queue?limit=50&region_id=1" auth="Bearer JWT" desc="Live Emotion-Decay Priority Queue. Returns open complaints ranked by priority_score DESC. Scoped by caller's role automatically." />
          <Endpoint method="GET" path="/api/complaints/{id}" auth="Bearer JWT" desc="Full complaint detail including body, named entities, draft reply, audit metadata, and superior-takeover flag." />
          <Endpoint method="GET" path="/api/complaints/{id}/similar?top_k=5" auth="Bearer JWT" desc="Returns semantically similar complaints using pgvector cosine similarity (threshold > 0.75). Used for DNA deduplication context." />
          <Endpoint method="PATCH" path="/api/complaints/{id}/assign" auth="Bearer JWT" desc="Assign complaint to an employee."
            body={`{ "employee_id": 3 }`} />
          <Endpoint method="PATCH" path="/api/complaints/{id}/escalate" auth="Bearer JWT" desc="Employee escalates a complaint upward. Removes from employee queue, flags is_escalated=true, puts back in regional Sub-Admin pool."
            body={`{ "employee_id": 3 }`} />
          <Endpoint method="PATCH" path="/api/complaints/{id}/approve-draft?agent=Name" auth="Bearer JWT" desc="Agent approves the RAG-generated draft reply. Triggers audit log entry and queue broadcast." />
          <Endpoint method="PATCH" path="/api/complaints/{id}/resolve" auth="Bearer JWT" desc="Mark complaint as resolved. Appends resolution to the PDF knowledge base for future RAG grounding."
            body={`{
  "agent":           "Officer Name",
  "resolution_note": "Optional custom note...",
  "add_to_kb":       true,
  "csat":            5
}`}
            response={`{
  "status":      "resolved",
  "sla_status":  "met",
  "resolved_at": "2026-05-19T15:00:00"
}`}
          />
          <Endpoint method="GET" path="/api/complaints/{id}/audit" auth="Bearer JWT" desc="Full immutable RBI-compliant audit trail for every action taken on a complaint (ingest, assign, escalate, approve, resolve)." />
          <Endpoint method="GET" path="/api/complaints/track/{id}" auth="Public" desc="Public status tracking endpoint. Returns status, category, and SLA deadline — no PII exposed." />
        </Section>

        {/* Analytics API */}
        <Section id="analytics" icon={BarChart3} color="dark:text-indigo-400 text-indigo-600" title="Analytics API  ·  /api/analytics">
          <Endpoint method="GET" path="/api/analytics/dashboard?region_id=1" auth="Bearer JWT" desc="KPI summary: total_open, p0_open, sla_breached, resolved_today, duplicates_caught, avg_resolution_hrs." />
          <Endpoint method="GET" path="/api/analytics/by-category?days=30&region_id=1" auth="Bearer JWT" desc="Complaint count grouped by AI-classified category for the past N days." />
          <Endpoint method="GET" path="/api/analytics/by-severity?region_id=1" auth="Bearer JWT" desc="Open complaint distribution across P0–P4 severity tiers." />
          <Endpoint method="GET" path="/api/analytics/volume-trend?days=14&region_id=1" auth="Bearer JWT" desc="Daily complaint volumes for the past N days including duplicate and P0 counts." />
          <Endpoint method="GET" path="/api/analytics/channel-distribution?days=30&region_id=1" auth="Bearer JWT" desc="Complaint count grouped by ingest channel (email, sms, twitter, web)." />
          <Endpoint method="GET" path="/api/analytics/spike-signals?hours=48" auth="Bearer JWT" desc="AI-detected complaint surge signals with predicted_surge_pct and RCA insight." />
        </Section>

        {/* Admin API */}
        <Section id="admin" icon={Users} color="dark:text-emerald-400 text-emerald-600" title="Admin API  ·  /api/admin">
          <Endpoint method="POST" path="/api/admin/users" auth="SUPER_ADMIN / SUB_ADMIN" desc="Create a new user account. SUB_ADMINs can only create EMPLOYEEs within their own region."
            body={`{
  "name":      "Inspector Ravi Kumar",
  "email":     "ravi@unionbank.in",
  "password":  "SecurePass123",
  "role":      "EMPLOYEE" | "SUB_ADMIN",
  "region_id": 2
}`} />
          <Endpoint method="GET" path="/api/admin/users" auth="Bearer JWT" desc="List users. SUPER_ADMIN sees all. SUB_ADMIN sees only EMPLOYEEs in their region." />
          <Endpoint method="DELETE" path="/api/admin/users/{id}" auth="SUPER_ADMIN / SUB_ADMIN" desc="Delete a user. SUB_ADMINs restricted to their own regional employees." />
          <Endpoint method="PATCH" path="/api/admin/users/status?is_active=true" auth="Bearer JWT" desc="Toggle the calling user's own on-shift / off-shift status." />
          <Endpoint method="GET" path="/api/admin/regions" auth="Public" desc="List all regional hubs." />
          <Endpoint method="POST" path="/api/admin/regions" auth="SUPER_ADMIN" desc="Create a new regional hub."
            body={`{ "name": "Maharashtra Region" }`} />
        </Section>

        {/* Auth */}
        <Section id="auth" icon={Key} color="dark:text-red-400 text-red-600" title="Authentication  ·  /api/auth">
          <Endpoint method="POST" path="/api/auth/login" auth="Public" desc="Authenticate and receive a JWT Bearer token. Token expires in 1 hour. Store in cookie: crest_token."
            body={`{
  "email":    "admin@unionbank.com",
  "password": "admin123"
}`}
            response={`{
  "access_token": "eyJhbGci...",
  "token_type":   "bearer",
  "user_id":      1,
  "role":         "SUPER_ADMIN",
  "name":         "System Admin"
}`}
          />
          <div className="rounded-2xl p-4 border dark:bg-red-900/10 dark:border-red-500/20 bg-red-50 border-red-200 mt-4">
            <p className="text-[10px] font-black uppercase tracking-widest dark:text-red-400 text-red-700 mb-1">Authorization Header</p>
            <pre className="text-xs dark:text-slate-300 text-gray-700 font-mono">Authorization: Bearer {"<access_token>"}</pre>
          </div>
        </Section>

        {/* Footer note */}
        <div className="rounded-2xl p-5 border dark:bg-slate-900/40 dark:border-slate-800 bg-gray-50 border-gray-200 text-center">
          <p className="text-xs font-bold dark:text-slate-400 text-gray-500">
            Interactive API explorer available at <code className="dark:text-blue-300 text-blue-700">http://localhost:8000/docs</code> (Swagger UI) · CREST · Union Bank of India iDEA 2.0 · Gen Forge
          </p>
        </div>

      </div>
    </div>
  );
}
