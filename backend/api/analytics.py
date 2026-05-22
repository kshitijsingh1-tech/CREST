"""
CREST - Analytics API Router
Dashboard metrics: SLA health, complaint volume, category distribution, spike signals.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from backend.mock_store import (
    channel_distribution as mock_channel_distribution,
    complaints_by_category as mock_complaints_by_category,
    complaints_by_severity as mock_complaints_by_severity,
    dashboard_summary as mock_dashboard_summary,
    get_priority_queue as mock_get_priority_queue,
    spike_signals as mock_spike_signals,
    volume_trend as mock_volume_trend,
)
from backend.utils.db import get_db_optional
from backend.utils.runtime import DEV_MOCK

if TYPE_CHECKING:
    from backend.models.complaint import Channel, Complaint
    from backend.models.knowledge import SpikeSignal

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
def dashboard_summary(
    region_id: int | None = Query(None),
    db: Session | None = Depends(get_db_optional)
):
    if DEV_MOCK:
        return mock_dashboard_summary()

    from backend.models.complaint import Complaint

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    base_query = db.query(Complaint)
    if region_id is not None:
        base_query = base_query.filter(Complaint.region_id == region_id)

    total_open = base_query.filter(Complaint.status == "open").with_entities(func.count(Complaint.id)).scalar()
    p0_open = base_query.filter(
        Complaint.status == "open", Complaint.severity == 0
    ).with_entities(func.count(Complaint.id)).scalar()
    breached = base_query.filter(
        Complaint.sla_status == "breached", Complaint.status != "resolved"
    ).with_entities(func.count(Complaint.id)).scalar()
    resolved_today = base_query.filter(
        Complaint.resolved_at >= today_start
    ).with_entities(func.count(Complaint.id)).scalar()
    duplicates_caught = base_query.filter(
        Complaint.is_duplicate == True
    ).with_entities(func.count(Complaint.id)).scalar()

    avg_resolution = base_query.filter(Complaint.resolved_at.isnot(None)).with_entities(
        func.avg(func.extract("epoch", Complaint.resolved_at - Complaint.created_at) / 3600)
    ).scalar()

    return {
        "total_open": total_open or 0,
        "p0_open": p0_open or 0,
        "sla_breached": breached or 0,
        "resolved_today": resolved_today or 0,
        "duplicates_caught": duplicates_caught or 0,
        "avg_resolution_hrs": round(float(avg_resolution or 0), 1),
    }


@router.get("/by-category")
def complaints_by_category(
    days: int = Query(30, le=365),
    region_id: int | None = Query(None),
    db: Session | None = Depends(get_db_optional),
):
    if DEV_MOCK:
        return mock_complaints_by_category()

    from backend.models.complaint import Complaint

    since = datetime.now(timezone.utc) - timedelta(days=days)
    query = db.query(Complaint.category, func.count(Complaint.id).label("count")).filter(Complaint.created_at >= since).filter(Complaint.is_duplicate == False)
    
    if region_id is not None:
        query = query.filter(Complaint.region_id == region_id)

    rows = (
        query
        .group_by(Complaint.category)
        .order_by(func.count(Complaint.id).desc())
        .all()
    )
    return [{"category": r.category or "Unknown", "count": r.count} for r in rows]


@router.get("/by-severity")
def complaints_by_severity(
    region_id: int | None = Query(None),
    db: Session | None = Depends(get_db_optional)
):
    if DEV_MOCK:
        return mock_complaints_by_severity()

    from backend.models.complaint import Complaint

    query = db.query(Complaint.severity, func.count(Complaint.id).label("count")).filter(Complaint.status.in_(["open", "in_progress"])).filter(Complaint.is_duplicate == False)
    
    if region_id is not None:
        query = query.filter(Complaint.region_id == region_id)

    rows = (
        query
        .group_by(Complaint.severity)
        .order_by(Complaint.severity)
        .all()
    )
    labels = {0: "P0 Critical", 1: "P1 High", 2: "P2 Medium", 3: "P3 Low", 4: "P4 Info"}
    return [{"severity": labels.get(r.severity, f"P{r.severity}"), "count": r.count} for r in rows]


@router.get("/volume-trend")
def volume_trend(
    days: int = Query(14, le=90),
    db: Session | None = Depends(get_db_optional),
):
    if DEV_MOCK:
        return mock_volume_trend(days)

    rows = db.execute(
        text(
            """
            SELECT DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS day,
                   COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE is_duplicate = TRUE) AS duplicates,
                   COUNT(*) FILTER (WHERE severity = 0) AS p0_count
            FROM complaints
            WHERE created_at >= NOW() - make_interval(days => :days)
            GROUP BY day
            ORDER BY day ASC
            """
        ),
        {"days": days},
    ).fetchall()
    return [
        {
            "date": str(r.day),
            "total": r.total,
            "duplicates": r.duplicates,
            "p0_count": r.p0_count,
        }
        for r in rows
    ]


@router.get("/sla-health")
def sla_health(db: Session | None = Depends(get_db_optional)):
    if DEV_MOCK:
        counts: dict[str, int] = {}
        for complaint in mock_get_priority_queue(limit=500):
            status = complaint.get("sla_status", "unknown")
            counts[status] = counts.get(status, 0) + 1
        return [{"status": status, "count": count} for status, count in sorted(counts.items())]

    from backend.models.complaint import Complaint

    rows = (
        db.query(Complaint.sla_status, func.count(Complaint.id).label("count"))
        .filter(Complaint.status.notin_(["closed"]))
        .group_by(Complaint.sla_status)
        .all()
    )
    return [{"status": r.sla_status, "count": r.count} for r in rows]


@router.get("/channel-distribution")
def channel_distribution(
    days: int = Query(30, le=365),
    region_id: int | None = Query(None),
    db: Session | None = Depends(get_db_optional),
):
    if DEV_MOCK:
        return mock_channel_distribution()

    from backend.models.complaint import Channel, Complaint

    since = datetime.now(timezone.utc) - timedelta(days=days)
    query = db.query(Channel.name, func.count(Complaint.id).label("count")).join(Complaint, Complaint.channel_id == Channel.id).filter(Complaint.created_at >= since)
    
    if region_id is not None:
        query = query.filter(Complaint.region_id == region_id)

    rows = (
        query
        .group_by(Channel.name)
        .order_by(func.count(Complaint.id).desc())
        .all()
    )
    return [{"channel": r.name, "count": r.count} for r in rows]


@router.get("/spike-signals")
def spike_signals(hours: int = Query(48, le=168), db: Session | None = Depends(get_db_optional)):
    if DEV_MOCK:
        return mock_spike_signals(hours)

    from backend.models.knowledge import SpikeSignal

    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    signals = (
        db.query(SpikeSignal)
        .filter(SpikeSignal.signal_ts >= since)
        .order_by(SpikeSignal.predicted_surge_pct.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "signal_type": s.signal_type,
            "description": s.description,
            "expected_impact": s.expected_impact,
            "predicted_surge_pct": float(s.predicted_surge_pct or 0),
            "signal_ts": s.signal_ts.isoformat(),
        }
        for s in signals
    ]


@router.get("/by-region")
def complaints_by_region(db: Session | None = Depends(get_db_optional)):
    if DEV_MOCK:
        return [
            {"region": "Mumbai Region", "open": 24, "breached": 2, "total": 140},
            {"region": "Delhi Region", "open": 18, "breached": 3, "total": 98},
            {"region": "Kolkata Region", "open": 12, "breached": 0, "total": 54},
            {"region": "Bengaluru Region", "open": 15, "breached": 1, "total": 78},
            {"region": "Chennai Region", "open": 8, "breached": 0, "total": 42},
        ]

    from backend.models.user import Region
    from backend.models.complaint import Complaint

    rows = (
        db.query(
            Region.name.label("region_name"),
            func.count(Complaint.id).label("total_count"),
            func.sum(func.case((Complaint.status != "resolved", 1), else_=0)).label("open_count"),
            func.sum(func.case((Complaint.sla_status == "breached", 1), else_=0)).label("breached_count")
        )
        .join(Complaint, Complaint.region_id == Region.id)
        .group_by(Region.name)
        .order_by(func.count(Complaint.id).desc())
        .all()
    )
    
    result = []
    for r in rows:
        result.append({
            "region": r.region_name,
            "open": int(r.open_count or 0),
            "breached": int(r.breached_count or 0),
            "total": int(r.total_count or 0)
        })
        
    unassigned_total = db.query(Complaint).filter(Complaint.region_id.is_(None)).count()
    if unassigned_total > 0:
        unassigned_open = db.query(Complaint).filter(Complaint.region_id.is_(None), Complaint.status != "resolved").count()
        unassigned_breached = db.query(Complaint).filter(Complaint.region_id.is_(None), Complaint.sla_status == "breached").count()
        result.append({
            "region": "Unassigned / Central Nodal",
            "open": unassigned_open,
            "breached": unassigned_breached,
            "total": unassigned_total
        })

    return result