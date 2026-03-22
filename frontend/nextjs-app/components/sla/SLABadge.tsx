"use client";

/**
 * CREST — SLABadge Component
 * Shows a colour-coded SLA status pill with percentage elapsed.
 * Used inline in queue rows and complaint detail header.
 */

interface Props {
  slaDeadline: string | null;
  createdAt:   string;
  slaStatus:   string;
  showPct?:    boolean;
}

export default function SLABadge({ slaDeadline, createdAt, slaStatus, showPct = false }: Props) {
  const now        = Date.now();
  const created    = new Date(createdAt).getTime();
  const deadline   = slaDeadline ? new Date(slaDeadline).getTime() : null;
  const totalMs    = deadline ? deadline - created : null;
  const elapsedMs  = now - created;
  const pct        = totalMs ? Math.min(100, Math.round((elapsedMs / totalMs) * 100)) : null;

  const hoursLeft  = deadline ? Math.max(0, (deadline - now) / 3_600_000) : null;

  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    on_track: { bg: "bg-green-50 border-green-200",  text: "text-green-700", label: "On Track"  },
    at_risk:  { bg: "bg-amber-50 border-amber-200",  text: "text-amber-700", label: "At Risk"   },
    breached: { bg: "bg-red-50 border-red-200",      text: "text-red-700",   label: "Breached"  },
    resolved: { bg: "bg-gray-50 border-gray-200",    text: "text-gray-500",  label: "Resolved"  },
  };
  const { bg, text, label } = cfg[slaStatus] ?? cfg.on_track;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium ${bg} ${text}`}>
      {slaStatus === "breached" ? "⛔" : slaStatus === "at_risk" ? "⚠️" : slaStatus === "resolved" ? "✅" : "🟢"}
      {label}
      {showPct && pct !== null && <span className="opacity-70">({pct}%)</span>}
      {hoursLeft !== null && hoursLeft > 0 && (
        <span className="opacity-60">
          · {hoursLeft < 24 ? `${Math.floor(hoursLeft)}h` : `${Math.floor(hoursLeft / 24)}d`} left
        </span>
      )}
    </span>
  );
}
