"""
CREST — Spike Detection Service
Autonomous monitoring for category frequency surges (Early Warning System).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

import httpx
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from backend.models.complaint import Complaint
from backend.models.knowledge import SpikeSignal
from backend.utils.logger import get_logger
from ai.agents.rca_agent import perform_rca

logger = get_logger("crest.services.spike")

# Configuration for detection
SPIKE_SENSITIVITY = 2.5  # 250% increase vs. baseline
MIN_THRESHOLD     = 5    # Minimum volume to trigger a spike (avoid noise)

#rca = root cause analysis 

def _trigger_spike_broadcast_with_rca(category: str, surge_pct: float, rca_insight: Optional[str] = None):
    """Hits the local internal webhook for Socket.IO dispatch with RCA info."""
    try:
        httpx.post(
            "http://localhost:8000/api/complaints/internal/broadcast",
            json={
                "type": "spike",
                "category": category,
                "surge_pct": surge_pct,
                "rca_insight": rca_insight
            },
            timeout=10.0 # RCA might take longer
        )
    except Exception as e:
        logger.error(f"Failed to fire spike/rca webhook: {e}")


def detect_category_spikes(db: Session) -> List[SpikeSignal]:
    """
    Scans the last 1 hour of complaints and compares to the previous 24-hour average.
    Returns a list of generated SpikeSignal records.
    """
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    past_24_hours = now - timedelta(hours=24)

    # 1. Get Current Hour Counts (Grouped by Category)
    current_counts = (
        db.query(Complaint.category, func.count(Complaint.id).label("count"))
        .filter(Complaint.created_at >= one_hour_ago)
        .filter(Complaint.is_duplicate == False)  # Only unique issues
        .group_by(Complaint.category)
        .all()
    )

    if not current_counts:
        return []

    signals = []

    for cat_name, current_count in current_counts:
        if not cat_name or current_count < MIN_THRESHOLD:
            continue

        # 2. Get 24-Hour Baseline (Average hourly frequency)
        # We query total count for the last 24h and divide by 24.
        total_24h = (
            db.query(func.count(Complaint.id))
            .filter(Complaint.category == cat_name)
            .filter(Complaint.created_at >= past_24_hours)
            .filter(Complaint.created_at < one_hour_ago)
            .filter(Complaint.is_duplicate == False)
            .scalar() or 0
        )
        
        avg_baseline = total_24h / 23.0 if total_24h > 0 else 0.5  # Min baseline factor
        
        # 3. Detect Surge
        if current_count > (avg_baseline * SPIKE_SENSITIVITY):
            surge_pct = round(((current_count - avg_baseline) / avg_baseline) * 100, 2)
            
            logger.warning(f"SPIKE DETECTED: {cat_name} | Surge: {surge_pct}% | Current: {current_count}")

            # 4. Perform AI Root Cause Analysis
            # Fetch recent complaint bodies for this category
            recent_bodies = [
                c.body for c in db.query(Complaint.body)
                .filter(Complaint.category == cat_name)
                .filter(Complaint.created_at >= one_hour_ago)
                .filter(Complaint.is_duplicate == False)
                .order_by(Complaint.created_at.desc())
                .limit(50)
                .all()
            ]
            
            rca_result = perform_rca(recent_bodies)
            
            # Create Signal record with RCA insights
            signal = SpikeSignal(
                signal_type="categorical_surge",
                description=f"Significant surge in {cat_name} complaints (last 1h vs 24h avg).",
                expected_impact="high" if current_count > 20 else "medium",
                predicted_surge_pct=surge_pct,
                rca_insight=rca_result.get("rca_insight"),
                common_factors=rca_result.get("common_factors", {})
            )
            
            db.add(signal)
            signals.append(signal)

            # 5. Fire Socket.IO broadcast (extending payload with RCA)
            try:
                # We'll use a modified broadcast that includes RCA
                _trigger_spike_broadcast_with_rca(cat_name, surge_pct, rca_result.get("rca_insight"))
            except Exception as e:
                logger.error(f"Failed to broadcast spike: {e}")

    if signals:
        db.commit()
    
    return signals


def get_recent_spikes(db: Session, limit: int = 15) -> List[SpikeSignal]:
    """Fetch latest historical signals for UI timeline."""
    return (
        db.query(SpikeSignal)
        .order_by(SpikeSignal.signal_ts.desc())
        .limit(limit)
        .all()
    )
