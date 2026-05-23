"use client";

import { useEffect, useState } from "react";
import { getRegions } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, FileText, Send, User, MapPin, AlignLeft, CheckCircle2, Search, Mail } from "lucide-react";
import ColorBends from "@/components/ColorBends";

export default function SubmitComplaint() {
  const [regions, setRegions] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    customer_name: "",
    subject: "",
    body: "",
    region_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    getRegions().then(setRegions).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/complaints/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          channel: "web_portal",
          region_id: form.region_id ? Number(form.region_id) : null,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Failed to submit complaint");
    }
    setLoading(false);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col justify-center items-center p-6 py-12 relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
          <ColorBends 
            colors={["#ef4444", "#3b82f6"]} 
            speed={0.05} 
            warpStrength={0.3}
            iterations={1}
            bandWidth={5}
          />
        </div>

        <div className="absolute top-6 left-6 md:top-8 md:left-8 z-30">
          <Link href="/ub_publicPortal" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors bg-white/80 dark:bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-full shadow-md border border-slate-200 dark:border-white/10">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
          </Link>
        </div>

        <div className="w-full max-w-xl animate-fade-in-up relative z-10 space-y-6">
          <div className="bg-white dark:bg-[#090d16] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/5 p-10 md:p-12 text-center relative overflow-hidden group space-y-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
            
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div>
              <h2 className="text-xl font-black mb-1 uppercase tracking-widest dark:text-white text-[#0f2347]">Grievance Lodged</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold leading-relaxed">
                Your reference ID is securely generated. Please keep it safe.
              </p>
            </div>
            
            <div className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-center select-all cursor-copy hover:border-blue-500/30 transition-colors">
              <span className="font-mono text-lg font-black tracking-widest dark:text-blue-400 text-blue-700">
                {result.complaint_id}
              </span>
            </div>
            
            <div className="space-y-3 pt-2">
              <Link href="/track" className="w-full flex items-center justify-center gap-2 py-4 bg-[#0052ff] hover:bg-[#0041cc] text-white font-black rounded-2xl uppercase tracking-widest transition-all duration-300 shadow-lg text-xs">
                <Search className="w-4 h-4" /> Track Status Now
              </Link>
              <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center py-4 bg-transparent border border-slate-200 dark:border-white/10 dark:text-white text-slate-700 font-black rounded-2xl uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 text-xs">
                Lodge Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col justify-center items-center p-6 py-12 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
        <ColorBends 
          colors={["#ef4444", "#3b82f6"]} 
          speed={0.05} 
          warpStrength={0.3}
          iterations={1}
          bandWidth={5}
        />
      </div>

      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-30">
        <Link href="/ub_publicPortal" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors bg-white/80 dark:bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-full shadow-md border border-slate-200 dark:border-white/10">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
        </Link>
      </div>

      <div className="w-full max-w-2xl animate-fade-in-up relative z-10 space-y-8">
        
        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-black shadow-xl border border-slate-100 dark:border-white/5 overflow-hidden">
            <img src="/crest_logo.png" alt="CREST Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase flex justify-center items-center gap-0.5 dark:text-white text-slate-800">
            <span className="text-[#0052ff]">ub_</span>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #0052ff, #4a22ff, #9b1aff, #e31837, #ff2200)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CREST
            </span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest dark:text-slate-400 text-slate-500 font-extrabold">Grievance Lodging Gateway</p>
        </div>

        {/* Lodging Card */}
        <div className="bg-white dark:bg-[#090d16] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden p-8 md:p-12 space-y-8">
          
          <div className="flex flex-col md:flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5 gap-4">
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" /> Lodge a Grievance
            </h2>
            <Link href="/track" className="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 hover:underline transition-colors uppercase flex items-center gap-1.5">
              Track Status <Search className="w-3.5 h-3.5" />
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Customer ID / Email</label>
                <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-100 dark:bg-white/5 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)] border border-slate-200 dark:border-white/5">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <Mail className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input required value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} className="block w-full pl-10 pr-3.5 py-4 bg-white dark:bg-black rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors text-sm" placeholder="user@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Full Name</label>
                <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-100 dark:bg-white/5 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)] border border-slate-200 dark:border-white/5">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <User className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input required value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className="block w-full pl-10 pr-3.5 py-4 bg-white dark:bg-black rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors text-sm" placeholder="John Doe" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Region / Branch</label>
              <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-100 dark:bg-white/5 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)] border border-slate-200 dark:border-white/5">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <MapPin className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <select required value={form.region_id} onChange={e => setForm({...form, region_id: e.target.value})} className="block w-full pl-10 pr-3.5 py-4 bg-white dark:bg-black rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors text-sm appearance-none">
                  <option value="">Select your nearest region...</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Subject</label>
              <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-100 dark:bg-white/5 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)] border border-slate-200 dark:border-white/5">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <FileText className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="block w-full pl-10 pr-3.5 py-4 bg-white dark:bg-black rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors text-sm" placeholder="Brief summary of issue" />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Detailed Complaint</label>
              <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-100 dark:bg-white/5 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)] border border-slate-200 dark:border-white/5">
                <div className="absolute top-4 left-0 pl-3.5 flex items-start pointer-events-none z-10">
                  <AlignLeft className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <textarea required rows={5} value={form.body} onChange={e => setForm({...form, body: e.target.value})} className="block w-full pl-10 pr-3.5 py-4 bg-white dark:bg-black rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors text-sm resize-none" placeholder="Please describe the issue in detail..." />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4.5 px-4 border border-transparent rounded-2xl shadow-lg text-xs font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-70 transition-all duration-300 active:scale-[0.99] mt-6"
            >
              {loading ? "Processing..." : "Process Grievance"} <Send className="w-4 h-4 ml-1" />
            </button>
          </form>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5">
            <p className="text-[9px] text-center text-slate-400 dark:text-slate-500/80 leading-relaxed font-bold uppercase tracking-wider">
              <strong>Official Notice:</strong> Please protect your session. Operations are monitored. Misuse of the grievance lodging portal may lead to action under applicable laws.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
