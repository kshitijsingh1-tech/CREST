"use client";

/**
 * CREST — ComplaintDetail Component
 * Shows full complaint info, draft reply, similar complaints, and audit trail.
 * Agent can assign, approve draft, and resolve from this view.
 */

import { useState, useEffect } from "react";
import { assignComplaint, escalateComplaint, approveDraft, resolveComplaint, type Complaint, type AuditEntry } from "@/lib/api";

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
  const [agent, setAgent]   = useState("");
  const [note, setNote]     = useState("");
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("crest_user");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setAgent(user.user_id?.toString() || "");
          setUserRole(user.role || "");
        } catch {}
      }
    }
  }, []);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleAssign = async () => {
    if (!agent) return;
    setLoading(true);
    try {
      await assignComplaint(c.id, Number(agent));
      setC(prev => ({ ...prev, assigned_employee_id: Number(agent), status: "in_progress" }));
      flash("ok", `Assigned to ${agent}`);
    } catch { flash("err", "Assignment failed"); }
    setLoading(false);
  };

  const handleApproveDraft = async () => {
    if (!agent) { flash("err", "Enter your agent ID first"); return; }
    setLoading(true);
    try {
      await approveDraft(c.id, agent, c.draft_reply || undefined);
      setC(prev => ({ ...prev, draft_approved: true }));
      setNote("Resolved by approving AI generated draft reply.");
      flash("ok", "Draft approved! You can now Mark as Resolved.");
    } catch { flash("err", "Approval failed"); }
    setLoading(false);
  };

  const handleResolve = async () => {
    if (!agent) { flash("err", "Agent ID required"); return; }
    setLoading(true);
    try {
      await resolveComplaint(c.id, agent, note, undefined);
      setC(prev => ({ ...prev, status: "resolved" }));
      flash("ok", "Complaint resolved and added to knowledge base ✓");
    } catch { flash("err", "Resolution failed"); }
    setLoading(false);
  };

  const handleEscalate = async () => {
    if (!agent) { flash("err", "Enter your employee ID first"); return; }
    setLoading(true);
    try {
      await escalateComplaint(c.id, Number(agent));
      setC(prev => ({ ...prev, is_escalated: true, assigned_employee_id: null, status: "open" }));
      flash("ok", "Ticket escalated to your Regional Sub-Admin");
    } catch { flash("err", "Escalation failed"); }
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
              <span className="text-xs text-gray-400 dark:text-gray-500">
                via {c.channel === "web" ? "Public Portal" : c.channel.charAt(0).toUpperCase() + c.channel.slice(1)}
              </span>
              {c.region_id && (
                <span className="text-xs bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 px-2 py-1 rounded">
                  Region: {c.region_id}
                </span>
              )}
              {c.is_escalated && (
                <span className="text-xs bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-1 rounded font-bold">
                  ⚠️ Escalated
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

      <div className="grid grid-cols-3 gap-6 items-stretch">
        {/* Left main panel */}
        <div className="col-span-2 flex flex-col gap-5">

          {/* Complaint body */}
          <div className="bg-white dark:bg-black/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-5 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Customer Complaint</h3>
            <p className="text-sm text-gray-800 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{(c as any).body}</p>
          </div>

          {/* RAG Draft Reply - Stretched */}
          <div className="flex-1 bg-white dark:bg-black/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm p-5 backdrop-blur-md flex flex-col justify-between">
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ✨ AI Draft Reply
                </h3>
                <div className="flex items-center gap-2">
                  {!c.draft_approved && !(c as any).is_superior_takeover && (
                    <button onClick={() => setIsEditingDraft(!isEditingDraft)} className="text-[10px] uppercase font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                      {isEditingDraft ? "Done" : "Edit"}
                    </button>
                  )}
                  {c.draft_approved && (
                    <span className="text-xs text-green-600 dark:text-green-500 font-medium">✓ Approved</span>
                  )}
                </div>
              </div>
              {c.draft_reply ? (
                <div className="flex-1 flex flex-col">
                  {c.draft_approved || (c as any).is_superior_takeover || (!isEditingDraft) ? (
                    <p className="flex-1 text-sm text-gray-800 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/40 min-h-[150px]">
                      {c.draft_reply}
                    </p>
                  ) : (
                    <textarea
                      className="flex-1 w-full text-sm text-gray-800 dark:text-white leading-relaxed bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/40 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 resize-y min-h-[150px]"
                      value={c.draft_reply || ""}
                      onChange={(e) => setC(prev => ({ ...prev, draft_reply: e.target.value }))}
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No draft generated yet.</p>
              )}
            </div>

            {/* RAG Sources (Grounded AI) */}
            {c.draft_reply && c.draft_metadata && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-3 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Verified Policy References
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {c.draft_metadata.documents?.map((doc: any, i: number) => (
                    <div key={i} className="text-xs bg-gray-50 dark:bg-black/40 p-3 rounded-lg border border-gray-100 dark:border-white/5 group hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-700 dark:text-gray-300">{doc.document_title}</span>
                        <span className="text-[10px] text-gray-400">Page {doc.page_number}</span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-500 italic line-clamp-2">"{doc.content}"</p>
                    </div>
                  ))}
                  {c.draft_metadata.resolutions?.map((res: any, i: number) => (
                    <div key={i} className="text-xs bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-blue-700 dark:text-blue-400">Past Resolution: {res.title}</span>
                        <span className="text-[10px] text-blue-400">Similarity: {(res.relevance * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-blue-600/80 dark:text-blue-500/80">Key: {res.resolution_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="col-span-1 flex flex-col gap-5">

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

          {/* Agent actions / resolved / takeover box */}
          {c.status !== "resolved" && !(c as any).is_superior_takeover && (
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

              <div className="flex flex-wrap gap-2">
                {!(c as any).is_superior_takeover && (
                  <button onClick={handleAssign} disabled={loading || !agent}
                    className="text-xs px-3 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded transition-colors disabled:opacity-50">
                    Assign to Me
                  </button>
                )}
                {userRole !== "SUPER_ADMIN" && (
                  <button onClick={handleEscalate} disabled={loading || !agent || c.is_escalated}
                    className="text-xs px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-900/30 transition-colors disabled:opacity-50">
                    Escalate
                  </button>
                )}
                {c.draft_reply && !c.draft_approved && !(c as any).is_superior_takeover && (
                  <button onClick={handleApproveDraft} disabled={loading || !agent}
                    className="text-xs px-3 py-2 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 rounded transition-colors disabled:opacity-50">
                    ✓ Approve Draft
                  </button>
                )}
              </div>

              {!(c as any).is_superior_takeover && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Resolution Note</label>
                    <textarea
                      rows={4} value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Note if something was special"
                      className="w-full text-sm border border-gray-200 dark:border-white/10 dark:bg-black/40 dark:text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-700"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button onClick={handleResolve} disabled={loading || !agent}
                      className="mt-2 w-full text-sm px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50">
                      ✓ Mark Resolved
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/ub_CREST/queue"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Back to Queue
                </a>
                <a
                  href="/ub_CREST/analytics"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  View Performance Analytics
                </a>
                <a
                  href="/ub_CREST/home"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all border border-gray-300 dark:border-white/10"
                >
                  Return to Home
                </a>
              </div>
            </div>
          )}

          {/* Superior Lockout State */}
          {c.status !== "resolved" && (c as any).is_superior_takeover && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5 shadow-sm backdrop-blur-md">
              <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                ⚠️ Your superior is working with the complaint
              </h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
                You cannot edit, approve, or resolve this ticket.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
