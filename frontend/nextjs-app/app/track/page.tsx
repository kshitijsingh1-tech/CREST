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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <header className="bg-[#0f2347] text-white shadow-md py-4">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-red-500" />
              <div>
                <h1 className="text-xl font-bold">Union Bank of India</h1>
                <p className="text-xs text-blue-200">Grievance Tracking Portal</p>
              </div>
            </div>
            <button
              onClick={() => setComplaintData(null)}
              className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Search
            </button>
          </div>
        </header>

        {/* Status Dashboard */}
        <main className="flex-grow max-w-5xl mx-auto w-full p-4 py-8 animate-fade-in-up">

          {success && (
            <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-md border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Status: {complaintData.status.toUpperCase()}</h2>
                <p className="text-slate-500">Ref: <span className="font-mono text-slate-700">{complaintData.id}</span></p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Registered Contact</p>
                <p className="font-medium text-slate-800">{complaintData.masked_contact}</p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Grievance Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500">Subject</p>
                      <p className="font-medium text-slate-800">{complaintData.subject || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Category</p>
                      <p className="font-medium text-slate-800">{complaintData.category || "General"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Assigned To</p>
                      <p className="font-medium text-indigo-700">{complaintData.assignee_masked}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Tracking Timeline</h3>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">

                    {/* Stage 1 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${complaintData.timeline.received ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                        <h4 className="font-semibold text-sm text-slate-800">Received & Logged</h4>
                        <p className="text-xs text-slate-500">{new Date(complaintData.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Stage 2 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${complaintData.timeline.prioritized ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                        <h4 className="font-semibold text-sm text-slate-800">Prioritized (AI Brain)</h4>
                        <p className="text-xs text-slate-500">Category and priority assigned</p>
                      </div>
                    </div>

                    {/* Stage 3 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${complaintData.timeline.assigned ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                        <h4 className="font-semibold text-sm text-slate-800">Under Review</h4>
                        <p className="text-xs text-slate-500">Assigned to resolution officer</p>
                      </div>
                    </div>

                    {/* Stage 4 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${complaintData.timeline.resolved ? 'bg-emerald-500' : (complaintData.timeline.withdrawn ? 'bg-red-500' : 'bg-slate-300')}`}></div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                        <h4 className="font-semibold text-sm text-slate-800">
                          {complaintData.timeline.withdrawn ? "Withdrawn" : "Resolved"}
                        </h4>
                        {complaintData.resolved_at && (
                          <p className="text-xs text-slate-500">{new Date(complaintData.resolved_at).toLocaleString()}</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {complaintData.resolution_note && (
                <div className="mt-8 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Resolution Remarks</h3>
                  <p className="text-sm text-blue-800">{complaintData.resolution_note}</p>
                </div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="bg-slate-50 border-t border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Customer Actions</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => alert("Downloading Official PDF Receipt...")}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Download Status PDF
                </button>

                <button
                  onClick={() => handleAction("upload")}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm"
                >
                  <UploadCloud className="w-4 h-4 text-indigo-600" /> Upload Documents
                </button>

                {complaintData.status === "open" && (
                  <button
                    onClick={() => handleAction("withdraw")}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors shadow-sm font-medium text-sm ml-auto"
                  >
                    <XCircle className="w-4 h-4" /> Withdraw Complaint
                  </button>
                )}

                {complaintData.status === "resolved" && (
                  <button
                    onClick={() => handleAction("appeal")}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-md hover:bg-amber-100 transition-colors shadow-sm font-medium text-sm ml-auto"
                  >
                    <RotateCcw className="w-4 h-4" /> File Appeal
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* NEW SECTION: Government-Style Citizen Resource & Support Directory */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 mt-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0f2347]" /> Grievance Appellate Committee & Support Nodal Officers
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              If you are not satisfied with the resolution remarks provided by the Assigned Support Desk, you can escalate the complaint via the regional Nodal Officers or appeal directly to the Grievance Appellate Committee:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-sm text-slate-800 mb-1">National Helpline Center</h4>
                <p className="text-xs text-slate-500 mb-2">Immediate Banking/Financial Fraud Helpline</p>
                <p className="text-sm font-bold text-red-600">Hotline: 7905438724</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-sm text-slate-800 mb-1">Principal Nodal Officer</h4>
                <p className="text-xs text-slate-500 mb-2">Central Grievance Office, Union Bank Mumbai</p>
                <p className="text-sm font-bold text-blue-800">pno@unionbankofindia.bank</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-sm text-slate-800 mb-1">Grievance Appellate Cell</h4>
                <p className="text-xs text-slate-500 mb-2">Official GAC Citizen Appeals Portal</p>
                <a href="https://gac.gov.in/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-700 hover:underline">gac.gov.in</a>
              </div>
            </div>
          </div>

        </main>
      </div>
    );
  }

  // Phase 1: Verification Gateway
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Ambient background neon sweeps matching other public portal elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0">
        <ColorBends 
          colors={["#ef4444", "#3b82f6"]} 
          speed={0.08} 
          warpStrength={0.4}
          iterations={2}
          bandWidth={4.5}
        />
      </div>

      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-30">
        <Link href="/ub_publicPortal" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors bg-white/80 dark:bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-full shadow-md border border-slate-200 dark:border-white/10">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
        </Link>
      </div>

      <div className="w-full max-w-md animate-fade-in-up relative z-10 space-y-6">

        {/* Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-black/60 shadow-xl mb-4 border border-slate-200 dark:border-white/10 overflow-hidden">
            <img src="/crest_logo.png" alt="CREST Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase flex justify-center items-center gap-0.5 dark:text-white text-[#0f2347]">
            <span className="text-[#0052ff]">ub_</span>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #0052ff, #4a22ff, #9b1aff, #e31837, #ff2200)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CREST
            </span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest dark:text-slate-400 text-slate-500 font-extrabold mt-1">Grievance Tracking Gateway</p>
        </div>

        {/* Tracking Card */}
        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="bg-[#0f2347] dark:bg-white/5 px-6 py-4.5 border-b border-[#1c386b] dark:border-white/10">
            <h2 className="text-sm font-black uppercase tracking-wider text-white dark:text-slate-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-red-500" /> Track Grievance Status
            </h2>
          </div>

          <div className="p-6.5 space-y-5">
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
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Acknowledgement Number / Token</label>
                  <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-200 dark:bg-white/10 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)]">
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
                  <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-200 dark:bg-white/10 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)]">
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
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-xs font-black uppercase tracking-widest text-white bg-[#0f2347] dark:bg-blue-600 hover:bg-[#16305c] dark:hover:bg-blue-700 focus:outline-none disabled:opacity-70 transition-all duration-300 active:scale-[0.99] mt-6"
                >
                  {loading ? "Verifying..." : "Get OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleTrack} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Enter OTP</label>
                  <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-200 dark:bg-white/10 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)]">
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
                      {/* Captcha Noise Background */}
                      <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
                      <span className="relative z-10 font-mono text-2xl tracking-widest text-[#0f2347] dark:text-blue-400 font-bold mix-blend-multiply dark:mix-blend-screen filter blur-[0.5px] italic">
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
                  
                  <div className="relative group rounded-2xl p-[1.5px] transition-all duration-300 bg-slate-200 dark:bg-white/10 focus-within:bg-gradient-to-r focus-within:from-[#0052ff] focus-within:to-[#e31837] focus-within:shadow-[0_0_15px_rgba(0,82,255,0.25)]">
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
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-xs font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-70 transition-all duration-300 active:scale-[0.99] mt-6"
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

          <div className="bg-slate-50/50 dark:bg-white/5 px-6 py-5 border-t border-slate-200 dark:border-white/10 space-y-4">
            {/* Quick Action Resources (Inspired by Govt portal) */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-b border-slate-200 dark:border-white/10 pb-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Opening Citizen Grievance Redressal Manual..."); }} className="flex items-center gap-1.5 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                <FileText className="w-4 h-4 text-red-500" /> Redressal Manual
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Contacting National Grievance Cell Helpline..."); }} className="flex items-center gap-1.5 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Helpline Info
              </a>
            </div>

            <p className="text-[9px] text-center text-slate-500 dark:text-slate-400/80 leading-relaxed font-bold uppercase tracking-wider">
              <strong>Official Notice:</strong> Please protect your session. Operations are monitored. Under Section 66D of the IT Act, unauthorized access attempt is a punishable offense.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
