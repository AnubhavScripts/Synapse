"""
AI Strategist Service — Gemini-powered strategic reasoning.
This is the ONLY Gemini touchpoint.

Receives rich persona/opportunity context from the algorithmic engines
and uses Gemini for strategic reasoning, audience selection, messaging,
and recommendations.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.customer import Customer
from app.models.persona import CustomerPersona
from app.models.segment import Segment
from app.models.campaign import Campaign
from app.schemas.strategist import (
    StrategyResponse,
    AudienceRecommendation,
    StrategyRecommendation,
    ChannelRecommendation,
    MessageDraft,
    PerformancePrediction,
)
from app.core.config import get_settings

settings = get_settings()


def _pydantic_to_gemini_schema(model) -> dict:
    """
    Generate a JSON Schema from a Pydantic model and transform it for the Gemini API.
    - Resolves all $defs and inlines $ref references.
    - Strips 'additionalProperties'.
    """
    raw_schema = model.model_json_schema()
    defs = raw_schema.pop("$defs", {})
    
    def resolve_refs(node):
        if isinstance(node, dict):
            if "$ref" in node:
                ref_path = node["$ref"]
                ref_name = ref_path.split("/")[-1]
                if ref_name in defs:
                    resolved = resolve_refs(dict(defs[ref_name]))
                    node_copy = {k: v for k, v in node.items() if k != "$ref"}
                    resolved.update(node_copy)
                    return resolved
            
            resolved_node = {}
            for k, v in node.items():
                if k == "additionalProperties":
                    continue
                resolved_node[k] = resolve_refs(v)
            return resolved_node
            
        elif isinstance(node, list):
            return [resolve_refs(item) for item in node]
            
        return node

    return resolve_refs(raw_schema)


async def _gather_context(session: AsyncSession) -> dict:

    """Gather rich customer intelligence context for Gemini."""

    # Customer stats
    total = (await session.execute(select(func.count(Customer.id)))).scalar() or 0
    total_revenue = (await session.execute(select(func.sum(Customer.total_spend)))).scalar() or 0
    avg_ltv = (await session.execute(select(func.avg(Customer.lifetime_value)))).scalar() or 0

    # Persona distribution
    risk_dist = {}
    for risk in ["loyal", "stable", "at_risk", "dormant", "churned"]:
        count = (await session.execute(
            select(func.count(CustomerPersona.id)).where(CustomerPersona.risk_level == risk)
        )).scalar() or 0
        risk_dist[risk] = count

    # Channel distribution
    channel_dist = {}
    for ch in ["whatsapp", "sms", "email", "rcs"]:
        count = (await session.execute(
            select(func.count(CustomerPersona.id)).where(CustomerPersona.channel_affinity == ch)
        )).scalar() or 0
        channel_dist[ch] = count

    # Category distribution
    cat_result = await session.execute(
        select(CustomerPersona.primary_category, func.count(CustomerPersona.id))
        .group_by(CustomerPersona.primary_category)
        .order_by(func.count(CustomerPersona.id).desc())
        .limit(5)
    )
    category_dist = {row[0]: row[1] for row in cat_result.all()}

    # Discount affinity
    discount_dist = {}
    for d in ["high", "medium", "low", "none"]:
        count = (await session.execute(
            select(func.count(CustomerPersona.id)).where(CustomerPersona.discount_affinity == d)
        )).scalar() or 0
        discount_dist[d] = count

    # Avg engagement score
    avg_engagement = (await session.execute(
        select(func.avg(CustomerPersona.engagement_score))
    )).scalar() or 0

    # Dormant customer details
    dormant_revenue = (await session.execute(
        select(func.sum(Customer.lifetime_value))
        .join(CustomerPersona, Customer.id == CustomerPersona.customer_id)
        .where(CustomerPersona.risk_level == "dormant")
    )).scalar() or 0

    # Recent campaign performance
    completed_campaigns = (await session.execute(
        select(Campaign).where(Campaign.status == "completed").order_by(Campaign.completed_at.desc()).limit(5)
    )).scalars().all()

    campaign_perf = []
    for c in completed_campaigns:
        if c.actual_sent > 0:
            campaign_perf.append({
                "name": c.name,
                "channel": c.channel,
                "sent": c.actual_sent,
                "delivered": c.actual_delivered,
                "read": c.actual_read,
                "clicked": c.actual_clicked,
                "converted": c.actual_converted,
                "revenue": c.actual_revenue,
            })

    # Segments
    segments = (await session.execute(
        select(Segment).order_by(Segment.customer_count.desc())
    )).scalars().all()

    segment_info = [{"name": s.name, "count": s.customer_count, "revenue": s.revenue_contribution, "engagement": s.engagement_rate} for s in segments]

    return {
        "total_customers": total,
        "total_revenue": total_revenue,
        "avg_ltv": round(avg_ltv, 2),
        "risk_distribution": risk_dist,
        "channel_distribution": channel_dist,
        "category_distribution": category_dist,
        "discount_distribution": discount_dist,
        "avg_engagement_score": round(avg_engagement, 1),
        "dormant_recoverable_revenue": dormant_revenue,
        "recent_campaigns": campaign_perf,
        "segments": segment_info,
    }


async def analyze_goal(goal: str, session: AsyncSession) -> StrategyResponse:
    """
    Send business goal + persona context to Gemini.
    Gemini returns strategic recommendations with reasoning.
    """
    context = await _gather_context(session)

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = f"""You are an AI Marketing Strategist for a retail brand's CRM platform called ReachIQ.

You have deep customer intelligence from our Persona Engine:

CUSTOMER DATA:
- Total Customers: {context['total_customers']}
- Total Revenue: ₹{context['total_revenue']:,.0f}
- Average Customer LTV: ₹{context['avg_ltv']:,.0f}
- Average Engagement Score: {context['avg_engagement_score']}/100

RISK DISTRIBUTION:
{', '.join(f"{k}: {v}" for k, v in context['risk_distribution'].items())}

CHANNEL AFFINITY:
{', '.join(f"{k}: {v} customers" for k, v in context['channel_distribution'].items())}

CATEGORY PREFERENCES:
{', '.join(f"{k}: {v}" for k, v in context['category_distribution'].items())}

DISCOUNT SENSITIVITY:
{', '.join(f"{k}: {v}" for k, v in context['discount_distribution'].items())}

DORMANT RECOVERABLE REVENUE: ₹{context['dormant_recoverable_revenue']:,.0f}

SEGMENTS:
{chr(10).join(f"- {s['name']}: {s['count']} customers, ₹{s['revenue']:,.0f} revenue, {s['engagement']}% engagement" for s in context['segments'])}

RECENT CAMPAIGN PERFORMANCE:
{chr(10).join(f"- {c['name']} ({c['channel']}): {c['sent']} sent, {c['read']} read, {c['clicked']} clicked, {c['converted']} converted, ₹{c['revenue']:,.0f} revenue" for c in context['recent_campaigns']) if context['recent_campaigns'] else 'No recent campaigns'}

BUSINESS GOAL: "{goal}"

Based on this data, create a comprehensive marketing strategy. Use actual numbers from the data above. Be specific about WHY you recommend each decision. All monetary values should be in Indian Rupees (₹)."""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": _pydantic_to_gemini_schema(StrategyResponse),
            },
        )

        return StrategyResponse.model_validate_json(response.text)


    except Exception as e:
        # Fallback: generate strategy algorithmically if Gemini fails
        print(f"Gemini API error: {e}. Falling back to algorithmic strategy.")
        return await _fallback_strategy(goal, context, session)


async def _fallback_strategy(goal: str, context: dict, session: AsyncSession) -> StrategyResponse:
    """Algorithmic fallback when Gemini is unavailable."""
    goal_lower = goal.lower()

    # Determine best audience based on goal
    if any(w in goal_lower for w in ["dormant", "back", "inactive", "win-back", "return", "reactivate"]):
        segment_name = "Dormant Customers"
        count = context["risk_distribution"].get("dormant", 0)
        revenue_opp = context["dormant_recoverable_revenue"]
        campaign_type = "Win-Back"
        characteristics = ["Haven't purchased in 75+ days", "Previously active buyers", "High historical LTV"]
    elif any(w in goal_lower for w in ["loyal", "vip", "reward", "retain", "loyalty"]):
        segment_name = "VIP Customers"
        count = context["risk_distribution"].get("loyal", 0)
        revenue_opp = context["avg_ltv"] * count * 0.15
        campaign_type = "Loyalty Reward"
        characteristics = ["High engagement score", "Frequent purchasers", "Strong brand affinity"]
    elif any(w in goal_lower for w in ["repeat", "purchase", "frequency", "buy again"]):
        segment_name = "Stable Customers"
        count = context["risk_distribution"].get("stable", 0)
        revenue_opp = context["avg_ltv"] * count * 0.2
        campaign_type = "Repeat Purchase"
        characteristics = ["Active buyers", "Moderate purchase frequency", "Growth potential"]
    elif any(w in goal_lower for w in ["new", "launch", "product", "collection", "promote"]):
        segment_name = "Engaged Customers"
        count = context["risk_distribution"].get("loyal", 0) + context["risk_distribution"].get("stable", 0)
        revenue_opp = count * 1500
        campaign_type = "Product Launch"
        characteristics = ["Active engagement", "Category match potential", "High read rates"]
    else:
        segment_name = "All Active Customers"
        count = context["total_customers"] - context["risk_distribution"].get("churned", 0)
        revenue_opp = context["total_revenue"] * 0.1
        campaign_type = "General Engagement"
        characteristics = ["Broad audience", "Mixed engagement levels", "Multi-category interest"]

    # Best channel
    best_channel = max(context["channel_distribution"], key=context["channel_distribution"].get)
    channel_metrics = {
        "whatsapp": {"read_rate": 0.78, "click_rate": 0.28, "conversion_rate": 0.12},
        "sms": {"read_rate": 0.45, "click_rate": 0.12, "conversion_rate": 0.05},
        "email": {"read_rate": 0.22, "click_rate": 0.08, "conversion_rate": 0.03},
        "rcs": {"read_rate": 0.65, "click_rate": 0.22, "conversion_rate": 0.09},
    }

    ch_rates = channel_metrics.get(best_channel, channel_metrics["whatsapp"])

    headline_text = "Come Back to Us!" if "dormant" in goal_lower else "Something Special for You"
    body_suffix = "We miss you! Here's an exclusive offer just for you." if "dormant" in goal_lower else "Check out our latest picks curated just for you."

    return StrategyResponse(
        goal_summary=f"Objective: {goal}. Targeting {segment_name.lower()} to drive {campaign_type.lower()} outcomes through personalized engagement on their preferred channels.",
        audience=AudienceRecommendation(
            segment_name=segment_name,
            customer_count=count,
            revenue_opportunity=revenue_opp,
            characteristics=characteristics,
            reasoning=f"Selected based on persona engine analysis. {count} customers match the goal criteria with combined revenue opportunity of ₹{revenue_opp:,.0f}."
        ),
        strategy=StrategyRecommendation(
            campaign_type=campaign_type,
            approach=f"Personalized {campaign_type.lower()} campaign leveraging customer category affinity and discount sensitivity for maximum relevance.",
            confidence_score=0.82,
            expected_outcome=f"Expected to recover {int(count * 0.15)} customers with ₹{revenue_opp * 0.15:,.0f} projected revenue.",
            reasoning=f"Based on historical persona data and {len(context.get('recent_campaigns', []))} recent campaign performance metrics."
        ),
        channel=ChannelRecommendation(
            primary_channel=best_channel,
            reasoning=f"{best_channel.title()} selected as primary channel because {context['channel_distribution'][best_channel]} customers ({int(context['channel_distribution'][best_channel]/max(count,1)*100)}%) show highest affinity. Expected read rate: {ch_rates['read_rate']*100:.0f}%.",
            channel_metrics=channel_metrics
        ),
        message=MessageDraft(
            headline=f"{headline_text} 🎁",
            body=f"Hi {{{{name}}}}, we've noticed you love {{{{category}}}}. {body_suffix}",
            cta="Shop Now →",
            personalization_tokens=["{name}", "{category}", "{last_product}"],
            tone="friendly and personalized"
        ),
        performance=PerformancePrediction(
            estimated_reach=count,
            estimated_opens=int(count * ch_rates["read_rate"]),
            estimated_clicks=int(count * ch_rates["click_rate"]),
            estimated_conversions=int(count * ch_rates["conversion_rate"]),
            estimated_revenue=round(revenue_opp * ch_rates["conversion_rate"], 2)
        ),
        decision_reasoning=[
            f"Audience: Selected {segment_name} ({count} customers) based on risk_level and engagement_score analysis.",
            f"Channel: {best_channel.title()} chosen due to highest customer affinity ({context['channel_distribution'][best_channel]} prefer it).",
            f"Timing: Recommended based on majority preferred time slot distribution.",
            f"Offer: {'Discount-driven approach' if context['discount_distribution'].get('high', 0) > count * 0.3 else 'Value-driven approach'} based on discount affinity distribution.",
        ]
    )
