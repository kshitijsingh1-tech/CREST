import { getMe, getSpikeSignals } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, ShieldCheck, Zap, Users, ListFilter, Cpu, Radio, BookOpen } from "lucide-react";

export default async function CommandCenterHome() {
  let user;
  try {
    user = await getMe();
  } catch (e) {
    redirect("/ub_CREST/login");
  }

  const spikes = await getSpikeSignals(24).catch(() => []);

  return (
    <div className="flex-1 bg-transparent p-6 md:p-10 space-y-10 max-w-[90rem] mx-auto w-full relative z-10 animate-fade-in-up">
      
      {/* Immersive Command Hero */}
      <div className="relative rounded-[2rem] overflow-hidden border shadow-2xl p-8 md:p-12 group
        dark:border-blue-500/20 dark:bg-slate-950/50 dark:backdrop-blur-3xl
        border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50">

        {/* Animated gradient orbs */}
        <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-blue-900/20 dark:via-slate-900/80 dark:to-indigo-900/20 bg-gradient-to-br from-blue-100/60 via-white/80 to-indigo-100/60 z-0" />
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[80px] pointer-events-none
          dark:bg-blue-500/10 bg-blue-400/20
          group-hover:scale-150 transition-transform duration-1000 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-[80px] pointer-events-none
          dark:bg-indigo-500/10 bg-indigo-400/20
          group-hover:scale-150 transition-transform duration-1000 animate-pulse [animation-delay:1s]" />
        {/* Animated scan line */}
        <div className="absolute inset-x-0 top-0 h-px dark:bg-gradient-to-r dark:from-transparent dark:via-blue-500/60 dark:to-transparent bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4
              dark:bg-blue-500/10 dark:border dark:border-blue-500/20 dark:text-blue-400 dark:shadow-[0_0_15px_rgba(59,130,246,0.15)]
              bg-blue-100 border border-blue-300 text-blue-700 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              {user.role === "SUPER_ADMIN" ? "Super Administrator" : user.role === "SUB_ADMIN" ? "Regional Sub-Admin" : "Regional Officer"} Clearance Active
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-2 drop-shadow-sm
              dark:text-white text-gray-900">
              Command Center
            </h1>
            <p className="text-sm md:text-base font-bold uppercase tracking-widest
              dark:text-slate-400 text-gray-500">
              Welcome to the grid, {user.name}
            </p>
          </div>
          
          <div className="flex items-center gap-3 rounded-2xl p-4 shadow-xl backdrop-blur-md border
            dark:bg-black/60 dark:border-slate-800
            bg-white/80 border-gray-200">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border
              dark:bg-green-500/10 dark:border-green-500/20
              bg-green-50 border-green-200">
              <Activity className="w-6 h-6 text-green-500 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-bold dark:text-slate-500 text-gray-400">Infrastructure</span>
              <span className="text-sm font-black uppercase tracking-wider text-green-500">All Systems Nominal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Core Quick Access Portals */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 pl-2
            dark:text-white text-gray-800">
            <Zap className="w-4 h-4 text-blue-500" /> Operational Portals
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Queue */}
            <Link href="/ub_CREST/queue" className="group rounded-3xl p-6 border transition-all duration-500 relative overflow-hidden backdrop-blur-xl hover:-translate-y-1
              dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-amber-500/40 dark:hover:bg-slate-900 dark:hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]
              bg-white border-gray-200 hover:border-amber-400 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500 text-amber-500">
                <ListFilter className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border
                dark:bg-amber-500/10 dark:border-amber-500/20 dark:shadow-[0_0_15px_rgba(245,158,11,0.2)]
                bg-amber-50 border-amber-200">
                <ListFilter className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2 dark:text-white text-gray-900">Live Priority Queue</h3>
              <p className="text-xs font-medium leading-relaxed dark:text-slate-400 text-gray-500">Real-time Emotion-Decay sorting matrix. Handle P0 grievances as they stream into the network.</p>
            </Link>

            {/* Management */}
            <Link href="/ub_CREST/management" className="group rounded-3xl p-6 border transition-all duration-500 relative overflow-hidden backdrop-blur-xl hover:-translate-y-1
              dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-emerald-500/40 dark:hover:bg-slate-900 dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]
              bg-white border-gray-200 hover:border-emerald-400 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500 text-emerald-500">
                <Users className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border
                dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:shadow-[0_0_15px_rgba(16,185,129,0.2)]
                bg-emerald-50 border-emerald-200">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2 dark:text-white text-gray-900">Management Console</h3>
              <p className="text-xs font-medium leading-relaxed dark:text-slate-400 text-gray-500">Oversee junior officers, review assigned regions, and manage personnel access across branches.</p>
            </Link>

            {/* Analytics */}
            <Link href="/ub_CREST/analytics" className="group rounded-3xl p-6 border transition-all duration-500 relative overflow-hidden backdrop-blur-xl hover:-translate-y-1
              dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-purple-500/40 dark:hover:bg-slate-900 dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]
              bg-white border-gray-200 hover:border-purple-400 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500 text-purple-500">
                <Radio className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border
                dark:bg-purple-500/10 dark:border-purple-500/20 dark:shadow-[0_0_15px_rgba(168,85,247,0.2)]
                bg-purple-50 border-purple-200">
                <Radio className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2 dark:text-white text-gray-900">Analytics</h3>
              <p className="text-xs font-medium leading-relaxed dark:text-slate-400 text-gray-500">Deep-dive into 30-day volume trajectories, channel distributions, and SLA compliances.</p>
            </Link>

            {/* Docs */}
            <Link href="/ub_CREST/docs" className="group rounded-3xl p-6 border transition-all duration-500 relative overflow-hidden backdrop-blur-xl hover:-translate-y-1
              dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-cyan-500/40 dark:hover:bg-slate-900 dark:hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]
              bg-white border-gray-200 hover:border-cyan-400 hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)]">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500 text-cyan-500">
                <BookOpen className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border
                dark:bg-cyan-500/10 dark:border-cyan-500/20 dark:shadow-[0_0_15px_rgba(6,182,212,0.2)]
                bg-cyan-50 border-cyan-200">
                <BookOpen className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2 dark:text-white text-gray-900">Platform Docs</h3>
              <p className="text-xs font-medium leading-relaxed dark:text-slate-400 text-gray-500">Full REST API reference, role hierarchy, ingest channel setup, and quick-start guide for CREST.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest dark:text-cyan-400 text-cyan-600">
                View Docs →
              </span>
            </Link>
          </div>
        </div>

        {/* System Diagnostics & Alerts */}
        <div className="space-y-6 flex flex-col">
          
          <div className="rounded-3xl p-6 border backdrop-blur-xl
            dark:bg-slate-900/80 dark:border-slate-800
            bg-white border-gray-200 shadow-sm">
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

          <div className="rounded-3xl p-6 border backdrop-blur-xl flex-1
            dark:bg-red-950/20 dark:border-red-500/20
            bg-red-50 border-red-200">
            <h2 className="text-xs font-black uppercase tracking-widest text-red-500 dark:text-red-400 flex items-center gap-2 mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd"></path></svg>
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
                    dark:bg-black/40 dark:border-red-500/10
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
                    <p className="text-[10px] font-medium leading-relaxed line-clamp-2 dark:text-slate-400 text-gray-500">{s.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
