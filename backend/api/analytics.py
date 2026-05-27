"""
CREST - Analytics API Router
Dashboard metrics: SLA health, complaint volume, category distribution, spike signals.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, text
from sqlalchemy.orm import Session


from backend.utils.db import get_db_optional


if TYPE_CHECKING:
    from backend.models.complaint import Channel, Complaint
    from backend.models.knowledge import SpikeSignal

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
def dashboard_summary(
    scope: str = Query("all"),
    region_id: int | None = Query(None),
    db: Session | None = Depends(get_db_optional)
):
    from backend.models.complaint import Complaint

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    base_query = db.query(Complaint)
    if region_id is not None:
        base_query = base_query.filter(Complaint.region_id == region_id)
    if scope == "queue":
        base_query = base_query.filter(Complaint.status.in_(["open", "in_progress"]), Complaint.is_duplicate == False)

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
    scope: str = Query("all"),
    days: int = Query(30, le=365),
    region_id: int | None = Query(None),
    db: Session | None = Depends(get_db_optional),
):
    from backend.models.complaint import Complaint

    query = db.query(Complaint.category, func.count(Complaint.id).label("count")).filter(Complaint.is_duplicate == False)
    
    if scope == "queue":
        query = query.filter(Complaint.status.in_(["open", "in_progress"]))
    else:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(Complaint.created_at >= since)

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
    scope: str = Query("all"),
    region_id: int | None = Query(None),
    db: Session | None = Depends(get_db_optional)
):
    from backend.models.complaint import Complaint

    query = db.query(Complaint.severity, func.count(Complaint.id).label("count")).filter(Complaint.is_duplicate == False)
    
    if region_id is not None:
        query = query.filter(Complaint.region_id == region_id)
    if scope == "queue":
        query = query.filter(Complaint.status.in_(["open", "in_progress"]))

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
    scope: str = Query("all"),
    days: int = Query(14, le=90),
    region_id: int | None = Query(None),
    db: Session | None = Depends(get_db_optional),
):
    status_filter_sqlite = ""
    status_filter_postgres = ""
    if scope == "queue":
        status_filter_sqlite = "AND status IN ('open', 'in_progress') AND is_duplicate = 0"
        status_filter_postgres = "AND status IN ('open', 'in_progress') AND is_duplicate = FALSE"

    region_filter = ""
    if region_id is not None:
        region_filter = "AND region_id = :region_id"

    params = {"days": days}
    if region_id is not None:
        params["region_id"] = region_id

    if db.bind.dialect.name == "sqlite":
        # SQLite compatible trend query
        rows = db.execute(
            text(
                f"""
                SELECT date(created_at) AS day,
                       COUNT(*) AS total,
                       SUM(CASE WHEN is_duplicate = 1 THEN 1 ELSE 0 END) AS duplicates,
                       SUM(CASE WHEN severity = 0 THEN 1 ELSE 0 END) AS p0_count
                FROM complaints
                WHERE created_at >= datetime('now', '-' || :days || ' days') {status_filter_sqlite} {region_filter}
                GROUP BY day
                ORDER BY day ASC
                """
            ),
            params,
        ).fetchall()
    else:
        # PostgreSQL compatible trend query
        rows = db.execute(
            text(
                f"""
                SELECT DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS day,
                       COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE is_duplicate = TRUE) AS duplicates,
                       COUNT(*) FILTER (WHERE severity = 0) AS p0_count
                FROM complaints
                WHERE created_at >= NOW() - make_interval(days => :days) {status_filter_postgres} {region_filter}
                GROUP BY day
                ORDER BY day ASC
                """
            ),
            params,
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
    scope: str = Query("all"),
    days: int = Query(30, le=365),
    region_id: int | None = Query(None),
    db: Session | None = Depends(get_db_optional),
):
    from backend.models.complaint import Channel, Complaint

    query = db.query(Channel.name, func.count(Complaint.id).label("count")).join(Complaint, Complaint.channel_id == Channel.id).filter(Complaint.is_duplicate == False)
    
    if scope == "queue":
        query = query.filter(Complaint.status.in_(["open", "in_progress"]))
    else:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(Complaint.created_at >= since)

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
def complaints_by_region(
    scope: str = Query("all"),
    db: Session | None = Depends(get_db_optional)
):
    from backend.models.user import Region
    from backend.models.complaint import Complaint

    if scope == "queue":
        total_expr = func.sum(case(((Complaint.status.in_(["open", "in_progress"])) & (Complaint.is_duplicate == False), 1), else_=0))
        open_expr = func.sum(case(((Complaint.status.in_(["open", "in_progress"])) & (Complaint.is_duplicate == False), 1), else_=0))
        breached_expr = func.sum(case(((Complaint.sla_status == "breached") & (Complaint.status.in_(["open", "in_progress"])) & (Complaint.is_duplicate == False), 1), else_=0))
    else:
        total_expr = func.count(Complaint.id)
        open_expr = func.sum(case(((Complaint.status != "resolved"), 1), else_=0))
        breached_expr = func.sum(case(((Complaint.sla_status == "breached"), 1), else_=0))

    rows = (
        db.query(
            Region.id.label("region_id"),
            Region.name.label("region_name"),
            total_expr.label("total_count"),
            open_expr.label("open_count"),
            breached_expr.label("breached_count"),
        )
        .outerjoin(Complaint, Complaint.region_id == Region.id)
        .group_by(Region.id, Region.name)
        .order_by(Region.name)
        .all()
    )
    
    result = []
    for r in rows:
        result.append({
            "region_id": r.region_id,
            "region": r.region_name,
            "open": int(r.open_count or 0),
            "breached": int(r.breached_count or 0),
            "total": int(r.total_count or 0)
        })
        
    unassigned_query = db.query(Complaint).filter(Complaint.region_id.is_(None))
    if scope == "queue":
        unassigned_query = unassigned_query.filter(Complaint.status.in_(["open", "in_progress"]), Complaint.is_duplicate == False)

    unassigned_total = unassigned_query.count()
    if unassigned_total > 0:
        unassigned_open_query = db.query(Complaint).filter(Complaint.region_id.is_(None), Complaint.status != "resolved")
        unassigned_breached_query = db.query(Complaint).filter(Complaint.region_id.is_(None), Complaint.sla_status == "breached")
        if scope == "queue":
            unassigned_open_query = unassigned_open_query.filter(Complaint.is_duplicate == False)
            unassigned_breached_query = unassigned_breached_query.filter(Complaint.status.in_(["open", "in_progress"]), Complaint.is_duplicate == False)
        else:
            unassigned_open_query = unassigned_open_query.filter(Complaint.is_duplicate == False)

        result.append({
            "region": "Unassigned / Central Nodal",
            "open": unassigned_open_query.count(),
            "breached": unassigned_breached_query.count(),
            "total": unassigned_total
        })

    return result
