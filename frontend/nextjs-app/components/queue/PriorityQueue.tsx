"use client";

/**
 * CREST — PriorityQueue Component
 * Renders the live Emotion-Decay priority queue table.
 * Receives real-time updates via Socket.IO (useSocket hook).
 * Colour-coded by severity and SLA status.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getPriorityQueue, type Complaint } from "@/lib/api";
import { useSocket } from "@/lib/useSocket";

const SEVERITY_LABEL: Record<number, string> = {
  0: "P0", 1: "P1", 2: "P2", 3: "P3", 4: "P4",
};
const SEVERITY_COLOR: Record<number, string> = {
  0: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
  1: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900",
  2: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-900",
  3: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
  4: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-800",
};
const SLA_COLOR: Record<string, string> = {
  on_track: "text-green-600 dark:text-green-500",
  at_risk:  "text-amber-600 dark:text-amber-500",
  breached: "text-red-600 dark:text-red-500 font-bold",
  resolved: "text-gray-400 dark:text-gray-600",
};

function hoursUntilSLA(deadline: string | null): string {
  if (!deadline) return "—";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Breached";
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h` : `${h}h`;
}

export default function PriorityQueue({ regionId }: { regionId?: number }) {
  const [queue, setQueue]     = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash]     = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<number | undefined>(regionId);
  const [regions, setRegions] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getPriorityQueue(50, currentRegion);
      setQueue(data);
    } catch (err: any) {
      console.error("Queue refresh failed:", err);
      if (err.message.includes("401")) {
        // Token expired or missing
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  }, [currentRegion]);

  useEffect(() => { 
    refresh(); 
    // Fetch regions for filtering
    import("@/lib/api").then(api => api.getRegions().then(setRegions)).catch(console.error);
  }, [refresh]);

  useSocket({
    onQueueUpdated: () => refresh(),
    onNewComplaint: (data) => {
      setFlash(`New ${data.severity === 0 ? "🚨 P0" : ""} complaint: ${data.category}`);
      setTimeout(() => setFlash(null), 4000);
      refresh();
    },
  });

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400">
      Loading priority queue…
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          Filters
        </button>

        {showFilters && (
          <div className="flex gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">By Region</label>
              <select 
                value={currentRegion || ""} 
                onChange={(e) => setCurrentRegion(e.target.value ? Number(e.target.value) : undefined)}
                className="block w-full bg-transparent border-b-2 border-gray-300 dark:border-white/20 text-xs font-bold py-1 focus:border-black dark:focus:border-white outline-none"
              >
                <option value="">All Regions</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">By Column</label>
              <input 
                type="text"
                placeholder="Search category, status..."
                onChange={(e) => {
                  const val = e.target.value.toLowerCase();
                  if (!val) { refresh(); return; }
                  setQueue(prev => prev.filter(c => 
                    c.category?.toLowerCase().includes(val) || 
                    c.status.toLowerCase().includes(val) ||
                    c.customer_name?.toLowerCase().includes(val)
                  ));
                }}
                className="block w-full bg-transparent border-b-2 border-gray-300 dark:border-white/20 text-xs font-bold py-1 focus:border-black dark:focus:border-white outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {flash && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm animate-pulse">
          {flash}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-sm">
          <thead className="bg-gray-50 dark:bg-black">
            <tr>
              {["Priority", "Sev.", "Category", "Customer", "Channel", "Anger", "SLA", "Status", "Agent", ""].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-black divide-y divide-gray-100 dark:divide-white/5">
            {queue.map((c, idx) => (
              <tr key={c.id} className={idx % 2 === 0 ? "bg-white dark:bg-black" : "bg-slate-50 dark:bg-white/5"}>
                {/* Priority score */}
                <td className="px-3 py-3 font-mono text-xs text-indigo-700 dark:text-indigo-400 font-bold">
                  {Number(c.priority_score).toFixed(2)}
                </td>

                {/* Severity badge */}
                <td className="px-3 py-3">
                  <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${SEVERITY_COLOR[c.severity ?? 4]}`}>
                    {SEVERITY_LABEL[c.severity ?? 4]}
                  </span>
                </td>

                {/* Category */}
                <td className="px-3 py-3 text-gray-800 dark:text-gray-200 font-medium">
                  {c.category ?? "—"}
                  {c.sub_category && (
                    <span className="block text-gray-400 dark:text-gray-500 text-xs">{c.sub_category}</span>
                  )}
                </td>

                {/* Customer */}
                <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                  <span className="font-mono text-xs">{c.customer_id}</span>
                  {c.customer_name && (
                    <span className="block text-gray-400 dark:text-gray-500 text-xs">{c.customer_name}</span>
                  )}
                </td>

                {/* Channel */}
                <td className="px-3 py-3 text-gray-600 dark:text-gray-400 capitalize">{c.channel}</td>

                {/* Anger score */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-16 bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(c.anger_score ?? 0) * 100}%`,
                          backgroundColor: (c.anger_score ?? 0) > 0.8 ? "#ef4444"
                            : (c.anger_score ?? 0) > 0.5 ? "#f97316" : "#22c55e",
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{((c.anger_score ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                </td>

                {/* SLA */}
                <td className={`px-3 py-3 text-xs ${SLA_COLOR[c.sla_status]}`}>
                  {hoursUntilSLA(c.sla_deadline)}
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <span className="capitalize text-xs text-gray-600 dark:text-gray-400">{c.status.replace("_", " ")}</span>
                </td>

                {/* Employee */}
                <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {c.assigned_employee_id ? `ID: ${c.assigned_employee_id}` : <span className="text-amber-500">Unassigned</span>}
                </td>

                {/* Action */}
                <td className="px-3 py-3">
                  <Link
                    href={`/complaints/${c.id}`}
                    className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/80 dark:text-indigo-200 transition-colors"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {queue.length === 0 && (
          <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">
            No open complaints — all SLAs on track ✓
          </div>
        )}
      </div>
    </div>
  );
}
