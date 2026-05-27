import Link from "next/link";
import { 
  getDashboardSummary, getBySeverity, getVolumeTrend, 
  getChannelDistribution, getByCategory, getSpikeSignals, getMe,
  getRegionDistribution, RegionStat
} from "@/lib/api";
import VolumeTrendChart from "@/components/charts/VolumeTrendChart";
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

const SEVERITY_COLORS: Record<string, { light: string; dark: string }> = {
  "P0 Critical": { 
    light: "bg-red-500", 
    dark: "dark:bg-gradient-to-r dark:from-red-600 dark:to-red-400 dark:shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
  },
  "P1 High": { 
    light: "bg-orange-500", 
    dark: "dark:bg-gradient-to-r dark:from-orange-500 dark:to-orange-400 dark:shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
  },
  "P2 Medium": { 
    light: "bg-amber-500", 
    dark: "dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-300 dark:shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
  },
  "P3 Low": { 
    light: "bg-blue-500", 
    dark: "dark:bg-gradient-to-r dark:from-blue-600 dark:to-blue-400 dark:shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
  },
  "P4 Info": { 
    light: "bg-slate-400", 
    dark: "dark:bg-gradient-to-r dark:from-slate-500 dark:to-slate-400" 
  },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  web: <img src="/crest_logo.png" className="w-4 h-4 rounded-sm object-cover" alt="CREST" />,
  whatsapp: (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#25D366" />
      <path fillRule="evenodd" clipRule="evenodd" d="M12.03 5C8.15 5 5 8.15 5 12.03c0 1.27.34 2.5.98 3.58L5 20l4.52-.95c1.04.57 2.2.87 3.5.87 3.88 0 7.03-3.15 7.03-7.03C20.06 8.15 16.9 5 12.03 5zm3.62 10.05c-.15.42-.76.81-1.05.86-.29.05-.65.08-1.89-.43-1.6-.66-2.61-2.28-2.69-2.39-.08-.11-.68-.9-.68-1.72s.43-1.22.58-1.37c.15-.15.34-.19.45-.19.1 0 .26 0 .4.3.15.35.53 1.27.57 1.35.04.09.07.19.02.3-.06.11-.09.19-.17.28-.08.09-.18.21-.25.29-.08.08-.17.18-.08.35.1.18.46.76.99 1.23.68.6 1.25.79 1.43.87.18.08.28-.02.39-.13.1-.11.45-.52.57-.7.12-.18.24-.15.41-.09.17.06 1.07.5 1.25.6.18.09.3.14.34.22.04.08.04.44-.1.86z" fill="white" />
    </svg>
  ),
  email: <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  sms: <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  app: <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  instagram: <svg className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  telegram: (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#2AABEE" />
      <path d="M18.8 6.2c-.1-.1-.3-.1-.4 0l-14 5.4c-.2.1-.3.3-.3.5s.1.4.3.4l3.5 1.1 1.3 4.1c.1.2.2.3.4.3.1 0 .2 0 .3-.1l2.2-1.8 3.5 2.6c.1.1.3.1.4 0 .1-.1.2-.2.2-.4l3-11.5c0-.2-.1-.4-.2-.5zm-10 6.6l6.8-4.2-5.3 4.9v2.2l-1.5-2.9z" fill="white" />
    </svg>
  ),
  discord: (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#5865F2" />
      <path d="M17.842 8.73c-.856-.395-1.782-.693-2.762-.876a.048.048 0 0 0-.05.023c-.119.213-.251.488-.344.71-.105-.015-.208-.023-.31-.023a8.91 8.91 0 0 0-.62 0c-.093 0-.197.008-.302.023-.093-.222-.225-.497-.344-.71a.048.048 0 0 0-.05-.023c-.98.183-1.906.48-2.762.876a.047.047 0 0 0-.022.018c-1.764 2.64-2.247 5.215-2.01 7.75a.05.05 0 0 0 .019.035c1.168.86 2.302 1.381 3.414 1.724a.05.05 0 0 0 .054-.017c.267-.367.508-.758.71-1.173a.048.048 0 0 0-.026-.067 6.07 6.07 0 0 1-.84-.403.048.048 0 0 1-.005-.08c.058-.043.113-.089.167-.134a.047.047 0 0 1 .049-.007c2.246 1.03 4.685 1.03 6.9 0a.047.047 0 0 1 .05.006c.053.046.108.092.167.135a.048.048 0 0 1-.006.08 5.86 5.86 0 0 1-.84.403.048.048 0 0 0-.025.068c.203.415.444.805.71 1.172a.05.05 0 0 0 .055.018c1.115-.343 2.25-.865 3.415-1.724a.05.05 0 0 0 .019-.035c.291-3.003-.497-5.556-2.015-7.75a.047.047 0 0 0-.022-.018zM10.74 13.918c-.663 0-1.21-.61-1.21-1.356 0-.747.537-1.356 1.21-1.356.677 0 1.218.615 1.21 1.356 0 .747-.533 1.356-1.21 1.356zm4.52 0c-.663 0-1.21-.61-1.21-1.356 0-.747.537-1.356 1.21-1.356.677 0 1.218.615 1.21 1.356 0 .747-.533 1.356-1.21 1.356z" fill="white" />
    </svg>
  ),
  voice: <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
};

export default async function CrestAnalyticsPage() {
  let user;
  try {
    user = await getMe();
  } catch (e) {
    redirect("/ub_CREST/login?recovered=1");
  }

  const regionId = user.region_id ?? undefined;

  // Wrap each call individually so a backend failure shows empty data instead of crashing
  let coreBackendError = false;
  let regionBackendError = false;
  const safe = async <T,>(fn: () => Promise<T>, fallback: T, onError?: () => void): Promise<T> => {
    try {
      return await fn();
    } catch {
      onError?.();
      return fallback;
    }
  };

  const emptySummary = { total_open: 0, p0_open: 0, sla_breached: 0, resolved_today: 0, duplicates_caught: 0, avg_resolution_hrs: 0 };

  const [summary, severities, trend, channels, categories, spikes, regions] = await Promise.all([
    safe(() => getDashboardSummary(regionId), emptySummary, () => { coreBackendError = true; }),
    safe(() => getBySeverity(regionId), [] as ReturnType<typeof getBySeverity> extends Promise<infer T> ? T : never[], () => { coreBackendError = true; }),
    safe(() => getVolumeTrend(14, regionId), [], () => { coreBackendError = true; }),
    safe(() => getChannelDistribution(30, regionId), [], () => { coreBackendError = true; }),
    safe(() => getByCategory(30, regionId), [], () => { coreBackendError = true; }),
    safe(() => getSpikeSignals(168), [], () => { coreBackendError = true; }),
    user.role === "SUPER_ADMIN"
      ? safe(() => getRegionDistribution(), [] as RegionStat[], () => { regionBackendError = true; })
      : Promise.resolve([] as RegionStat[]),
  ]);

  const totalComplaints = categories.reduce((sum, c) => sum + c.count, 0);
  const totalChannels   = channels.reduce((sum, c) => sum + c.count, 0);
  const hasPrimaryData =
    summary.total_open > 0 ||
    summary.p0_open > 0 ||
    summary.sla_breached > 0 ||
    summary.resolved_today > 0 ||
    summary.duplicates_caught > 0 ||
    trend.length > 0 ||
    severities.length > 0 ||
    channels.length > 0 ||
    categories.length > 0 ||
    spikes.length > 0;

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

      {coreBackendError && (
        <div className="flex items-start gap-4 rounded-2xl border px-6 py-4 mb-2 transition-colors duration-500
          bg-amber-50 border-amber-200 text-amber-800
          dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
          <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-black text-xs uppercase tracking-widest mb-1">Backend Unreachable</p>
            <p className="text-xs font-medium leading-relaxed">
              The CREST API did not respond. Metrics below show last-known or empty data.
              Ensure the backend is running and <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">NEXT_PUBLIC_API_URL</code> is correctly set.
            </p>
          </div>
        </div>
      )}

      {!coreBackendError && !hasPrimaryData && (
        <div className="flex items-start gap-4 rounded-2xl border px-6 py-4 mb-2 transition-colors duration-500
          bg-blue-50 border-blue-200 text-blue-900
          dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-200">
          <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 6.75a9 9 0 110 18 9 9 0 010-18z" />
          </svg>
          <div>
            <p className="font-black text-xs uppercase tracking-widest mb-1">No Analytics Data Yet</p>
            <p className="text-xs font-medium leading-relaxed">
              The analytics services are responding, but this production environment does not yet have enough complaint activity to draw charts.
            </p>
          </div>
        </div>
      )}

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
             {/* Priority Queue Link Module */}
            <div className="rounded-3xl p-6 md:p-8 border transition-all duration-500 flex flex-col justify-center items-center h-full min-h-[250px] relative overflow-hidden group
              dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
              bg-white border-gray-200 shadow-xl hover:border-black hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]">
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-full blur-3xl scale-0 group-hover:scale-[3] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
              
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest mb-4 transition-colors duration-500 dark:text-white text-black relative z-10 text-center">
                Manage Live Queue
              </h2>
              <p className="text-xs md:text-sm font-semibold text-gray-500 dark:text-slate-400 mb-8 text-center max-w-md relative z-10">
                Monitor and manage all live grievances ranked dynamically by Emotion-Decay priority scoring. Filter by region, severity, category, or channel.
              </p>
              
              <Link href="/ub_CREST/queue" className="px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 border shadow-sm relative z-10
                dark:bg-blue-600 dark:border-blue-500 dark:text-white dark:hover:bg-blue-500 dark:shadow-[0_0_20px_rgba(37,99,235,0.4)]
                bg-blue-600 border-blue-700 text-white hover:bg-blue-700 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/30">
                Go to Live Queue →
              </Link>
            </div>
          </div>

          <div className="space-y-8 flex flex-col">
            <div className="rounded-3xl border p-6 md:p-8 transition-all duration-500 flex-1
              dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
              bg-white border-gray-200 shadow-xl hover:border-black">
              <h3 className="text-xs font-black uppercase tracking-widest mb-8 transition-colors duration-500 dark:text-white text-black">Open by Severity</h3>
              <div className="space-y-6">
                {severities.map(s => {
                  const severityStyle = SEVERITY_COLORS[s.severity] || { light: "bg-gray-400", dark: "dark:bg-slate-400" };
                  return (
                    <Link href={`/ub_CREST/queue?severity=${s.severity.split(" ")[0].replace("P", "")}`} key={s.severity} className="flex items-center gap-4 group cursor-pointer">
                      <span className="text-[10px] font-bold w-24 uppercase tracking-wider transition-colors duration-300 dark:text-blue-300 dark:group-hover:text-white text-gray-500 group-hover:text-black">{s.severity}</span>
                      <div className="flex-1 rounded-full h-3 overflow-hidden border transition-colors duration-500 dark:bg-black/80 dark:shadow-inner dark:border-blue-900/50 bg-gray-100 border-gray-300">
                        <div className={`h-full rounded-full transition-all duration-500 ${severityStyle.light} ${severityStyle.dark}`}
                          style={{ width: `${Math.max(5, (s.count / (severities[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-black w-10 text-right transition-colors duration-500 dark:text-white text-black group-hover:text-blue-600 dark:group-hover:text-blue-400">{s.count}</span>
                    </Link>
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
                const displayChannel = c.channel === "web" ? "Public Portal" : c.channel.charAt(0).toUpperCase() + c.channel.slice(1);
                return (
                  <Link href={`/ub_CREST/queue?channel=${c.channel}`} key={c.channel} className="flex flex-col gap-2 group cursor-pointer block">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-300
                      dark:text-blue-300 dark:group-hover:text-white text-gray-500 group-hover:text-black">
                      <span className="flex items-center gap-2">
                        {CHANNEL_ICONS[c.channel] ?? <span className="w-4 h-4 bg-gray-250 dark:bg-gray-800 rounded-full" />}
                        {displayChannel}
                      </span>
                      <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{c.count} ({pct}%)</span>
                    </div>
                    <div className="w-full rounded-full h-2 overflow-hidden border transition-colors duration-500
                      dark:bg-black/80 dark:border-blue-900/50 dark:shadow-inner bg-gray-100 border-gray-300">
                      <div className="h-full rounded-full transition-all duration-500 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)]
                        dark:bg-gradient-to-r dark:from-indigo-600 dark:to-indigo-400 dark:shadow-[0_0_10px_rgba(99,102,241,0.8)]
                        bg-black" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
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
                  <Link href={`/ub_CREST/queue?category=${encodeURIComponent(c.category)}`} key={c.category} className="flex flex-col gap-2 group cursor-pointer block">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-300
                      dark:text-blue-300 dark:group-hover:text-white text-gray-500 group-hover:text-black">
                      <span>{c.category}</span>
                      <span className="group-hover:text-teal-600 dark:group-hover:text-teal-400">{c.count} ({pct}%)</span>
                    </div>
                    <div className="w-full rounded-full h-2 overflow-hidden border transition-colors duration-500
                      dark:bg-black/80 dark:border-blue-900/50 dark:shadow-inner bg-gray-100 border-gray-300">
                      <div className="h-full rounded-full transition-all duration-500 group-hover:shadow-[0_0_10px_rgba(20,184,166,0.5)]
                        dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-400 dark:shadow-[0_0_10px_rgba(20,184,166,0.8)]
                        bg-black" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
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

        {/* --- REGIONAL MONITORING SECTION (SUPER ADMIN ONLY) --- */}
        {user.role === "SUPER_ADMIN" && regionBackendError && (
          <div className="rounded-3xl border px-6 py-4 transition-all duration-500
            bg-amber-50 border-amber-200 text-amber-800
            dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
            <p className="font-black text-xs uppercase tracking-widest mb-1">Regional Panel Temporarily Unavailable</p>
            <p className="text-xs font-medium leading-relaxed">
              Core analytics loaded, but the region-level summary query did not complete. Redeploy the API service after the latest backend analytics fix.
            </p>
          </div>
        )}

        {user.role === "SUPER_ADMIN" && regions && regions.length > 0 && (
          <div className="rounded-3xl border p-6 md:p-8 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden group/regions
            dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl hover:border-blue-500/40
            bg-white border-gray-200 shadow-xl hover:border-black hover:shadow-2xl">
            
            {/* Ambient Background Glow on Hover */}
            <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl scale-0 group-hover/regions:scale-[3] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 relative z-10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest transition-colors duration-500 dark:text-white text-black">
                  Regional Nodal Performance & SLA Health
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                  Live Global Status for Super Admin
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] uppercase font-bold tracking-widest dark:text-emerald-400 text-emerald-700">All Nodes Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 relative z-10">
              {regions.map((r) => (
                <Link href={r.region_id ? `/ub_CREST/queue?region_id=${r.region_id}` : `/ub_CREST/queue`} key={r.region} className="block rounded-2xl border p-5 transition-all duration-500 group/card cursor-pointer
                  dark:bg-white/[0.02] dark:border-white/5 dark:hover:bg-white/[0.04] dark:hover:border-blue-500/30
                  bg-slate-50 border-gray-100 hover:bg-white hover:border-blue-300 hover:-translate-y-1 hover:shadow-md">
                  <p className="text-xs font-extrabold tracking-tight dark:text-white text-gray-900 truncate group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">{r.region}</p>
                  
                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-semibold text-gray-500 dark:text-slate-400">Total Grievances</span>
                      <span className="font-black dark:text-blue-400 text-blue-700">{r.total}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-semibold text-gray-500 dark:text-slate-400">Currently Active</span>
                      <span className="font-black dark:text-amber-400 text-amber-600">{r.open}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-semibold text-gray-500 dark:text-slate-400">SLA Breached</span>
                      <span className={`font-black ${r.breached > 0 ? 'text-red-500 animate-pulse font-extrabold' : 'text-gray-400 dark:text-slate-600'}`}>
                        {r.breached}
                      </span>
                    </div>
                  </div>

                  {/* Minimal progress bar indicators */}
                  <div className="mt-4 w-full bg-gray-200 dark:bg-black/60 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 group-hover/card:shadow-[0_0_8px_rgba(59,130,246,0.5)] ${r.breached > 0 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] group-hover/card:shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-blue-500'}`} 
                      style={{ width: `${Math.min(100, Math.max(5, (r.open / (r.total || 1)) * 100))}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
