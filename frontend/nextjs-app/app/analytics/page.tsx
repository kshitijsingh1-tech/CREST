import Link from "next/link";
import { getVolumeTrend, getChannelDistribution, getByCategory, getSpikeSignals } from "@/lib/api";
import VolumeTrendChart from "@/components/charts/VolumeTrendChart";

export default async function AnalyticsPage() {
  const [trend, channels, categories, spikes] = await Promise.all([
    getVolumeTrend(14),
    getChannelDistribution(30),
    getByCategory(30),
    getSpikeSignals(168),   // last 7 days
  ]);

  const totalComplaints = categories.reduce((sum, c) => sum + c.count, 0);
  const totalChannels   = channels.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="flex-1 bg-transparent p-6 md:p-10 space-y-10 max-w-[90rem] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
         <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase transition-colors duration-500 dark:text-white text-black dark:drop-shadow-sm">Analytics</h1>
          <p className="text-xs uppercase tracking-widest mt-2 font-bold transition-colors duration-500 dark:text-blue-300 text-gray-600">Historical trends and deep dives</p>
        </div>
        <Link href="/dashboard" className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-500 border shadow-sm
          dark:bg-blue-900/30 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-900/50
          bg-gray-100 border-gray-300 text-black hover:bg-gray-200">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="space-y-8">
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
                const pct = Math.round((c.count / totalChannels) * 100);
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
                const pct = Math.round((c.count / totalComplaints) * 100);
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
