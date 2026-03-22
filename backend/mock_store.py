from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import uuid


NOW = datetime.now(timezone.utc)

_COMPLAINT_1 = "4a5d7e3c-b1c2-4d7e-90aa-111111111111"
_COMPLAINT_2 = "4a5d7e3c-b1c2-4d7e-90aa-222222222222"
_COMPLAINT_3 = "4a5d7e3c-b1c2-4d7e-90aa-333333333333"

_complaints: dict[str, dict] = {
    _COMPLAINT_1: {
        "id": _COMPLAINT_1,
        "channel": "email",
        "customer_id": "CUST-009184",
        "customer_name": "Asha Verma",
        "subject": "UPI debit without beneficiary credit",
        "body": "My UPI payment of Rs 2,500 was debited but the beneficiary did not receive it. The transaction failed twice and I need this resolved urgently.",
        "category": "UPI",
        "sub_category": "Failed Transaction",
        "severity": 0,
        "anger_score": 0.82,
        "sentiment": "negative",
        "priority_score": 13.4,
        "sla_deadline": (NOW + timedelta(hours=18)).isoformat(),
        "sla_status": "at_risk",
        "status": "open",
        "assigned_agent": None,
        "is_duplicate": False,
        "duplicate_of": None,
        "draft_reply": "Dear Asha,\n\nWe acknowledge your complaint regarding the failed UPI debit of Rs. 2,500. Our team is verifying the transaction with NPCI and the destination bank.\n\nIf the debit is confirmed unsuccessful end-to-end, the amount will be reversed as per RBI timelines. We will update you within 3 working days.\n\nThank you for banking with Union Bank.",
        "draft_approved": False,
        "created_at": (NOW - timedelta(hours=30)).isoformat(),
        "named_entities": {"amounts": ["2500"], "products": ["UPI"]},
    },
    _COMPLAINT_2: {
        "id": _COMPLAINT_2,
        "channel": "whatsapp",
        "customer_id": "CUST-007412",
        "customer_name": "Rahul Sethi",
        "subject": "Debit card transaction disputed",
        "body": "An unauthorized card transaction of Rs 12,800 happened last night. I have blocked the card and need the dispute registered immediately.",
        "category": "Card",
        "sub_category": "Unauthorized Transaction",
        "severity": 1,
        "anger_score": 0.74,
        "sentiment": "hostile",
        "priority_score": 10.1,
        "sla_deadline": (NOW + timedelta(hours=42)).isoformat(),
        "sla_status": "on_track",
        "status": "in_progress",
        "assigned_agent": "AGENT_042",
        "is_duplicate": False,
        "duplicate_of": None,
        "draft_reply": "Dear Rahul,\n\nWe have registered your dispute for the unauthorized card transaction of Rs. 12,800. Your card remains blocked as a precaution while our team initiates a chargeback review.\n\nYou will receive the next update within 10 working days, subject to network validation.\n\nThank you for banking with Union Bank.",
        "draft_approved": True,
        "created_at": (NOW - timedelta(hours=12)).isoformat(),
        "named_entities": {"amounts": ["12800"], "products": ["debit card"]},
    },
    _COMPLAINT_3: {
        "id": _COMPLAINT_3,
        "channel": "branch",
        "customer_id": "CUST-005901",
        "customer_name": "Neha Kapoor",
        "subject": "KYC freeze despite branch submission",
        "body": "My account is still frozen even after submitting KYC documents at the branch last week. I cannot use net banking or UPI.",
        "category": "KYC",
        "sub_category": "Account Freeze",
        "severity": 2,
        "anger_score": 0.48,
        "sentiment": "negative",
        "priority_score": 5.6,
        "sla_deadline": (NOW + timedelta(hours=96)).isoformat(),
        "sla_status": "on_track",
        "status": "open",
        "assigned_agent": None,
        "is_duplicate": False,
        "duplicate_of": None,
        "draft_reply": "Dear Neha,\n\nWe have received your complaint regarding the account freeze after KYC submission. The branch and compliance teams are validating your documents.\n\nWe expect to update you within 2 working days.\n\nThank you for banking with Union Bank.",
        "draft_approved": False,
        "created_at": (NOW - timedelta(hours=6)).isoformat(),
        "named_entities": {"products": ["UPI", "net banking"]},
    },
}

_audit: dict[str, list[dict]] = {
    _COMPLAINT_1: [
        {"id": 1, "actor": "system", "action": "created", "old_value": None, "new_value": {"channel": "email"}, "ts": (NOW - timedelta(hours=30)).isoformat()},
    ],
    _COMPLAINT_2: [
        {"id": 2, "actor": "system", "action": "created", "old_value": None, "new_value": {"channel": "whatsapp"}, "ts": (NOW - timedelta(hours=12)).isoformat()},
        {"id": 3, "actor": "AGENT_042", "action": "assigned", "old_value": {"assigned_agent": None}, "new_value": {"assigned_agent": "AGENT_042"}, "ts": (NOW - timedelta(hours=10)).isoformat()},
    ],
    _COMPLAINT_3: [
        {"id": 4, "actor": "system", "action": "created", "old_value": None, "new_value": {"channel": "branch"}, "ts": (NOW - timedelta(hours=6)).isoformat()},
    ],
}

_spikes = [
    {
        "id": 1,
        "signal_type": "outage",
        "description": "Mobile banking login latency increased across western region.",
        "expected_impact": "high",
        "predicted_surge_pct": 38.0,
        "signal_ts": (NOW - timedelta(hours=4)).isoformat(),
    },
    {
        "id": 2,
        "signal_type": "app_update",
        "description": "Recent app update correlates with higher KYC and login complaints.",
        "expected_impact": "medium",
        "predicted_surge_pct": 22.0,
        "signal_ts": (NOW - timedelta(hours=18)).isoformat(),
    },
]

_trend = [
    {"date": str((NOW - timedelta(days=6)).date()), "total": 18, "duplicates": 2, "p0_count": 1},
    {"date": str((NOW - timedelta(days=5)).date()), "total": 21, "duplicates": 3, "p0_count": 1},
    {"date": str((NOW - timedelta(days=4)).date()), "total": 17, "duplicates": 1, "p0_count": 0},
    {"date": str((NOW - timedelta(days=3)).date()), "total": 24, "duplicates": 4, "p0_count": 2},
    {"date": str((NOW - timedelta(days=2)).date()), "total": 29, "duplicates": 5, "p0_count": 2},
    {"date": str((NOW - timedelta(days=1)).date()), "total": 31, "duplicates": 6, "p0_count": 1},
    {"date": str(NOW.date()), "total": 14, "duplicates": 2, "p0_count": 1},
]


def _copy(value):
    return deepcopy(value)


def _add_audit(complaint_id: str, actor: str, action: str, old_value: dict | None, new_value: dict | None) -> None:
    entries = _audit.setdefault(complaint_id, [])
    next_id = max((entry["id"] for entry in entries), default=0) + 1
    entries.append(
        {
            "id": next_id,
            "actor": actor,
            "action": action,
            "old_value": old_value,
            "new_value": new_value,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
    )


def ingest(payload: dict) -> dict:
    complaint_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    complaint = {
        "id": complaint_id,
        "channel": payload["channel"],
        "customer_id": payload["customer_id"],
        "customer_name": payload.get("customer_name"),
        "subject": payload.get("subject"),
        "body": payload["body"],
        "category": "General",
        "sub_category": "General Enquiry",
        "severity": 2,
        "anger_score": 0.5,
        "sentiment": "neutral",
        "priority_score": 4.5,
        "sla_deadline": (created_at + timedelta(hours=payload.get("sla_hours", 720))).isoformat(),
        "sla_status": "on_track",
        "status": "open",
        "assigned_agent": None,
        "is_duplicate": False,
        "duplicate_of": None,
        "draft_reply": "Dear Customer,\n\nWe have registered your complaint and our team is reviewing it. You will receive an update shortly.\n\nThank you for banking with Union Bank.",
        "draft_approved": False,
        "created_at": created_at.isoformat(),
        "named_entities": {},
    }
    _complaints[complaint_id] = complaint
    _add_audit(complaint_id, "system", "created", None, {"channel": payload["channel"]})
    return {
        "complaint_id": complaint_id,
        "category": complaint["category"],
        "severity": complaint["severity"],
        "priority_score": complaint["priority_score"],
        "is_duplicate": False,
        "duplicate_of": None,
        "sla_deadline": complaint["sla_deadline"],
    }


def get_priority_queue(limit: int = 50) -> list[dict]:
    queue = sorted(
        (c for c in _complaints.values() if c["status"] in {"open", "in_progress"} and not c["is_duplicate"]),
        key=lambda c: c["priority_score"],
        reverse=True,
    )
    return _copy(queue[:limit])


def get_complaint(complaint_id: str) -> dict | None:
    complaint = _complaints.get(complaint_id)
    return _copy(complaint) if complaint else None


def find_similar(complaint_id: str, top_k: int = 5) -> list[dict]:
    complaint = _complaints.get(complaint_id)
    if not complaint:
        return []
    similar = [
        c for cid, c in _complaints.items()
        if cid != complaint_id and c["category"] == complaint["category"]
    ]
    if not similar:
        similar = [c for cid, c in _complaints.items() if cid != complaint_id]
    return _copy(similar[:top_k])


def export_audit_trail(complaint_id: str) -> list[dict]:
    return _copy(_audit.get(complaint_id, []))


def assign_complaint(complaint_id: str, agent: str) -> dict | None:
    complaint = _complaints.get(complaint_id)
    if not complaint:
        return None
    old_agent = complaint["assigned_agent"]
    complaint["assigned_agent"] = agent
    complaint["status"] = "in_progress"
    _add_audit(complaint_id, agent, "assigned", {"assigned_agent": old_agent}, {"assigned_agent": agent, "status": "in_progress"})
    return _copy(complaint)


def approve_draft(complaint_id: str, agent: str) -> dict | None:
    complaint = _complaints.get(complaint_id)
    if not complaint:
        return None
    complaint["draft_approved"] = True
    _add_audit(complaint_id, agent, "draft_approved", None, {"draft_approved": True})
    return _copy(complaint)


def resolve_complaint(complaint_id: str, agent: str, resolution_note: str, csat: float | None = None) -> dict | None:
    complaint = _complaints.get(complaint_id)
    if not complaint:
        return None
    complaint["status"] = "resolved"
    complaint["resolution_note"] = resolution_note
    complaint["resolved_at"] = datetime.now(timezone.utc).isoformat()
    complaint["sla_status"] = "resolved"
    _add_audit(complaint_id, agent, "resolved", None, {"resolution_note": resolution_note, "csat": csat, "status": "resolved"})
    return _copy(complaint)


def dashboard_summary() -> dict:
    complaints = list(_complaints.values())
    return {
        "total_open": sum(c["status"] == "open" for c in complaints),
        "p0_open": sum(c["status"] != "resolved" and c["severity"] == 0 for c in complaints),
        "sla_breached": sum(c["sla_status"] == "breached" for c in complaints),
        "resolved_today": sum(c.get("resolved_at", "").startswith(str(NOW.date())) for c in complaints),
        "duplicates_caught": sum(c["is_duplicate"] for c in complaints),
        "avg_resolution_hrs": 18.6,
    }


def complaints_by_category() -> list[dict]:
    counts: dict[str, int] = {}
    for complaint in _complaints.values():
        if complaint["is_duplicate"]:
            continue
        counts[complaint["category"]] = counts.get(complaint["category"], 0) + 1
    return [{"category": category, "count": count} for category, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)]


def complaints_by_severity() -> list[dict]:
    labels = {0: "P0 Critical", 1: "P1 High", 2: "P2 Medium", 3: "P3 Low", 4: "P4 Info"}
    counts: dict[int, int] = {}
    for complaint in _complaints.values():
        if complaint["status"] not in {"open", "in_progress"} or complaint["is_duplicate"]:
            continue
        counts[complaint["severity"]] = counts.get(complaint["severity"], 0) + 1
    return [{"severity": labels[level], "count": count} for level, count in sorted(counts.items())]


def volume_trend(days: int) -> list[dict]:
    return _copy(_trend[-days:])


def channel_distribution() -> list[dict]:
    counts: dict[str, int] = {}
    for complaint in _complaints.values():
        counts[complaint["channel"]] = counts.get(complaint["channel"], 0) + 1
    return [{"channel": channel, "count": count} for channel, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)]


def spike_signals(hours: int) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    signals = [signal for signal in _spikes if datetime.fromisoformat(signal["signal_ts"]) >= cutoff]
    return _copy(signals)
