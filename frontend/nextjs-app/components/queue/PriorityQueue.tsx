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
  web: <img src="/crest_logo.png" className="w-4 h-4 rounded-sm object-cover" alt="CREST" />,
  whatsapp: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#25D366" />
      <path fillRule="evenodd" clipRule="evenodd" d="M12.03 5C8.15 5 5 8.15 5 12.03c0 1.27.34 2.5.98 3.58L5 20l4.52-.95c1.04.57 2.2.87 3.5.87 3.88 0 7.03-3.15 7.03-7.03C20.06 8.15 16.9 5 12.03 5zm3.62 10.05c-.15.42-.76.81-1.05.86-.29.05-.65.08-1.89-.43-1.6-.66-2.61-2.28-2.69-2.39-.08-.11-.68-.9-.68-1.72s.43-1.22.58-1.37c.15-.15.34-.19.45-.19.1 0 .26 0 .4.3.15.35.53 1.27.57 1.35.04.09.07.19.02.3-.06.11-.09.19-.17.28-.08.09-.18.21-.25.29-.08.08-.17.18-.08.35.1.18.46.76.99 1.23.68.6 1.25.79 1.43.87.18.08.28-.02.39-.13.1-.11.45-.52.57-.7.12-.18.24-.15.41-.09.17.06 1.07.5 1.25.6.18.09.3.14.34.22.04.08.04.44-.1.86z" fill="white" />
    </svg>
  ),
  email: <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  sms: <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  app: <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  twitter: <svg className="w-4 h-4 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
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
  const [sortBy, setSortBy] = useState<string>("priority_score");

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

  const sortedQueue = [...queue].sort((a, b) => {
    if (sortBy === "priority_score") {
      return Number(b.priority_score || 0) - Number(a.priority_score || 0);
    } else if (sortBy === "anger_score") {
      return Number(b.anger_score || 0) - Number(a.anger_score || 0);
    } else if (sortBy === "sla_deadline") {
      const timeA = a.sla_deadline ? new Date(a.sla_deadline).getTime() : Infinity;
      const timeB = b.sla_deadline ? new Date(b.sla_deadline).getTime() : Infinity;
      return timeA - timeB;
    } else if (sortBy === "created_at") {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    }
    return 0;
  });

  return (
    <div className="w-full">
      {/* Modern Filter Bar (Always visible) */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 mb-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm transition-all">
        {/* Left: AI Search Input */}
        <div className="relative w-full md:w-1/2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text"
            placeholder="Search AI category, status, name..."
            onChange={(e) => {
              const val = e.target.value.toLowerCase();
              if (!val) { refresh(); return; }
              setQueue(prev => prev.filter(c => 
                c.category?.toLowerCase().includes(val) || 
                c.status.toLowerCase().includes(val) ||
                c.customer_name?.toLowerCase().includes(val)
              ));
            }}
            className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-gray-400 dark:text-white"
          />
        </div>

        {/* Right: Dropdowns */}
        <div className="flex w-full md:w-auto gap-3">
          {/* Sort By Dropdown */}
          <div className="relative group flex-1 md:flex-none min-w-[180px]">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none block w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer"
            >
              <option value="priority_score">Sort: Priority (High - Low)</option>
              <option value="anger_score">Sort: Anger (High - Low)</option>
              <option value="sla_deadline">Sort: SLA (Soonest)</option>
              <option value="created_at">Sort: Date (Newest)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {/* Region Dropdown */}
          <div className="relative group flex-1 md:flex-none min-w-[150px]">
            <select 
              value={currentRegion || ""} 
              onChange={(e) => setCurrentRegion(e.target.value ? Number(e.target.value) : undefined)}
              className="appearance-none block w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer"
            >
              <option value="">All Regions</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
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
            {sortedQueue.map((c, idx) => (
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
                    <span className="text-gray-600 dark:text-gray-400">
                      {c.channel === "web" ? "Public Portal" : c.channel.charAt(0).toUpperCase() + c.channel.slice(1)}
                    </span>
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
