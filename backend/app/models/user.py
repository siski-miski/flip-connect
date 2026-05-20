from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="seeker")  # provider | seeker | both | admin
    country = Column(String, nullable=True)
    plan = Column(String, nullable=False, default="explorer")  # explorer | professional | enterprise
    trust_score = Column(Integer, default=50)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
