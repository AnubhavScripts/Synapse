from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.strategist import StrategyRequest, StrategyResponse
from app.services.ai_strategist import analyze_goal

router = APIRouter(prefix="/api/strategist", tags=["AI Strategist"])


@router.post("/analyze", response_model=StrategyResponse)
async def analyze(request: StrategyRequest, db: AsyncSession = Depends(get_db)):
    """
    The core AI endpoint.
    Sends business goal + persona context to Gemini.
    Returns structured strategy with reasoning.
    """
    return await analyze_goal(request.goal, db)
