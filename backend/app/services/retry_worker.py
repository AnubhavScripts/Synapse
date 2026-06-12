"""
Retry Worker — CRM Background Task

Polls callback_events every POLL_INTERVAL seconds for events in 'failed'
status where retry_count < MAX_RETRIES. Re-runs process_callback_event for
each, incrementing retry_count on each attempt. After MAX_RETRIES the event
is marked 'permanently_failed' and left for manual inspection.

Started as an asyncio background task in app/main.py lifespan.
"""

import asyncio
import logging
from sqlalchemy import select
from app.core.database import async_session
from app.models.callback_event import CallbackEvent
from app.services.callback_processor import process_callback_event

logger = logging.getLogger(__name__)

POLL_INTERVAL = 5      # seconds between retry sweeps
MAX_RETRIES = 3        # Requirement #10 — permanently_failed after this many attempts


async def retry_worker() -> None:
    """
    Infinite loop that wakes every POLL_INTERVAL seconds and re-processes
    any failed callback events that have not yet exhausted their retry budget.
    """
    logger.info("[RetryWorker] Started — polling every %ds for failed callbacks", POLL_INTERVAL)

    while True:
        try:
            await asyncio.sleep(POLL_INTERVAL)
            await _sweep_failed_events()
        except asyncio.CancelledError:
            logger.info("[RetryWorker] Shutting down gracefully")
            break
        except Exception as exc:
            # Log but do NOT crash the worker — keep retrying on next tick
            logger.exception("[RetryWorker] Unexpected error in sweep: %s", exc)


async def _sweep_failed_events() -> None:
    """Finds all retryable failed events and re-processes them."""
    async with async_session() as db:
        result = await db.execute(
            select(CallbackEvent)
            .where(CallbackEvent.status == "failed")
            .where(CallbackEvent.retry_count < MAX_RETRIES)
            .order_by(CallbackEvent.created_at.asc())
            .limit(50)   # Safety cap — don't flood DB on a backlog
        )
        events = result.scalars().all()

    if not events:
        return

    logger.info("[RetryWorker] Found %d failed events to retry", len(events))

    for event in events:
        try:
            logger.info(
                "[RetryWorker] Retrying event %s (attempt %d/%d) — type=%s message=%s",
                event.id, event.retry_count + 1, MAX_RETRIES,
                event.event_type, event.message_id,
            )
            await process_callback_event(event.id)
        except Exception as exc:
            # process_callback_event handles its own error state internally,
            # but log here in case of truly unexpected failures
            logger.error("[RetryWorker] Failed to retry event %s: %s", event.id, exc)
