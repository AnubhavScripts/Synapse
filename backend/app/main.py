from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    await create_tables()
    yield
    # Shutdown


app = FastAPI(
    title="ReachIQ",
    description="AI-Native Customer Engagement CRM",
    version="1.0.0",
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
    return {"name": "ReachIQ", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
