"""
Callback Processor — Service Layer

Handles the business logic for processing a CallbackEvent after it has been
persisted to the database. Called from:
  - campaigns.py  (background task after 202 response)
  - retry_worker.py  (re-processing of failed events)

Key design decisions:
  1. Sequence guard: events with sequence_number <= message.sequence are silently ignored.
  2. campaign_messages updated on EVERY event — live UI updates (Fix #4).
  3. Campaign aggregate counters updated via SQL arithmetic (+1) — O(1), no full scan (Fix #4).
  4. Full metrics recompute + completion check only at terminal states (converted/failed/expired).
  5. Customer learning loop runs only on 'converted' events.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import async_session
from app.models.callback_event import CallbackEvent
from app.models.campaign_message import CampaignMessage
from app.models.campaign import Campaign
from app.models.activity import Activity
from app.models.customer import Customer

TERMINAL_STATES = frozenset({"converted", "failed", "expired"})


async def process_callback_event(event_id: uuid.UUID) -> None:
    """
    Main entry point for processing a persisted callback event.
    Opens its own DB session so it can be called from background tasks
    and the retry worker without sharing session state.
    """
    async with async_session() as db:
        await _process(event_id, db)


async def _process(event_id: uuid.UUID, db: AsyncSession) -> None:
    event = await db.get(CallbackEvent, event_id)
    if not event or event.status in ("processed", "permanently_failed"):
        return

    try:
        # Fetch campaign message with pessimistic locking to prevent race conditions on sequence updates (lost updates)
        res = await db.execute(
            select(CampaignMessage)
            .where(CampaignMessage.id == event.message_id)
            .with_for_update()
        )
        msg = res.scalar_one_or_none()
        if not msg:
            raise ValueError(f"CampaignMessage {event.message_id} not found")

        # ── Fix #5: Sequence Guard ────────────────────────────────────────────
        # Reject out-of-order or duplicate events before any DB mutation.
        # Network can reorder packets; this is the safety net.
        if event.sequence_number <= msg.sequence:
            event.status = "processed"
            event.processed_at = datetime.now(timezone.utc)
            await db.commit()
            return

        # ── Fix #4: Update campaign_messages on EVERY event ──────────────────
        # This ensures the message timeline in the UI reflects live progress.
        old_status = msg.status
        msg.status = event.event_type
        msg.sequence = event.sequence_number
        history = list(msg.history or [])
        history.append({
            "status": event.event_type,
            "at": datetime.now(timezone.utc).isoformat(),
            "revenue": event.details.get("revenue", 0.0),
            "error_message": event.details.get("error_message"),
        })
        msg.history = history
        db.add(msg)
        await db.flush()

        # ── Fix #4: SQL arithmetic increments — O(1), live campaign counters ──
        # No full SELECT across all messages required. Each event fires one
        # targeted UPDATE that increments a single counter column.
        campaign_id = msg.campaign_id
        _increment = _build_transition_increment(old_status, event.event_type, event.details)
        if _increment:
            await db.execute(
                update(Campaign)
                .where(Campaign.id == campaign_id)
                .values(**_increment)
            )

        # ── Terminal State Processing ─────────────────────────────────────────
        # Customer learning loop + activity log + completion check
        if event.event_type in TERMINAL_STATES:
            await _handle_terminal(event, msg, campaign_id, db)

        event.status = "processed"
        event.processed_at = datetime.now(timezone.utc)
        await db.commit()

    except Exception as exc:
        await db.rollback()
        # Re-load event in a fresh state to update retry metadata
        async with async_session() as err_db:
            err_event = await err_db.get(CallbackEvent, event_id)
            if err_event:
                err_event.retry_count = (err_event.retry_count or 0) + 1
                err_event.last_error = str(exc)
                err_event.status = (
                    "permanently_failed" if err_event.retry_count >= 3 else "failed"
                )
                await err_db.commit()


def _build_transition_increment(old_status: str, new_status: str, details: dict) -> dict:
    """
    Computes precise campaign counter increments/decrements based on message state transition
    to guarantee that metrics never inflate and sent <= total messages.
    """
    increments = {}
    
    if old_status == new_status:
        return increments

    # 1. Sent
    if new_status == "sent":
        increments["actual_sent"] = Campaign.actual_sent + 1

    # 2. Failed
    elif new_status == "failed":
        if old_status != "failed":
            increments["actual_failed"] = Campaign.actual_failed + 1

    # 3. Delivered
    elif new_status == "delivered":
        increments["actual_delivered"] = Campaign.actual_delivered + 1
        if old_status == "failed":
            increments["actual_failed"] = Campaign.actual_failed - 1

    # 4. Read
    elif new_status == "read":
        increments["actual_read"] = Campaign.actual_read + 1

    # 5. Clicked
    elif new_status == "clicked":
        increments["actual_clicked"] = Campaign.actual_clicked + 1

    # 6. Converted
    elif new_status == "converted":
        increments["actual_converted"] = Campaign.actual_converted + 1
        increments["actual_revenue"] = Campaign.actual_revenue + float(details.get("revenue", 0.0))

    return increments


async def _handle_terminal(
    event: CallbackEvent,
    msg: CampaignMessage,
    campaign_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """Runs terminal-state side effects: customer update, activity log, completion check."""

    if event.event_type == "converted":
        revenue = float(event.details.get("revenue", 0.0))
        customer = await db.get(Customer, msg.customer_id)
        if customer:
            customer.order_count += 1
            customer.total_spend = round(customer.total_spend + revenue, 2)
            customer.average_order_value = round(
                customer.total_spend / customer.order_count, 2
            )
            customer.last_purchase_date = datetime.now(timezone.utc)
            customer.lifetime_value = round(customer.total_spend * 1.5, 2)
            db.add(customer)
            await db.flush()
            from app.services.persona_engine import compute_persona_for_customer
            await compute_persona_for_customer(customer, db)

        db.add(Activity(
            campaign_id=campaign_id,
            event_type="message_converted",
            channel=msg.channel,
            status="success",
            description=(
                f"Message to customer {msg.customer_id} "
                f"converted (Revenue: ₹{revenue:,.2f})"
            ),
            affected_count=1,
        ))

    elif event.event_type == "failed":
        db.add(Activity(
            campaign_id=campaign_id,
            event_type="message_failed",
            channel=msg.channel,
            status="error",
            description=(
                f"Message to customer {msg.customer_id} failed: "
                f"{event.details.get('error_message', 'Unknown error')}"
            ),
            affected_count=1,
        ))

    await _check_campaign_completion(campaign_id, db)


async def _check_campaign_completion(campaign_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Checks if all CampaignMessages for a campaign are in terminal states.
    If so, marks the campaign 'completed' and records an activity log.

    Uses a single COUNT query that splits total vs terminal in one pass —
    no Python-side iteration over all messages required.
    """
    # Lock the Campaign row first to serialize completion checks and avoid race conditions under concurrency
    campaign_res = await db.execute(
        select(Campaign)
        .where(Campaign.id == campaign_id)
        .with_for_update()
    )
    campaign = campaign_res.scalar_one_or_none()
    if not campaign or campaign.status != "sending":
        return

    res = await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(
                CampaignMessage.status.in_(list(TERMINAL_STATES))
            ).label("terminal"),
        )
        .select_from(CampaignMessage)
        .where(CampaignMessage.campaign_id == campaign_id)
    )
    row = res.one()
    if row.total == 0 or row.total != row.terminal:
        return

    campaign.status = "completed"
    campaign.completed_at = datetime.now(timezone.utc)
    db.add(campaign)
    db.add(Activity(
        campaign_id=campaign_id,
        event_type="campaign_completed",
        channel=campaign.channel,
        status="success",
        description=(
            f"Campaign '{campaign.name}' completed. "
            f"All {row.total} messages reached terminal states."
        ),
        affected_count=row.total,
    ))
