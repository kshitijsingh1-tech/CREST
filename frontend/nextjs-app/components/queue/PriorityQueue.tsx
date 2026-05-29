"use client";

/**
 * CREST — PriorityQueue Component
 * Renders the live Emotion-Decay priority queue table.
 * Receives real-time updates via Socket.IO (useSocket hook).
 * Colour-coded by severity and SLA status.
 */

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  instagram: <svg className="w-4 h-4 text-pink-600 dark:text-pink-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
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
  voice: <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
};

const CATEGORY_THEMES = [
  {
    bg: "bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30",
    border: "border-l-indigo-400 dark:border-l-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  {
    bg: "bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30",
    border: "border-l-emerald-400 dark:border-l-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  {
    bg: "bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30",
    border: "border-l-amber-400 dark:border-l-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
  {
    bg: "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-900/30",
    border: "border-l-rose-400 dark:border-l-rose-500",
    text: "text-rose-700 dark:text-rose-300",
  },
  {
    bg: "bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-100/50 dark:hover:bg-sky-900/30",
    border: "border-l-sky-400 dark:border-l-sky-500",
    text: "text-sky-700 dark:text-sky-300",
  },
  {
    bg: "bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-900/30",
    border: "border-l-purple-400 dark:border-l-purple-500",
    text: "text-purple-700 dark:text-purple-300",
  },
  {
    bg: "bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-100/50 dark:hover:bg-teal-900/30",
    border: "border-l-teal-400 dark:border-l-teal-500",
    text: "text-teal-700 dark:text-teal-300",
  },
  {
    bg: "bg-pink-50/40 dark:bg-pink-950/20 hover:bg-pink-100/50 dark:hover:bg-pink-900/30",
    border: "border-l-pink-400 dark:border-l-pink-500",
    text: "text-pink-700 dark:text-pink-300",
  }
];

const getCategoryTheme = (category: string) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CATEGORY_THEMES.length;
  return CATEGORY_THEMES[index];
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
  const searchParams = useSearchParams();
  const initialRegion = searchParams.get("region_id") ? Number(searchParams.get("region_id")) : regionId;
  const initialSeverity = searchParams.get("severity");
  const initialCategory = searchParams.get("category");
  const initialChannel = searchParams.get("channel");

  const [queue, setQueue]     = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash]     = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<number | undefined>(initialRegion);
  const [regions, setRegions] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("priority_score");
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string | null>(initialSeverity);
  const [filterCategory, setFilterCategory] = useState<string | null>(initialCategory);
  const [filterChannel, setFilterChannel] = useState<string | null>(initialChannel);

  // Sync state with URL search params changes dynamically
  useEffect(() => {
    setFilterSeverity(searchParams.get("severity"));
    setFilterCategory(searchParams.get("category"));
    setFilterChannel(searchParams.get("channel"));
    const reg = searchParams.get("region_id");
    if (reg) {
      setCurrentRegion(Number(reg));
    }
  }, [searchParams]);

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("crest_user");
      if (stored) {
        try {
           const u = JSON.parse(stored);
           setUserRole(u.role || "");
           setCurrentUserId(u.user_id || null);

           if (u.role === "SUPER_ADMIN" || u.role === "SUB_ADMIN") {
             import("@/lib/api").then(api => {
               api.listUsers().then(setUsers).catch(console.error);
             });
           }
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

  const filteredQueue = useMemo(() => {
    return queue.filter(c => {
      // Search Box (Case Insensitive)
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const match = 
          c.category?.toLowerCase().includes(sq) ||
          c.sub_category?.toLowerCase().includes(sq) ||
          c.status.toLowerCase().includes(sq) ||
          c.customer_name?.toLowerCase().includes(sq) ||
          c.customer_id?.toLowerCase().includes(sq) ||
          c.subject?.toLowerCase().includes(sq);
        if (!match) return false;
      }

      // Severity
      if (filterSeverity !== null && c.severity?.toString() !== filterSeverity) return false;
      
      // Category
      if (filterCategory && c.category !== filterCategory) return false;
      
      // Channel
      if (filterChannel && c.channel !== filterChannel) return false;

      return true;
    });
  }, [queue, searchQuery, filterSeverity, filterCategory, filterChannel]);

  const sortedQueue = [...filteredQueue].sort((a, b) => {
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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of sortedQueue) {
      if (c.category && c.category.toLowerCase() !== "general") {
        counts[c.category] = (counts[c.category] || 0) + 1;
      }
    }
    return counts;
  }, [sortedQueue]);

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
            placeholder="Search AI category, status, name, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {(filterSeverity || filterCategory || filterChannel) && (
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mr-2">Active Filters:</span>
          {filterSeverity && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/50 dark:border-red-900/30">
              Severity: P{filterSeverity}
              <button onClick={() => {
                setFilterSeverity(null);
                const params = new URLSearchParams(window.location.search);
                params.delete("severity");
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
              }} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-200/60 dark:hover:bg-red-800/40 text-[10px] font-black">×</button>
            </span>
          )}
          {filterCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/50 dark:border-teal-900/30">
              Category: {filterCategory}
              <button onClick={() => {
                setFilterCategory(null);
                const params = new URLSearchParams(window.location.search);
                params.delete("category");
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
              }} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-teal-200/60 dark:hover:bg-teal-800/40 text-[10px] font-black">×</button>
            </span>
          )}
          {filterChannel && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/30">
              Channel: {filterChannel}
              <button onClick={() => {
                setFilterChannel(null);
                const params = new URLSearchParams(window.location.search);
                params.delete("channel");
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
              }} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200/60 dark:hover:bg-blue-800/40 text-[10px] font-black">×</button>
            </span>
          )}
          <button onClick={() => { 
            setFilterSeverity(null); 
            setFilterCategory(null); 
            setFilterChannel(null);
            const params = new URLSearchParams(window.location.search);
            params.delete("severity");
            params.delete("category");
            params.delete("channel");
            window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
          }} className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white px-2 py-1 rounded-lg hover:bg-gray-150 dark:hover:bg-white/5 transition-all">
            Clear All
          </button>
        </div>
      )}

      {flash && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm animate-pulse">
          {flash}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 font-semibold text-xs uppercase tracking-wider animate-pulse">
          Loading priority queue...
        </div>
      ) : (
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
            {sortedQueue.map((c, idx) => {
              const isDuplicateCategory = c.category && categoryCounts[c.category] > 1;
              const theme = isDuplicateCategory ? getCategoryTheme(c.category || "") : null;
              
              return (
                <tr 
                  key={c.id} 
                  className={`
                    transition-all duration-150 relative border-l-4
                    ${theme ? theme.bg : (idx % 2 === 0 ? "bg-white dark:bg-black" : "bg-slate-50 dark:bg-white/5")} 
                    ${c.severity === 0 ? "animate-p0-glow border-l-red-500" : (theme ? theme.border : "border-l-transparent")}
                  `}
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{c.category ?? "—"}</span>
                      {isDuplicateCategory && (
                        <span className={`
                          inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md
                          bg-white/80 dark:bg-black/40 border border-current shadow-sm ${theme?.text}
                          animate-pulse
                        `}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                          Cluster ({categoryCounts[c.category || ""]})
                        </span>
                      )}
                    </div>
                    {c.sub_category && (
                      <span className="block text-gray-400 dark:text-gray-500 text-xs mt-0.5">{c.sub_category}</span>
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

                  {/* Employee — read-only; assignment is handled automatically */}
                  <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {(() => {
                      const assignedUser = users.find(u => u.id === c.assigned_employee_id);
                      if (assignedUser) {
                        return (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[10px] text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                              {assignedUser.name?.charAt(0).toUpperCase() ?? "#"}
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]" title={assignedUser.name}>
                              {assignedUser.name}
                            </span>
                          </div>
                        );
                      }
                      if (c.assigned_employee_id) {
                        return (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-[10px] text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                              #
                            </div>
                            <span className="text-gray-500 dark:text-gray-400">Officer {c.assigned_employee_id}</span>
                          </div>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-400 italic text-[11px]">
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Auto-Routing...
                        </span>
                      );
                    })()}
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
              );
            })}
          </tbody>
        </table>

        {sortedQueue.length === 0 && queue.length > 0 && (
          <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">
            No complaints match your current filters.
          </div>
        )}

        {queue.length === 0 && (
          <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">
            No open complaints — all SLAs on track ✓
          </div>
        )}
        </div>
      )}
    </div>
  );
}
