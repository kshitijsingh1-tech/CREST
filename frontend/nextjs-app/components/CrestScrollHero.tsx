"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import ColorBends from "@/components/ColorBends";

interface CrestScrollHeroProps {
  heroImage: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  subText?: string;
  italicText?: string;
  children: ReactNode;
}

export default function CrestScrollHero({
  heroImage,
  title,
  subtitle,
  badgeText,
  subText,
  italicText,
  children,
}: CrestScrollHeroProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let active = true;
    let currentScroll = window.scrollY;
    let targetScroll = window.scrollY;

    const handleScroll = () => {
      targetScroll = window.scrollY;
    };

    const update = () => {
      if (!active) return;
      
      // Cushioned linear interpolation (lerp) formula:
      // Moves 12% of the remaining distance per frame, creating an ultra-smooth, premium liquid slide!
      const diff = targetScroll - currentScroll;
      if (Math.abs(diff) > 0.05) {
        currentScroll += diff * 0.12;
        setScrollY(currentScroll);
      } else if (currentScroll !== targetScroll) {
        currentScroll = targetScroll;
        setScrollY(currentScroll);
      }
      
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    requestAnimationFrame(update);

    return () => {
      active = false;
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Smooth Quadratic Ease-out Easing over 400px of scroll for an incredibly fluid, luxury transition!
  const rawPercent = Math.min(1, scrollY / 400);
  const expandPercent = rawPercent * (2 - rawPercent);
  const containerRadius = (1 - expandPercent) * 40; // shrinks from 40px to 0px
  const imgScale = 1.0; // Locked at static 1.0 scale to guarantee 100% crop-free display with zero boundary clipping!

  // Dynamic Scroll Variables for Card/Button Undissolve (synchronized to start as expansion completes)
  const cardsScrollPercent = Math.min(1, Math.max(0, (scrollY - 150) / 250));

  return (
    <div className="flex-grow flex flex-col w-full relative bg-transparent">
      
      {/* 1. The Widescreen Title Banner with WebGL Red & Blue neon sweeps (Single Unified Classy Card) */}
      <div className="w-full max-w-6xl mx-auto px-6 mt-6 mb-10 relative overflow-hidden rounded-[2.5rem] border border-white/20 dark:border-white/10 h-[280px] flex items-center justify-center shadow-[0_25px_60px_-15px_rgba(59,130,246,0.12),0_15px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl bg-white/12 dark:bg-black/25 animate-fade-in-up hover:shadow-[0_30px_70px_-10px_rgba(59,130,246,0.2),0_20px_40px_rgba(0,0,0,0.1)] hover:border-white/30 dark:hover:border-white/20 transition-all duration-700 ease-out hover:-translate-y-1">
        {/* ColorBends rendering beautiful WebGL neon red/blue sweeps in background */}
        <div className="absolute inset-0 opacity-45 pointer-events-none z-0">
          <ColorBends 
            colors={["#ef4444", "#3b82f6"]} 
            speed={0.12} 
            warpStrength={0.6}
            iterations={2}
            bandWidth={4.5}
          />
        </div>
        
        {/* Title Details floating directly inside the single unified glassmorphic canvas */}
        <div className="relative z-10 text-center space-y-4 max-w-4xl px-4">
          {badgeText && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm
              dark:border-white/10 dark:bg-white/5 dark:text-blue-300
              border-white/20 bg-white/10 text-gray-700 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_both]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 animate-[pulse_2s_infinite]" /> {badgeText}
            </div>
          )}
          
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none drop-shadow-sm animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.1s_both] bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #0052ff, #1a64ff, #7a22ff, #d8296a, #ff4d00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {title}
          </h2>
          
          <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-gray-600/90 dark:text-slate-400 drop-shadow-sm animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]">
            {subtitle}
          </p>
          {/* Laser-style glowing neon-gradient underline replacing static solid line */}
          <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[#e31837] to-transparent shadow-[0_0_10px_rgba(227,24,55,0.6)] mx-auto mt-2 rounded-full animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.25s_both]" />

          {subText && (
            <p className="text-[9px] max-w-2xl mx-auto font-bold uppercase tracking-widest leading-relaxed text-gray-500/80 dark:text-slate-400/60 mt-1 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.3s_both]">
              {subText}
            </p>
          )}
        </div>
      </div>

      {/* 2. Anthropic-style Scroll-Expanding Showcase Banner (Aspect-locked 16:9 with zero height caps to guarantee 100% full-bleed, crop-free display!) */}
      <div className="w-full flex justify-center items-center my-12 bg-transparent relative z-20">
        <div 
          className="w-full aspect-[16/9] bg-[#002261] dark:bg-black overflow-hidden relative flex justify-center items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-white/10"
          style={{
            width: `calc(100% - ${(1 - expandPercent) * 48}px)`,
            maxWidth: `calc(1152px + ${expandPercent} * (100vw - 1152px))`,
            borderRadius: `${containerRadius}px`,
          }}
        >
          <img 
            src={heroImage} 
            alt="CREST Command Center Preview" 
            className="w-full h-full object-cover object-center transition-transform duration-300 ease-out"
            style={{
              transform: `scale(${imgScale})`,
            }}
          />
          {/* Ambient soft glow overlays */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/15 dark:from-[#0a0a0a]/20 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* 3. Page Contents Wrapper - UNDISSOLVES (fades, slides & unblurs) smoothly onto screen as we scroll! */}
      <div 
        className="w-full flex-grow transition-all duration-700 ease-out"
        style={{
          opacity: cardsScrollPercent,
          transform: `translateY(${(1 - cardsScrollPercent) * 45}px)`,
          filter: `blur(${(1 - cardsScrollPercent) * 10}px)`,
        }}
      >
        {/* Children (Command Center Dashboard Content) */}
        <div className="w-full flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
}
