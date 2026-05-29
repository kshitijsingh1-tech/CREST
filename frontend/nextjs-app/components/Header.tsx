"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import GoogleTranslate from '@/components/GoogleTranslate';
import Cookies from 'js-cookie';
import { logout } from '@/lib/api';

export default function Header({ theme, toggleTheme }: { theme: "dark" | "light", toggleTheme: () => void }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get("crest_token");
    setIsAuthenticated(!!token);
    if (token) {
      try {
        const parts = token.split('.');
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        setRole(payload.role);
      } catch (e) {
        setRole(null);
      }
    } else {
      setRole(null);
    }
  }, [pathname]);
  
  // Hide the admin header entirely for public customer pages, or if accessing docs without an active admin session
  const publicRoutes = ["/", "/track", "/submit", "/ub_publicPortal", "/crest_publicPortal", "/ub_CREST/login"];
  if (publicRoutes.includes(pathname) || (pathname === "/ub_CREST/docs" && !isAuthenticated)) {
    return null;
  }

  return (
    <header className="w-full transition-all duration-500 
      dark:bg-black/80 dark:backdrop-blur-xl dark:border-b dark:border-blue-900/30
      bg-white border-b border-gray-200 shadow-sm hover:border-black
      px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      
      <Link href="/ub_CREST/home" className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 overflow-hidden shadow-md group-hover:scale-[1.03]">
          <img src="/crest_logo.png" alt="CREST Logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight leading-none transition-colors duration-500 bg-clip-text text-transparent w-fit" style={{ backgroundImage: "linear-gradient(to right, #0052ff, #4a22ff, #9b1aff, #e31837, #ff2200)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            CREST
          </h1>
          <p className="text-[9px] uppercase tracking-widest font-bold mt-1 transition-colors duration-500
            dark:text-red-400 text-gray-600 group-hover:text-red-600 dark:group-hover:text-red-300">
            Union Bank of India
          </p>
        </div>
      </Link>
      
      <nav className="hidden lg:flex items-center gap-6">
        <Link href="/ub_CREST/home" className="text-sm font-bold transition-all duration-300 dark:text-blue-100 dark:hover:text-red-400 text-black hover:text-red-600">Home</Link>
        <Link href="/ub_CREST/analytics" className="text-sm font-bold transition-all duration-300 dark:text-blue-100 dark:hover:text-red-400 text-black hover:text-red-600">Analytics</Link>
        {role !== 'EMPLOYEE' && (
          <Link href="/ub_CREST/management" className="text-sm font-bold transition-all duration-300 dark:text-blue-100 dark:hover:text-red-400 text-black hover:text-red-600">Management</Link>
        )}
        <Link href="/ub_CREST/queue" className="text-sm font-bold transition-all duration-300 dark:text-blue-100 dark:hover:text-red-400 text-black hover:text-red-600">Live Queue</Link>
        <Link href="/ub_CREST/docs" className="text-sm font-bold transition-all duration-300 dark:text-cyan-300 dark:hover:text-red-400 text-cyan-700 hover:text-red-600">Docs</Link>
      </nav>

      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <div className="hidden md:flex items-center px-3 py-1.5 rounded-full border transition-all duration-300
          dark:bg-blue-900/10 dark:border-blue-500/20 dark:hover:border-blue-500/40
          bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50">
          <GoogleTranslate />
        </div>

        {/* Theme Toggle Button */}
        <button onClick={toggleTheme} className="p-2.5 rounded-full transition-all duration-300
          dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-yellow-400 dark:border-transparent
          bg-gray-100 hover:bg-gray-200 text-black border border-gray-200">
          {theme === "dark" ? (
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>

        <button onClick={logout} className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer
          dark:bg-blue-900/20 dark:border-blue-500/30 dark:text-blue-400
          bg-black border-black text-white hover:bg-gray-800 hover:border-gray-800 shadow-sm active:scale-[0.97]">
          <span className="w-2 h-2 rounded-full animate-pulse dark:bg-blue-400 bg-white"></span>
          Logout
        </button>
      </div>
    </header>
  );
}
