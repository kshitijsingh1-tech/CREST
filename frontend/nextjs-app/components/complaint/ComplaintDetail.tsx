"use client";

/**
 * CREST — ComplaintDetail Component
 * Shows full complaint info, draft reply, similar complaints, and audit trail.
 * Agent can assign, approve draft, and resolve from this view.
 */

import { useState } from "react";
import { assignComplaint, approveDraft, resolveComplaint, type Complaint, type AuditEntry } from "@/lib/api";

const SEV_COLOR: Record<number, string> = {
  0: "bg-red-600", 1: "bg-orange-500", 2: "bg-yellow-500", 3: "bg-blue-500", 4: "bg-gray-400",
};
const SENT_EMOJI: Record<string, string> = {
  hostile: "😡", negative: "😞", neutral: "😐", positive: "😊",
};

interface Props {
  complaint: Complaint;
  similar:   Complaint[];
  audit:     AuditEntry[];
}

export default function ComplaintDetail({ complaint: initial, similar, audit }: Props) {
  const [c, setC]           = useState(initial);
  const [agent, setAgent]   = useState(initial.assigned_agent || "");
  const [note, setNote]     = useState("");
  const [csat, setCsat]     = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleAssign = async () => {
    if (!agent) return;
    setLoading(true);
    try {
      await assignComplaint(c.id, agent);
      setC(prev => ({ ...prev, assigned_agent: agent, status: "in_progress" }));
      flash("ok", `Assigned to ${agent}`);
    } catch { flash("err", "Assignment failed"); }
    setLoading(false);
  };

  const handleApproveDraft = async () => {
    if (!agent) { flash("err", "Enter your agent ID first"); return; }
    setLoading(true);
    try {
      await approveDraft(c.id, agent);
      setC(prev => ({ ...prev, draft_approved: true }));
      setNote("Resolved by approving AI generated draft reply.");
      flash("ok", "Draft approved! You can now Mark as Resolved.");
    } catch { flash("err", "Approval failed"); }
    setLoading(false);
  };

  const handleResolve = async () => {
    if (!agent || !note) { flash("err", "Agent ID and resolution note required"); return; }
    setLoading(true);
    try {
      await resolveComplaint(c.id, agent, note, csat !== "" ? Number(csat) : undefined);
      setC(prev => ({ ...prev, status: "resolved" }));
      flash("ok", "Complaint resolved and added to knowledge base ✓");
    } catch { flash("err", "Resolution failed"); }
    setLoading(false);
  };

  const slaHours = c.sla_deadline
    ? Math.max(0, (new Date(c.sla_deadline).getTime() - Date.now()) / 3_600_000)
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Flash message */}
      {msg && (
        <div className={`px-4 py-3 rounded text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-black/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-6 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold text-white px-2 py-1 rounded ${SEV_COLOR[c.severity ?? 4]}`}>
                P{c.severity}
              </span>
              <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 px-2 py-1 rounded font-medium">
                {c.category}
              </span>
              {c.sub_category && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{c.sub_category}</span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">via {c.channel}</span>
              {c.is_duplicate && (
                <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 px-2 py-1 rounded">
                  Duplicate
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {c.subject ?? "No Subject"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {c.customer_name ?? c.customer_id} · {new Date(c.created_at).toLocaleString("en-IN")}
            </p>
          </div>

          {/* SLA indicator */}
          <div className="text-right">
            <div className={`text-sm font-bold ${c.sla_status === "breached" ? "text-red-600" : c.sla_status === "at_risk" ? "text-amber-600" : "text-green-600"}`}>
              {c.sla_status === "breached" ? "⛔ SLA Breached" : c.sla_status === "at_risk" ? "⚠️ At Risk" : "✅ On Track"}
            </div>
            {slaHours !== null && (
              <div className="text-xs text-gray-400 mt-0.5">
                {slaHours > 0 ? `${Math.floor(slaHours)}h remaining` : "Deadline passed"}
              </div>
            )}
          </div>
        </div>

        {/* Emotion indicators */}
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <span className="text-gray-400 text-xs">Anger</span>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-red-500" style={{ width: `${(c.anger_score ?? 0) * 100}%` }} />
              </div>
              <span className="text-xs font-mono text-gray-600">{((c.anger_score ?? 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Sentiment</span>
            <div className="font-medium mt-0.5">{SENT_EMOJI[c.sentiment ?? "neutral"]} {c.sentiment}</div>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Priority Score</span>
            <div className="font-mono font-bold text-indigo-700 mt-0.5">{Number(c.priority_score).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">

          {/* Complaint body */}
          <div className="bg-white dark:bg-black/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-5 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Customer Complaint</h3>
            <p className="text-sm text-gray-800 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{(c as any).body}</p>
          </div>

          {/* RAG Draft Reply */}
          <div className="bg-white dark:bg-black/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                ✨ AI Draft Reply
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">(Claude API + RAG)</span>
              </h3>
              {c.draft_approved && (
                <span className="text-xs text-green-600 dark:text-green-500 font-medium">✓ Approved</span>
              )}
            </div>
            {c.draft_reply ? (
              <p className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                {c.draft_reply}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">No draft generated yet.</p>
            )}
          </div>

          {/* Resolved Success State */}
          {c.status === "resolved" && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-900/50 shadow-sm p-8 text-center backdrop-blur-md">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
                ✓
              </div>
              <h3 className="text-lg font-bold text-green-800 dark:text-green-400 mb-2">Complaint Successfully Resolved</h3>
              <p className="text-sm text-green-600 dark:text-green-500 mb-6">
                The resolution note has been securely locked into the RBI Audit Trail.
              </p>
              <a
                href="/queue"
                className="inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Return to Priority Queue ➔
              </a>
            </div>
          )}

          {/* Agent actions */}
          {c.status !== "resolved" && (
            <div className="bg-white dark:bg-black/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-5 space-y-4 backdrop-blur-md">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Agent Actions</h3>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Your Agent ID</label>
                <input
                  value={agent}
                  onChange={e => setAgent(e.target.value)}
                  placeholder="e.g. AGENT_042"
                  className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-black/40 dark:text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={handleAssign} disabled={loading || !agent}
                  className="text-xs px-3 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded transition-colors disabled:opacity-50">
                  Assign to Me
                </button>
                {c.draft_reply && !c.draft_approved && (
                  <button onClick={handleApproveDraft} disabled={loading || !agent}
                    className="text-xs px-3 py-2 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 rounded transition-colors disabled:opacity-50">
                    ✓ Approve Draft
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Resolution Note</label>
                <textarea
                  rows={4} value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Describe the resolution steps taken…"
                  className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-black/40 dark:text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-700"
                />
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">CSAT (1–5)</label>
                  <input type="number" min={1} max={5} value={csat}
                    onChange={e => setCsat(e.target.value ? Number(e.target.value) : "")}
                    className="w-20 text-sm border border-gray-200 dark:border-white/10 dark:bg-black/40 dark:text-white rounded px-3 py-2 focus:outline-none"
                    placeholder="4"
                  />
                </div>
                <button onClick={handleResolve} disabled={loading || !agent || !note}
                  className="mt-4 text-sm px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50">
                  ✓ Mark Resolved
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Named entities */}
          {(c as any).named_entities && Object.keys((c as any).named_entities).length > 0 && (
            <div className="bg-white dark:bg-black/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-4 backdrop-blur-md">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Extracted Entities</h3>
              {Object.entries((c as any).named_entities as Record<string, string[]>).map(([k, vals]) => (
                <div key={k} className="mb-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{k.replace("_", " ")}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {vals.map(v => (
                      <span key={v} className="text-xs bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded font-mono">{v}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Similar complaints */}
          {similar.length > 0 && (
            <div className="bg-white dark:bg-black/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-4 backdrop-blur-md">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                Similar Complaints (DNA Match)
              </h3>
              <div className="space-y-2">
                {similar.map(s => (
                  <a key={s.id} href={`/complaints/${s.id}`}
                    className="block text-xs p-2 rounded hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-white/5">
                    <span className={`inline-block px-1.5 py-0.5 text-white rounded text-xs mr-1 ${SEV_COLOR[s.severity ?? 4]}`}>P{s.severity}</span>
                    <span className="text-gray-700 dark:text-gray-300">{s.category}</span>
                    <span className={`ml-1 text-xs ${s.status === "resolved" ? "text-green-500" : "text-amber-500"}`}>
                      ({s.status})
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Audit trail */}
          <div className="bg-white dark:bg-black/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-4 backdrop-blur-md">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Audit Trail (RBI)</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {audit.map(e => (
                <div key={e.id} className="text-xs border-l-2 border-indigo-200 dark:border-indigo-900/50 pl-3 py-1">
                  <div className="font-medium text-gray-700 dark:text-gray-300">{e.action.replace("_", " ")}</div>
                  <div className="text-gray-400 dark:text-gray-500">{e.actor} · {new Date(e.ts).toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
