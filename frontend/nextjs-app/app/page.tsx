/**
 * CREST — Dashboard Home Page
 * Server component: fetches KPIs and renders summary cards.
 * Priority queue is a client component with Socket.IO live updates.
 */

import { getDashboardSummary, getByCategory, getBySeverity, getSpikeSignals } from "@/lib/api";
import PriorityQueue from "@/components/queue/PriorityQueue";

function KPICard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color ?? "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const [summary, categories, severities, spikes] = await Promise.all([
    getDashboardSummary(),
    getByCategory(30),
    getBySeverity(),
    getSpikeSignals(48),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            CREST <span className="text-indigo-600">·</span> Union Bank of India
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Complaint Resolution & Escalation Smart Technology
          </p>
        </div>
        <div className="text-xs text-gray-400">
          {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
        </div>
      </header>

      <main className="px-8 py-6 space-y-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard label="Open" value={summary.total_open} />
          <KPICard label="P0 Critical" value={summary.p0_open}
            color={summary.p0_open > 0 ? "text-red-600" : "text-green-600"} />
          <KPICard label="SLA Breached" value={summary.sla_breached}
            color={summary.sla_breached > 0 ? "text-red-600" : "text-green-600"} />
          <KPICard label="Resolved Today" value={summary.resolved_today} color="text-green-600" />
          <KPICard label="Duplicates Caught" value={summary.duplicates_caught}
            sub="Cross-channel dedup" color="text-indigo-600" />
          <KPICard label="Avg Resolution" value={`${summary.avg_resolution_hrs}h`}
            sub="All-time" />
        </div>

        {/* Spike Signals */}
        {spikes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-amber-800 mb-3">
              ⚡ Proactive Spike Signals (Last 48hr)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {spikes.map(s => (
                <div key={s.id} className="bg-white rounded-lg border border-amber-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 capitalize">
                      {s.signal_type.replace("_", " ")}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      s.predicted_surge_pct > 30 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      +{s.predicted_surge_pct}% surge predicted
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority Queue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              Live Priority Queue
              <span className="ml-2 text-xs text-gray-400 font-normal">
                Emotion-Decay ranking · refreshes every 5 min
              </span>
            </h2>
          </div>
          <PriorityQueue />
        </div>

        {/* Category + Severity breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Open by Category (30d)</h3>
            <div className="space-y-2">
              {categories.slice(0, 8).map(c => (
                <div key={c.category} className="flex items-center gap-2">
                  <span className="text-xs w-24 text-gray-600 truncate">{c.category}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full"
                      style={{ width: `${(c.count / (categories[0]?.count || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Open by Severity</h3>
            <div className="space-y-2">
              {severities.map(s => {
                const colors: Record<string, string> = {
                  "P0 Critical": "bg-red-500",
                  "P1 High":     "bg-orange-500",
                  "P2 Medium":   "bg-yellow-500",
                  "P3 Low":      "bg-blue-400",
                  "P4 Info":     "bg-gray-300",
                };
                return (
                  <div key={s.severity} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-gray-600">{s.severity}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${colors[s.severity] ?? "bg-gray-400"}`}
                        style={{ width: `${(s.count / (severities[0]?.count || 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{s.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
