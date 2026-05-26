"use client";

import { useState, useEffect } from "react";
import { getApiErrorStatus, login } from "@/lib/api";
import { 
  ShieldCheck, 
  Lock, 
  Cpu, 
  ArrowRight, 
  RefreshCw, 
  Mail,
  CheckCircle2
} from "lucide-react";
import Cookies from "js-cookie";

const generateCaptchaText = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous characters
  let text = "";
  for (let i = 0; i < 6; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
};

export default function CrestLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Captcha states
  const [captchaText, setCaptchaText] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize Captcha
  useEffect(() => {
    setCaptchaText(generateCaptchaText());
  }, []);

  const handleRefreshCaptcha = () => {
    setCaptchaText(generateCaptchaText());
    setCaptchaInput("");
  };

  // Authenticate Credentials & Captcha on a Single Integrated Form
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validate Alphanumeric Captcha (case-insensitive)
    if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
      setError("Invalid security Captcha. Please try again.");
      handleRefreshCaptcha();
      setLoading(false);
      return;
    }

    try {
      // Authenticate via FastAPI JWT backend
      await login(email, password);
      
      setSuccess("Operational clearance confirmed!");
      setTimeout(() => {
        window.location.assign("/ub_CREST/home");
      }, 600);
    } catch (err) {
      const status = getApiErrorStatus(err);
      if (status && [502, 503, 504].includes(status)) {
        setError("Gateway recovered. Please try login again.");
      } else if (status === 401) {
        setError("Invalid administrative credentials");
      } else {
        setError("Login service temporarily unavailable");
      }
      handleRefreshCaptcha();
      // Clean cookies just to be safe
      Cookies.remove("crest_token", { path: "/" });
      localStorage.removeItem("crest_user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-transparent flex flex-col justify-center items-center p-6 relative overflow-hidden">
      
      <div className="max-w-md w-full relative z-10 animate-fade-in-up space-y-6">
        
        {/* Branding & Subtitle */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl dark:bg-blue-950/40 dark:border-blue-500/20 bg-blue-50 border border-blue-200 shadow-xl mb-4 overflow-hidden">
            <img src="/crest_logo.png" alt="CREST Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase flex justify-center items-center gap-0.5">
            <span className="text-[#0052ff]">ub_</span>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #0052ff, #4a22ff, #9b1aff, #e31837, #ff2200)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CREST
            </span>
          </h1>
          <p className="text-xs uppercase tracking-widest dark:text-slate-400 text-slate-600 font-bold mt-1">
            Enterprise Authorization Gate
          </p>
        </div>

        {/* Corporate Entry Card */}
        <div className="dark:bg-black/80 bg-white/80 backdrop-blur-xl border dark:border-white/10 border-gray-200 rounded-3xl p-8 shadow-2xl relative overflow-hidden group dark:hover:border-blue-500/30 hover:border-black/30 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl uppercase tracking-wider text-center animate-pulse">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-2xl uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {success}
            </div>
          )}

          {/* Integrated Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest dark:text-slate-400 text-slate-600 mb-2 block">Officer Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 dark:text-slate-500 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full pl-10 pr-4 py-4 dark:bg-black/80 bg-white border dark:border-white/10 border-gray-200 rounded-2xl focus:ring-2 dark:focus:ring-blue-500 focus:ring-blue-600 dark:text-white text-black outline-none transition-all text-sm"
                  placeholder="officer@unionbank.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest dark:text-slate-400 text-slate-600 mb-2 block">Secure Keyphrase</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 dark:text-slate-500 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full pl-10 pr-4 py-4 dark:bg-black/80 bg-white border dark:border-white/10 border-gray-200 rounded-2xl focus:ring-2 dark:focus:ring-blue-500 focus:ring-blue-600 dark:text-white text-black outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-black uppercase tracking-widest dark:text-slate-400 text-slate-600 mb-2 block">Security Captcha</label>
              <div className="flex gap-3 mb-3">
                <div className="flex-grow dark:bg-black/90 bg-gray-100 rounded-2xl border dark:border-white/10 border-gray-200 flex items-center justify-center overflow-hidden relative select-none py-3">
                   {/* Noise background */}
                   <div className="absolute inset-0 opacity-15 dark:text-white text-black" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '6px 6px' }}></div>
                   <span className="relative z-10 font-mono text-2xl tracking-widest dark:text-blue-400 text-blue-600 font-bold mix-blend-normal dark:mix-blend-screen filter blur-[0.5px] italic">
                     {captchaText}
                   </span>
                </div>
                <button 
                  type="button"
                  onClick={handleRefreshCaptcha}
                  className="p-3 border dark:border-white/10 border-gray-200 rounded-2xl dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-black dark:hover:bg-slate-800/50 hover:bg-gray-100 transition-all animate-none"
                  title="Refresh Captcha"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              <input 
                type="text" 
                required
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className="w-full px-4 py-4 dark:bg-black/80 bg-white border dark:border-white/10 border-gray-200 rounded-2xl focus:ring-2 dark:focus:ring-blue-500 focus:ring-blue-600 dark:text-white text-black outline-none transition-all text-sm"
                placeholder="Enter captcha text"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 active:scale-[0.99] text-sm mt-6 shadow-lg shadow-blue-500/10"
            >
              {loading ? "Decrypting Credentials..." : "Confirm Clearance & Login"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Security Disclaimers */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full dark:bg-black/60 bg-gray-100 border dark:border-white/10 border-gray-200 text-[10px] font-bold tracking-wider dark:text-slate-400 text-slate-600 uppercase">
            <Lock className="w-3.5 h-3.5 text-red-500" /> SECURE STAFF GATEWAY
          </div>
          <p className="text-[10px] dark:text-slate-500 text-slate-600 max-w-sm mx-auto leading-relaxed">
            Authorized Union Bank Personnel only. All operational attempts are logged and scrutinized.
          </p>
        </div>

      </div>
    </div>
  );
}
