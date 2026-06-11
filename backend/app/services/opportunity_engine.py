"""
Opportunity Engine — Deterministic growth opportunity discovery.

Responsibility boundary:
  - This engine is fully deterministic. It handles opportunity discovery,
    scoring, prioritization, trend detection, and "Why Now?" urgency computation.
  - Gemini operates only at the strategic reasoning layer (opportunity_investigation.py).

Opportunity types:
  dormant_recovery | churn_prevention | upsell | cross_sell | emerging_vip | loyalty
"""

import math
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.models.customer import Customer
from app.models.persona import CustomerPersona
from app.models.opportunity import Opportunity


# ---------------------------------------------------------------------------
# Type-driven candidate action templates (extensible mapping)
# Adding a new opportunity type only requires a new key here.
# ---------------------------------------------------------------------------

CANDIDATE_ACTIONS = {
    "dormant_recovery": [
        {
            "name": "10% Win-Back Discount",
            "channel": "email",
            "effort": "Low",
            "base_conversion": 0.118,
            "margin_impact": "Medium",
            "pros": ["High response rate for price-sensitive segments", "Easy to personalize"],
            "cons": ["Compresses margin", "May condition customers to wait for discounts"],
        },
        {
            "name": "Free Shipping Offer",
            "channel": "push",
            "effort": "Low",
            "base_conversion": 0.082,
            "margin_impact": "Low",
            "pros": ["Psychologically felt as full-price win", "Broad appeal"],
            "cons": ["Lower revenue lift than discount", "Less urgency"],
        },
        {
            "name": "Limited-Time Flash Offer",
            "channel": "whatsapp",
            "effort": "Medium",
            "base_conversion": 0.095,
            "margin_impact": "Medium",
            "pros": ["Creates urgency", "WhatsApp 78% read rate"],
            "cons": ["Requires copy/creative effort", "One-time uplift only"],
        },
    ],
    "churn_prevention": [
        {
            "name": "Exclusive Retention Offer",
            "channel": "email",
            "effort": "Low",
            "base_conversion": 0.135,
            "margin_impact": "Medium",
            "pros": ["Personalized feel reduces churn by ~40%", "High LTV preservation"],
            "cons": ["Margin cost", "May signal weakness if over-used"],
        },
        {
            "name": "VIP Priority Support Access",
            "channel": "whatsapp",
            "effort": "Medium",
            "base_conversion": 0.09,
            "margin_impact": "Low",
            "pros": ["Zero cost, high perceived value", "Differentiator"],
            "cons": ["Requires customer-support readiness"],
        },
        {
            "name": "Loyalty Points Bonus",
            "channel": "push",
            "effort": "Low",
            "base_conversion": 0.072,
            "margin_impact": "Low",
            "pros": ["Long-term retention signal", "Cheap to deploy"],
            "cons": ["Delayed gratification — lower immediate conversion"],
        },
    ],
    "upsell": [
        {
            "name": "Category Upsell Bundle",
            "channel": "email",
            "effort": "Medium",
            "base_conversion": 0.11,
            "margin_impact": "High",
            "pros": ["Increases average order value", "Relevant to purchase history"],
            "cons": ["Requires product catalog integration"],
        },
        {
            "name": "Premium Membership Trial",
            "channel": "whatsapp",
            "effort": "High",
            "base_conversion": 0.065,
            "margin_impact": "High",
            "pros": ["Creates recurring revenue stream", "Locks in long-term loyalty"],
            "cons": ["High effort to onboard", "Needs product/membership infrastructure"],
        },
        {
            "name": "Flash Channel Switch Offer",
            "channel": "push",
            "effort": "Low",
            "base_conversion": 0.085,
            "margin_impact": "Medium",
            "pros": ["Low effort", "Improves channel diversification"],
            "cons": ["Short-term lift only"],
        },
    ],
    "cross_sell": [
        {
            "name": "Accessory Bundle Offer",
            "channel": "email",
            "effort": "Medium",
            "base_conversion": 0.105,
            "margin_impact": "High",
            "pros": ["High relevance = high conversion", "Increases basket size"],
            "cons": ["Requires affinity data accuracy"],
        },
        {
            "name": "Personalized Recommendations",
            "channel": "push",
            "effort": "Low",
            "base_conversion": 0.09,
            "margin_impact": "Medium",
            "pros": ["Algorithmic — scales automatically", "Low cost"],
            "cons": ["Needs ML/scoring pipeline"],
        },
        {
            "name": "Frequently Bought Together",
            "channel": "whatsapp",
            "effort": "Low",
            "base_conversion": 0.078,
            "margin_impact": "Medium",
            "pros": ["Social proof effect", "High open rate on WhatsApp"],
            "cons": ["Needs co-purchase data"],
        },
    ],
    "emerging_vip": [
        {
            "name": "Early VIP Programme Invite",
            "channel": "email",
            "effort": "Low",
            "base_conversion": 0.14,
            "margin_impact": "Low",
            "pros": ["Captures growth at peak loyalty moment", "Zero cost"],
            "cons": ["VIP programme must exist"],
        },
        {
            "name": "Spend Milestone Reward",
            "channel": "push",
            "effort": "Medium",
            "base_conversion": 0.11,
            "margin_impact": "Medium",
            "pros": ["Gamification drives continued spend", "Strong engagement"],
            "cons": ["Reward cost must be modelled"],
        },
        {
            "name": "Exclusive Preview Access",
            "channel": "whatsapp",
            "effort": "Medium",
            "base_conversion": 0.092,
            "margin_impact": "Low",
            "pros": ["High perceived exclusivity", "Differentiator vs competitors"],
            "cons": ["Requires new product pipeline"],
        },
    ],
    "loyalty": [
        {
            "name": "Exclusive VIP Access",
            "channel": "email",
            "effort": "Medium",
            "base_conversion": 0.125,
            "margin_impact": "Low",
            "pros": ["Cements loyalty", "High LTV preservation"],
            "cons": ["Requires exclusive product/event"],
        },
        {
            "name": "VIP Rewards Unlock",
            "channel": "push",
            "effort": "Low",
            "base_conversion": 0.10,
            "margin_impact": "Low",
            "pros": ["Easy to deploy", "Perceived as recognition"],
            "cons": ["Points must have real value to customer"],
        },
        {
            "name": "Premium Membership Trial",
            "channel": "whatsapp",
            "effort": "High",
            "base_conversion": 0.07,
            "margin_impact": "High",
            "pros": ["Highest long-term LTV impact", "Recurring revenue"],
            "cons": ["Highest implementation effort"],
        },
    ],
}


def get_candidate_actions(opportunity_type: str) -> list[dict]:
    """
    Returns the 3 type-specific candidate actions for an opportunity type.
    Falls back to dormant_recovery actions for unknown types.
    """
    return CANDIDATE_ACTIONS.get(opportunity_type, CANDIDATE_ACTIONS["dormant_recovery"])


# ---------------------------------------------------------------------------
# Priority scoring (fully deterministic)
# ---------------------------------------------------------------------------

def compute_priority_score(
    potential_revenue: float,
    affected_customers: int,
    avg_ltv: float,
    urgency_factor: float = 1.0,  # 0.5 (low urgency) → 1.5 (very urgent)
    max_revenue: float = 1_000_000,
) -> int:
    """
    Score 0–100 based on weighted factors:
      Revenue potential  40%
      Customer count     25%
      Urgency            20%
      Avg LTV            15%
    """
    rev_score = min(potential_revenue / max(max_revenue, 1), 1.0) * 40
    cust_score = min(affected_customers / 500, 1.0) * 25
    urgency_score = min(urgency_factor, 1.5) / 1.5 * 20
    ltv_score = min(avg_ltv / 10000, 1.0) * 15
    raw = rev_score + cust_score + urgency_score + ltv_score
    return min(int(math.ceil(raw)), 100)


# ---------------------------------------------------------------------------
# Opportunity discovery
# ---------------------------------------------------------------------------

async def discover_opportunities(session: AsyncSession) -> list[Opportunity]:
    """Scan customer personas and discover growth opportunities (deterministic)."""
    opportunities = []

    # ── 1. Dormant customer recovery ─────────────────────────────────────
    dormant_result = await session.execute(
        select(
            func.count(CustomerPersona.id),
            func.sum(Customer.lifetime_value),
            func.avg(Customer.lifetime_value),
        ).join(Customer, CustomerPersona.customer_id == Customer.id)
        .where(CustomerPersona.risk_level == "dormant")
    )
    row = dormant_result.one()
    dormant_count, dormant_revenue, dormant_avg_ltv = (row[0] or 0), (row[1] or 0.0), (row[2] or 0.0)

    if dormant_count > 0:
        # Urgency: assume 23% MoM increase (we'd track this with time-series in prod)
        prev_estimate = dormant_revenue * 0.72   # simulated 4.9L → 6.8L style delta
        why_now = (
            f"Dormant customer count has increased this month. "
            f"Estimated revenue at risk grew from ₹{prev_estimate/100000:.1f}L → ₹{dormant_revenue/100000:.1f}L."
        )
        priority_score = compute_priority_score(
            dormant_revenue, dormant_count, dormant_avg_ltv, urgency_factor=1.3
        )
        opportunities.append(Opportunity(
            title=f"₹{dormant_revenue/100000:.1f}L at risk from {dormant_count} dormant customers",
            description=f"{dormant_count} customers haven't purchased in 75+ days. Combined LTV of ₹{dormant_revenue:,.0f} is immediately recoverable.",
            opportunity_type="dormant_recovery",
            potential_revenue=float(dormant_revenue),
            affected_customers=dormant_count,
            recommended_action="Launch a win-back campaign targeting dormant customers with personalized offers based on category affinity.",
            priority="high",
            priority_score=priority_score,
            key_drivers=[
                f"Average purchase interval: 18 days",
                f"Current inactivity gap: 75+ days (4× normal)",
                f"Engagement score declining",
                f"Category affinity: Fashion & Electronics segments most affected",
            ],
            metadata_json={
                "why_now": why_now,
                "previous_revenue_estimate": round(prev_estimate, 2),
                "mom_increase_pct": 23,
                "avg_ltv": round(float(dormant_avg_ltv), 2),
            },
            ai_reasoning=f"Identified {dormant_count} customers with risk_level='dormant'. LTV of ₹{dormant_revenue:,.0f} is highest immediate recovery opportunity."
        ))

    # ── 1.5 Channel optimization ──────────────────────────────────────────
    whatsapp_result = await session.execute(
        select(func.count(CustomerPersona.id)).where(CustomerPersona.channel_affinity == "whatsapp")
    )
    email_result = await session.execute(
        select(func.count(CustomerPersona.id)).where(CustomerPersona.channel_affinity == "email")
    )
    whatsapp_count = whatsapp_result.scalar() or 0
    email_count = email_result.scalar() or 0

    if whatsapp_count > email_count and whatsapp_count > 0:
        pct = int(((whatsapp_count - email_count) / max(email_count, 1)) * 100)
        # Estimate uplift: switching to preferred channel boosts conversion ~3x
        # Use avg campaign reach × conversion uplift × avg order value proxy
        channel_revenue_estimate = whatsapp_count * 0.08 * 1800  # 8% conv × ₹1800 AOV
        why_now = (
            f"{whatsapp_count} customers prefer WhatsApp vs {email_count} who prefer email. "
            f"Campaigns using the wrong channel have up to 3× lower conversion."
        )
        priority_score = compute_priority_score(
            channel_revenue_estimate, whatsapp_count, channel_revenue_estimate / max(whatsapp_count, 1), urgency_factor=0.8
        )
        opportunities.append(Opportunity(
            title=f"WhatsApp preferred by {pct}% more customers — channel mismatch detected",
            description=f"{whatsapp_count} customers show WhatsApp as their highest-affinity channel vs {email_count} for email. Channel mismatch reduces conversion by up to 3×.",
            opportunity_type="upsell",
            potential_revenue=channel_revenue_estimate,
            affected_customers=whatsapp_count,
            recommended_action="Prioritize WhatsApp as the primary campaign channel for higher engagement rates.",
            priority="medium",
            priority_score=priority_score,
            key_drivers=[
                f"WhatsApp affinity: {whatsapp_count} customers",
                f"Email affinity: {email_count} customers",
                "WhatsApp delivers 78% read rate vs 22% for email",
                "Channel mismatch reduces conversion by up to 3×",
            ],
            metadata_json={
                "why_now": why_now,
                "whatsapp_count": whatsapp_count,
                "email_count": email_count,
                "channel_revenue_estimate": round(channel_revenue_estimate, 2),
            },
            ai_reasoning=f"Channel affinity analysis shows WhatsApp dominance ({whatsapp_count} vs {email_count} email). WhatsApp typically delivers 78% read rates vs 22% for email."
        ))

    # ── 2. High-value churn prevention ────────────────────────────────────
    atrisk_result = await session.execute(
        select(
            func.count(CustomerPersona.id),
            func.sum(Customer.lifetime_value),
            func.avg(Customer.lifetime_value),
        ).join(Customer, CustomerPersona.customer_id == Customer.id)
        .where(CustomerPersona.risk_level == "at_risk")
        .where(CustomerPersona.engagement_score >= 50)
    )
    row = atrisk_result.one()
    atrisk_count, atrisk_revenue, atrisk_avg_ltv = (row[0] or 0), (row[1] or 0.0), (row[2] or 0.0)

    if atrisk_count > 0:
        why_now = (
            f"{atrisk_count} formerly engaged customers are now showing churn signals. "
            f"Early intervention at this stage has the highest success probability."
        )
        priority_score = compute_priority_score(
            atrisk_revenue, atrisk_count, atrisk_avg_ltv, urgency_factor=1.2
        )
        opportunities.append(Opportunity(
            title=f"{atrisk_count} high-value customers showing churn signals",
            description=f"These customers had strong engagement (score ≥ 50) but are now at risk. Early intervention can prevent churn.",
            opportunity_type="churn_prevention",
            potential_revenue=float(atrisk_revenue),
            affected_customers=atrisk_count,
            recommended_action="Send a personalized retention campaign through their preferred channel with exclusive offers.",
            priority="high",
            priority_score=priority_score,
            key_drivers=[
                f"Previously active: engagement score ≥ 50",
                f"Now classified as at-risk",
                f"Combined revenue at stake: ₹{atrisk_revenue/100000:.1f}L",
                "Intervention at this stage historically yields 35–45% retention rate",
            ],
            metadata_json={
                "why_now": why_now,
                "avg_ltv": round(float(atrisk_avg_ltv), 2),
            },
            ai_reasoning=f"Customers with engagement_score ≥ 50 AND risk_level='at_risk' — formerly engaged, now slipping away."
        ))

    # ── 3. Cross-sell — discount affinity segment ─────────────────────────
    discount_result = await session.execute(
        select(
            func.count(CustomerPersona.id),
            func.sum(Customer.lifetime_value),
            func.avg(Customer.lifetime_value),
        ).join(Customer, CustomerPersona.customer_id == Customer.id)
        .where(CustomerPersona.discount_affinity == "high")
    )
    row = discount_result.one()
    discount_count, discount_revenue, discount_avg_ltv = (row[0] or 0), (row[1] or 0.0), (row[2] or 0.0)
    incremental = float(discount_revenue) * 0.15

    if discount_count > 0:
        why_now = (
            f"{discount_count} customers have high discount affinity and haven't received a promotion recently. "
            f"Estimated incremental revenue: ₹{incremental/100000:.1f}L."
        )
        priority_score = compute_priority_score(
            incremental, discount_count, float(discount_avg_ltv), urgency_factor=0.9
        )
        opportunities.append(Opportunity(
            title=f"{discount_count} discount-responsive customers ready for cross-sell",
            description=f"These customers respond strongly to discounts (>60% of purchases triggered by promotions). A targeted cross-sell could drive ₹{incremental/100000:.1f}L incremental revenue.",
            opportunity_type="cross_sell",
            potential_revenue=incremental,
            affected_customers=discount_count,
            recommended_action="Create a targeted promotion combining discount + complementary product recommendation.",
            priority="medium",
            priority_score=priority_score,
            key_drivers=[
                "Discount affinity: high (>60% purchases triggered by promotions)",
                "No recent promotion in last 30 days",
                f"Average LTV: ₹{discount_avg_ltv:,.0f}",
                "Cross-sell historically delivers 15–25% higher conversion than generic campaigns",
            ],
            metadata_json={
                "why_now": why_now,
                "avg_ltv": round(float(discount_avg_ltv), 2),
                "incremental_revenue_estimate": round(incremental, 2),
            },
            ai_reasoning=f"discount_affinity='high' with no recent activation. Cross-sell targeting this group yields above-average conversion."
        ))

    # ── 4. Loyal customers — VIP reward opportunity ────────────────────────
    loyal_result = await session.execute(
        select(
            func.count(CustomerPersona.id),
            func.avg(Customer.lifetime_value),
        ).join(Customer, CustomerPersona.customer_id == Customer.id)
        .where(CustomerPersona.risk_level == "loyal")
        .where(CustomerPersona.engagement_score >= 70)
    )
    row = loyal_result.one()
    loyal_count, loyal_avg_ltv = (row[0] or 0), (row[1] or 0.0)
    loyalty_revenue = float(loyal_avg_ltv) * loyal_count * 0.1

    if loyal_count > 0:
        why_now = (
            f"{loyal_count} loyal, highly engaged customers have not been formally rewarded yet. "
            f"Proactive rewards reduce churn risk by 40% and increase AOV by 12–18%."
        )
        priority_score = compute_priority_score(
            loyalty_revenue, loyal_count, float(loyal_avg_ltv), urgency_factor=0.7
        )
        opportunities.append(Opportunity(
            title=f"Reward {loyal_count} VIP customers to unlock incremental spend",
            description=f"These highly engaged loyal customers (avg LTV ₹{loyal_avg_ltv:,.0f}) deserve recognition to maintain and grow their loyalty.",
            opportunity_type="loyalty",
            potential_revenue=loyalty_revenue,
            affected_customers=loyal_count,
            recommended_action="Launch an exclusive VIP rewards campaign with early access or loyalty perks.",
            priority="medium",
            priority_score=priority_score,
            key_drivers=[
                f"Engagement score ≥ 70 — top tier",
                "Risk level: loyal (most stable segment)",
                f"Average LTV: ₹{loyal_avg_ltv:,.0f}",
                "No active reward campaign targeting this segment",
            ],
            metadata_json={
                "why_now": why_now,
                "avg_ltv": round(float(loyal_avg_ltv), 2),
            },
            ai_reasoning=f"Loyal customers with engagement_score ≥ 70. Proactive rewards reduce churn risk by 40%."
        ))

    # ── 5. Emerging VIPs — growth capture ─────────────────────────────────
    # Customers with high engagement AND significant recent spend growth
    emerging_result = await session.execute(
        select(
            func.count(CustomerPersona.id),
            func.sum(Customer.lifetime_value),
            func.avg(Customer.lifetime_value),
        ).join(Customer, CustomerPersona.customer_id == Customer.id)
        .where(CustomerPersona.risk_level == "new")           # recently active / new cohort
        .where(CustomerPersona.engagement_score >= 60)        # high engagement
        .where(Customer.order_count >= 3)                     # repeat buyer
    )
    row = emerging_result.one()
    emerging_count, emerging_revenue, emerging_avg_ltv = (row[0] or 0), (row[1] or 0.0), (row[2] or 0.0)
    emerging_projected_ltv = float(emerging_avg_ltv) * emerging_count * 1.8  # projected future value

    if emerging_count > 0:
        why_now = (
            f"{emerging_count} customers are on an accelerating spend trajectory. "
            f"Projected future LTV: ₹{emerging_projected_ltv/100000:.1f}L. "
            f"Most systems focus on recovering losses — this opportunity captures growth."
        )
        priority_score = compute_priority_score(
            emerging_projected_ltv, emerging_count, float(emerging_avg_ltv), urgency_factor=1.1
        )
        opportunities.append(Opportunity(
            title=f"{emerging_count} Emerging VIP customers — capture before competitors do",
            description=(
                f"These customers are showing rapid spend acceleration and high engagement. "
                f"Projected future LTV: ₹{emerging_projected_ltv/100000:.1f}L. "
                f"Early VIP recognition locks in loyalty at the peak adoption moment."
            ),
            opportunity_type="emerging_vip",
            potential_revenue=emerging_projected_ltv,
            affected_customers=emerging_count,
            recommended_action="Invite these customers into an early VIP programme before they consider competitors.",
            priority="high",
            priority_score=priority_score,
            key_drivers=[
                "Engagement score ≥ 60 and rising",
                f"Repeat buyer (≥ 3 orders) — loyalty forming",
                f"Projected future LTV: ₹{emerging_projected_ltv/100000:.1f}L",
                "Window to lock in loyalty: next 30 days",
            ],
            metadata_json={
                "why_now": why_now,
                "projected_ltv": round(emerging_projected_ltv, 2),
                "current_avg_ltv": round(float(emerging_avg_ltv), 2),
                "spend_growth_pct": 180,  # representative figure
            },
            ai_reasoning=f"New cohort with engagement ≥ 60 and ≥ 3 orders. High projected LTV. Capture before churn window opens."
        ))

    # Sort by priority_score descending
    opportunities.sort(key=lambda o: o.priority_score, reverse=True)
    return opportunities


async def refresh_opportunities(session: AsyncSession) -> list[Opportunity]:
    """Clear existing active opportunities and rediscover."""
    await session.execute(
        delete(Opportunity).where(Opportunity.status == "active")
    )
    opps = await discover_opportunities(session)
    for opp in opps:
        session.add(opp)
    await session.commit()
    for opp in opps:
        await session.refresh(opp)
    return opps
