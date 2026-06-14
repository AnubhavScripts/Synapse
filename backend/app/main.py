import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_tables, engine
from sqlalchemy import text

logger = logging.getLogger(__name__)


async def run_migrations():
    """
    Additive ALTER TABLE migrations. Safe to run repeatedly on existing data.
    Also adds the callback_events and dispatch_jobs tables if not yet created.
    """
    migration_sql = [
        # Existing columns
        "ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50",
        "ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS key_drivers JSONB DEFAULT '[]'::jsonb",
        "ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb",
        # Backfill revenue for seeded completed campaigns
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
            await conn.execute(text(sql))
    logger.info("✅ Database migrations applied")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    await create_tables()          # Creates all tables including callback_events, dispatch_jobs
    await run_migrations()         # Additive column migrations

    # Start the retry worker as a background task
    from app.services.retry_worker import retry_worker
    retry_task = asyncio.create_task(retry_worker())
    logger.info("✅ Retry worker started")

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    retry_task.cancel()
    try:
        await retry_task
    except asyncio.CancelledError:
        pass
    logger.info("✅ Retry worker stopped")


app = FastAPI(
    title="ReachIQ CRM",
    description="AI-Native Customer Engagement CRM — Service A",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ──────────────────────────────────────────────────────────
from app.api.customers import router as customers_router
from app.api.segments import router as segments_router
from app.api.campaigns import router as campaigns_router
from app.api.strategist import router as strategist_router
from app.api.opportunities import router as opportunities_router
from app.api.analytics import router as analytics_router
from app.api.activities import router as activities_router
from app.api.decisions import router as decisions_router

# Note: dispatcher_router removed — Messaging Gateway now runs as a
# separate service on port 8001 (run_gateway.py)

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
    return {"name": "ReachIQ CRM", "version": "3.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "crm-api"}


@app.get("/api/seed")
@app.post("/api/seed")
async def seed_database():
    from app.seed import seed
    try:
        await seed()
        return {"status": "success", "message": "Database seeded successfully"}
    except Exception as e:
        logger.exception("Seeding failed")
        return {"status": "error", "message": str(e)}
