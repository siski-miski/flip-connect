from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Date, Text, func
from app.core.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seeker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending | active | completed | terminated | review
    monthly_volume = Column(Float, nullable=True)
    commission_rate = Column(Float, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
