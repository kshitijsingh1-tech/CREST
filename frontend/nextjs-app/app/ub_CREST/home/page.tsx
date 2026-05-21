import { getMe, getSpikeSignals } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, ShieldCheck, Zap, Users, ListFilter, Cpu, Radio, BookOpen } from "lucide-react";
import CrestScrollHero from "@/components/CrestScrollHero";

export default async function CommandCenterHome() {
  let user;
  try {
    user = await getMe();
  } catch (e) {
    redirect("/ub_CREST/login");
  }

  const spikes = await getSpikeSignals(24).catch(() => []);

  const roleLabel =
    user.role === "SUPER_ADMIN" ? "Super Administrator" :
    user.role === "SUB_ADMIN"   ? "Regional Sub-Admin"  : "Regional Officer";

  return (
    <CrestScrollHero
      heroImage="/crest_internal_hero.png"
      title="CREST"
      subtitle="Command & Escalation Intelligence Platform"
      badgeText={`${roleLabel} Clearance Active`}
      italicText={`“हर शिकायत, हर बार हल”`}
      subText={`Bhashini AI • India AI Mission • RBI Ombudsman 2021 • DPDP Act 2023 • MeitY Aligned — Welcome, ${user.name}`}
    >
      <div className="flex-1 bg-transparent p-6 md:p-10 space-y-10 max-w-[90rem] mx-auto w-full relative z-10">

      {/* ── Hero Box ─────────────────────────────────────────── */}
      <div className="relative rounded-[2rem] overflow-hidden border p-8 md:p-12 group transition-all duration-700 ease-out
        dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl dark:hover:shadow-[0_0_60px_rgba(59,130,246,0.15)]
        bg-white border-gray-200 shadow-xl animate-fade-in-up hover:-translate-y-1 hover:border-blue-500/30">

        {/* Animated orbs */}
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none
          dark:bg-blue-500/10 bg-blue-400/20
          group-hover:scale-150 transition-transform duration-1000 animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none
          dark:bg-indigo-500/10 bg-indigo-400/20
          group-hover:scale-150 transition-transform duration-1000 animate-pulse [animation-delay:1.2s]" />
        {/* Top shimmer scan-line */}
        <div className="absolute inset-x-0 top-0 h-px
          dark:bg-gradient-to-r dark:from-transparent dark:via-blue-500/50 dark:to-transparent
          bg-gradient-to-r from-transparent via-blue-300/60 to-transparent
          animate-shimmer" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            {/* Clearance badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2
              dark:bg-blue-500/10 dark:border dark:border-blue-500/20 dark:text-blue-400
              bg-blue-50 border border-blue-200 text-blue-700 animate-[bounce_3s_infinite_ease-in-out]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 animate-[pulse_1.5s_infinite]" />
              {roleLabel} Clearance Active
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-2
              dark:text-white text-gray-900 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
              Command Center
            </h1>
            <p className="text-sm md:text-base font-bold uppercase tracking-widest
              dark:text-slate-400 text-gray-500 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]">
              Welcome to the grid, {user.name}
            </p>
          </div>

          {/* Status chip */}
          <div className="flex items-center gap-3 rounded-2xl p-4 shadow-sm border transition-all duration-500 hover:scale-105 hover:border-emerald-500/30
            dark:bg-white/5 dark:border-white/10
            bg-gray-50 border-gray-200 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.3s_both]">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border
              dark:bg-green-500/10 dark:border-green-500/20
              bg-green-50 border-green-200">
              <Activity className="w-6 h-6 text-green-500 animate-[pulse_1.5s_infinite]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-bold dark:text-slate-500 text-gray-400">Infrastructure</span>
              <span className="text-sm font-black uppercase tracking-wider text-green-500">All Systems Nominal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* ── Operational Portals ───────────────────────────── */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 pl-2
            dark:text-white text-gray-800">
            <Zap className="w-4 h-4 dark:text-blue-400 text-blue-600" /> Operational Portals
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live Queue */}
            <Link href="/ub_CREST/queue" className="group rounded-3xl p-6 border transition-all duration-500 relative overflow-hidden hover:-translate-y-1
              dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl dark:hover:border-amber-500/30 dark:hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]
              bg-white border-gray-200 shadow-xl hover:border-amber-400 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-500 text-amber-500">
                <ListFilter className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border
                dark:bg-amber-500/10 dark:border-amber-500/20
                bg-amber-50 border-amber-200">
                <ListFilter className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2 dark:text-white text-gray-900">Live Priority Queue</h3>
              <p className="text-xs font-medium leading-relaxed dark:text-slate-400 text-gray-500">Real-time Emotion-Decay sorting matrix. Handle P0 grievances as they stream into the network.</p>
            </Link>

            {/* Management */}
            <Link href="/ub_CREST/management" className="group rounded-3xl p-6 border transition-all duration-500 relative overflow-hidden hover:-translate-y-1
              dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl dark:hover:border-emerald-500/30 dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.12)]
              bg-white border-gray-200 shadow-xl hover:border-emerald-400 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-500 text-emerald-500">
                <Users className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border
                dark:bg-emerald-500/10 dark:border-emerald-500/20
                bg-emerald-50 border-emerald-200">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2 dark:text-white text-gray-900">Management Console</h3>
              <p className="text-xs font-medium leading-relaxed dark:text-slate-400 text-gray-500">Oversee junior officers, review assigned regions, and manage personnel access across branches.</p>
            </Link>

            {/* Analytics */}
            <Link href="/ub_CREST/analytics" className="group rounded-3xl p-6 border transition-all duration-500 relative overflow-hidden hover:-translate-y-1
              dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl dark:hover:border-purple-500/30 dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]
              bg-white border-gray-200 shadow-xl hover:border-purple-400 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-500 text-purple-500">
                <Radio className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border
                dark:bg-purple-500/10 dark:border-purple-500/20
                bg-purple-50 border-purple-200">
                <Radio className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2 dark:text-white text-gray-900">Analytics</h3>
              <p className="text-xs font-medium leading-relaxed dark:text-slate-400 text-gray-500">Deep-dive into 30-day volume trajectories, channel distributions, and SLA compliances.</p>
            </Link>

            {/* Docs */}
            <Link href="/ub_CREST/docs" className="group rounded-3xl p-6 border transition-all duration-500 relative overflow-hidden hover:-translate-y-1
              dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl dark:hover:border-cyan-500/30 dark:hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]
              bg-white border-gray-200 shadow-xl hover:border-cyan-400 hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)]">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-500 text-cyan-500">
                <BookOpen className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border
                dark:bg-cyan-500/10 dark:border-cyan-500/20
                bg-cyan-50 border-cyan-200">
                <BookOpen className="w-6 h-6 text-cyan-500" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2 dark:text-white text-gray-900">Platform Docs</h3>
              <p className="text-xs font-medium leading-relaxed dark:text-slate-400 text-gray-500">Full REST API reference, role hierarchy, ingest channel setup, and quick-start guide for CREST.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest dark:text-cyan-400 text-cyan-600">
                View Docs →
              </span>
            </Link>
          </div>
        </div>

        {/* ── System Diagnostics & Alerts ───────────────────── */}
        <div className="space-y-6 flex flex-col">

          {/* Pipeline Status */}
          <div className="rounded-3xl p-6 border transition-all duration-500
            dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
            bg-white border-gray-200 shadow-xl">
            <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-6
              dark:text-white text-gray-800">
              <Cpu className="w-4 h-4 dark:text-slate-400 text-gray-400" /> Neural Pipeline Status
            </h2>
            <div className="space-y-4">
              {[
                ["Kafka Data Stream", "Synced"],
                ["SBERT Embeddings", "Online"],
                ["PostgreSQL Vectors", "Active"],
                ["Emotion Classifier", "Tuned"],
              ].map(([label, status]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-gray-500">{label}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border
                    dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20
                    bg-green-50 text-green-600 border-green-200">{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Spike Signals */}
          <div className="rounded-3xl p-6 border flex-1 transition-all duration-500
            dark:bg-black/80 dark:backdrop-blur-xl dark:border-red-500/20 dark:shadow-2xl
            bg-red-50 border-red-200 shadow-xl">
            <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-6
              dark:text-red-400 text-red-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
              </svg>
              Recent AI Spikes (24H)
            </h2>
            {spikes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest dark:text-red-500/50 text-red-400">Zero active spikes detected.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {spikes.slice(0, 3).map(s => (
                  <div key={s.id} className="p-4 rounded-2xl border
                    dark:bg-white/5 dark:border-red-500/10
                    bg-white border-red-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider dark:text-white text-gray-800">
                        {s.signal_type.replace("_", " ")}
                      </span>
                      <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase border
                        dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30
                        bg-red-100 text-red-600 border-red-200">
                        +{s.predicted_surge_pct}%
                      </span>
                    </div>
                    <p className="text-[10px] font-medium leading-relaxed line-clamp-2
                      dark:text-slate-400 text-gray-500">{s.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
      </div>
    </CrestScrollHero>
  );
}
