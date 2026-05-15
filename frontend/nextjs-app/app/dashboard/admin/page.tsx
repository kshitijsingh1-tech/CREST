"use client";

import { useEffect, useState } from "react";
import { getRegions, getEmployees, getMe } from "@/lib/api";
import Shell from "@/components/Shell";

export default function AdminDashboard() {
  const [regions, setRegions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMe(), getRegions(), getEmployees()])
      .then(([userData, regionData, employeeData]) => {
        setMe(userData);
        setRegions(regionData);
        setEmployees(employeeData);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <div className="p-12 text-center font-black uppercase tracking-widest animate-pulse">Loading Admin Portal...</div>;

  return (
    <div className="flex-1 p-8 space-y-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase">Admin Control Center</h1>
          <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">
            Logged in as {me?.name} ({me?.role})
          </p>
        </div>
        <div className="flex gap-2">
           <button className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">Create Region</button>
           <button className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">Create User</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Regions List */}
        <section className="space-y-6">
          <h2 className="text-lg font-black uppercase tracking-widest border-b-4 border-black pb-2 inline-block">Active Regions</h2>
          <div className="grid grid-cols-1 gap-4">
            {regions.map(r => (
              <div key={r.id} className="p-6 bg-white rounded-3xl shadow-lg border border-gray-100 flex items-center justify-between hover:border-black transition-colors">
                <div>
                  <h3 className="font-black text-xl uppercase tracking-tighter">{r.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {r.id}</p>
                </div>
                <button className="text-[10px] font-black uppercase text-blue-600 hover:underline">View Analytics</button>
              </div>
            ))}
          </div>
        </section>

        {/* Employees Workload */}
        <section className="space-y-6">
          <h2 className="text-lg font-black uppercase tracking-widest border-b-4 border-black pb-2 inline-block">Regional Staff Workload</h2>
          <div className="space-y-4">
            {employees.map(e => (
              <div key={e.id} className="p-6 bg-white rounded-3xl shadow-lg border border-gray-100 group hover:bg-black transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tighter group-hover:text-white">{e.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee ID: {e.id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${e.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {e.is_active ? 'On Shift' : 'Off Shift'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div className="h-full bg-black group-hover:bg-white" style={{ width: '40%' }}></div>
                  </div>
                  <span className="text-[10px] font-black group-hover:text-white uppercase tracking-widest">8 Open Tasks</span>
                </div>
              </div>
            ))}
            {employees.length === 0 && <div className="p-8 text-center text-gray-400 italic">No staff found for this scope.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
