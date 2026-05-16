"use client";

import { useEffect, useState } from "react";
import { getRegions, listUsers, getMe, createUser, deleteUser } from "@/lib/api";
import Shell from "@/components/Shell";

export default function AdminDashboard() {
  const [regions, setRegions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: "", name: "", password: "password123", role: "EMPLOYEE", region_id: "" });

  const refresh = async () => {
    try {
      const [userData, regionData, userDataList] = await Promise.all([getMe(), getRegions(), listUsers()]);
      setMe(userData);
      setRegions(regionData);
      setUsers(userDataList);
      setLoading(false);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({ 
        ...formData, 
        region_id: formData.region_id ? Number(formData.region_id) : null 
      });
      setShowForm(false);
      setFormData({ email: "", name: "", password: "password123", role: "EMPLOYEE", region_id: "" });
      refresh();
    } catch (err: any) { alert("Failed to create user: " + err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(id);
      refresh();
    } catch (err: any) { alert("Delete failed: " + err.message); }
  };

  if (loading) return <div className="p-12 text-center font-black uppercase tracking-widest animate-pulse">Loading Admin Portal...</div>;

  return (
    <Shell>
      <div className="flex-1 p-8 space-y-12">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase">Admin Control Center</h1>
            <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">
              Logged in as {me?.name} ({me?.role})
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
            >
              {showForm ? "Cancel" : "Add New User"}
            </button>
          </div>
        </header>

        {showForm && (
          <form onSubmit={handleCreate} className="p-8 bg-gray-50 dark:bg-white/5 rounded-3xl border dark:border-white/10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white dark:bg-black p-3 rounded-xl border dark:border-white/10 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white dark:bg-black p-3 rounded-xl border dark:border-white/10 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-white dark:bg-black p-3 rounded-xl border dark:border-white/10 text-xs font-bold">
                  <option value="EMPLOYEE">Employee</option>
                  {me.role === "SUPER_ADMIN" && <option value="SUB_ADMIN">Sub-Admin</option>}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Region</label>
                <select value={formData.region_id} onChange={e => setFormData({...formData, region_id: e.target.value})} className="w-full bg-white dark:bg-black p-3 rounded-xl border dark:border-white/10 text-xs font-bold">
                  <option value="">Global / Central</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-colors">Create User Account</button>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Regions List */}
          <section className="space-y-6">
            <h2 className="text-lg font-black uppercase tracking-widest border-b-4 border-black pb-2 inline-block dark:border-white dark:text-white">Active Regions</h2>
            <div className="grid grid-cols-1 gap-4">
              {regions.map(r => (
                <div key={r.id} className="p-6 bg-white dark:bg-white/5 rounded-3xl shadow-lg border border-gray-100 dark:border-white/10 flex items-center justify-between hover:border-black dark:hover:border-white transition-colors">
                  <div>
                    <h3 className="font-black text-xl uppercase tracking-tighter dark:text-white">{r.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {r.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* User Management */}
          <section className="space-y-6">
            <h2 className="text-lg font-black uppercase tracking-widest border-b-4 border-black pb-2 inline-block dark:border-white dark:text-white">
              {me.role === "SUPER_ADMIN" ? "System-wide Credentials" : "Regional Staff"}
            </h2>
            <div className="space-y-4">
              {users.map(u => (
                <div key={u.id} className="p-6 bg-white dark:bg-white/5 rounded-3xl shadow-lg border border-gray-100 dark:border-white/10 group hover:bg-black dark:hover:bg-white transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg uppercase tracking-tighter group-hover:text-white dark:text-white group-hover:dark:text-black">{u.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.role} — {u.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {u.is_active ? 'Active' : 'Offline'}
                      </span>
                      {u.id !== me.id && (
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                          title="Delete User"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="p-8 text-center text-gray-400 italic">No users found in your scope.</div>}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
