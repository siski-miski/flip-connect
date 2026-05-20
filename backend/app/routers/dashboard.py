from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.deal import Deal
from app.models.user import User
from app.schemas.schemas import DashboardStats, VolumeHistory

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    user = db.query(User).filter(User.id == user_id).first()

    active_deals = db.query(Deal).filter(
        ((Deal.provider_id == user_id) | (Deal.seeker_id == user_id)),
        Deal.status == "active",
    ).count()

    volume_result = db.query(func.coalesce(func.sum(Deal.monthly_volume), 0)).filter(
        ((Deal.provider_id == user_id) | (Deal.seeker_id == user_id)),
        Deal.status.in_(["active", "completed"]),
    ).scalar()

    revenue = float(volume_result) * 0.028 if volume_result else 0

    return DashboardStats(
        active_deals=active_deals,
        volume_processed=float(volume_result or 0),
        revenue_earned=round(revenue, 2),
        trust_score=user.trust_score if user else 50,
    )


@router.get("/volume-history", response_model=List[VolumeHistory])
def get_volume_history(request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    now = datetime.now(timezone.utc)

    # Get total active volume for this user (simple approach)
    total_vol = db.query(func.coalesce(func.sum(Deal.monthly_volume), 0)).filter(
        ((Deal.provider_id == user_id) | (Deal.seeker_id == user_id)),
        Deal.status.in_(["active", "completed"]),
    ).scalar()

    months = []
    for i in range(6, -1, -1):
        d = now - timedelta(days=30 * i)
        month_name = d.strftime("%b")
        # Show volume only for the current month if there are active deals
        vol = float(total_vol or 0) if i == 0 else 0.0
        months.append(VolumeHistory(month=month_name, volume=vol))

    return months
