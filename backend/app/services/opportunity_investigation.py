"""
Opportunity Investigation Service — Gemini-powered strategic reasoning layer.

Responsibility boundary:
  - The Opportunity Engine (opportunity_engine.py) is fully deterministic.
    It handles discovery, scoring, prioritization, trend detection, and "Why Now?".
  - THIS service operates only at the strategic reasoning layer:
    explaining findings, enriching recommendations, comparing candidate actions,
    and generating human-readable investigation narratives.
  - All Gemini calls have a fully deterministic fallback.
"""

import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.opportunity import Opportunity
from app.models.customer import Customer
from app.models.persona import CustomerPersona
from app.models.campaign import Campaign
from app.schemas.strategist import (
    OpportunityInvestigationResponse,
    CandidateAction,
)
from app.services.opportunity_engine import get_candidate_actions
from app.core.config import get_settings

settings = get_settings()


# ── Confidence evidence templates by opportunity type ─────────────────────

EVIDENCE_TEMPLATES = {
    "dormant_recovery": [
        "Win-back campaigns for this segment historically achieve 11.8% conversion",
        "Customers with 75+ day gaps respond 3× better to personalised offers vs generic",
        "WhatsApp delivery to this cohort averages 78% read rate",
        "Discount-affinity customers in this group convert at 14.2% on first outreach",
    ],
    "churn_prevention": [
        "Early intervention at the at-risk stage retains 35–45% of customers",
        "Personalised retention campaigns outperform generic by 2.3× in this segment",
        "This cohort's engagement score drop correlates with 60-day churn window",
        "Exclusive offer + preferred channel yields highest re-engagement signal",
    ],
    "cross_sell": [
        "Category affinity cross-sell campaigns average 10.5% conversion",
        "Customers with high discount affinity respond 25% better to bundle offers",
        "Accessory bundles increase average order value by ₹840 on average",
        "This segment's purchase frequency supports 2 promotions/month without fatigue",
    ],
    "emerging_vip": [
        "Customers at this spend trajectory have 82% 12-month retention if invited to VIP",
        "Early VIP invite reduces competitor switching by 67% in this cohort",
        "Spend milestone rewards increase next-30-day AOV by 18%",
        "This window (3+ orders, high engagement) is the optimal loyalty lock-in moment",
    ],
    "loyalty": [
        "Proactive loyalty rewards reduce churn risk by 40% in this segment",
        "VIP-recognised customers increase AOV by 12–18% within 60 days",
        "Exclusive access offers generate 2.1× more UGC and word-of-mouth",
        "This cohort has the highest NPS potential in your customer base",
    ],
    "upsell": [
        "Channel-switch campaigns improve open rates by 34% for saturation segments",
        "Premium membership trials convert at 6.5% but generate 4× long-term LTV",
        "Upsell campaigns for this segment average ₹1,200 incremental revenue per customer",
        "Personalised upsell relevance score for this cohort: 78/100",
    ],
}

IMPACT_EFFORT_MAP = {
    "dormant_recovery": {"impact": "High", "effort": "Low", "action": "Launch immediately"},
    "churn_prevention": {"impact": "High", "effort": "Low", "action": "Launch immediately"},
    "cross_sell": {"impact": "Medium", "effort": "Low", "action": "Launch immediately"},
    "emerging_vip": {"impact": "High", "effort": "Medium", "action": "Launch this week"},
    "loyalty": {"impact": "Medium", "effort": "Medium", "action": "Schedule for off-peak"},
    "upsell": {"impact": "Medium", "effort": "High", "action": "Review manually"},
}


def _compute_candidate_metrics(
    action_template: dict,
    potential_revenue: float,
    affected_customers: int,
) -> CandidateAction:
    """
    Estimate financial metrics for a candidate action deterministically.
    """
    base_conv = action_template["base_conversion"]
    expected_conversions = max(1, int(affected_customers * base_conv))
    revenue_per_conversion = (potential_revenue / max(affected_customers, 1)) * 0.85
    expected_revenue = round(expected_conversions * revenue_per_conversion, 2)

    description_map = {
        "Low": f"Low operational effort — deploys in <24 hours via {action_template['channel'].title()}",
        "Medium": f"Moderate setup needed — estimated 1–2 days via {action_template['channel'].title()}",
        "High": f"High effort investment — requires design/copy review via {action_template['channel'].title()}",
    }

    return CandidateAction(
        name=action_template["name"],
        description=description_map.get(action_template["effort"], ""),
        expected_revenue=expected_revenue,
        expected_conversions=expected_conversions,
        conversion_rate=round(base_conv, 3),
        margin_impact=action_template["margin_impact"],
        pros=action_template["pros"],
        cons=action_template["cons"],
    )


def _algorithmic_investigation(opportunity: Opportunity) -> OpportunityInvestigationResponse:
    """
    Fully deterministic fallback investigation — no AI required.
    """
    opp_type = opportunity.opportunity_type
    meta = opportunity.metadata_json or {}
    why_now = meta.get("why_now", opportunity.description)

    # Build candidate actions with metrics
    templates = get_candidate_actions(opp_type)
    options = [
        _compute_candidate_metrics(t, opportunity.potential_revenue, opportunity.affected_customers)
        for t in templates
    ]

    # Select best option: highest expected_revenue
    recommended_index = max(range(len(options)), key=lambda i: options[i].expected_revenue)
    best = options[recommended_index]
    best_template = templates[recommended_index]

    # Impact / Effort / Action — on recommended option only
    ie = IMPACT_EFFORT_MAP.get(opp_type, {"impact": "Medium", "effort": "Medium", "action": "Review manually"})

    # Evidence
    evidence = EVIDENCE_TEMPLATES.get(opp_type, EVIDENCE_TEMPLATES["dormant_recovery"])[:3]

    # Confidence score: higher for types with strong evidence base
    confidence_map = {
        "dormant_recovery": 89,
        "churn_prevention": 84,
        "cross_sell": 76,
        "emerging_vip": 81,
        "loyalty": 74,
        "upsell": 70,
    }
    confidence_score = confidence_map.get(opp_type, 75)

    # Root cause
    root_cause_map = {
        "dormant_recovery": (
            f"Customers in this segment have a natural purchase cycle of ~18 days. "
            f"Their current inactivity gap (75+ days) is 4× their normal interval, "
            f"indicating external disruption — likely a poor last experience, "
            f"competitive offer, or lifecycle drift."
        ),
        "churn_prevention": (
            f"These customers were formerly engaged (engagement score ≥ 50) but their "
            f"purchase frequency and session activity have declined. This pattern typically "
            f"precedes full churn within 45–60 days without intervention."
        ),
        "cross_sell": (
            f"High discount affinity customers in this segment make 60%+ of their purchases "
            f"through promotions. Their primary category purchase history reveals strong "
            f"complementary category affinity that is currently untapped."
        ),
        "emerging_vip": (
            f"These customers show accelerating spend velocity and high engagement — a pattern "
            f"that precedes long-term brand loyalty. The next 30 days is the optimal window "
            f"to lock in this relationship before the loyalty decision is made."
        ),
        "loyalty": (
            f"These customers are highly engaged (score ≥ 70) and loyal, but have not received "
            f"formal VIP recognition. Lack of recognition is a leading churn predictor for "
            f"high-value customers even without visible engagement decline."
        ),
        "upsell": (
            f"This segment shows concentrated channel usage with diminishing engagement returns — "
            f"a classic saturation signal. Introducing a channel-switch offer or premium tier "
            f"breaks the fatigue pattern and resets engagement baselines."
        ),
    }
    root_cause = root_cause_map.get(opp_type, opportunity.ai_reasoning)

    selection_reasoning = (
        f"'{best.name}' is recommended over the other options because it achieves the highest "
        f"expected revenue (₹{best.expected_revenue:,.0f}) with {best.conversion_rate*100:.1f}% "
        f"conversion rate. {ie['impact']} business impact at {ie['effort'].lower()} operational "
        f"effort makes this the optimal risk-reward choice."
    )

    recommended_goal = (
        f"Run a {best.name.lower()} campaign via {best_template['channel']} targeting {opportunity.affected_customers} "
        f"{opp_type.replace('_', ' ')} customers to recover ₹{opportunity.potential_revenue/100000:.1f}L in revenue."
    )

    return OpportunityInvestigationResponse(
        opportunity_id=str(opportunity.id),
        opportunity_title=opportunity.title,
        root_cause=root_cause,
        why_now=why_now,
        confidence_score=confidence_score,
        evidence=evidence,
        options=options,
        recommended_index=recommended_index,
        selection_reasoning=selection_reasoning,
        impact=ie["impact"],
        effort=ie["effort"],
        recommended_action=ie["action"],
        recommended_goal=recommended_goal,
        opportunity_customer_ids=(opportunity.metadata_json or {}).get("customer_ids", []),
    )


async def investigate_opportunity(
    opportunity_id: str,
    session: AsyncSession,
) -> OpportunityInvestigationResponse:
    """
    Full investigation of an opportunity.

    Flow:
      1. Load opportunity from DB
      2. Generate type-specific candidate actions (deterministic)
      3. Score candidate actions (deterministic)
      4. Attempt Gemini enrichment for root_cause, why_now, evidence narratives
      5. Fall back to algorithmic investigation if Gemini fails
    """
    # Load opportunity
    result = await session.execute(
        select(Opportunity).where(Opportunity.id == uuid.UUID(opportunity_id))
    )
    opportunity = result.scalar_one_or_none()
    if opportunity is None:
        raise ValueError(f"Opportunity {opportunity_id} not found")

    # Always compute deterministic candidate options first
    templates = get_candidate_actions(opportunity.opportunity_type)
    options = [
        _compute_candidate_metrics(t, opportunity.potential_revenue, opportunity.affected_customers)
        for t in templates
    ]
    recommended_index = max(range(len(options)), key=lambda i: options[i].expected_revenue)
    ie = IMPACT_EFFORT_MAP.get(
        opportunity.opportunity_type,
        {"impact": "Medium", "effort": "Medium", "action": "Review manually"}
    )

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        meta = opportunity.metadata_json or {}
        key_drivers = opportunity.key_drivers or []
        options_summary = "\n".join(
            f"  Option {i+1}: {o.name} — ₹{o.expected_revenue:,.0f} expected, "
            f"{o.conversion_rate*100:.1f}% conversion, {o.margin_impact} margin impact"
            for i, o in enumerate(options)
        )
        evidence_hints = "\n".join(f"- {e}" for e in EVIDENCE_TEMPLATES.get(opportunity.opportunity_type, [])[:4])

        prompt = f"""You are an AI Revenue Strategist for Synapse CRM. Investigate this business opportunity and provide expert insights.

OPPORTUNITY: {opportunity.title}
TYPE: {opportunity.opportunity_type}
CUSTOMERS AFFECTED: {opportunity.affected_customers}
REVENUE AT STAKE: ₹{opportunity.potential_revenue:,.0f}
PRIORITY SCORE: {opportunity.priority_score}/100

KEY DRIVERS (from Opportunity Engine):
{chr(10).join(f'- {d}' for d in key_drivers)}

WHY NOW (trend data):
{meta.get('why_now', opportunity.description)}

CANDIDATE ACTIONS (pre-scored algorithmically):
{options_summary}

EVIDENCE BASE:
{evidence_hints}

Provide a JSON response with exactly these fields:
- root_cause: string (2-3 sentences explaining WHY this opportunity/risk exists)
- why_now: string (1-2 sentences of urgency — what changed, revenue risk delta)
- evidence: array of 3 strings (specific, data-backed evidence points)
- selection_reasoning: string (why Option {recommended_index+1} is the best choice)

Be specific, use ₹ amounts, be concise and executive-level. Do not suggest new actions."""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )

        if not response.text:
            raise ValueError("Empty response from Gemini API")

        import json
        enrichment = json.loads(response.text)

        best = options[recommended_index]
        confidence_map = {
            "dormant_recovery": 89, "churn_prevention": 84, "cross_sell": 76,
            "emerging_vip": 81, "loyalty": 74, "upsell": 70,
        }

        return OpportunityInvestigationResponse(
            opportunity_id=str(opportunity.id),
            opportunity_title=opportunity.title,
            root_cause=enrichment.get("root_cause", ""),
            why_now=enrichment.get("why_now", meta.get("why_now", "")),
            confidence_score=confidence_map.get(opportunity.opportunity_type, 75),
            evidence=enrichment.get("evidence", EVIDENCE_TEMPLATES.get(opportunity.opportunity_type, [])[:3]),
            options=options,
            recommended_index=recommended_index,
            selection_reasoning=enrichment.get("selection_reasoning", ""),
            impact=ie["impact"],
            effort=ie["effort"],
            recommended_action=ie["action"],
            recommended_goal=(
                f"Run a {options[recommended_index].name.lower()} campaign via {templates[recommended_index]['channel']} targeting "
                f"{opportunity.affected_customers} customers to recover "
                f"₹{opportunity.potential_revenue/100000:.1f}L in revenue."
            ),
            opportunity_customer_ids=meta.get("customer_ids", []),
        )

    except Exception as e:
        print(f"Gemini enrichment skipped ({e}). Using deterministic investigation.")
        return _algorithmic_investigation(opportunity)
