from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.deal import Deal
from app.models.user import User
from app.models.card import Card
from app.schemas.schemas import DealCreate, DealStatusUpdate, DealResponse

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("", response_model=List[DealResponse])
def list_deals(request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    results = (
        db.query(Deal, User, Card)
        .join(User, Deal.provider_id == User.id)
        .join(Card, Deal.card_id == Card.id)
        .filter((Deal.provider_id == user_id) | (Deal.seeker_id == user_id))
        .all()
    )

    deals = []
    for deal, provider, card in results:
        seeker = db.query(User).filter(User.id == deal.seeker_id).first()
        resp = DealResponse.model_validate(deal)
        resp.provider_name = provider.full_name
        resp.seeker_name = seeker.full_name if seeker else None
        resp.card_title = card.title
        deals.append(resp)

    return deals


@router.post("", response_model=DealResponse)
def create_deal(data: DealCreate, request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    deal = Deal(
        provider_id=data.provider_id,
        seeker_id=user_id,
        card_id=data.card_id,
        monthly_volume=data.monthly_volume,
        commission_rate=data.commission_rate,
        notes=data.notes,
        status="pending",
        start_date=date.today(),
    )
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return DealResponse.model_validate(deal)


@router.put("/{deal_id}/status", response_model=DealResponse)
def update_deal_status(deal_id: int, data: DealStatusUpdate, request: Request, db: Session = Depends(get_db)):
    user_id = get_current_user_id(request)
    deal = db.query(Deal).filter(
        Deal.id == deal_id,
        (Deal.provider_id == user_id) | (Deal.seeker_id == user_id),
    ).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal.status = data.status
    if data.status == "completed" or data.status == "terminated":
        deal.end_date = date.today()
    db.commit()
    db.refresh(deal)
    return DealResponse.model_validate(deal)
