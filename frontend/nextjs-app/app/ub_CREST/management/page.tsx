import { getMe, listUsers, getRegions } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, ShieldCheck, MapPin, UserCheck, Activity, Search } from "lucide-react";
import AddOfficerModal from "./AddOfficerModal";
import DeleteUserButton from "./DeleteUserButton";

export default async function ManagementConsolePage() {
  let user;
  try {
    user = await getMe();
  } catch (e) {
    redirect("/ub_CREST/login?recovered=1");
  }

  // Ensure only authenticated staff can view team stats
  const [users, regions] = await Promise.all([
    listUsers().catch(() => []),
    getRegions().catch(() => [])
  ]);

  // Map regions for easy lookup
  const regionMap = regions.reduce((acc, r) => {
    acc[r.id] = r.name;
    return acc;
  }, {} as Record<number, string>);

  const activeUsers = users.filter(u => u.is_active).length;
  const adminCount = users.filter(u => u.role === "admin" || u.role === "SUPER_ADMIN" || u.role === "SUB_ADMIN").length;
  const staffCount = users.filter(u => u.role === "staff" || u.role === "EMPLOYEE").length;

  return (
    <div className="flex-1 bg-transparent p-6 md:p-10 space-y-10 max-w-[90rem] mx-auto w-full animate-fade-in-up">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase transition-colors duration-500 dark:text-white text-black dark:drop-shadow-sm flex items-center gap-4">
            Management Console
          </h1>
          <p className="text-xs uppercase tracking-widest mt-2 font-bold transition-colors duration-500 dark:text-emerald-400 text-emerald-600">
            Personnel Directory & Regional Assignments
          </p>
        </div>
        <Link href="/ub_CREST/home" className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-500 border shadow-sm
          dark:bg-emerald-900/30 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50
          bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
          ← Back to Command Center
        </Link>
      </div>

      {/* Roster KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-3xl border p-6 dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl bg-white border-gray-200 shadow-xl relative overflow-hidden group">
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-[2] transition-transform duration-700"></div>
          <p className="text-[10px] uppercase tracking-widest font-bold dark:text-emerald-400 text-emerald-600 mb-1">Total Personnel</p>
          <p className="text-4xl font-black dark:text-white text-black">{users.length}</p>
        </div>
        <div className="rounded-3xl border p-6 dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl bg-white border-gray-200 shadow-xl relative overflow-hidden group">
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-[2] transition-transform duration-700"></div>
          <p className="text-[10px] uppercase tracking-widest font-bold dark:text-blue-400 text-blue-600 mb-1">Active Accounts</p>
          <p className="text-4xl font-black dark:text-white text-black">{activeUsers}</p>
        </div>
        <div className="rounded-3xl border p-6 dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl bg-white border-gray-200 shadow-xl relative overflow-hidden group">
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:scale-[2] transition-transform duration-700"></div>
          <p className="text-[10px] uppercase tracking-widest font-bold dark:text-purple-400 text-purple-600 mb-1">Admins</p>
          <p className="text-4xl font-black dark:text-white text-black">{adminCount}</p>
        </div>
        <div className="rounded-3xl border p-6 dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl bg-white border-gray-200 shadow-xl relative overflow-hidden group">
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-[2] transition-transform duration-700"></div>
          <p className="text-[10px] uppercase tracking-widest font-bold dark:text-amber-400 text-amber-600 mb-1">Regional Officers</p>
          <p className="text-4xl font-black dark:text-white text-black">{staffCount}</p>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="rounded-3xl p-6 md:p-8 border transition-all duration-500
        dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
        bg-white border-gray-200 shadow-xl">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-base font-black uppercase tracking-widest flex items-center gap-3 transition-colors duration-500 dark:text-white text-black">
            <Users className="w-5 h-5 dark:text-emerald-400 text-emerald-600" /> Authorized Personnel Directory
          </h2>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search officer name..." 
                className="pl-9 pr-4 py-2 rounded-xl text-xs font-bold w-full md:w-64 outline-none border transition-all duration-300
                  dark:bg-slate-900 dark:border-slate-800 dark:text-white dark:focus:border-emerald-500
                  bg-gray-50 border-gray-200 text-black focus:border-emerald-500"
              />
            </div>
            
            {(user.role === "SUPER_ADMIN" || user.role === "SUB_ADMIN") && (
              <AddOfficerModal regions={regions} currentUserRole={user.role} />
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b dark:border-slate-800 border-gray-200">
                <th className="pb-4 text-[10px] uppercase tracking-widest font-black dark:text-slate-500 text-gray-400 px-4">Officer ID</th>
                <th className="pb-4 text-[10px] uppercase tracking-widest font-black dark:text-slate-500 text-gray-400 px-4">Identity</th>
                <th className="pb-4 text-[10px] uppercase tracking-widest font-black dark:text-slate-500 text-gray-400 px-4">Clearance Role</th>
                <th className="pb-4 text-[10px] uppercase tracking-widest font-black dark:text-slate-500 text-gray-400 px-4">Regional Hub</th>
                <th className="pb-4 text-[10px] uppercase tracking-widest font-black dark:text-slate-500 text-gray-400 px-4">Status</th>
                <th className="pb-4 text-[10px] uppercase tracking-widest font-black dark:text-slate-500 text-gray-400 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800/50 divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors duration-300">
                  <td className="py-5 px-4">
                    <span className="font-mono text-xs font-bold dark:text-slate-400 text-gray-500">#{u.id.toString().padStart(4, '0')}</span>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black dark:text-white text-black">{u.name}</span>
                      <span className="text-[10px] font-bold dark:text-slate-500 text-gray-400">
                        {u.email} {u.phone ? `• ${u.phone}` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider border ${
                      u.role === "admin" 
                        ? "dark:bg-purple-900/20 dark:border-purple-500/30 dark:text-purple-400 bg-purple-50 border-purple-200 text-purple-700" 
                        : "dark:bg-blue-900/20 dark:border-blue-500/30 dark:text-blue-400 bg-blue-50 border-blue-200 text-blue-700"
                    }`}>
                      {u.role === "admin" ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold dark:text-slate-300 text-gray-700">
                      <MapPin className="w-3.5 h-3.5 dark:text-slate-500 text-gray-400" />
                      {u.region_id ? regionMap[u.region_id] || `Region ${u.region_id}` : "Global (HQ)"}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      {u.is_active ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                          <span className="text-[10px] font-black uppercase tracking-widest dark:text-emerald-400 text-emerald-600">Active</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                          <span className="text-[10px] font-black uppercase tracking-widest dark:text-red-400 text-red-600">Suspended</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-5 px-4 text-right">
                    {((user.role === "SUPER_ADMIN" && u.id !== user.id) ||
                      (user.role === "SUB_ADMIN" && u.role === "EMPLOYEE" && u.region_id === user.region_id)) ? (
                      <DeleteUserButton userId={u.id} userName={u.name} />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Locked</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs font-bold dark:text-slate-500 text-gray-400 uppercase tracking-widest">
                    No personnel records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
