"""
Database Seeder — Populates ReachIQ with realistic data.
~100 customers, personas, 7 segments, 10 campaigns, decision logs, activities, opportunities.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone
from app.core.database import engine, async_session, Base
from app.models.customer import Customer
from app.models.persona import CustomerPersona
from app.models.segment import Segment, SegmentMembership
from app.models.campaign import Campaign
from app.models.decision_log import DecisionLog
from app.models.activity import Activity
from app.models.opportunity import Opportunity
from app.services.persona_engine import compute_persona_for_customer

# Indian names dataset
FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
    "Shaurya", "Atharv", "Advik", "Dhruv", "Kabir", "Ritvik", "Aarush", "Kian", "Darsh", "Viraj",
    "Ananya", "Diya", "Myra", "Sara", "Aadhya", "Isha", "Kiara", "Riya", "Prisha", "Anvi",
    "Anika", "Navya", "Saanvi", "Pari", "Nisha", "Tara", "Meera", "Pooja", "Sneha", "Kavya",
    "Rahul", "Priya", "Amit", "Neha", "Rohit", "Shreya", "Vikram", "Anjali", "Manish", "Swati",
    "Rajesh", "Deepika", "Suresh", "Komal", "Arun", "Divya", "Nikhil", "Pallavi", "Gaurav", "Nidhi",
    "Sanjay", "Ritika", "Akash", "Megha", "Varun", "Simran", "Mohit", "Kriti", "Harish", "Tanvi",
    "Kunal", "Bhavya", "Tarun", "Madhuri", "Rakesh", "Sonali", "Karthik", "Lavanya", "Prasad", "Shalini",
    "Sameer", "Trisha", "Ashish", "Nandini", "Yash", "Chaitra", "Dev", "Vidya", "Pranav", "Aarti",
    "Siddharth", "Rasika", "Abhishek", "Jyoti", "Harsh", "Sakshi", "Rohan", "Bhoomika", "Tushar", "Manya",
]

LAST_NAMES = [
    "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Nair", "Iyer", "Joshi", "Mehta",
    "Verma", "Chopra", "Malhotra", "Shah", "Rao", "Desai", "Agarwal", "Kapoor", "Bhat", "Pillai",
    "Mishra", "Chauhan", "Pandey", "Saxena", "Srivastava", "Banerjee", "Mukherjee", "Ghosh", "Das", "Bose",
]

DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"]


def random_phone():
    return f"+91{random.randint(70000, 99999)}{random.randint(10000, 99999)}"


def random_date(start_days_ago: int, end_days_ago: int = 0):
    days = random.randint(end_days_ago, start_days_ago)
    return datetime.now(timezone.utc) - timedelta(days=days)


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        print("🌱 Seeding ReachIQ database...")

        # ── CUSTOMERS ──────────────────────────────────────
        customers = []
        used_emails = set()
        for i in range(250):
            first = FIRST_NAMES[i % len(FIRST_NAMES)]
            last = random.choice(LAST_NAMES)
            name = f"{first} {last}"

            email_base = f"{first.lower()}.{last.lower()}"
            email = f"{email_base}@{random.choice(DOMAINS)}"
            while email in used_emails:
                email = f"{email_base}{random.randint(1,99)}@{random.choice(DOMAINS)}"
            used_emails.add(email)

            # Generate varied purchase patterns
            pattern = random.choice(["vip", "active", "moderate", "light", "dormant", "new", "churned", "discount"])

            if pattern == "vip":
                order_count = random.randint(15, 40)
                total_spend = random.uniform(30000, 150000)
                last_purchase = random_date(15, 0)
                created = random_date(365, 180)
            elif pattern == "active":
                order_count = random.randint(8, 18)
                total_spend = random.uniform(10000, 50000)
                last_purchase = random_date(30, 0)
                created = random_date(300, 120)
            elif pattern == "moderate":
                order_count = random.randint(4, 10)
                total_spend = random.uniform(5000, 25000)
                last_purchase = random_date(60, 15)
                created = random_date(365, 90)
            elif pattern == "light":
                order_count = random.randint(1, 4)
                total_spend = random.uniform(1000, 8000)
                last_purchase = random_date(90, 30)
                created = random_date(300, 60)
            elif pattern == "dormant":
                order_count = random.randint(3, 12)
                total_spend = random.uniform(5000, 40000)
                last_purchase = random_date(200, 80)
                created = random_date(500, 200)
            elif pattern == "new":
                order_count = random.randint(1, 3)
                total_spend = random.uniform(500, 5000)
                last_purchase = random_date(20, 0)
                created = random_date(30, 0)
            elif pattern == "discount":
                # High order count of low-value items (AOV < 500)
                order_count = random.randint(12, 28)
                # Keep total spend low enough relative to order count so AOV < 500
                total_spend = order_count * random.uniform(150, 450)
                last_purchase = random_date(45, 5)
                created = random_date(300, 60)
            else:  # churned
                order_count = random.randint(2, 8)
                total_spend = random.uniform(3000, 20000)
                last_purchase = random_date(400, 200)
                created = random_date(600, 300)

            aov = round(total_spend / max(order_count, 1), 2)
            ltv = round(total_spend * random.uniform(1.2, 2.0), 2)

            customer = Customer(
                name=name,
                email=email,
                phone=random_phone(),
                total_spend=round(total_spend, 2),
                average_order_value=aov,
                order_count=order_count,
                last_purchase_date=last_purchase,
                lifetime_value=ltv,
                created_at=created,
                updated_at=datetime.now(timezone.utc),
            )
            session.add(customer)
            customers.append(customer)

        await session.flush()
        print(f"  ✓ Created {len(customers)} customers")

        # ── PERSONAS ───────────────────────────────────────
        for customer in customers:
            await compute_persona_for_customer(customer, session)
        await session.flush()
        print(f"  ✓ Computed {len(customers)} personas")

        # Re-fetch customers with personas pre-loaded to prevent async lazy-loading issues
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        stmt = select(Customer).options(selectinload(Customer.persona))
        customers = list((await session.execute(stmt)).scalars().all())


        # ── SEGMENTS ───────────────────────────────────────
        segment_defs = [
            ("VIP Customers", "High-value, highly engaged customers with strong loyalty", "vip", lambda p: p.engagement_score >= 75 and p.risk_level == "loyal"),
            ("Dormant Customers", "Customers who haven't purchased in 75+ days", "dormant", lambda p: p.risk_level == "dormant"),
            ("Frequent Buyers", "Customers with 10+ orders", "frequent", lambda p: p.engagement_score >= 60),
            ("New Customers", "Recently acquired customers within 30 days", "new", lambda p: p.risk_level in ("loyal", "stable") and p.engagement_score < 40),
            ("At Risk Customers", "Previously active customers showing declining engagement", "at_risk", lambda p: p.risk_level == "at_risk"),
            ("High Value", "Top 20% by lifetime value", "high_value", lambda p: p.engagement_score >= 70),
            ("Discount Driven", "Customers with high discount affinity", "discount", lambda p: p.discount_affinity == "high"),
        ]

        segments = []
        for seg_name, seg_desc, seg_key, persona_filter in segment_defs:
            # Find matching customers
            matching = []
            for c in customers:
                if c.persona and persona_filter(c.persona):
                    matching.append(c)

            # Limit to avoid overlap issues
            if len(matching) == 0:
                matching = random.sample(customers, min(10, len(customers)))

            revenue = sum(c.lifetime_value for c in matching)
            engagement = sum(c.persona.engagement_score for c in matching if c.persona) / max(len(matching), 1)

            segment = Segment(
                name=seg_name,
                description=seg_desc,
                segment_type="prebuilt",
                customer_count=len(matching),
                revenue_contribution=round(revenue, 2),
                engagement_rate=round(engagement, 1),
                growth_trend=round(random.uniform(-5, 15), 1),
                rule_type=seg_key,
            )
            session.add(segment)
            await session.flush()

            for c in matching:
                session.add(SegmentMembership(segment_id=segment.id, customer_id=c.id))

            segments.append(segment)

        await session.flush()
        print(f"  ✓ Created {len(segments)} segments")

        # ── CAMPAIGNS ──────────────────────────────────────
        campaign_data = [
            ("Diwali Win-Back Campaign", "Bring back dormant customers for Diwali sale", "whatsapp", "completed", 0),
            ("VIP Exclusive Access", "Reward VIP customers with early access to new collection", "whatsapp", "completed", 1),
            ("Weekend Flash Sale", "Increase weekend sales with flash discount", "sms", "completed", 6),
            ("New Arrivals Alert", "Promote new spring collection to engaged customers", "email", "completed", 2),
            ("Cart Abandonment Recovery", "Re-engage customers who abandoned carts", "whatsapp", "completed", 5),
            ("Loyalty Milestone Reward", "Congratulate customers on purchase milestones", "rcs", "completed", 0),
            ("Monsoon Sale Blast", "Monsoon season clearance sale", "sms", "completed", 6),
            ("Birthday Special Offers", "Personalized birthday discount campaign", "email", "completed", 3),
            ("Re-engagement Campaign", "Win back at-risk customers before they churn", "whatsapp", "draft", 4),
            ("Summer Collection Launch", "Launch summer collection to fashion-interested segment", "rcs", "draft", 2),
        ]

        campaigns = []
        for name, goal, channel, status, seg_idx in campaign_data:
            seg = segments[seg_idx] if seg_idx < len(segments) else segments[0]
            reach = seg.customer_count

            from app.services.channel_simulator import CHANNEL_RATES
            rates = CHANNEL_RATES.get(channel, CHANNEL_RATES["whatsapp"])

            predicted_opens = int(reach * rates["read"])
            predicted_clicks = int(reach * rates["click"])
            predicted_conversions = int(reach * rates["convert"])
            predicted_revenue = round(predicted_conversions * random.uniform(1000, 4000), 2)

            campaign = Campaign(
                name=name,
                goal=goal,
                segment_id=seg.id,
                channel=channel,
                status=status,
                message_headline=f"{'🎁 ' if 'reward' in goal.lower() or 'special' in goal.lower() else '🔥 '}{name}",
                message_body=f"Hi {{{{name}}}}, {goal.lower()}. We've curated something special for you based on your love for {{{{category}}}}!",
                message_cta="Shop Now →",
                ai_strategy={"type": "automated", "confidence": round(random.uniform(0.7, 0.95), 2)},
                predicted_reach=reach,
                predicted_opens=predicted_opens,
                predicted_clicks=predicted_clicks,
                predicted_conversions=predicted_conversions,
                predicted_revenue=predicted_revenue,
                created_at=random_date(60, 5),
            )

            if status == "completed":
                # Simulate actual metrics with some variance
                actual_sent = reach
                actual_delivered = int(reach * rates["delivery"] * random.uniform(0.9, 1.0))
                actual_read = int(actual_delivered * rates["read"] * random.uniform(0.85, 1.15))
                actual_clicked = int(actual_read * rates["click"] * random.uniform(0.8, 1.2))
                actual_converted = int(actual_clicked * rates["convert"] * random.uniform(0.7, 1.3))
                actual_failed = reach - actual_delivered
                actual_revenue = round(actual_converted * random.uniform(800, 4500), 2)

                campaign.actual_sent = actual_sent
                campaign.actual_delivered = actual_delivered
                campaign.actual_read = actual_read
                campaign.actual_clicked = actual_clicked
                campaign.actual_converted = actual_converted
                campaign.actual_failed = actual_failed
                campaign.actual_revenue = actual_revenue
                base_time = campaign.created_at or datetime.now(timezone.utc)
                campaign.launched_at = base_time + timedelta(hours=random.randint(1, 24))
                campaign.completed_at = campaign.launched_at + timedelta(hours=random.randint(2, 48))

            session.add(campaign)
            campaigns.append(campaign)

        await session.flush()
        print(f"  ✓ Created {len(campaigns)} campaigns")

        # ── DECISION LOGS ──────────────────────────────────
        decision_count = 0
        for campaign in campaigns[:8]:  # Only for completed campaigns
            sample_customers = random.sample(customers, min(8, len(customers)))
            for customer in sample_customers:
                if customer.persona:
                    ch_scores = customer.persona.channel_scores
                    best_ch = customer.persona.channel_affinity
                    best_score = ch_scores.get(best_ch, 0.5) if ch_scores else 0.5

                    alternatives = []
                    for ch, score in (ch_scores or {}).items():
                        if ch != campaign.channel:
                            alternatives.append({
                                "option": ch.title(),
                                "score": score,
                                "reason_rejected": f"Affinity score {score:.2f} lower than {best_score:.2f}"
                            })

                    session.add(DecisionLog(
                        campaign_id=campaign.id,
                        customer_id=customer.id,
                        decision_type="channel_selection",
                        decision=campaign.channel.title(),
                        reasoning=f"{campaign.channel.title()} selected for {customer.name}. "
                                  f"Channel affinity: {best_score:.2f}. "
                                  f"Engagement score: {customer.persona.engagement_score}/100. "
                                  f"Risk: {customer.persona.risk_level}. "
                                  f"Discount affinity: {customer.persona.discount_affinity}. "
                                  f"Category: {customer.persona.primary_category}.",
                        confidence_score=best_score,
                        source="persona_engine",
                        persona_snapshot={
                            "engagement_score": customer.persona.engagement_score,
                            "risk_level": customer.persona.risk_level,
                            "channel_affinity": customer.persona.channel_affinity,
                            "discount_affinity": customer.persona.discount_affinity,
                            "primary_category": customer.persona.primary_category,
                        },
                        alternatives_considered=alternatives,
                    ))
                    decision_count += 1

        await session.flush()
        print(f"  ✓ Created {decision_count} decision logs")

        # ── ACTIVITIES ─────────────────────────────────────
        activity_count = 0
        for campaign in campaigns[:8]:
            events = [
                ("campaign_queued", "info", f"Campaign '{campaign.name}' queued for processing.", campaign.predicted_reach),
                ("processing_started", "info", f"Campaign '{campaign.name}' processing started.", campaign.predicted_reach),
                ("messages_sent", "info", f"Sending {campaign.actual_sent} messages via {campaign.channel.title()}.", campaign.actual_sent),
                ("delivery_callback", "success", f"Delivery complete: {campaign.actual_delivered}/{campaign.actual_sent} delivered.", campaign.actual_delivered),
                ("read_event", "success", f"{campaign.actual_read} messages read ({int(campaign.actual_read/max(campaign.actual_delivered,1)*100)}% read rate).", campaign.actual_read),
                ("click_event", "success", f"{campaign.actual_clicked} clicks recorded.", campaign.actual_clicked),
                ("purchase_event", "success", f"{campaign.actual_converted} conversions, ₹{campaign.actual_revenue:,.0f} revenue.", campaign.actual_converted),
                ("campaign_completed", "success", f"Campaign '{campaign.name}' completed successfully.", campaign.actual_sent),
            ]

            if campaign.actual_failed > 0:
                events.insert(4, ("failure_recorded", "warning", f"{campaign.actual_failed} messages failed to deliver.", campaign.actual_failed))

            base_time = campaign.launched_at or campaign.created_at
            for j, (event_type, status, desc, count) in enumerate(events):
                session.add(Activity(
                    campaign_id=campaign.id,
                    event_type=event_type,
                    channel=campaign.channel,
                    status=status,
                    description=desc,
                    affected_count=count,
                    created_at=base_time + timedelta(minutes=j * random.randint(5, 30)),
                ))
                activity_count += 1

        await session.flush()
        print(f"  ✓ Created {activity_count} activities")

        # ── OPPORTUNITIES ──────────────────────────────────
        from app.services.opportunity_engine import refresh_opportunities
        opps = await refresh_opportunities(session)
        print(f"  ✓ Discovered {len(opps)} opportunities")

        await session.commit()
        print("\n✅ ReachIQ database seeded successfully!")
        print(f"   Customers: {len(customers)}")
        print(f"   Personas:  {len(customers)}")
        print(f"   Segments:  {len(segments)}")
        print(f"   Campaigns: {len(campaigns)}")
        print(f"   Decisions: {decision_count}")
        print(f"   Activities: {activity_count}")
        print(f"   Opportunities: {len(opps)}")


if __name__ == "__main__":
    asyncio.run(seed())
