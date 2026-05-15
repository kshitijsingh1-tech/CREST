"use client";

import { useEffect, useState } from "react";
import { getRegions } from "@/lib/api";
import Header from "@/components/Header";

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
      const res = await fetch("http://localhost:8000/api/complaints/ingest", {
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
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl text-center border-4 border-black">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">✓</div>
          <h2 className="text-2xl font-black mb-2">Complaint Submitted</h2>
          <p className="text-gray-600 mb-6">Your reference ID is <b>{result.complaint_id}</b></p>
          <p className="text-xs text-gray-400 mb-6 uppercase tracking-widest">Auto-assigned to regional staff</p>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-black text-white font-black rounded-xl uppercase tracking-widest hover:scale-105 transition-transform">Submit Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full py-12 px-6">
      <h1 className="text-4xl font-black mb-8 tracking-tighter italic">LODGE A GRIEVANCE</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Customer ID / Email</label>
            <input required value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Full Name</label>
            <input required value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Region / Branch</label>
          <select 
            required 
            value={form.region_id} 
            onChange={e => setForm({...form, region_id: e.target.value})}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none appearance-none"
          >
            <option value="">Select your nearest region...</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Subject</label>
          <input required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none" />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Detailed Complaint</label>
          <textarea required rows={5} value={form.body} onChange={e => setForm({...form, body: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none" />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-5 bg-black text-white font-black rounded-2xl uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Process Grievance →"}
        </button>
      </form>
    </div>
  );
}
