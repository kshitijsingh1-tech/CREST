"use client";

/**
 * CREST — VolumeTrendChart
 * Recharts line chart showing daily complaint volume for the last N days.
 * Three series: total, duplicates caught, P0 critical.
 * Used on /analytics page.
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { VolumeTrend } from "@/lib/api";

interface Props {
  data: VolumeTrend[];
}

export default function VolumeTrendChart({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Daily Complaint Volume
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={formatted} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="total"      name="Total"      stroke="#6366F1" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="duplicates" name="Duplicates" stroke="#0EA5E9" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="p0_count"   name="P0 Critical" stroke="#EF4444" strokeWidth={2} dot={{ fill: "#EF4444", r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
