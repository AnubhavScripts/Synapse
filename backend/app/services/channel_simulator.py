"""
Channel Simulator — Asynchronous campaign delivery simulation.
Simulates message delivery lifecycle with realistic timing and probabilities.
Each callback updates campaign counters and creates activity/decision log entries.
"""

import asyncio
import random
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import async_session
from app.models.campaign import Campaign
from app.models.activity import Activity
from app.models.decision_log import DecisionLog
from app.models.persona import CustomerPersona
from app.models.segment import SegmentMembership
from app.models.customer import Customer


# Channel-specific probabilities
CHANNEL_RATES = {
    "whatsapp": {"delivery": 0.97, "read": 0.78, "click": 0.28, "convert": 0.12},
    "sms": {"delivery": 0.95, "read": 0.45, "click": 0.12, "convert": 0.05},
    "email": {"delivery": 0.92, "read": 0.22, "click": 0.08, "convert": 0.03},
    "rcs": {"delivery": 0.90, "read": 0.65, "click": 0.22, "convert": 0.09},
}


async def simulate_campaign(campaign_id: uuid.UUID):
    """
    Run campaign simulation in the background.
    Uses its own database session since this runs asynchronously.
    """
    async with async_session() as session:
        try:
            # Get campaign
            campaign = await session.get(Campaign, campaign_id)
            if not campaign:
                return

            # Update status to processing
            campaign.status = "processing"
            await session.commit()

            # Log activity
            session.add(Activity(
                campaign_id=campaign_id,
                event_type="processing_started",
                channel=campaign.channel,
                status="info",
                description=f"Campaign '{campaign.name}' processing started.",
                affected_count=campaign.predicted_reach,
            ))
            await session.commit()

            # Get audience members
            if campaign.segment_id:
                members_result = await session.execute(
                    select(SegmentMembership.customer_id)
                    .where(SegmentMembership.segment_id == campaign.segment_id)
                )
                customer_ids = [row[0] for row in members_result.all()]
            else:
                customer_ids = []

            if not customer_ids:
                # Use predicted reach as fallback count
                customer_ids = [uuid.uuid4() for _ in range(min(campaign.predicted_reach, 50))]

            total = len(customer_ids)
            rates = CHANNEL_RATES.get(campaign.channel, CHANNEL_RATES["whatsapp"])

            # Update status to sending
            campaign.status = "sending"
            await session.commit()

            session.add(Activity(
                campaign_id=campaign_id,
                event_type="messages_sent",
                channel=campaign.channel,
                status="info",
                description=f"Sending {total} messages via {campaign.channel.title()}.",
                affected_count=total,
            ))
            await session.commit()

            # Simulate each customer journey
            sent = 0
            delivered = 0
            read_count = 0
            clicked = 0
            converted = 0
            failed = 0
            total_revenue = 0.0

            for i, cid in enumerate(customer_ids):
                # Send (immediate)
                sent += 1

                # Small delay to simulate processing
                if i % 10 == 0:
                    await asyncio.sleep(0.1)

                # Delivered
                if random.random() < rates["delivery"]:
                    delivered += 1

                    # Read
                    if random.random() < rates["read"]:
                        read_count += 1

                        # Clicked
                        if random.random() < rates["click"]:
                            clicked += 1

                            # Converted (purchased)
                            if random.random() < rates["convert"]:
                                converted += 1
                                purchase_amount = round(random.uniform(500, 5000), 2)
                                total_revenue += purchase_amount
                                
                                # Update customer transactional history in DB
                                customer_result = await session.execute(
                                    select(Customer).where(Customer.id == cid)
                                )
                                customer = customer_result.scalar_one_or_none()
                                if customer:
                                    customer.order_count += 1
                                    customer.total_spend = round(customer.total_spend + purchase_amount, 2)
                                    customer.average_order_value = round(customer.total_spend / customer.order_count, 2)
                                    customer.last_purchase_date = datetime.now(timezone.utc)
                                    customer.lifetime_value = round(customer.total_spend * 1.5, 2)
                    else:
                        pass  # Not read
                else:
                    failed += 1


                # Update campaign counters periodically
                if i % 20 == 0 or i == total - 1:
                    campaign.actual_sent = sent
                    campaign.actual_delivered = delivered
                    campaign.actual_read = read_count
                    campaign.actual_clicked = clicked
                    campaign.actual_converted = converted
                    campaign.actual_failed = failed
                    campaign.actual_revenue = round(total_revenue, 2)
                    await session.commit()

            # Create delivery callback activity
            session.add(Activity(
                campaign_id=campaign_id,
                event_type="delivery_callback",
                channel=campaign.channel,
                status="success",
                description=f"Delivery complete: {delivered}/{sent} delivered, {failed} failed.",
                affected_count=delivered,
                metadata_json={"sent": sent, "delivered": delivered, "failed": failed},
            ))

            # Read events activity
            if read_count > 0:
                session.add(Activity(
                    campaign_id=campaign_id,
                    event_type="read_event",
                    channel=campaign.channel,
                    status="success",
                    description=f"{read_count} messages read ({int(read_count/max(delivered,1)*100)}% read rate).",
                    affected_count=read_count,
                ))

            # Click events
            if clicked > 0:
                session.add(Activity(
                    campaign_id=campaign_id,
                    event_type="click_event",
                    channel=campaign.channel,
                    status="success",
                    description=f"{clicked} clicks recorded ({int(clicked/max(read_count,1)*100)}% CTR).",
                    affected_count=clicked,
                ))

            # Purchase events
            if converted > 0:
                session.add(Activity(
                    campaign_id=campaign_id,
                    event_type="purchase_event",
                    channel=campaign.channel,
                    status="success",
                    description=f"{converted} conversions, ₹{total_revenue:,.0f} revenue generated.",
                    affected_count=converted,
                    metadata_json={"revenue": round(total_revenue, 2)},
                ))

            # Failed events
            if failed > 0:
                session.add(Activity(
                    campaign_id=campaign_id,
                    event_type="failure_recorded",
                    channel=campaign.channel,
                    status="warning",
                    description=f"{failed} messages failed to deliver.",
                    affected_count=failed,
                ))

            # Create decision log entries for sample customers
            sample_size = min(10, len(customer_ids))
            sample_ids = customer_ids[:sample_size]
            for cid in sample_ids:
                # Try to get persona data
                persona_result = await session.execute(
                    select(CustomerPersona).where(CustomerPersona.customer_id == cid)
                )
                persona = persona_result.scalar_one_or_none()

                customer_result = await session.execute(
                    select(Customer).where(Customer.id == cid)
                )
                customer = customer_result.scalar_one_or_none()

                if persona and customer:
                    ch_scores = persona.channel_scores or {}
                    best = persona.channel_affinity
                    best_score = ch_scores.get(best, 0.5)

                    # Create channel selection decision
                    alternatives = []
                    for ch, score in ch_scores.items():
                        if ch != campaign.channel:
                            alternatives.append({
                                "option": ch.title(),
                                "score": score,
                                "reason_rejected": f"Affinity score {score:.2f} vs {best_score:.2f} for {campaign.channel.title()}"
                            })

                    session.add(DecisionLog(
                        campaign_id=campaign_id,
                        customer_id=cid,
                        decision_type="channel_selection",
                        decision=campaign.channel.title(),
                        reasoning=f"{campaign.channel.title()} affinity score {best_score:.2f} (highest). "
                                  f"Engagement score: {persona.engagement_score}/100. "
                                  f"Risk level: {persona.risk_level}. "
                                  f"Customer {customer.name} responds best to {persona.preferred_time} messages on {best.title()}.",
                        confidence_score=best_score,
                        source="persona_engine",
                        persona_snapshot={
                            "engagement_score": persona.engagement_score,
                            "risk_level": persona.risk_level,
                            "channel_affinity": persona.channel_affinity,
                            "discount_affinity": persona.discount_affinity,
                            "primary_category": persona.primary_category,
                        },
                        alternatives_considered=alternatives,
                    ))

            # Complete campaign
            campaign.status = "completed"
            campaign.completed_at = datetime.now(timezone.utc)
            campaign.actual_sent = sent
            campaign.actual_delivered = delivered
            campaign.actual_read = read_count
            campaign.actual_clicked = clicked
            campaign.actual_converted = converted
            campaign.actual_failed = failed
            campaign.actual_revenue = round(total_revenue, 2)

            session.add(Activity(
                campaign_id=campaign_id,
                event_type="campaign_completed",
                channel=campaign.channel,
                status="success",
                description=f"Campaign '{campaign.name}' completed. {converted} conversions, ₹{total_revenue:,.0f} revenue.",
                affected_count=total,
                metadata_json={
                    "sent": sent, "delivered": delivered, "read": read_count,
                    "clicked": clicked, "converted": converted, "failed": failed,
                    "revenue": round(total_revenue, 2),
                },
            ))

            # Recompute personas for all targeted customers (learning loop)
            from app.services.persona_engine import compute_persona_for_customer
            for cid in customer_ids:
                customer_result = await session.execute(
                    select(Customer).where(Customer.id == cid)
                )
                customer = customer_result.scalar_one_or_none()
                if customer:
                    await compute_persona_for_customer(customer, session)

            await session.commit()


        except Exception as e:
            print(f"Channel simulator error: {e}")
            try:
                campaign = await session.get(Campaign, campaign_id)
                if campaign:
                    campaign.status = "failed"
                    session.add(Activity(
                        campaign_id=campaign_id,
                        event_type="failure_recorded",
                        status="error",
                        description=f"Campaign failed: {str(e)}",
                        affected_count=0,
                    ))
                    await session.commit()
            except Exception:
                pass
