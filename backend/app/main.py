from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import hash_password
from app.models.site_settings import ensure_site_settings_columns
from app.models import tracking_settings as _tracking_settings  # noqa: F401
from app.models import custom_script as _custom_script  # noqa: F401
from app.models import verification_html_file as _verification_html_file  # noqa: F401
from app.routers import auth, users, cards, deals, notifications, dashboard, site_settings, verifications, messages
from app.routers import tracking_settings, custom_scripts, verification_html, ssr
import os

# Create tables
Base.metadata.create_all(bind=engine)
ensure_site_settings_columns(engine)


def seed_admin():
    """Create the admin account on first startup if it doesn't exist."""
    db = SessionLocal()
    try:
        from app.models.user import User
        existing = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not existing:
            admin = User(
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                full_name=settings.ADMIN_FULLNAME,
                company_name="flipconnects",
                role="admin",
                plan="enterprise",
                trust_score=100,
                is_verified=True,
            )
            db.add(admin)
            db.commit()
            print(f"[SEED] Admin account created: {settings.ADMIN_EMAIL}")
        else:
            print(f"[SEED] Admin account already exists: {settings.ADMIN_EMAIL}")
    finally:
        db.close()


seed_admin()


def seed_demo_cards():
    """Seed the marketplace with demo cards owned by the admin so the site doesn't look empty."""
    db = SessionLocal()
    try:
        from app.models.user import User
        from app.models.card import Card

        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin:
            return

        existing_cards = db.query(Card).count()
        if existing_cards > 0:
            return

        demos = [
            Card(
                user_id=admin.id, type="offer", operation_type="sell",
                title="PayPal Business Gateway — EU & UK",
                description="Established EU merchant account with 4+ year history. Accepting eCommerce & SaaS sub-merchants. Competitive rates and fast settlement.",
                gateway_type="PayPal", regions=["EU", "North America"], industries=["eCommerce", "SaaS"],
                currencies=["EUR", "GBP", "USD"], pricing_model="percentage",
                commission_rate=2.8, min_volume=5000, max_volume=80000, is_active=True, views_count=124,
            ),
            Card(
                user_id=admin.id, type="request", operation_type="rent",
                title="Seeking US Stripe/Braintree Access — High Volume",
                description="LATAM SaaS company with $200K MRR seeking US-based payment processor. Clean chargeback history, fully compliant.",
                gateway_type="Stripe", regions=["North America"], industries=["SaaS"],
                currencies=["USD"], pricing_model="negotiable",
                min_volume=150000, max_volume=300000, is_active=True, views_count=87,
            ),
            Card(
                user_id=admin.id, type="offer", operation_type="sell",
                title="Adyen Sub-Acquiring — MENA & Africa",
                description="Licensed PSP with Adyen sub-acquiring rights. Cross-border Africa & GCC supported. Multi-currency settlements in USD/EUR/AED.",
                gateway_type="Adyen", regions=["MENA", "Africa"], industries=["eCommerce", "Travel"],
                currencies=["USD", "EUR", "AED"], pricing_model="percentage",
                commission_rate=1.9, fixed_fee=0.20, min_volume=10000, max_volume=500000, is_active=True, views_count=215,
            ),
            Card(
                user_id=admin.id, type="offer", operation_type="sell",
                title="Crypto On-Ramp / Off-Ramp — Global Coverage",
                description="Full-stack crypto payment gateway with fiat on/off ramp. Support for BTC, ETH, USDT, USDC. API-first integration with 24h settlement.",
                gateway_type="Custom", regions=["EU", "North America", "Asia"], industries=["Digital Goods", "SaaS"],
                currencies=["USD", "EUR", "BTC", "ETH"], pricing_model="percentage",
                commission_rate=1.5, min_volume=1000, max_volume=200000, is_active=True, views_count=156,
            ),
            Card(
                user_id=admin.id, type="request", operation_type="rent",
                title="Need SEPA Direct Debit — Subscription SaaS",
                description="B2B SaaS platform looking for SEPA Direct Debit processing in the EEA. Monthly recurring billing for 2,000+ enterprise accounts.",
                gateway_type="SEPA", regions=["EU"], industries=["SaaS"],
                currencies=["EUR"], pricing_model="fixed",
                fixed_fee=0.35, min_volume=50000, max_volume=250000, is_active=True, views_count=64,
            ),
            Card(
                user_id=admin.id, type="offer", operation_type="sell",
                title="High-Risk Merchant Acquiring — EU Licensed",
                description="EU-licensed acquirer specializing in high-risk verticals: nutraceuticals, forex, dating, gaming. Rolling reserve negotiable.",
                gateway_type="WorldPay", regions=["EU", "North America"], industries=["High Risk"],
                currencies=["EUR", "USD", "GBP"], pricing_model="percentage",
                commission_rate=4.5, min_volume=20000, max_volume=1000000, is_active=True, views_count=342,
            ),
            Card(
                user_id=admin.id, type="offer", operation_type="sell",
                title="ACH & Wire Transfers — US Domestic",
                description="Direct ACH origination and wire transfer capabilities for US-based businesses. Same-day ACH available. NACHA compliant.",
                gateway_type="ACH", regions=["North America"], industries=["eCommerce", "SaaS"],
                currencies=["USD"], pricing_model="fixed",
                fixed_fee=0.25, min_volume=10000, max_volume=500000, is_active=True, views_count=98,
            ),
            Card(
                user_id=admin.id, type="request", operation_type="rent",
                title="Looking for LATAM Payment Processing",
                description="Travel platform expanding to Brazil, Mexico, Colombia. Need local payment method support (PIX, OXXO, Boleto) with USD settlement.",
                gateway_type="Any", regions=["LATAM"], industries=["Travel"],
                currencies=["BRL", "MXN", "COP", "USD"], pricing_model="negotiable",
                min_volume=30000, max_volume=150000, is_active=True, views_count=73,
            ),
        ]

        for card in demos:
            db.add(card)
        db.commit()
        print(f"[SEED] {len(demos)} demo marketplace cards created.")
    finally:
        db.close()


seed_demo_cards()

# Ensure uploads directory exists
os.makedirs("uploads/verifications", exist_ok=True)
os.makedirs("uploads/verification_html", exist_ok=True)

app = FastAPI(title="flipconnects API", version="1.0.0")

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(cards.router)
app.include_router(deals.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(site_settings.router)
app.include_router(verifications.router)
app.include_router(messages.router)
app.include_router(tracking_settings.router)
app.include_router(custom_scripts.router)
app.include_router(verification_html.router)
app.include_router(ssr.router)


@app.get("/")
def root():
    return {"message": "flipconnects API is running"}
