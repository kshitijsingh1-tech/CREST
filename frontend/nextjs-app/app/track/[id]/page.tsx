"use client";

import { useEffect, useState } from "react";
import { trackComplaint } from "@/lib/api";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function CustomerTrackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routingStatus, setRoutingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [routingMsg, setRoutingMsg] = useState("");

  const fetchComplaintDetails = () => {
    if (id) {
      trackComplaint(id)
        .then(setData)
        .catch((err) => setError("Grievance ID not found or invalid"))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  // Handle auto-routing via query param (e.g. ?set_region=Mumbai)
  useEffect(() => {
    const targetRegion = searchParams.get("set_region");
    if (targetRegion && id && data && !data.region_id && routingStatus === "idle") {
      handleSetRegion(targetRegion);
    }
  }, [searchParams, id, data]);

  const handleSetRegion = async (regionName: string) => {
    setRoutingStatus("loading");
    try {
      const res = await fetch("/api/public/set-region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_token: id, region_name: regionName })
      });
      if (res.ok) {
        setRoutingStatus("success");
        setRoutingMsg(`Grievance successfully routed to ${regionName} nodal branch!`);
        // Refresh complaint data to reflect the new region and assigned agent
        trackComplaint(id).then((freshData) => {
          setData(freshData);
        });
      } else {
        const errData = await res.json();
        setRoutingStatus("error");
        setRoutingMsg(errData.detail || "Failed to set region.");
      }
    } catch (err) {
      setRoutingStatus("error");
      setRoutingMsg("Network error routing grievance.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#020817]">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020817] p-8">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Grievance Not Found</h1>
          <p className="text-gray-400 text-sm">We couldn't locate a complaint with ID <span className="text-red-400 font-mono">{id}</span>. Please check your reference number and try again.</p>
          <Link href="/" className="inline-block px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { label: "Received", status: "completed" },
    { label: "Triage", status: data.status !== "pending" ? "completed" : "active" },
    { label: "Investigation", status: data.status === "in_progress" ? "active" : data.status === "resolved" ? "completed" : "pending" },
    { label: "Resolved", status: data.status === "resolved" ? "completed" : "pending" },
  ];

  return (
    <div className="flex-1 bg-transparent p-6 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]">Customer Mirror Portal</p>
            <h1 className="text-4xl md:text-6xl font-black transition-colors duration-500 dark:text-white text-black tracking-tighter uppercase dark:drop-shadow-sm">Grievance Status</h1>
            <p className="text-gray-500 font-mono text-xs opacity-60 tracking-widest">ID: {id}</p>
          </div>
          <div className={`px-6 py-2 rounded-xl border font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-500
            ${data.status === 'resolved' ? 'dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-400 bg-green-50 border-green-200 text-green-700' : 
              data.status === 'in_progress' ? 'dark:bg-blue-500/10 dark:border-blue-500/40 dark:text-blue-400 bg-blue-50 border-blue-200 text-blue-700' : 
              'dark:bg-red-500/10 dark:border-red-500/40 dark:text-red-400 bg-red-50 border-red-200 text-red-700'}`}>
            <span className="w-2 h-2 rounded-full inline-block mr-3 animate-pulse bg-current"></span>
            {data.status.replace('_', ' ')}
          </div>
        </div>

        {/* Status Stepper */}
        <div className="dark:bg-black/80 dark:backdrop-blur-2xl dark:border-white/10 bg-white shadow-2xl border border-gray-200 rounded-3xl p-10 transition-all duration-700">
          <div className="relative flex justify-between">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 w-full h-[2px] dark:bg-white/5 bg-gray-100 -z-0"></div>
            <div className="absolute top-5 left-0 h-[2px] transition-all duration-1000 z-0 bg-gradient-to-r from-blue-600 to-blue-400 dark:shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
              style={{ width: `${(steps.filter(s => s.status === 'completed').length / (steps.length - 1)) * 100}%` }}></div>

            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center gap-4 relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500
                  ${step.status === 'completed' ? 'bg-blue-600 border-blue-600 dark:shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 
                    step.status === 'active' ? 'bg-white dark:bg-black border-blue-500 animate-pulse' : 
                    'bg-white dark:bg-black border-gray-200 dark:border-white/10'}`}>
                  {step.status === 'completed' ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${step.status === 'active' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-white/10'}`}></div>
                  )}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-500
                  ${step.status !== 'pending' ? 'dark:text-white text-black' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Region Routing Selector (if none set) */}
        {!data.region_id && data.status !== 'resolved' && data.status !== 'withdrawn' && (
          <div className="dark:bg-black/80 dark:backdrop-blur-2xl dark:border-white/10 bg-white shadow-2xl border border-gray-200 rounded-3xl p-8 space-y-6 transition-all duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Action Required: Nodal Branch Routing</h2>
                </div>
                <p className="dark:text-white text-black font-black text-lg tracking-tight">Select your nearest nodal branch to route your ticket.</p>
                <p className="text-gray-400 text-xs">Routing your ticket connects you to a specialized agent in your region for faster resolution.</p>
              </div>
            </div>

            {routingStatus === "loading" && (
              <div className="flex items-center gap-3 text-xs text-blue-500 font-bold uppercase tracking-wider animate-pulse">
                <span className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></span>
                Routing ticket, please wait...
              </div>
            )}

            {routingStatus === "success" && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                {routingMsg}
              </div>
            )}

            {routingStatus === "error" && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-bold uppercase tracking-wider flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {routingMsg}
              </div>
            )}

            {routingStatus !== "success" && routingStatus !== "loading" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["Delhi", "Mumbai", "Bangalore"].map((region) => (
                  <button
                    key={region}
                    onClick={() => handleSetRegion(region)}
                    className="group relative overflow-hidden px-6 py-4 rounded-2xl dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 text-left hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] dark:text-blue-400 text-blue-600 mb-1">📍 Nodal Branch</p>
                    <p className="dark:text-white text-black font-black text-base tracking-tight uppercase">{region}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 bg-white border border-gray-200 shadow-xl rounded-3xl p-8 space-y-6 hover:-translate-y-1 transition-all duration-500 group">
             <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-2xl scale-0 group-hover:scale-[4] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] dark:text-blue-400 text-blue-600 relative z-10">Grievance Information</h2>
            <div className="space-y-5 relative z-10">
              <div>
                <p className="text-[9px] uppercase dark:text-gray-500 text-gray-400 font-black tracking-widest mb-1">Subject of matter</p>
                <p className="dark:text-white text-black font-black text-lg tracking-tight">{data.subject || "General Enquiry"}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase dark:text-gray-500 text-gray-400 font-black tracking-widest mb-1">Classification</p>
                <p className="dark:text-white text-black font-bold uppercase tracking-widest text-xs">{data.category}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase dark:text-gray-500 text-gray-400 font-black tracking-widest mb-1">Logged timestamp</p>
                <p className="dark:text-white text-black font-mono text-xs">{new Date(data.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 bg-white border border-gray-200 shadow-xl rounded-3xl p-8 space-y-6 hover:-translate-y-1 transition-all duration-500 group">
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full blur-2xl scale-0 group-hover:scale-[4] transition-transform duration-700 ease-out z-0 pointer-events-none"></div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] dark:text-red-400 text-red-600 relative z-10">Resolution Journey</h2>
            <div className="space-y-5 relative z-10">
              <div>
                <p className="text-[9px] uppercase dark:text-gray-500 text-gray-400 font-black tracking-widest mb-1">RBI Mandated Deadline</p>
                <p className="dark:text-white text-black font-mono text-xs">
                  {data.status === 'resolved' ? 'Resolved within SLA' : new Date(data.sla_deadline).toLocaleString()}
                </p>
              </div>
              {data.status === 'resolved' && (
                <div className="p-5 dark:bg-emerald-500/10 dark:border-emerald-500/30 bg-green-50 border border-green-200 rounded-2xl space-y-2">
                  <p className="text-[9px] uppercase dark:text-emerald-400 text-green-700 font-black tracking-widest">Official Resolution</p>
                  <p className="dark:text-emerald-50 text-green-900 text-sm italic font-medium leading-relaxed">"{data.resolution_note}"</p>
                  <p className="text-[9px] dark:text-emerald-500/60 text-green-600/60 font-mono uppercase tracking-widest">Completed on {new Date(data.resolved_at).toLocaleDateString()}</p>
                </div>
              )}
              {data.status !== 'resolved' && (
                <div className="p-5 dark:bg-blue-600/10 dark:border-blue-500/30 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg dark:bg-blue-500/20 bg-blue-600/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 dark:text-blue-400 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[11px] dark:text-blue-200 text-blue-800 leading-relaxed font-bold uppercase tracking-tight">
                    Union Bank Intelligence (CREST) is currently processing this grievance. An official response is pending final agent verification.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center pt-8">
          <Link href="/" className="dark:text-gray-500 text-gray-400 hover:text-blue-500 dark:hover:text-white transition-all duration-300 text-[10px] font-black uppercase tracking-[0.5em] flex items-center gap-4 group">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Exit Track Portal
          </Link>
        </div>

      </div>
    </div>
  );
}
