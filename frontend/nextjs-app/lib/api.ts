/**
 * CREST — API Client
 * Typed fetch wrappers for all backend endpoints.
 * Used by React Server Components (RSC) and client hooks alike.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────

export interface Complaint {
  id:             string;
  channel:        string;
  customer_id:    string;
  customer_name:  string | null;
  subject:        string | null;
  category:       string | null;
  sub_category:   string | null;
  severity:       number | null;
  anger_score:    number | null;
  sentiment:      string | null;
  priority_score: number;
  sla_deadline:   string | null;
  sla_status:     string;
  status:         string;
  assigned_agent: string | null;
  is_duplicate:   boolean;
  duplicate_of:   string | null;
  draft_reply:    string | null;
  draft_approved: boolean;
  created_at:     string;
}

export interface DashboardSummary {
  total_open:        number;
  p0_open:           number;
  sla_breached:      number;
  resolved_today:    number;
  duplicates_caught: number;
  avg_resolution_hrs:number;
}

export interface CategoryStat  { category: string;  count: number; }
export interface SeverityStat  { severity: string;  count: number; }
export interface ChannelStat   { channel:  string;  count: number; }
export interface VolumeTrend   { date: string; total: number; duplicates: number; p0_count: number; }
export interface SpikeSignal   {
  id:                  number;
  signal_type:         string;
  description:         string;
  expected_impact:     string;
  predicted_surge_pct: number;
  signal_ts:           string;
}
export interface AuditEntry {
  id:        number;
  actor:     string;
  action:    string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ts:        string;
}

// ── Complaints ────────────────────────────────────────────────

export const getPriorityQueue = (limit = 50): Promise<Complaint[]> =>
  apiFetch(`/api/complaints/queue?limit=${limit}`, { cache: "no-store" });

export const getComplaint = (id: string): Promise<Complaint> =>
  apiFetch(`/api/complaints/${id}`, { cache: "no-store" });

export const getSimilarComplaints = (id: string, topK = 5): Promise<Complaint[]> =>
  apiFetch(`/api/complaints/${id}/similar?top_k=${topK}`, { cache: "no-store" });

export const getAuditTrail = (id: string): Promise<AuditEntry[]> =>
  apiFetch(`/api/complaints/${id}/audit`, { cache: "no-store" });

export const assignComplaint = (id: string, agent: string) =>
  apiFetch(`/api/complaints/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ agent }),
  });

export const approveDraft = (id: string, agent: string) =>
  apiFetch(`/api/complaints/${id}/approve-draft?agent=${encodeURIComponent(agent)}`, {
    method: "PATCH",
  });

export const resolveComplaint = (
  id: string,
  agent: string,
  resolution_note: string,
  csat?: number,
) =>
  apiFetch(`/api/complaints/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ agent, resolution_note, add_to_kb: true, csat }),
  });

// ── Analytics ─────────────────────────────────────────────────

export const getDashboardSummary = (): Promise<DashboardSummary> =>
  apiFetch("/api/analytics/dashboard", { next: { revalidate: 30 } });

export const getByCategory = (days = 30): Promise<CategoryStat[]> =>
  apiFetch(`/api/analytics/by-category?days=${days}`, { next: { revalidate: 60 } });

export const getBySeverity = (): Promise<SeverityStat[]> =>
  apiFetch("/api/analytics/by-severity", { next: { revalidate: 60 } });

export const getVolumeTrend = (days = 14): Promise<VolumeTrend[]> =>
  apiFetch(`/api/analytics/volume-trend?days=${days}`, { next: { revalidate: 300 } });

export const getChannelDistribution = (days = 30): Promise<ChannelStat[]> =>
  apiFetch(`/api/analytics/channel-distribution?days=${days}`, { next: { revalidate: 60 } });

export const getSpikeSignals = (hours = 48): Promise<SpikeSignal[]> =>
  apiFetch(`/api/analytics/spike-signals?hours=${hours}`, { next: { revalidate: 120 } });
