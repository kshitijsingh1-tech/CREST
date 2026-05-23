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
const SEVERITY_BADGE: Record<number, string> = {
  0: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800",
  1: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800",
  2: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800",
  3: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800",
  4: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-800",
};

const SLA_COLOR: Record<string, string> = {
  breached: "text-red-600 font-bold animate-pulse",
  warning: "text-amber-500 font-bold",
  on_track: "text-emerald-500",
  resolved: "text-gray-400 dark:text-gray-600",
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  whatsapp: <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 2C6.446 2 1.921 6.513 1.918 12.083c0 1.781.464 3.518 1.341 5.04L2 22l5.068-1.325c1.472.802 3.125 1.226 4.811 1.229h.004c5.586 0 10.111-4.513 10.114-10.082 0-2.7-1.054-5.236-2.964-7.142A9.97 9.97 0 0 0 12.031 2z" /></svg>,
  sms: <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  app: <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  twitter: <svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>,
  voice: <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
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
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("crest_user");
      if (stored) {
        try {
           const u = JSON.parse(stored);
           setUserRole(u.role || "");
           setCurrentUserId(u.user_id || null);
        } catch {}
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getPriorityQueue(50, currentRegion);
      setQueue(data);
    } catch (err: any) {
      console.error("Queue refresh failed:", err);
      if (err.message.includes("401")) {
        // Token expired or missing
        window.location.href = "/ub_CREST/login";
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
              <tr 
                key={c.id} 
                className={`${idx % 2 === 0 ? "bg-white dark:bg-black" : "bg-slate-50 dark:bg-white/5"} ${c.severity === 0 ? "animate-p0-glow border-l-4 border-l-red-500" : "border-l-4 border-l-transparent"}`}
              >
                {/* Priority score */}
                <td className="px-3 py-3 font-mono text-xs text-indigo-700 dark:text-indigo-400 font-bold">
                  {Number(c.priority_score).toFixed(2)}
                </td>

                {/* Severity badge */}
                <td className="px-3 py-3">
                  <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${SEVERITY_BADGE[c.severity ?? 4]}`}>
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
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {CHANNEL_ICONS[c.channel] || <span className="w-4 h-4 bg-gray-200 rounded-sm" />}
                    <span className="capitalize text-gray-600 dark:text-gray-400">{c.channel}</span>
                  </div>
                </td>

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
                  {c.assigned_employee_id ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[10px] text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
                        {c.assigned_employee_id}
                      </div>
                      <span>Agent ID</span>
                      {userRole !== "EMPLOYEE" && c.assigned_employee_id !== currentUserId && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              if (!currentUserId) return;
                              await import("@/lib/api").then(api => api.assignComplaint(c.id, currentUserId));
                              refresh();
                            } catch (err) { console.error(err); }
                          }}
                          className="ml-2 text-[10px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded font-bold uppercase hover:bg-red-100 transition-colors"
                        >
                          Takeover
                        </button>
                      )}
                    </div>
                  ) : userRole === "EMPLOYEE" ? (
                    <span className="text-gray-400 italic">Unassigned</span>
                  ) : (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          if (!currentUserId) return;
                          await import("@/lib/api").then(api => api.assignComplaint(c.id, currentUserId));
                          refresh();
                        } catch (err) { console.error(err); }
                      }}
                      className="text-[10px] px-2 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-900/50 rounded-lg font-black uppercase tracking-tighter hover:bg-amber-100 transition-colors"
                    >
                      Assign to Me
                    </button>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {c.draft_reply && c.status === "OPEN" && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm("Quick Resolve using AI Draft?")) return;
                          try {
                            const userStr = localStorage.getItem("crest_user");
                            const user = userStr ? JSON.parse(userStr) : { name: "System" };
                            await import("@/lib/api").then(api => api.resolveComplaint(c.id, user.name, "Resolved via Quick-Action Dashboard"));
                            refresh();
                          } catch (err) { console.error(err); }
                        }}
                        title="Quick Resolve with AI Draft"
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-all border border-green-500/20"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </button>
                    )}
                    <Link
                      href={`/complaints/${c.id}`}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </Link>
                  </div>
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
