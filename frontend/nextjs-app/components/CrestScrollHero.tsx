"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import ColorBends from "@/components/ColorBends";

interface CrestScrollHeroProps {
  heroImage: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  subText?: ReactNode;
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
      
      {/* 1. The Widescreen Title Banner with WebGL Red & Blue neon sweeps (Single Unified Classy Card - Zoomed-in Premium) */}
      <div className="w-full max-w-7xl mx-auto px-8 mt-8 mb-12 relative overflow-hidden rounded-[3rem] border border-white/35 dark:border-white/15 min-h-[340px] py-12 flex flex-col items-center justify-center shadow-[0_35px_80px_-15px_rgba(59,130,246,0.22),0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-3xl bg-white/30 dark:bg-black/35 animate-fade-in-up hover:shadow-[0_45px_90px_-10px_rgba(59,130,246,0.32),0_25px_50px_rgba(0,0,0,0.12)] hover:border-white/45 dark:hover:border-white/25 transition-all duration-700 ease-out hover:-translate-y-1">
        {/* ColorBends rendering beautiful WebGL neon red/blue sweeps in background */}
        <div className="absolute inset-0 opacity-55 pointer-events-none z-0">
          <ColorBends 
            colors={["#ef4444", "#3b82f6"]} 
            speed={0.12} 
            warpStrength={0.6}
            iterations={2}
            bandWidth={4.5}
          />
        </div>
        
        {/* Title Details floating directly inside the single unified glassmorphic canvas */}
        <div className="relative z-10 text-center space-y-5 max-w-5xl px-6">
          {badgeText && (
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm
              dark:border-white/15 dark:bg-white/5 dark:text-blue-300
              border-white/25 bg-white/15 text-gray-700 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_both]">
              <ShieldCheck className="w-4 h-4 text-emerald-500 animate-[pulse_2s_infinite]" /> {badgeText}
            </div>
          )}
          
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-none drop-shadow-md animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.1s_both] bg-clip-text text-transparent w-fit mx-auto" style={{ backgroundImage: "linear-gradient(to right, #0052ff, #4a22ff, #9b1aff, #e31837, #ff2200)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {title}
          </h2>
          
          <p className="text-sm md:text-base font-black uppercase tracking-widest text-gray-700 dark:text-slate-300 drop-shadow-sm animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]">
            {subtitle}
          </p>
          {/* Laser-style glowing neon-gradient underline replacing static solid line */}
          <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-[#e31837] to-transparent shadow-[0_0_12px_rgba(227,24,55,0.7)] mx-auto mt-2 rounded-full animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.25s_both]" />
 
          {subText && (
            <div className="text-xs md:text-sm max-w-3xl mx-auto font-black uppercase tracking-widest leading-relaxed text-gray-600 dark:text-slate-300 mt-2 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0.3s_both]">
              {subText}
            </div>
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
