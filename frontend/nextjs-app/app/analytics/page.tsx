/**
 * CREST — Analytics Page
 * Server component: fetches all chart data.
 * VolumeTrendChart is a client component (uses Recharts).
 */

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
        <Link href="/" className="text-xs text-indigo-600 hover:underline">← Dashboard</Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-sm font-semibold text-gray-700">Analytics</h1>
      </header>

      <main className="px-8 py-6 space-y-6">
        {/* Volume trend */}
        <VolumeTrendChart data={trend} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Channel distribution */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">By Channel (30d)</h3>
            <div className="space-y-3">
              {channels.map(c => {
                const pct = Math.round((c.count / totalChannels) * 100);
                const icons: Record<string, string> = {
                  email: "📧", whatsapp: "💬", app: "📱", twitter: "🐦", voice: "📞", branch: "🏦"
                };
                return (
                  <div key={c.channel}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 capitalize">{icons[c.channel] ?? "•"} {c.channel}</span>
                      <span className="text-gray-500">{c.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">By Category (30d)</h3>
            <div className="space-y-3">
              {categories.map(c => {
                const pct = Math.round((c.count / totalComplaints) * 100);
                return (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{c.category}</span>
                      <span className="text-gray-500">{c.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spike signals history */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Spike Signals (7d)</h3>
            {spikes.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No signals this week.</p>
            ) : (
              <div className="space-y-3">
                {spikes.map(s => (
                  <div key={s.id} className="border-l-2 border-amber-300 pl-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-gray-700 capitalize">
                        {s.signal_type.replace("_", " ")}
                      </span>
                      <span className="text-xs font-bold text-amber-600">
                        +{s.predicted_surge_pct}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.signal_ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
