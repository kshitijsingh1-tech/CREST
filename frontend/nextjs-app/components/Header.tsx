import Link from 'next/link';

export default function Header({ theme, toggleTheme }: { theme: "dark" | "light", toggleTheme: () => void }) {
  return (
    <header className="w-full transition-all duration-500 
      dark:bg-black/80 dark:backdrop-blur-xl dark:border-b dark:border-blue-900/30
      bg-white border-b border-gray-200 shadow-sm hover:border-black
      px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500
          dark:bg-gradient-to-br dark:from-red-600 dark:to-blue-600 dark:shadow-[0_0_20px_rgba(255,0,0,0.4)]
          bg-black shadow-md">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight leading-none transition-colors duration-500
            dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-blue-200
            text-black">
            CREST
          </h1>
          <p className="text-[9px] uppercase tracking-widest font-bold mt-1 transition-colors duration-500
            dark:text-red-400 text-gray-600">
            Union Bank of India
          </p>
        </div>
      </div>
      
      <nav className="hidden md:flex items-center gap-8">
        <Link href="/" className="text-sm font-bold transition-all duration-300 dark:text-blue-100 dark:hover:text-red-400 text-black hover:text-red-600">Home</Link>
        <Link href="/dashboard" className="text-sm font-bold transition-all duration-300 dark:text-blue-100 dark:hover:text-red-400 text-black hover:text-red-600">Dashboard</Link>
        <Link href="/analytics" className="text-sm font-bold transition-all duration-300 dark:text-blue-100 dark:hover:text-red-400 text-black hover:text-red-600">Analytics</Link>
        <Link href="/queue" className="text-sm font-bold transition-all duration-300 dark:text-blue-100 dark:hover:text-red-400 text-black hover:text-red-600">Live Queue</Link>
      </nav>

      <div className="flex items-center gap-4">
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

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-colors duration-500
          dark:bg-blue-900/20 dark:border-blue-500/30 dark:text-blue-400
          bg-black border-black text-white shadow-sm">
          <span className="w-2 h-2 rounded-full animate-pulse dark:bg-blue-400 bg-white"></span>
          Secure Session
        </div>
      </div>
    </header>
  );
}
