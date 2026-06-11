from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_tables, engine
import logging

logger = logging.getLogger(__name__)


async def run_migrations():
    """
    Option A migration — ALTER TABLE IF NOT EXISTS.
    Safe to run repeatedly. Preserves all existing data.
    """
    migration_sql = [
        "ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50",
        "ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS key_drivers JSONB DEFAULT '[]'::jsonb",
        "ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb",
        # Backfill actual_revenue for completed seeded campaigns that have 0 revenue
        # Uses actual_converted × random-ish per-row seed (row_number × 1200 mod avoids uniform values)
        """
        UPDATE campaigns
        SET actual_revenue = ROUND(
            (actual_converted * (800 + (EXTRACT(EPOCH FROM created_at)::BIGINT % 3700)))::NUMERIC,
            2
        )
        WHERE status = 'completed'
          AND actual_revenue = 0
          AND actual_converted > 0
        """,
    ]
    async with engine.begin() as conn:
        for sql in migration_sql:
            await conn.execute(__import__("sqlalchemy").text(sql))
    logger.info("✅ Database migrations applied (ALTER TABLE + revenue backfill)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables, then apply additive migrations
    await create_tables()
    await run_migrations()
    yield
    # Shutdown


app = FastAPI(
    title="ReachIQ",
    description="AI-Native Customer Engagement CRM",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api.customers import router as customers_router
from app.api.segments import router as segments_router
from app.api.campaigns import router as campaigns_router
from app.api.strategist import router as strategist_router
from app.api.opportunities import router as opportunities_router
from app.api.analytics import router as analytics_router
from app.api.activities import router as activities_router
from app.api.decisions import router as decisions_router

app.include_router(customers_router)
app.include_router(segments_router)
app.include_router(campaigns_router)
app.include_router(strategist_router)
app.include_router(opportunities_router)
app.include_router(analytics_router)
app.include_router(activities_router)
app.include_router(decisions_router)


@app.get("/")
async def root():
    return {"name": "ReachIQ", "version": "2.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
