from pydantic import BaseModel, Field
from typing import Optional


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
    goal_summary: str = Field(description="AI summary of the business objective")
    audience: AudienceRecommendation
    strategy: StrategyRecommendation
    channel: ChannelRecommendation
    message: MessageDraft
    performance: PerformancePrediction
    decision_reasoning: list[str] = Field(description="Key decisions and their reasoning")
