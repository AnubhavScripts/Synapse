from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.strategist import (
    StrategyRequest, StrategyResponse,
    InvestigateRequest, OpportunityInvestigationResponse,
)
from app.services.ai_strategist import analyze_goal
from app.services.opportunity_investigation import investigate_opportunity

router = APIRouter(prefix="/api/strategist", tags=["AI Strategist"])


@router.post("/analyze", response_model=StrategyResponse)
async def analyze(request: StrategyRequest, db: AsyncSession = Depends(get_db)):
    """
    Goal-driven strategy endpoint (secondary entry point).
    Sends business goal + persona context to Gemini.
    Returns structured strategy with reasoning.
    """
    return await analyze_goal(request.goal, db)


@router.post("/investigate", response_model=OpportunityInvestigationResponse)
async def investigate(request: InvestigateRequest, db: AsyncSession = Depends(get_db)):
    """
    Opportunity Investigation endpoint.

    Flow:
      Opportunity → Root Cause + Why Now? → Evidence + Confidence
          → 3 Candidate Actions (type-specific) → Recommendation (Impact / Effort / Action)

    The Opportunity Engine is deterministic. Gemini enriches narratives only.
    """
    try:
        return await investigate_opportunity(request.opportunity_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Investigation failed: {e}")
