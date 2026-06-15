from pydantic import BaseModel, Field
from typing import Optional


# ── Existing schemas (unchanged) ──────────────────────────────────────────

class StrategyRequest(BaseModel):
    goal: str


class AudienceRecommendation(BaseModel):
    segment_name: str = Field(description="Name of the recommended audience segment")
    customer_count: int = Field(description="Number of customers in this audience")
    revenue_opportunity: float = Field(description="Potential revenue in INR from this audience")
    characteristics: list[str] = Field(description="Key characteristics of this audience")
    reasoning: str = Field(description="Why this audience was selected")


class StrategyRecommendation(BaseModel):
    campaign_type: str = Field(description="Type of campaign: win-back, loyalty, promotional, etc.")
    approach: str = Field(description="Strategic approach description")
    confidence_score: float = Field(description="Confidence in this strategy, 0.0 to 1.0")
    expected_outcome: str = Field(description="What outcome to expect")
    reasoning: str = Field(description="Why this strategy was chosen")


class ChannelRecommendation(BaseModel):
    primary_channel: str = Field(description="Recommended primary channel: whatsapp, sms, email, or rcs")
    reasoning: str = Field(description="Why this channel was chosen")
    channel_metrics: dict = Field(description="Predicted metrics per channel: {channel: {read_rate, click_rate, conversion_rate}}")


class MessageDraft(BaseModel):
    headline: str = Field(description="Campaign headline")
    body: str = Field(description="Main message body")
    cta: str = Field(description="Call to action text")
    personalization_tokens: list[str] = Field(description="Personalization tokens used like {name}, {category}")
    tone: str = Field(description="Message tone: friendly, urgent, exclusive, etc.")


class PerformancePrediction(BaseModel):
    estimated_reach: int
    estimated_opens: int
    estimated_clicks: int
    estimated_conversions: int
    estimated_revenue: float


class StrategyResponse(BaseModel):
    goal_summary: str = Field(description="Short, punchy campaign title, 3-5 words max (e.g. 'Accessory Bundle Offer')")
    audience: AudienceRecommendation
    strategy: StrategyRecommendation
    channel: ChannelRecommendation
    message: MessageDraft
    performance: PerformancePrediction
    decision_reasoning: list[str] = Field(description="Key decisions and their reasoning")


# ── v2 — Opportunity Investigation schemas ────────────────────────────────

class InvestigateRequest(BaseModel):
    opportunity_id: str


class CandidateAction(BaseModel):
    """One of the 3 alternative actions compared during an investigation."""
    name: str                    # e.g. "10% Win-Back Discount"
    description: str
    expected_revenue: float
    expected_conversions: int
    conversion_rate: float       # e.g. 0.118
    margin_impact: str           # "Low" | "Medium" | "High"
    pros: list[str]
    cons: list[str]


class OpportunityInvestigationResponse(BaseModel):
    """
    Full investigation report for an opportunity.

    Flow:
      Opportunity → Root Cause + Why Now? → Evidence + Confidence
              → 3 Candidate Actions → Recommended Action (Impact / Effort / Label)
    """
    opportunity_id: str
    opportunity_title: str

    # ── Diagnostic Layer ──
    root_cause: str              # Why this opportunity/risk exists
    why_now: str                 # Urgency: trend delta, revenue risk change

    # ── Evidence Layer ──
    confidence_score: int        # 0–100, e.g. 89
    evidence: list[str]          # ["Similar campaigns achieved 11.8% conversion", ...]

    # ── Alternative Actions Layer ──
    options: list[CandidateAction]   # Always 3, type-specific (not hardcoded globally)

    # ── Recommendation Layer (winning option only) ──
    recommended_index: int       # Index into options[]
    selection_reasoning: str     # Why this option was chosen over the others
    impact: str                  # "High" | "Medium" | "Low"
    effort: str                  # "High" | "Medium" | "Low"
    recommended_action: str      # "Launch immediately" | "Review manually" | "Schedule for off-peak"

    recommended_goal: str        # Pre-fill text for the existing /analyze endpoint
    opportunity_customer_ids: list[str] = []  # Exact customer UUIDs to target — always = affected_customers count
