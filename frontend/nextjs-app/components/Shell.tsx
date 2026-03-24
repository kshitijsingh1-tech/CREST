"use client";
import { useState, useEffect } from "react";
import FloatingLines from "./FloatingLines";
import Header from "./Header";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("crest-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("crest-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const colors = ["#0055ff", "#00aaff", "#ff3333", "#ff0000"];

  if (!mounted) return <div className="min-h-screen bg-white"></div>;

  return (
    <div className={`transition-colors duration-700 min-h-screen relative overflow-x-hidden ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-700 opacity-100`}>
        <div className="pointer-events-auto absolute inset-0">
          <FloatingLines 
            theme={theme}
            linesGradient={colors} 
            interactive={true} 
            animationSpeed={1.0}
            bendStrength={-1.5}
            bendRadius={0.03}
          />
        </div>
      </div>
      
      <div className="relative z-10 min-h-screen flex flex-col pointer-events-none">
        <div className="pointer-events-auto flex flex-col min-h-screen">
          <Header theme={theme} toggleTheme={toggleTheme} />
          {children}
        </div>
      </div>
    </div>
  );
}
