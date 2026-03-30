"""
CREST — Insights & Analytics API
Endpoints for spike detection, trends, and performance metrics.
"""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.utils.db import get_db_optional
from backend.services.spike_service import get_recent_spikes
from backend.utils.logger import get_logger

router = APIRouter(prefix="/api/insights", tags=["insights"])
logger = get_logger("crest.api.insights")


@router.get("/spikes", response_model=List[dict])
def list_spikes(limit: int = Query(20, le=100), db: Session = Depends(get_db_optional)):
    """
    Get the history of detected category spikes.
    Shown in the early-warning feed of the dashboard.
    """
    if db is None:
        # Mock data for frontend dev if DB is not available
        return [
            {
                "id": str(uuid.uuid4()),
                "signal_type": "categorical_surge",
                "description": "Significant surge in UPI complaints.",
                "expected_impact": "high",
                "predicted_surge_pct": 320.5,
                "signal_ts": "2026-03-30T10:00:00Z"
            }
        ]

    spikes = get_recent_spikes(db, limit=limit)
    return [
        {
            "id": str(s.id),
            "signal_type": s.signal_type,
            "description": s.description,
            "expected_impact": s.expected_impact,
            "predicted_surge_pct": float(s.predicted_surge_pct or 0),
            "signal_ts": s.signal_ts.isoformat(),
        }
        for s in spikes
    ]
