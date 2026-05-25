/**
 * CREST — API Client
 * Typed fetch wrappers for all backend endpoints.
 * Used by React Server Components (RSC) and client hooks alike.
 */

import Cookies from "js-cookie";

const normalizeServiceUrl = (value?: string | null) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `http://${value}`;
};

const PROD_API_URL = "https://crest-api-z8zf.onrender.com";

const getBaseUrls = () => {
  if (typeof window !== "undefined") {
    // Browser: use relative URL — Next.js proxies /api/* → backend server-side (no CORS)
    return [""];
  }

  // Server-side (RSC): use the same public API as the browser proxy so JWT/session stays on one backend.
  return Array.from(new Set([
    normalizeServiceUrl(process.env.NEXT_PUBLIC_API_URL),
    PROD_API_URL,
    normalizeServiceUrl(process.env.BACKEND_INTERNAL_URL),
  ].filter((value): value is string => Boolean(value))));
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrls = getBaseUrls();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  
  let token: string | undefined;

  if (typeof window !== "undefined") {
    // Client-side
    token = Cookies.get("crest_token");
  } else {
    // Server-side (RSC)
    const { cookies } = await import("next/headers");
    token = cookies().get("crest_token")?.value;
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  let lastError: unknown;

  for (const [index, baseUrl] of baseUrls.entries()) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers,
        credentials: "include", // Essential for sending cookies to the backend
        ...init,
      });

      if (!res.ok) {
        if (res.status === 401 && typeof window !== "undefined") {
          console.warn("Unauthorized API call, redirecting to login");
          // We don't redirect immediately here to avoid loops, 
          // but we throw so the component can handle it.
        }

        const shouldRetryOnServer =
          typeof window === "undefined" &&
          index < baseUrls.length - 1 &&
          (res.status >= 500 || res.status === 401);

        if (shouldRetryOnServer) {
          console.warn(`[API Fetch Retry] ${path}: ${baseUrl} returned ${res.status}, trying next backend URL`);
          continue;
        }

        throw new Error(`API ${path} failed with status ${res.status}`);
      }

      return res.json() as Promise<T>;
    } catch (error) {
      lastError = error;
      const shouldRetryOnServer =
        typeof window === "undefined" &&
        index < baseUrls.length - 1;

      if (shouldRetryOnServer) {
        console.warn(`[API Fetch Retry] ${path}: ${baseUrl} failed, trying next backend URL`, error);
        continue;
      }
    }
  }

  console.error(`[API Fetch Error] ${path}:`, lastError);
  throw lastError;
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
  region_id:      number | null;
  assigned_employee_id: number | null;
  is_escalated:   boolean;
  is_duplicate:   boolean;
  duplicate_of:   string | null;
  draft_reply:    string | null;
  draft_metadata: any | null;
  draft_approved: boolean;
  created_at:     string;
}

export interface Region {
  id:   number;
  name: string;
}

export interface User {
  id:        number;
  email:     string;
  name:      string;
  role:      string;
  phone?:    string | null;
  region_id: number | null;
  is_active: boolean;
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
export interface RegionStat   { region_id?: number; region: string; open: number; breached: number; total: number; }
export interface SpikeSignal   {
  id:                  number;
  signal_type:         string;
  description:         string;
  expected_impact:     string;
  predicted_surge_pct: number;
  rca_insight:         string | null;
  common_factors:      any | null;
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

export const getPriorityQueue = (limit = 50, regionId?: number): Promise<Complaint[]> => {
  const query = regionId ? `&region_id=${regionId}` : "";
  return apiFetch(`/api/complaints/queue?limit=${limit}${query}`, { cache: "no-store" });
};

export const getComplaint = (id: string): Promise<Complaint> =>
  apiFetch(`/api/complaints/${id}`, { cache: "no-store" });

export const getSimilarComplaints = (id: string, topK = 5): Promise<Complaint[]> =>
  apiFetch(`/api/complaints/${id}/similar?top_k=${topK}`, { cache: "no-store" });

export const getAuditTrail = (id: string): Promise<AuditEntry[]> =>
  apiFetch(`/api/complaints/${id}/audit`, { cache: "no-store" });

export const trackComplaint = (id: string): Promise<any> =>
  apiFetch(`/api/complaints/track/${id}`, { cache: "no-store" });

export const assignComplaint = (id: string, employeeId: number) =>
  apiFetch(`/api/complaints/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ employee_id: employeeId }),
  });

export const escalateComplaint = (id: string, employeeId: number) =>
  apiFetch(`/api/complaints/${id}/escalate`, {
    method: "PATCH",
    body: JSON.stringify({ employee_id: employeeId }),
  });

export const approveDraft = (id: string, agent: string, draft_reply?: string) =>
  apiFetch(`/api/complaints/${id}/approve-draft`, {
    method: "PATCH",
    body: JSON.stringify({ agent, draft_reply }),
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

export const getDashboardSummary = (regionId?: number): Promise<DashboardSummary> => {
  const query = regionId ? `?region_id=${regionId}` : "";
  return apiFetch(`/api/analytics/dashboard${query}`, { next: { revalidate: 30 } });
};

export const getByCategory = (days = 30, regionId?: number): Promise<CategoryStat[]> => {
  const query = `?days=${days}${regionId ? `&region_id=${regionId}` : ""}`;
  return apiFetch(`/api/analytics/by-category${query}`, { next: { revalidate: 60 } });
};

export const getBySeverity = (regionId?: number): Promise<SeverityStat[]> => {
  const query = regionId ? `?region_id=${regionId}` : "";
  return apiFetch(`/api/analytics/by-severity${query}`, { next: { revalidate: 60 } });
};

export const getVolumeTrend = (days = 14, regionId?: number): Promise<VolumeTrend[]> => {
  const query = `?days=${days}${regionId ? `&region_id=${regionId}` : ""}`;
  return apiFetch(`/api/analytics/volume-trend${query}`, { next: { revalidate: 300 } });
};

export const getChannelDistribution = (days = 30, regionId?: number): Promise<ChannelStat[]> => {
  const query = `?days=${days}${regionId ? `&region_id=${regionId}` : ""}`;
  return apiFetch(`/api/analytics/channel-distribution${query}`, { next: { revalidate: 60 } });
};

export const getSpikeSignals = (hours = 48): Promise<SpikeSignal[]> =>
  apiFetch(`/api/analytics/spike-signals?hours=${hours}`, { next: { revalidate: 120 } });

export const getRegionDistribution = (): Promise<RegionStat[]> =>
  apiFetch("/api/analytics/by-region", { next: { revalidate: 60 } });

// ── Admin ─────────────────────────────────────────────────────

export const getRegions = (): Promise<Region[]> =>
  apiFetch("/api/admin/regions", { cache: "no-store" });

export const listUsers = (): Promise<User[]> =>
  apiFetch("/api/admin/users", { cache: "no-store" });

export const createUser = (payload: any): Promise<User> =>
  apiFetch("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const deleteUser = (userId: number): Promise<any> =>
  apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });

export const getMe = (): Promise<User> =>
  apiFetch("/api/admin/users/me", { cache: "no-store" });

export const toggleStatus = (isActive: boolean): Promise<User> =>
  apiFetch(`/api/admin/users/status?is_active=${isActive}`, { method: "PATCH" });

// ── Auth ──────────────────────────────────────────────────────

export const login = async (email: string, password: string): Promise<any> => {
  const data = await apiFetch<any>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (typeof window !== "undefined") {
    const isSecure = window.location.protocol === "https:";
    Cookies.set("crest_token", data.access_token, { expires: 1 / 24, secure: isSecure, sameSite: "lax", path: "/" }); // 1 hour
    localStorage.setItem("crest_user", JSON.stringify(data));
  }
  return data;
};

export const logout = () => {
  if (typeof window !== "undefined") {
    Cookies.remove("crest_token", { path: "/" });
    localStorage.removeItem("crest_user");
    window.location.href = "/ub_CREST/login";
  }
};

// ── Public Tracking ───────────────────────────────────────────

export const sendPublicOtp = (reference_token: string, contact: string): Promise<any> =>
  apiFetch("/api/public/send-otp", {
    method: "POST",
    body: JSON.stringify({ reference_token, contact }),
  });

export const trackPublicComplaint = (reference_token: string, contact: string, otp: string): Promise<any> =>
  apiFetch("/api/public/track", {
    method: "POST",
    body: JSON.stringify({ reference_token, contact, otp }),
  });

export const submitPublicAction = (reference_token: string, action_type: string, data?: any): Promise<any> =>
  apiFetch("/api/public/action", {
    method: "POST",
    body: JSON.stringify({ reference_token, action_type, data }),
  });

export const createPublicComplaint = (payload: {
  customer_id: string;
  customer_name: string;
  subject: string;
  body: string;
}): Promise<any> =>
  apiFetch("/api/complaints/ingest", {
    method: "POST",
    body: JSON.stringify({
      channel: "web",
      customer_id: payload.customer_id,
      customer_name: payload.customer_name,
      subject: payload.subject,
      body: payload.body,
      language: "en",
      sla_hours: 720
    }),
  });
