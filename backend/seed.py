"""Seed script to populate flipconnects with demo data."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.user import User
from app.models.card import Card
from app.models.deal import Deal
from app.models.verification import Verification
from app.models.notification import Notification
from app.models.activity_log import ActivityLog
from datetime import date, datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Clear existing
for model in [ActivityLog, Notification, Deal, Card, Verification, User]:
    db.query(model).delete()
db.commit()

# Users
users_data = [
    {"email": "jm@novex.com", "full_name": "Jean-Marc Dupont", "company_name": "Novex Payments Ltd", "role": "provider", "country": "France", "trust_score": 94, "is_verified": True},
    {"email": "sarah@brightroute.com", "full_name": "Sarah Chen", "company_name": "BrightRoute Inc.", "role": "seeker", "country": "Brazil", "trust_score": 88, "is_verified": True},
    {"email": "ali@atlas.ae", "full_name": "Ali Rashid", "company_name": "Atlas Financial FZ", "role": "provider", "country": "UAE", "trust_score": 97, "is_verified": True},
    {"email": "maria@kreatorworks.ph", "full_name": "Maria Santos", "company_name": "Kreatorworks PH", "role": "seeker", "country": "Philippines", "trust_score": 79, "is_verified": True},
    {"email": "thomas@qantpay.com", "full_name": "Thomas Müller", "company_name": "QantPay Solutions", "role": "provider", "country": "Germany", "trust_score": 91, "is_verified": True},
    {"email": "emma@safex.de", "full_name": "Emma Weber", "company_name": "Safex Europe GmbH", "role": "provider", "country": "Germany", "trust_score": 86, "is_verified": True},
]

db_users = []
for u in users_data:
    user = User(password_hash=hash_password("password123"), **u)
    db.add(user)
    db.flush()
    db_users.append(user)

# Cards
cards_data = [
    {"user_id": db_users[0].id, "type": "offer", "title": "PayPal Business Gateway , EU & UK", "description": "Established EU merchant account with 4+ year history. Accepting eCommerce & SaaS sub-merchants. Chargeback ratio below 0.5%.", "gateway_type": "PayPal", "regions": ["EU", "UK"], "industries": ["eCommerce", "SaaS"], "currencies": ["EUR", "GBP", "USD"], "pricing_model": "percentage", "commission_rate": 2.8, "max_volume": 80000, "min_volume": 5000},
    {"user_id": db_users[1].id, "type": "request", "title": "Seeking US Stripe/Braintree Access , High Volume", "description": "LATAM SaaS company, $200K MRR, seeking US-based payment processor. Clean chargeback history. Prepared to share financials.", "gateway_type": "Stripe", "regions": ["North America"], "industries": ["SaaS"], "currencies": ["USD"], "pricing_model": "negotiable", "min_volume": 150000, "max_volume": 300000},
    {"user_id": db_users[2].id, "type": "offer", "title": "ShopifyPayment Acquiring , MENA & Africa Corridors", "description": "Licensed PSP with ShopifyPayment sub-acquiring rights. Specializing in cross-border Africa & GCC merchants. SWIFT payouts in 48h.", "gateway_type": "ShopifyPayment", "regions": ["MENA", "Africa"], "industries": ["Cross-border"], "currencies": ["USD", "EUR", "AED"], "pricing_model": "percentage", "commission_rate": 1.9, "fixed_fee": 0.20, "min_volume": 10000, "max_volume": 500000},
    {"user_id": db_users[3].id, "type": "request", "title": "Looking for Payout Rails , Southeast Asia", "description": "Creator economy platform, 8,000 contractors in PH, ID, VN. Need reliable payout in local currencies. Budget ~1.5% per payout.", "gateway_type": "Payouts", "regions": ["Asia"], "industries": ["Creator Economy"], "currencies": ["PHP", "IDR", "VND"], "pricing_model": "percentage", "commission_rate": 1.5, "min_volume": 20000, "max_volume": 100000},
    {"user_id": db_users[4].id, "type": "offer", "title": "High-Risk Merchant Acquiring , Travel & Ticketing", "description": "Specialist acquirer for travel agencies, OTAs, and ticket resellers. Up to $500K/mo volume. Pre-approved for high refund tolerance verticals.", "gateway_type": "Acquiring", "regions": ["EU", "North America"], "industries": ["Travel", "Ticketing", "High Risk"], "currencies": ["EUR", "USD", "GBP"], "pricing_model": "percentage", "commission_rate": 3.5, "min_volume": 50000, "max_volume": 500000, "risk_tolerance": "high"},
    {"user_id": db_users[5].id, "type": "offer", "title": "Gateway Redundancy Partner , eCommerce EU", "description": "Offer backup processing capacity for EU eCommerce businesses. Fast onboarding (72h). Fixed fee structure available. No volume minimum.", "gateway_type": "Redundancy", "regions": ["EU"], "industries": ["eCommerce"], "currencies": ["EUR"], "pricing_model": "fixed", "fixed_fee": 0.35, "min_volume": 0, "max_volume": 200000},
]

db_cards = []
for c in cards_data:
    card = Card(**c)
    db.add(card)
    db.flush()
    db_cards.append(card)

# Deals
deals_data = [
    {"provider_id": db_users[0].id, "seeker_id": db_users[1].id, "card_id": db_cards[0].id, "status": "active", "monthly_volume": 12000, "commission_rate": 2.8, "start_date": date(2026, 11, 1)},
    {"provider_id": db_users[2].id, "seeker_id": db_users[3].id, "card_id": db_cards[2].id, "status": "active", "monthly_volume": 48000, "commission_rate": 1.9, "start_date": date(2026, 10, 15)},
    {"provider_id": db_users[5].id, "seeker_id": db_users[1].id, "card_id": db_cards[5].id, "status": "pending", "monthly_volume": 8000, "commission_rate": 0.35, "start_date": date(2026, 2, 1)},
    {"provider_id": db_users[4].id, "seeker_id": db_users[1].id, "card_id": db_cards[4].id, "status": "review", "monthly_volume": 30000, "commission_rate": 3.5, "start_date": date(2026, 1, 1)},
]

for d in deals_data:
    db.add(Deal(**d))

# Verifications
verifications_data = [
    {"user_id": db_users[0].id, "type": "kyb", "status": "approved"},
    {"user_id": db_users[0].id, "type": "aml", "status": "approved"},
    {"user_id": db_users[0].id, "type": "bank", "status": "approved"},
    {"user_id": db_users[0].id, "type": "kyc", "status": "pending"},
    {"user_id": db_users[2].id, "type": "kyb", "status": "approved"},
    {"user_id": db_users[2].id, "type": "aml", "status": "approved"},
    {"user_id": db_users[2].id, "type": "bank", "status": "approved"},
]

for v in verifications_data:
    db.add(Verification(**v))

# Notifications
notifs = [
    {"user_id": db_users[0].id, "type": "deal", "message": "Atlas Financial accepted your deal request for MENA corridor"},
    {"user_id": db_users[0].id, "type": "card", "message": "New card posted matching your saved filter: EU SaaS gateway"},
    {"user_id": db_users[0].id, "type": "compliance", "message": "Compliance team completed review of your KYB documents"},
    {"user_id": db_users[0].id, "type": "trust", "message": "Trust Score updated: 91 → 94 after successful deal completion"},
]

for n in notifs:
    db.add(Notification(**n))

db.commit()
db.close()
print("✓ Seed data inserted successfully!")
