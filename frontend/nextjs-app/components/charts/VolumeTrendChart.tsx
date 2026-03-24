"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { VolumeTrend } from "@/lib/api";
import { useEffect, useState } from "react";

interface Props {
  data: VolumeTrend[];
}

export default function VolumeTrendChart({ data }: Props) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    setIsDark(document.documentElement.classList.contains("dark"));
    return () => observer.disconnect();
  }, []);

  const formatted = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  const axisColor = isDark ? "#94A3B8" : "#64748B";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9";
  const tooltipBg = isDark ? "#000000" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";

  return (
    <div className="rounded-3xl border p-6 md:p-8 transition-all duration-500
      dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
      bg-white border-gray-200 shadow-xl hover:border-black">
      <h3 className="text-xs font-black uppercase tracking-widest mb-8 transition-colors duration-500 dark:text-white text-black">
        Daily Complaint Volume
      </h3>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor, fontWeight: 'bold' }} axisLine={false} tickLine={false} tickMargin={12} />
            <YAxis tick={{ fontSize: 10, fill: axisColor, fontWeight: 'bold' }} axisLine={false} tickLine={false} tickMargin={12} />
            <Tooltip
              contentStyle={{ fontSize: 11, fontWeight: 'bold', backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              itemStyle={{ fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: '20px' }} iconType="circle" />
            <Line type="monotone" dataKey="total"      name="Total"      stroke="#6366F1" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#6366F1", strokeWidth: 0 }} />
            <Line type="monotone" dataKey="duplicates" name="Duplicates" stroke="#0EA5E9" strokeWidth={3} dot={false} strokeDasharray="4 4" activeDot={{ r: 6, fill: "#0EA5E9", strokeWidth: 0 }} />
            <Line type="monotone" dataKey="p0_count"   name="P0 Critical" stroke="#EF4444" strokeWidth={3} dot={{ fill: "#EF4444", r: 4, strokeWidth: 0 }} activeDot={{ r: 7, fill: "#EF4444", strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
