import { getMe, getSpikeSignals } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, ShieldCheck, Zap, Users, ListFilter, Cpu, Radio } from "lucide-react";

export default async function CommandCenterHome() {
  let user;
  try {
    user = await getMe();
  } catch (e) {
    redirect("/ub_CREST/login");
  }

  // Fetch only the latest 24hr spikes for the quick alert widget
  const spikes = await getSpikeSignals(24).catch(() => []);

  return (
    <div className="flex-1 bg-transparent p-6 md:p-10 space-y-10 max-w-[90rem] mx-auto w-full relative z-10 animate-fade-in-up">
      
      {/* Immersive Command Hero */}
      <div className="relative rounded-[2rem] overflow-hidden border border-blue-500/20 bg-slate-950/50 backdrop-blur-3xl shadow-2xl p-8 md:p-12 group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900/80 to-indigo-900/20 z-0"></div>
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              {user.role === "admin" ? "Super Administrator" : "Regional Authority"} Clearance Active
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-white drop-shadow-lg mb-2">
              Command Center
            </h1>
            <p className="text-sm md:text-base font-bold text-slate-400 uppercase tracking-widest">
              Welcome to the grid, {user.name}
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-black/60 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-400 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Infrastructure</span>
              <span className="text-sm font-black uppercase tracking-wider text-green-400">All Systems Nominal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Core Quick Access Portals */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2 pl-2">
            <Zap className="w-4 h-4 text-blue-400" /> Operational Portals
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/ub_CREST/queue" className="group rounded-3xl p-6 bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900 transition-all duration-500 relative overflow-hidden backdrop-blur-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:-translate-y-1">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500 text-amber-400">
                <ListFilter className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <ListFilter className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Live Priority Queue</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Real-time Emotion-Decay sorting matrix. Handle P0 grievances as they stream into the network.</p>
            </Link>

            <Link href="/ub_CREST/management" className="group rounded-3xl p-6 bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition-all duration-500 relative overflow-hidden backdrop-blur-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:-translate-y-1">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500 text-emerald-400">
                <Users className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Management Console</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Oversee junior officers, review assigned regions, and manage personnel access across branches.</p>
            </Link>

            <Link href="/ub_CREST/analytics" className="group rounded-3xl p-6 bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-900 transition-all duration-500 relative overflow-hidden backdrop-blur-xl hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:-translate-y-1">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500 text-purple-400">
                <Radio className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Radio className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Analytics</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Deep-dive into 30-day volume trajectories, channel distributions, and SLA compliances.</p>
            </Link>
          </div>
        </div>

        {/* System Diagnostics & Alerts */}
        <div className="space-y-6 flex flex-col">
          
          <div className="rounded-3xl p-6 bg-slate-900/80 border border-slate-800 backdrop-blur-xl">
            <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2 mb-6">
              <Cpu className="w-4 h-4 text-slate-400" /> Neural Pipeline Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kafka Data Stream</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">Synced</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SBERT Embeddings</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PostgreSQL Vectors</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emotion Classifier</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">Tuned</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-6 bg-red-950/20 border border-red-500/20 backdrop-blur-xl flex-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-red-400 flex items-center gap-2 mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd"></path></svg>
              Recent AI Spikes (24H)
            </h2>
            {spikes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/50">Zero active spikes detected.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {spikes.slice(0, 3).map(s => (
                  <div key={s.id} className="p-4 rounded-2xl bg-black/40 border border-red-500/10">
                     <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black uppercase tracking-wider text-white">
                         {s.signal_type.replace("_", " ")}
                       </span>
                       <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase border bg-red-500/20 text-red-400 border-red-500/30">
                         +{s.predicted_surge_pct}%
                       </span>
                     </div>
                     <p className="text-[10px] font-medium text-slate-400 leading-relaxed line-clamp-2">{s.description}</p>
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
