# ReachIQ — AI Strategist CRM (Synapse)

ReachIQ is a modern, premium AI-CRM platform built to identify customer growth/risk opportunities, generate targeted campaign strategies using strategic reasoning models (Gemini 2.5), and simulate high-throughput message dispatch pipelines with guaranteed durability and delivery sequence safety.

---

## 🏗️ What We Have Built

1. **Deterministic Opportunity Engine** (`opportunity_engine.py`)
   * An algorithmic, fully deterministic engine that scans raw customer data and persona snapshots to discover growth/risk opportunities (e.g. dormant customers, at-risk churn, emerging VIPs, discount-sensitive cohorts).
   * Implements priority scoring based on potential revenue, audience size, urgency, and average lifetime value (LTV).

2. **AI Strategic Reasoning Layer** (`ai_strategist.py` & `opportunity_investigation.py`)
   * Leverages Gemini 2.5 Flash for strategy drafting, root-cause analysis, and candidate action comparison.
   * Prompts generate structured JSON payloads containing concise campaign titles, strategic approaches, performance forecasts, and dynamic message drafts (with `{{name}}` and `{{category}}` personalization tokens).

3. **Distributed Messaging Gateway** (`gateway_app.py`)
   * A standalone microservice (running on port `8001`) simulating messaging carrier networks.
   * Processes campaigns in batches of 10 with concurrent execution bounded by an asynchronous semaphore to prevent system saturation.
   * Simulates customer journeys (Sent $\rightarrow$ Delivered $\rightarrow$ Read $\rightarrow$ Clicked $\rightarrow$ Converted/Expired) and fires sequential webhook callbacks.

4. **Pessimistic & Idempotent Callback Processor** (`callback_processor.py`)
   * Handles webhook events from the Gateway.
   * Implements a **Sequence Guard** (ignores callbacks with sequence numbers less than or equal to the message's current state) to handle out-of-order network packets.
   * Uses **Pessimistic Locking** (`SELECT FOR UPDATE`) on campaign message and campaign rows to eliminate concurrency race conditions.
   * Performs O(1) SQL atomic counter increments for live reporting (e.g., `actual_sent = actual_sent + 1`).

5. **Modern React Frontend**
   * **Opportunity Center**: Lists growth opportunities prioritized by value and score.
   * **AI Strategist**: Displays deep-dive investigations, candidate options comparison, expected revenues, and customization panels.
   * **Campaigns Panel**: Displays live execution timelines, funnel charts, decision histories, and message-level delivery records.
   * **Segments**: Manages demographic attributes and revenue contributions.

---

## ⚡ Seed Data Summary

Running the database seeder (`app/seed.py`) populates the database with scaled, realistic mock data for testing:

| Component | Fed / Input Templates | Dynamically Figured Out by System |
| :--- | :--- | :--- |
| **250 Customers** | Base Names & Email Domains | Spend patterns (VIP, moderate, dormant, discount), AOV, LTV, and signup dates. |
| **250 Personas** | *None (computed)* | Composite engagement scores, channel affinities, discount sensitivity, and category affinities. |
| **7 Segments** | Prebuilt membership rules | Dynamic member counts, growth trends, and revenue contributions. |
| **10 Campaigns** | Baseline campaign concepts | Reach, outcomes simulation (opens, conversions, revenue) and execution timelines. |
| **64 Decision Logs** | *None (computed)* | Historical strategic routing reasoning logs and confidence rates per customer. |
| **72 Activities** | *None (computed)* | Transactional timeline logs tracking gateway dispatches and callback steps. |
| **5 Opportunities** | *None (computed)* | High-value growth initiatives and targeted customer counts discovered from scratch. |

---

## ⚖️ Architectural Tradeoffs

* **Algorithmic vs. Generative Boundary**: We separated database scanning from LLM generation. Opportunity discovery and priority scoring are 100% deterministic (Python/SQL). Gemini is restricted to narrative explanation, root-cause enrichment, and creative message drafting. This guarantees data stability and eliminates LLM hallucination in financial modeling.
* **Durability vs. Write Overhead**: Every incoming callback is committed to the `callback_events` table *before* it is processed. This ensures that no delivery data is lost if the background queue crashes, though it increases database write volume.
* **Keyword-based Segment Fallback**: Instead of crashing or failing if Gemini generates a segment name that doesn't match the database exactly, a robust regex-based keyword fallback mapping is implemented in the frontend. This prevents empty audience dispatches.
* **In-Memory Concurrency Bounding**: We used `asyncio.Semaphore` inside the gateway app to cap execution speed rather than using external brokers (like Celery or Redis) to keep the developer environment lightweight.

---

## ⚠️ Scalability Bottlenecks (What Will Go Wrong)

* **Background Task Durability**: We use FastAPI's in-memory `BackgroundTasks` to process callback events asynchronously. If the CRM server restarts or crashes while callbacks are queued in memory, those callbacks will be lost (requiring a database worker script to find and retry `pending` callback events).
* **Database lock contention**: We execute `with_for_update()` locking on `campaigns` and `campaign_messages` rows during callback processing. Under high throughput (10,000+ callbacks per second), database lock wait times will scale exponentially, leading to pool exhaustion.
* **Synchronous Campaign Message Insertion**: In `launch_campaign`, the database rows for target messages are created in a linear loop before dispatching. For campaigns with 100,000+ targeted customers, this single-threaded loop will time out the HTTP request. We would need to implement bulk inserts (`bulk_save_objects`) and process them in an async task queue.
* **Stateful Gateway Semaphore**: Bounding Gateway concurrency with `asyncio.Semaphore` works only when running a single service instance. If the Messaging Gateway is scaled horizontally behind a load balancer, instances won't share state, which can saturate the CRM API downstream.
