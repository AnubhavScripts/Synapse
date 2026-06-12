"""
Messaging Gateway — Service B
Runs on port 8001, completely separate from the CRM API.

Responsibilities:
  - Receive dispatch requests from the CRM via POST /gateway/dispatch
  - Persist each request as a DispatchJob BEFORE processing (Fix #2)
  - Process messages in batches of 10 with asyncio.Semaphore(5) (Req #4, #5)
  - Simulate customer journeys using channel_simulator
  - Fire sequential callback events to the CRM via HTTP (Req #6)
  - Retry each CRM callback up to MAX_HTTP_RETRY times with backoff (Fix #3)
"""

import asyncio
import logging
import random
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session, engine, Base
from app.models.dispatch_job import DispatchJob
from app.services.channel_simulator import simulate_customer_journey

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────
CRM_CALLBACK_URL = "http://localhost:8000/api/campaigns/callback"
MAX_HTTP_RETRY = 3          # Fix #3 — explicit retry constant
BATCH_SIZE = 10             # Requirement #4
GATEWAY_TIMEOUT = 5.0       # seconds per CRM callback attempt

# ── Concurrency limiter (Requirement #5) ──────────────────────────────────────
# Caps concurrent in-flight message journeys at 5, regardless of batch size.
# Prevents overwhelming the CRM callback endpoint under high volume.
_sem = asyncio.Semaphore(5)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure dispatch_jobs table exists (shares same Neon PG cluster)
    async with engine.begin() as conn:
        from app.models import dispatch_job  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    logger.info("[Gateway] Messaging Gateway started on port 8001")
    yield
    logger.info("[Gateway] Messaging Gateway shutting down")


# ── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ReachIQ Messaging Gateway",
    description="Service B — Handles campaign dispatch, simulation, and CRM callbacks",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────
class MessageItem(BaseModel):
    message_id: str
    customer_id: str


class DispatchRequest(BaseModel):
    campaign_id: str
    channel: str
    messages: list[MessageItem]


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "messaging-gateway"}


@app.post("/gateway/dispatch", status_code=202)
async def dispatch(request: DispatchRequest, background_tasks: BackgroundTasks):
    """
    Receives a campaign dispatch request from the CRM.

    Fix #2 — Persistent dispatch job:
    A DispatchJob record is saved to DB BEFORE processing begins.
    If this process crashes after receiving but before completing,
    the job record survives with status='queued'|'processing' as evidence.
    """
    job_id = uuid.uuid4()
    async with async_session() as db:
        job = DispatchJob(
            id=job_id,
            campaign_id=uuid.UUID(request.campaign_id),
            status="queued",
            payload=request.model_dump(),
            total_messages=len(request.messages),
            processed_messages=0,
        )
        db.add(job)
        await db.commit()

    logger.info(
        "[Gateway] Dispatch job %s accepted — campaign=%s messages=%d",
        job_id, request.campaign_id, len(request.messages),
    )

    background_tasks.add_task(process_dispatch_job, job_id, request)
    return {
        "status": "accepted",
        "job_id": str(job_id),
        "total_messages": len(request.messages),
    }


# ── Dispatch Job Processor ────────────────────────────────────────────────────
async def process_dispatch_job(job_id: uuid.UUID, request: DispatchRequest) -> None:
    """
    Processes a dispatch job in batches of BATCH_SIZE (10), with per-message
    concurrency limited by _sem (Semaphore(5)).
    Updates the DispatchJob status throughout for observability.
    """
    # Mark as processing
    async with async_session() as db:
        job = await db.get(DispatchJob, job_id)
        if job:
            job.status = "processing"
            await db.commit()

    processed = 0
    try:
        messages = request.messages
        channel = request.channel

        for batch_start in range(0, len(messages), BATCH_SIZE):
            batch = messages[batch_start: batch_start + BATCH_SIZE]
            batch_num = batch_start // BATCH_SIZE + 1
            logger.info(
                "[Gateway] Job %s — processing batch %d (%d messages)",
                job_id, batch_num, len(batch),
            )

            # Run all messages in the batch concurrently (bounded by _sem)
            await asyncio.gather(*[
                _process_message_journey(msg.message_id, msg.customer_id, channel)
                for msg in batch
            ])

            processed += len(batch)

            # Brief throttle between batches — don't hammer the CRM
            if batch_start + BATCH_SIZE < len(messages):
                await asyncio.sleep(0.05)

        # Mark completed
        async with async_session() as db:
            job = await db.get(DispatchJob, job_id)
            if job:
                job.status = "completed"
                job.processed_messages = processed
                await db.commit()

        logger.info("[Gateway] Job %s completed — %d messages dispatched", job_id, processed)

    except Exception as exc:
        logger.exception("[Gateway] Job %s failed: %s", job_id, exc)
        async with async_session() as db:
            job = await db.get(DispatchJob, job_id)
            if job:
                job.status = "failed"
                job.processed_messages = processed
                job.error = str(exc)
                await db.commit()


# ── Message Journey Simulator ─────────────────────────────────────────────────
async def _process_message_journey(
    message_id: str, customer_id: str, channel: str
) -> None:
    """
    Acquires the semaphore slot, simulates the full message lifecycle,
    and fires sequential callbacks to the CRM.
    """
    async with _sem:   # Semaphore(5) — Requirement #5
        try:
            await _run_journey(message_id, customer_id, channel)
        except Exception as exc:
            logger.error("[Gateway] Journey exception for message %s: %s", message_id, exc)


async def _run_journey(message_id: str, customer_id: str, channel: str) -> None:
    """Full simulated lifecycle: sent → [failed retries] → delivered → ... → terminal."""
    logger.debug("[Gateway] Starting journey for message %s", message_id)

    # ── 1. Sent ───────────────────────────────────────────────────────────────
    await _fire(message_id, "sent", sequence_number=1, details={})

    # ── 2. Simulate outcome ───────────────────────────────────────────────────
    journey = simulate_customer_journey(channel, uuid.UUID(customer_id))

    # ── 3. Transient failure retries ─────────────────────────────────────────
    if journey["is_transient_failure"]:
        for attempt in range(1, 4):
            await asyncio.sleep(0.04 * attempt)
            await _fire(
                message_id, "failed", sequence_number=2,
                details={"error_message": (
                    f"Transient carrier error attempt {attempt}/3: "
                    f"{journey['transient_error']}"
                )},
            )
            if random.random() < 0.75:
                journey["is_transient_failure"] = False
                break

        if journey["is_transient_failure"]:
            await _fire(
                message_id, "failed", sequence_number=2,
                details={"error_message": "Permanent failure: max transport retries exceeded"},
            )
            return

    # ── 4. Delivery ───────────────────────────────────────────────────────────
    await asyncio.sleep(random.uniform(0.02, 0.08))

    if not journey["is_delivered"]:
        await _fire(
            message_id, "failed", sequence_number=3,
            details={"error_message": journey["failure_reason"]},
        )
        return

    await _fire(message_id, "delivered", sequence_number=3, details={})

    # ── 5. Read ───────────────────────────────────────────────────────────────
    if not journey["is_read"]:
        await asyncio.sleep(0.05)
        await _fire(message_id, "expired", sequence_number=7, details={})
        return

    await asyncio.sleep(random.uniform(0.02, 0.07))
    await _fire(message_id, "read", sequence_number=4, details={})

    # ── 6. Click ──────────────────────────────────────────────────────────────
    if not journey["is_clicked"]:
        await asyncio.sleep(0.05)
        await _fire(message_id, "expired", sequence_number=7, details={})
        return

    await asyncio.sleep(random.uniform(0.02, 0.07))
    await _fire(message_id, "clicked", sequence_number=5, details={})

    # ── 7. Conversion ─────────────────────────────────────────────────────────
    if journey["is_converted"]:
        await asyncio.sleep(random.uniform(0.02, 0.07))
        await _fire(
            message_id, "converted", sequence_number=6,
            details={"revenue": journey["revenue"]},
        )
    else:
        await asyncio.sleep(0.05)
        await _fire(message_id, "expired", sequence_number=7, details={})


# ── HTTP Callback Dispatcher ──────────────────────────────────────────────────
async def _fire(
    message_id: str,
    event_type: str,
    sequence_number: int,
    details: dict,
) -> bool:
    """
    Builds and fires a callback event to the CRM API.
    Wrapper around fire_callback_with_retry for a cleaner call site.
    """
    payload = {
        "callback_id": str(uuid.uuid4()),
        "message_id": message_id,
        "event_type": event_type,
        "sequence_number": sequence_number,
        "details": details,
    }
    return await _fire_with_retry(payload)


async def _fire_with_retry(payload: dict) -> bool:
    """
    Fix #3 — Gateway-side HTTP retry with exponential backoff.

    The CRM callback endpoint persists the event to DB before processing,
    so a 202 response guarantees durability. If the CRM is temporarily
    unavailable we retry with exponential backoff before giving up.

    Retry schedule: attempt 1 (immediate) → wait 1s → attempt 2
                    → wait 2s → attempt 3 → give up.
    """
    for attempt in range(MAX_HTTP_RETRY):
        try:
            async with httpx.AsyncClient(timeout=GATEWAY_TIMEOUT) as client:
                r = await client.post(CRM_CALLBACK_URL, json=payload)
                if r.status_code < 500:
                    # 2xx = processed, 4xx (e.g. 409 duplicate) = already handled
                    return True
                logger.warning(
                    "[Gateway] CRM returned %d for callback %s (attempt %d/%d)",
                    r.status_code, payload["callback_id"], attempt + 1, MAX_HTTP_RETRY,
                )
        except Exception as exc:
            logger.warning(
                "[Gateway] Callback HTTP error (attempt %d/%d): %s",
                attempt + 1, MAX_HTTP_RETRY, exc,
            )

        if attempt < MAX_HTTP_RETRY - 1:
            backoff = 2 ** attempt   # 1s, 2s
            logger.info(
                "[Gateway] Backing off %ds before retry of callback %s",
                backoff, payload["callback_id"],
            )
            await asyncio.sleep(backoff)

    logger.error(
        "[Gateway] Permanently failed to deliver callback %s after %d attempts",
        payload["callback_id"], MAX_HTTP_RETRY,
    )
    return False
