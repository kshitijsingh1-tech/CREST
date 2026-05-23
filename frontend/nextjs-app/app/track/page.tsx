"use client";

import { useState, useRef, useEffect } from "react";
import { Search, KeyRound, ShieldCheck, Mail, RefreshCw, FileText, ArrowLeft, Download, XCircle, RotateCcw, UploadCloud, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { sendPublicOtp, trackPublicComplaint, submitPublicAction } from "@/lib/api";
import ColorBends from "@/components/ColorBends";

const generateCaptchaText = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function PublicTrackingPage() {
  const [reference, setReference] = useState("");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaText, setCaptchaText] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [complaintData, setComplaintData] = useState<any>(null);

  useEffect(() => {
    setCaptchaText(generateCaptchaText());
  }, []);

  const handleRefreshCaptcha = () => {
    setCaptchaText(generateCaptchaText());
    setCaptchaInput("");
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference || !contact) {
      setError("Reference number and registered contact are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await sendPublicOtp(reference, contact);
      setOtpSent(true);
      setSuccess(`OTP sent successfully! (Demo OTP: ${res.demo_otp})`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
      setError("Invalid Captcha. Please try again.");
      handleRefreshCaptcha();
      return;
    }
    if (!otp) {
      setError("OTP is required.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const data = await trackPublicComplaint(reference, contact, otp);
      setComplaintData(data);
    } catch (err: any) {
      setError(err.message || "Failed to track complaint. Check OTP and Token.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!confirm(`Are you sure you want to ${action} this complaint?`)) return;

    setLoading(true);
    try {
      const res = await submitPublicAction(reference, action);
      setSuccess(res.message);
      // Refresh data
      const data = await trackPublicComplaint(reference, contact, otp);
      setComplaintData(data);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message || `Failed to ${action} complaint.`);
    } finally {
      setLoading(false);
    }
  };

  if (complaintData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
          <ColorBends colors={["#ef4444", "#3b82f6"]} speed={0.05} warpStrength={0.3} iterations={1} bandWidth={5} />
        </div>

        {/* Floating Modern Header */}
        <header className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-6">
          <div className="bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-5 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-black shadow flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5">
                <img src="/crest_logo.png" alt="CREST Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-wider uppercase text-slate-800 dark:text-white flex items-center gap-1">
                  <span className="text-[#0052ff]">ub_</span>
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #0052ff, #4a22ff, #9b1aff, #e31837, #ff2200)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CREST</span>
                </h1>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold">Grievance Tracking Portal</p>
              </div>
            </div>
            <button
              onClick={() => setComplaintData(null)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors bg-slate-100 dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-slate-200/50 dark:border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Search
            </button>
          </div>
        </header>

        {/* Status Dashboard */}
        <main className="relative z-10 flex-grow max-w-5xl mx-auto w-full p-6 py-10 animate-fade-in-up space-y-8">
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl uppercase tracking-wider p-5 flex items-center gap-2 shadow-md">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs font-bold rounded-2xl uppercase tracking-wider p-5 shadow-md">
              {error}
            </div>
          )}

          <div className="bg-white dark:bg-[#090d16] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
            <div className="p-8 md:p-10 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#0052ff] bg-blue-500/10 px-2.5 py-1 rounded-full dark:text-blue-400">
                  {complaintData.status.toUpperCase()}
                </span>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mt-2 flex items-center gap-1.5">
                  Grievance Ref: <span className="font-mono text-xl text-slate-500 dark:text-slate-400 select-all">{complaintData.id}</span>
                </h2>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 px-5 py-3 rounded-2xl">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Registered Contact</p>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{complaintData.masked_contact}</p>
              </div>
            </div>

            <div className="p-8 md:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Grievance Info</h3>
                  <div className="space-y-5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-3xl">
                    <div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Subject</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{complaintData.subject || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Category</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{complaintData.category || "General"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Assigned Resolution Officer</p>
                      <p className="font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5">{complaintData.assignee_masked}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tracking Status</h3>
                  <div className="space-y-6 pl-4 relative before:absolute before:inset-0 before:left-2 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                    
                    {/* Stage 1 */}
                    <div className="relative pl-6 flex items-start gap-4">
                      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-black shadow-md -translate-x-[6px] ${complaintData.timeline.received ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-300'}`}></div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">Grievance Registered</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{new Date(complaintData.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Stage 2 */}
                    <div className="relative pl-6 flex items-start gap-4">
                      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-black shadow-md -translate-x-[6px] ${complaintData.timeline.prioritized ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-300'}`}></div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">AI Classification Complete</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Assigned priority vector mapping</p>
                      </div>
                    </div>

                    {/* Stage 3 */}
                    <div className="relative pl-6 flex items-start gap-4">
                      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-black shadow-md -translate-x-[6px] ${complaintData.timeline.assigned ? 'bg-blue-500 shadow-blue-500/20' : 'bg-slate-300'}`}></div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">Regional Desk Active</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Assigned to resolution desk</p>
                      </div>
                    </div>

                    {/* Stage 4 */}
                    <div className="relative pl-6 flex items-start gap-4">
                      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-black shadow-md -translate-x-[6px] ${complaintData.timeline.resolved ? 'bg-emerald-500 shadow-emerald-500/20' : (complaintData.timeline.withdrawn ? 'bg-red-500' : 'bg-slate-300')}`}></div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          {complaintData.timeline.withdrawn ? "Withdrawn" : "Resolution Settled"}
                        </h4>
                        {complaintData.resolved_at && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{new Date(complaintData.resolved_at).toLocaleString()}</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {complaintData.resolution_note && (
                <div className="mt-8 bg-blue-500/5 dark:bg-white/5 p-6 rounded-3xl border border-blue-500/10 dark:border-white/10">
                  <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Desk Resolution Remarks</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{complaintData.resolution_note}</p>
                </div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 p-8 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => alert("Downloading Official PDF Receipt...")}
                className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm font-bold text-xs uppercase tracking-wider"
              >
                <Download className="w-4 h-4 text-blue-600" /> Download Status PDF
              </button>

              <button
                onClick={() => handleAction("upload")}
                className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm font-bold text-xs uppercase tracking-wider"
              >
                <UploadCloud className="w-4 h-4 text-[#0052ff]" /> Upload Documents
              </button>

              {complaintData.status === "open" && (
                <button
                  onClick={() => handleAction("withdraw")}
                  className="flex items-center gap-2 px-5 py-3 bg-transparent border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold text-xs uppercase tracking-wider ml-auto"
                >
                  <XCircle className="w-4 h-4" /> Withdraw Grievance
                </button>
              )}

              {complaintData.status === "resolved" && (
                <button
                  onClick={() => handleAction("appeal")}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl hover:bg-amber-500/20 transition-all font-bold text-xs uppercase tracking-wider ml-auto"
                >
                  <RotateCcw className="w-4 h-4" /> File Appeal
                </button>
              )}
            </div>
          </div>

          {/* Citizen Resources */}
          <div className="bg-white dark:bg-[#090d16] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl p-8 md:p-10 space-y-6">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-red-500 animate-[pulse_1.5s_infinite]" /> Grievance Appellate Committee & Support Nodal Officers
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              If you are not satisfied with the resolution remarks provided by the Assigned Support Desk, you can escalate the complaint via the regional Nodal Officers or appeal directly to the Grievance Appellate Committee:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">National Helpline Center</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-3 uppercase tracking-widest">Financial Fraud Assistance</p>
                <p className="text-sm font-black text-red-500">Hotline: 7905438724</p>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Principal Nodal Officer</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-3 uppercase tracking-widest">Central Office, Mumbai</p>
                <p className="text-sm font-black text-blue-600 dark:text-blue-400 select-all">pno@unionbankofindia.bank</p>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Grievance Appellate Cell</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-3 uppercase tracking-widest">Citizen Appeals Portal</p>
                <a href="https://gac.gov.in/" target="_blank" rel="noopener noreferrer" className="text-sm font-black text-indigo-600 dark:text-indigo-400 hover:underline">gac.gov.in</a>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Phase 1: Verification Gateway
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col justify-center items-center p-6 py-12 relative overflow-hidden">
      
      {/* Ambient background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
        <ColorBends colors={["#ef4444", "#3b82f6"]} speed={0.05} warpStrength={0.3} iterations={1} bandWidth={5} />
      </div>

      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-30">
        <Link href="/ub_publicPortal" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors bg-white/80 dark:bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-full shadow-md border border-slate-200 dark:border-white/10">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
        </Link>
      </div>

      <div className="w-full max-w-xl animate-fade-in-up relative z-10 space-y-8">

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
          <p className="text-[10px] uppercase tracking-widest dark:text-slate-400 text-slate-500 font-extrabold">Grievance Tracking Gateway</p>
        </div>

        {/* Tracking Card */}
        <div className="bg-white dark:bg-[#090d16] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden p-8 md:p-12 space-y-8">
          
          <div className="text-center">
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center justify-center gap-2">
              <Search className="w-5 h-5 text-red-500 animate-[pulse_1.5s_infinite]" /> Track Grievance Status
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Authenticate credentials to view real-time SLA metrics</p>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs font-bold rounded-2xl uppercase tracking-wider text-center animate-pulse">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {success}
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Acknowledgement Number / Token</label>
                  <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-100 dark:bg-white/5 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)] border border-slate-200 dark:border-white/5">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                      <FileText className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-4 bg-white dark:bg-black rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors text-sm"
                      placeholder="e.g. UBI-GRV-XXXX or UUID"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Registered Email ID / Mobile</label>
                  <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-100 dark:bg-white/5 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)] border border-slate-200 dark:border-white/5">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                      <Mail className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-4 bg-white dark:bg-black rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors text-sm"
                      placeholder="Email or Mobile No."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-4.5 px-4 border border-transparent rounded-2xl shadow-lg text-xs font-black uppercase tracking-widest text-white bg-[#0052ff] hover:bg-[#0041cc] focus:outline-none disabled:opacity-70 transition-all duration-300 active:scale-[0.99] mt-6"
                >
                  {loading ? "Verifying..." : "Get OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleTrack} className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Enter OTP</label>
                  <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-100 dark:bg-white/5 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)] border border-slate-200 dark:border-white/5">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                      <KeyRound className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-4 bg-white dark:bg-black rounded-2xl text-slate-900 dark:text-white tracking-widest font-mono focus:outline-none transition-colors text-sm"
                      placeholder="••••••"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 font-semibold">OTP sent to {contact}</p>
                </div>

                <div className="pt-1">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Security Captcha</label>
                  <div className="flex gap-3 mb-3">
                    <div className="flex-grow bg-slate-100 dark:bg-black/90 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden relative select-none py-3">
                      <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
                      <span className="relative z-10 font-mono text-2xl tracking-widest text-slate-800 dark:text-blue-400 font-bold mix-blend-multiply dark:mix-blend-screen filter blur-[0.5px] italic">
                        {captchaText}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshCaptcha}
                      className="p-3 border border-slate-300 dark:border-white/10 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      title="Refresh Captcha"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-100 dark:bg-white/5 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)] border border-slate-200 dark:border-white/5">
                    <input
                      type="text"
                      required
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      className="block w-full px-4 py-4 bg-white dark:bg-black rounded-2xl text-slate-900 dark:text-white focus:outline-none transition-colors text-sm"
                      placeholder="Enter captcha text"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-4.5 px-4 border border-transparent rounded-2xl shadow-lg text-xs font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-70 transition-all duration-300 active:scale-[0.99] mt-6"
                >
                  {loading ? "Authenticating..." : "Track Grievance"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(""); }}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-black uppercase tracking-widest"
                  >
                    &larr; Use different details
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Opening Citizen Grievance Redressal Manual..."); }} className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors justify-center">
                <FileText className="w-4 h-4 text-red-500" /> Redressal Manual
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Contacting National Grievance Cell Helpline..."); }} className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Helpline Info
              </a>
            </div>

            <p className="text-[9px] text-center text-slate-400 dark:text-slate-500/80 leading-relaxed font-bold uppercase tracking-wider pt-2">
              <strong>Official Notice:</strong> Operations are monitored under Section 66D of the IT Act. Unauthorized access is a punishable offense.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
