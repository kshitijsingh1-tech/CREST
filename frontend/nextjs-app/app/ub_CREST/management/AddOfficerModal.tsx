"use client";

import { useState } from "react";
import { createUser, Region } from "@/lib/api";
import { X, UserPlus, Loader2, KeyRound, Mail, MapPin, Shield, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  regions: Region[];
  currentUserRole: string;
}

export default function AddOfficerModal({ regions, currentUserRole }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "EMPLOYEE",
    region_id: regions.length > 0 ? String(regions[0].id) : ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        password: formData.password,
        role: formData.role,
        region_id: formData.region_id ? parseInt(formData.region_id) : null
      });
      
      setIsOpen(false);
      setFormData({
        name: "", email: "", phone: "", password: "", role: "EMPLOYEE", 
        region_id: regions.length > 0 ? String(regions[0].id) : ""
      });
      router.refresh(); // Refresh RSC data to show new user
    } catch (err: any) {
      setError(err.message || "Failed to create officer account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-500 shadow-xl
          dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-black dark:shadow-emerald-500/20
          bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
      >
        <UserPlus className="w-4 h-4" /> Add Officer
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg rounded-3xl border p-8 shadow-2xl animate-in zoom-in-95 duration-300
            dark:bg-slate-950 dark:border-slate-800 dark:text-white
            bg-white border-gray-200 text-black">
            
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center dark:bg-emerald-500/20 bg-emerald-100">
                <UserPlus className="w-6 h-6 dark:text-emerald-400 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Provision Personnel</h2>
                <p className="text-[10px] uppercase tracking-widest font-bold dark:text-slate-400 text-gray-500">Create new system access</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl border dark:bg-red-950/50 dark:border-red-900/50 bg-red-50 border-red-200">
                <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-black dark:text-slate-400 text-gray-500 ml-1">Full Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-500 text-gray-400" />
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Inspector Rajesh Kumar"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold border outline-none transition-all
                      dark:bg-slate-900 dark:border-slate-800 dark:focus:border-emerald-500 dark:text-white
                      bg-gray-50 border-gray-200 focus:border-emerald-500 text-black" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-black dark:text-slate-400 text-gray-500 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-500 text-gray-400" />
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="officer@unionbank.in"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold border outline-none transition-all
                      dark:bg-slate-900 dark:border-slate-800 dark:focus:border-emerald-500 dark:text-white
                      bg-gray-50 border-gray-200 focus:border-emerald-500 text-black" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-black dark:text-slate-400 text-gray-500 ml-1">Contact Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-500 text-gray-400" />
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold border outline-none transition-all
                      dark:bg-slate-900 dark:border-slate-800 dark:focus:border-emerald-500 dark:text-white
                      bg-gray-50 border-gray-200 focus:border-emerald-500 text-black" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-black dark:text-slate-400 text-gray-500 ml-1">Temporary Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-500 text-gray-400" />
                  <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold border outline-none transition-all
                      dark:bg-slate-900 dark:border-slate-800 dark:focus:border-emerald-500 dark:text-white
                      bg-gray-50 border-gray-200 focus:border-emerald-500 text-black" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black dark:text-slate-400 text-gray-500 ml-1">Clearance Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-500 text-gray-400" />
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold border outline-none appearance-none cursor-pointer transition-all
                        dark:bg-slate-900 dark:border-slate-800 dark:focus:border-emerald-500 dark:text-white
                        bg-gray-50 border-gray-200 focus:border-emerald-500 text-black">
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      {currentUserRole === "SUPER_ADMIN" && <option value="SUB_ADMIN">SUB_ADMIN</option>}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-black dark:text-slate-400 text-gray-500 ml-1">Regional Hub</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-500 text-gray-400" />
                    <select value={formData.region_id} onChange={e => setFormData({...formData, region_id: e.target.value})}
                      disabled={currentUserRole !== "SUPER_ADMIN"}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold border outline-none appearance-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        dark:bg-slate-900 dark:border-slate-800 dark:focus:border-emerald-500 dark:text-white
                        bg-gray-50 border-gray-200 focus:border-emerald-500 text-black">
                      <option value="">Global / Unassigned</option>
                      {regions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-70 shadow-lg
                    dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-black dark:shadow-emerald-500/20
                    bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Provision Account"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
