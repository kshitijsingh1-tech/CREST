import Link from "next/link";
import { 
  getDashboardSummary, getBySeverity, getVolumeTrend, 
  getChannelDistribution, getByCategory, getSpikeSignals, getMe 
} from "@/lib/api";
import VolumeTrendChart from "@/components/charts/VolumeTrendChart";
import PriorityQueue from "@/components/queue/PriorityQueue";
import { redirect } from "next/navigation";

function KPICard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl border p-6 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group
      dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:hover:bg-black dark:shadow-lg dark:hover:shadow-[0_10px_40px_rgba(96,165,250,0.1)]
      bg-white border-gray-200 shadow-sm hover:border-black hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.03]">
      
      {/* Bubbly background glow on hover */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-2xl scale-0 group-hover:scale-[4] transition-transform duration-700 ease-out z-0"></div>
      
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform duration-500 ease-out dark:invert-0 invert-0 z-0">
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-16 h-16 transition-colors duration-500 dark:text-white text-black"><path d="M12 2L2 22h20L12 2zm0 4.5l5.5 11h-11L12 6.5z"/></svg>
      </div>

      <p className="text-[10px] uppercase tracking-widest font-bold transition-colors duration-500
        dark:text-blue-300 text-gray-500 relative z-10">{label}</p>
      <p className={`text-3xl font-black mt-2 transition-colors duration-500 tracking-tight relative z-10 dark:drop-shadow-sm ${color ?? "dark:text-white text-black"}`}>{value}</p>
      {sub && <p className="text-[10px] mt-2 font-bold transition-colors duration-500 dark:text-gray-500 text-gray-400 relative z-10">{sub}</p>}
    </div>
  );
}

export default async function CrestAnalyticsPage() {
  let user;
  try {
    user = await getMe();
  } catch (e) {
    redirect("/ub_CREST/login");
  }

  const regionId = user.region_id ?? undefined;

  const [summary, severities, trend, channels, categories, spikes] = await Promise.all([
    getDashboardSummary(regionId),
    getBySeverity(regionId),
    getVolumeTrend(14, regionId),
    getChannelDistribution(30, regionId),
    getByCategory(30, regionId),
    getSpikeSignals(168),   // last 7 days (global)
  ]);

  const totalComplaints = categories.reduce((sum, c) => sum + c.count, 0);
  const totalChannels   = channels.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="flex-1 bg-transparent p-6 md:p-10 space-y-10 max-w-[90rem] mx-auto w-full animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
         <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase transition-colors duration-500 dark:text-white text-black dark:drop-shadow-sm">Analytics</h1>
          <p className="text-xs uppercase tracking-widest mt-2 font-bold transition-colors duration-500 dark:text-blue-300 text-gray-600">Real-time metrics, live queue & historical trends</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors duration-500 w-max border shadow-sm
            dark:bg-red-600/20 dark:border-red-500/40 dark:text-red-400
            bg-red-50 border-red-100 text-red-600">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse blur-[1px] dark:bg-red-500 bg-red-600"></span>
            Live Feed Active
          </div>
          <Link href="/ub_CREST/home" className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-500 border shadow-sm
            dark:bg-blue-900/30 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-900/50
            bg-gray-100 border-gray-300 text-black hover:bg-gray-200">
            ← Back to Home
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* --- ANALYTICS HUB SECTION --- */}
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          <KPICard label="Open Tickets" value={summary.total_open} />
          <KPICard label="P0 Critical" value={summary.p0_open} color={summary.p0_open > 0 ? "dark:text-red-400 text-red-600" : "dark:text-black text-black"} />
          <KPICard label="SLA Breached" value={summary.sla_breached} color={summary.sla_breached > 0 ? "dark:text-red-400 text-red-600" : "dark:text-black text-black"} />
          <KPICard label="Resolved Today" value={summary.resolved_today} color="dark:text-emerald-400 text-green-600" />
          <KPICard label="Duplicates Caught" value={summary.duplicates_caught} sub="Cross-channel dedup" color="dark:text-purple-400 text-purple-600" />
          <KPICard label="Avg Resolution" value={`${summary.avg_resolution_hrs}h`} sub="Overall performance" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
             {/* Priority Queue Module */}
            <div className="rounded-3xl p-6 md:p-8 border transition-all duration-500
              dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
              bg-white border-gray-200 shadow-xl hover:border-black">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-2">
                <h2 className="text-base font-black uppercase tracking-widest flex items-center gap-4 transition-colors duration-500 dark:text-white text-black">
                  Live Priority Queue
                  <span className="px-3 py-1.5 rounded-md text-[9px] font-bold tracking-widest uppercase transition-colors duration-500 border
                    dark:bg-blue-900/30 dark:border-blue-500/30 dark:text-blue-300
                    bg-gray-100 border-gray-300 text-black">
                    Emotion-Decay ranking
                  </span>
                </h2>
              </div>
              <div className="transition-all duration-500">
                <PriorityQueue regionId={regionId} />
              </div>
            </div>
          </div>

          <div className="space-y-8 flex flex-col">
            <div className="rounded-3xl border p-6 md:p-8 transition-all duration-500 flex-1
              dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
              bg-white border-gray-200 shadow-xl hover:border-black">
              <h3 className="text-xs font-black uppercase tracking-widest mb-8 transition-colors duration-500 dark:text-white text-black">Open by Severity</h3>
              <div className="space-y-6">
                {severities.map(s => {
                  const colors_dark: Record<string, string> = {
                    "P0 Critical": "from-red-600 to-red-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]",
                    "P1 High":     "from-orange-500 to-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]",
                    "P2 Medium":   "from-amber-500 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)]",
                    "P3 Low":      "from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]",
                    "P4 Info":     "from-slate-500 to-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.8)]",
                  };
                  const colors_light: Record<string, string> = {
                    "P0 Critical": "bg-red-600",
                    "P1 High":     "bg-orange-500",
                    "P2 Medium":   "bg-amber-400",
                    "P3 Low":      "bg-black",
                    "P4 Info":     "bg-gray-400",
                  };
                  return (
                    <div key={s.severity} className="flex items-center gap-4 group">
                      <span className="text-[10px] font-bold w-24 uppercase tracking-wider transition-colors duration-300 dark:text-blue-300 dark:group-hover:text-white text-gray-500 group-hover:text-black">{s.severity}</span>
                      <div className="flex-1 rounded-full h-3 overflow-hidden border transition-colors duration-500 dark:bg-black/80 dark:shadow-inner dark:border-blue-900/50 bg-gray-100 border-gray-300">
                        <div className={`h-full rounded-full transition-all duration-500 dark:bg-gradient-to-r dark:${colors_dark[s.severity] ?? "from-gray-500 to-gray-400"} ${colors_light[s.severity] ?? "bg-black"}`}
                          style={{ width: `${Math.max(5, (s.count / (severities[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-black w-10 text-right transition-colors duration-500 dark:text-white text-black">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* --- ANALYTICS SECTION --- */}
        {/* Volume trend */}
        <VolumeTrendChart data={trend} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Channel distribution */}
          <div className="rounded-3xl border p-6 md:p-8 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group/card flex-1
            dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:hover:bg-black dark:shadow-lg dark:hover:shadow-[0_10px_40px_rgba(96,165,250,0.1)] dark:hover:border-blue-500/30
            bg-white border-gray-200 shadow-xl hover:border-black hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-full blur-3xl scale-0 group-hover/card:scale-[3] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-8 transition-colors duration-500 dark:text-white text-black relative z-10">By Channel (30d)</h3>
            <div className="space-y-6">
              {channels.map(c => {
                const pct = Math.round((c.count / (totalChannels || 1)) * 100);
                const icons: Record<string, string> = { email: "📧", whatsapp: "💬", app: "📱", twitter: "🐦", voice: "📞", branch: "🏦" };
                return (
                  <div key={c.channel} className="flex flex-col gap-2 group">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-300
                      dark:text-blue-300 dark:group-hover:text-white text-gray-500 group-hover:text-black">
                      <span className="flex items-center gap-2">{icons[c.channel] ?? "•"} {c.channel}</span>
                      <span>{c.count} ({pct}%)</span>
                    </div>
                    <div className="w-full rounded-full h-2 overflow-hidden border transition-colors duration-500
                      dark:bg-black/80 dark:border-blue-900/50 dark:shadow-inner bg-gray-100 border-gray-300">
                      <div className="h-full rounded-full transition-all duration-500
                        dark:bg-gradient-to-r dark:from-indigo-600 dark:to-indigo-400 dark:shadow-[0_0_10px_rgba(99,102,241,0.8)]
                        bg-black" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="rounded-3xl border p-6 md:p-8 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group/card flex-1
            dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:hover:bg-black dark:shadow-lg dark:hover:shadow-[0_10px_40px_rgba(20,184,166,0.1)] dark:hover:border-teal-500/30
            bg-white border-gray-200 shadow-xl hover:border-black hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-teal-500/10 dark:bg-teal-400/10 rounded-full blur-3xl scale-0 group-hover/card:scale-[3] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-8 transition-colors duration-500 dark:text-white text-black relative z-10">By Category (30d)</h3>
            <div className="space-y-6">
              {categories.map(c => {
                const pct = Math.round((c.count / (totalComplaints || 1)) * 100);
                return (
                  <div key={c.category} className="flex flex-col gap-2 group">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-300
                      dark:text-blue-300 dark:group-hover:text-white text-gray-500 group-hover:text-black">
                      <span>{c.category}</span>
                      <span>{c.count} ({pct}%)</span>
                    </div>
                    <div className="w-full rounded-full h-2 overflow-hidden border transition-colors duration-500
                      dark:bg-black/80 dark:border-blue-900/50 dark:shadow-inner bg-gray-100 border-gray-300">
                      <div className="h-full rounded-full transition-all duration-500
                        dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-400 dark:shadow-[0_0_10px_rgba(20,184,166,0.8)]
                        bg-black" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spike signals history */}
          <div className="rounded-3xl border p-6 md:p-8 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group/card flex-1
            dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:hover:bg-black dark:shadow-lg dark:hover:shadow-[0_10px_40px_rgba(251,191,36,0.1)] dark:hover:border-amber-500/30
            bg-white border-gray-200 shadow-xl hover:border-black hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/10 dark:bg-amber-400/10 rounded-full blur-3xl scale-0 group-hover/card:scale-[3] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-8 transition-colors duration-500 dark:text-white text-black relative z-10">Spike Signals (7d)</h3>
            {spikes.length === 0 ? (
              <p className="text-[10px] font-bold tracking-widest uppercase transition-colors duration-500 dark:text-gray-500 text-gray-400">No signals this week.</p>
            ) : (
              <div className="space-y-6">
                {spikes.map(s => (
                  <div key={s.id} className="relative pl-4 border-l-2 transition-all duration-500
                    dark:border-amber-500/50 border-amber-300 group">
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full transition-all duration-500
                      dark:bg-amber-400 dark:shadow-[0_0_8px_rgba(251,191,36,0.8)] bg-amber-500" />
                    
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider transition-colors duration-500 dark:text-white text-black group-hover:text-amber-600">
                        {s.signal_type.replace("_", " ")}
                      </span>
                      <span className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded uppercase transition-colors duration-500 border
                        dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30
                        bg-amber-50 text-amber-700 border-amber-200">
                        +{s.predicted_surge_pct}%
                      </span>
                    </div>
                    <p className="text-[10px] font-bold leading-relaxed transition-colors duration-500 dark:text-gray-400 text-gray-500 line-clamp-2">{s.description}</p>
                    <p className="text-[9px] font-medium tracking-wider uppercase mt-2 transition-colors duration-500 dark:text-gray-600 text-gray-400">
                      {new Date(s.signal_ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
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
