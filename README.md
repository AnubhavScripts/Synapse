# Synapse

### Autonomous AI-Native CRM for Intelligent Customer Growth

Synapse is an AI-native customer intelligence and campaign automation platform designed for modern consumer brands.

Traditional CRM systems are reactive. Marketers manually analyze customer data, manually create customer segments, manually decide campaign strategy, and usually act only after customers begin churning.

Synapse rethinks this workflow.

Instead of waiting for marketers to identify opportunities, the platform continuously analyzes customer behavior, proactively discovers revenue opportunities, recommends strategic interventions, executes personalized campaigns across communication channels, and continuously learns from customer interactions.

The goal is simple:

**Transform CRM from a reactive dashboard into autonomous customer growth infrastructure.**

---

# Product Vision

Most CRM systems follow this workflow:

Customer Data → Manual Segmentation → Manual Campaign Creation → Manual Analysis

Synapse introduces a proactive intelligence layer:

Customer Data → Behavioral Intelligence → Opportunity Discovery → Strategy Generation → Campaign Execution → Continuous Learning Loop

Rather than asking:

*"Which customers should I target?"*

The system answers automatically:

*"I discovered 14 customers entering dormancy. ₹2.8L revenue is at risk. Here are three intervention strategies ranked by expected impact."*

---

# Deployment & Local Development

### Live Deployment
* **Frontend:** Deployed on Vercel.
* **CRM API Service (Backend):** Deployed on Render.
* **Messaging Gateway Service (Backend):** Deployed independently on Render.

---

### Local Development Setup

Follow these steps to run the Synapse CRM platform locally.

#### Prerequisites
- **Python 3.11+** installed.
- **Node.js (v18+)** and **npm** installed.
- A PostgreSQL database (e.g. Neon or local PG instance).

#### 1. Backend Setup & Running
Navigate to the `backend/` directory:
```bash
cd backend
```

Create a `.env` file inside `backend/` with your environment variables:
```env
DATABASE_URL=your_postgres_database_url
GEMINI_API_KEY=your_gemini_api_key
```

Install the required Python dependencies:
```bash
pip install -r requirements.txt
```

Start the **CRM API Service** (runs on port 8000 by default):
```bash
python run.py
```

Start the **Messaging Gateway Service** (runs on port 8001 by default):
```bash
python run_gateway.py
```

*Note: The database is automatically migrated and seeded upon starting the CRM API Service.*

#### 2. Frontend Setup & Running
Navigate to the `frontend/` directory:
```bash
cd ../frontend
```

Install the frontend dependencies:
```bash
npm install
```

Start the Vite development server (runs on `http://localhost:5173` by default):
```bash
npm run dev
```

The frontend React application will communicate with the backend services running locally.

---

# Core Product Features

### 1. Autonomous Opportunity Discovery

The platform continuously scans customer behavior and automatically discovers business opportunities.

Examples:

* Dormant customer recovery opportunities
* High value customers showing churn signals
* Cross-sell opportunities
* Emerging VIP customers
* Discount-sensitive customer cohorts
* Channel saturation detection

No manual configuration required.

---

### 2. Behavioral Intelligence Engine

Every customer is transformed into a dynamic behavioral persona.

The engine computes:

* Engagement score
* Churn risk prediction
* Channel affinity
* Price sensitivity
* Category affinity
* Purchase frequency
* Revenue contribution

This intelligence layer continuously updates after campaign execution.

---

### 3. AI Strategist

After discovering an opportunity, the strategist investigates:

* Why this opportunity exists
* Why immediate action is required
* Root cause analysis
* Alternative recovery strategies
* Revenue projections
* Conversion forecasts

The strategist compares multiple interventions.

Example:

Option A → 10% Discount
Option B → Free Shipping
Option C → Loyalty Rewards

Each strategy is ranked using projected business impact.

---

### 4. Personalized Campaign Generation

The system generates personalized campaign communication.

Output includes:

* Campaign title
* Strategic objective
* Channel recommendation
* Personalized message body
* Dynamic personalization tokens

Example:

Hello {{name}}, we noticed you love {{category}} products. Here’s something special for you.

---

### 5. Distributed Campaign Execution Engine

Campaign execution runs through a distributed messaging architecture.

The system simulates real-world messaging infrastructure.

Supported lifecycle:

Queued → Sent → Delivered → Read → Clicked → Converted / Expired

This architecture models how actual messaging providers work in production systems.

---

### 6. Real-Time Campaign Analytics

Campaign execution updates live metrics in real time.

Tracked metrics:

* Messages sent
* Delivery rate
* Read rate
* Click-through rate
* Conversion rate
* Revenue generated
* Funnel analytics
* Message level delivery states

---

# System Architecture

The platform is intentionally split into multiple intelligence layers.

```text
Customer Data (PostgreSQL)

        ↓

Persona Engine
(Customer Behavioral Intelligence)

        ↓

Opportunity Engine
(Revenue Opportunity Discovery)

        ↓

AI Strategist
(Strategy Investigation + Reasoning)

        ↓

Campaign Creation Engine

        ↓

CRM API Service (Port 8000)

        ↓

Messaging Gateway Service (Port 8001)

        ↓

Webhook Callback Processor

        ↓

Campaign Analytics Engine

        ↓

Continuous Learning Feedback Loop
```

---

# AI-Native Architecture

The system intentionally separates deterministic intelligence from generative AI.

This boundary was designed deliberately.

Business-critical decisions should remain reproducible, auditable, and stable.

LLMs should only be used where language reasoning provides value.

---

## Deterministic Intelligence Layer

Implemented entirely using Python + SQL.

Responsible for:

* Customer persona generation
* Churn prediction
* Risk classification
* Channel affinity scoring
* Opportunity discovery
* Priority scoring
* Revenue calculations
* Strategy evaluation
* Campaign analytics
* Delivery simulation

This layer guarantees deterministic behavior.

No LLM is involved.

---

## Generative Intelligence Layer (Gemini 2.5 Flash)

Gemini is intentionally restricted to reasoning and language generation.

Responsible for:

* Root cause explanation
* Why-now urgency analysis
* Strategy comparison reasoning
* Campaign communication generation
* Personalized message copy drafting

This prevents hallucination from affecting business-critical decisions.

---

# Distributed Messaging Infrastructure

The assignment explicitly required a callback-driven communication architecture.

The platform uses two completely independent services.

---

## Service A — CRM API (Port 8000)

Responsible for:

* Campaign creation
* Campaign message generation
* Receiving webhook callbacks
* Processing delivery events
* Updating campaign analytics
* Maintaining customer state

---

## Service B — Messaging Gateway (Port 8001)

Responsible for:

* Receiving dispatch requests
* Processing messages in batches
* Simulating customer delivery lifecycle
* Sending webhook callbacks back to CRM

Lifecycle:

Sent → Delivered → Read → Clicked → Converted / Failed

---

# Engineering Challenges Solved

---

## 1. Concurrent Callback Race Conditions

Problem:

Multiple asynchronous callbacks could update the same campaign message simultaneously.

Example:

Delivered event and Expired event arriving at nearly the same time.

This created lost update anomalies.

Solution:

Implemented PostgreSQL pessimistic row locking.

```python
select(CampaignMessage)
.where(CampaignMessage.id == event.message_id)
.with_for_update()
```

This guarantees serialized updates.

---

## 2. Out-of-Order Network Events

Problem:

Messaging networks can deliver events out of order.

Example:

Read event arrives before Delivered event.

Solution:

Implemented sequence guard.

Example:

Sent = 1
Delivered = 2
Read = 3
Clicked = 4
Converted = 5

Older sequence events are ignored automatically.

---

## 3. Duplicate Webhook Processing

Problem:

Network retries may resend identical callbacks.

Solution:

Implemented callback idempotency layer.

Each callback is stored before processing.

Duplicate callback IDs are rejected automatically.

---

# Simulated Dataset

The platform uses realistic seeded production-like data.

Generated dataset includes:

* 250 customers
* 250 dynamically computed customer personas
* 7 behavioral customer segments
* Historical campaign records
* Historical decision logs
* Activity execution timelines
* Automatically discovered opportunities

Important:

Most intelligence is dynamically computed.

Very little data is hardcoded.

---

# Technical Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Framer Motion
* Recharts

### Backend

* FastAPI
* Async SQLAlchemy
* PostgreSQL (NeonDB)

### AI Layer

* Gemini 2.5 Flash API

### Infrastructure

* CRM API Microservice
* Messaging Gateway Microservice
* Async HTTP Webhook Architecture

### Deployment

* Vercel (Frontend)
* Render (CRM API)
* Render (Messaging Gateway)

---

# Engineering Tradeoffs

Several design decisions were made intentionally.

---

### Deterministic Intelligence over Full ML Models

Instead of training machine learning models for churn prediction and opportunity discovery, deterministic intelligence engines were used.

Reason:

* Lower infrastructure complexity
* No model training pipeline required
* Easier explainability
* Lower storage overhead
* Deterministic reproducible outputs

For this problem scope, deterministic intelligence achieves nearly equivalent business value with significantly lower system complexity.

---

### No Redis or Celery

Instead of introducing distributed task queues.

Used:

* FastAPI background tasks
* Async HTTP callbacks
* Concurrency bounded semaphores

Reason:

* Lightweight architecture
* Faster development iteration
* Easier deployment

---

# Current Scalability Bottlenecks

At production scale several bottlenecks will emerge.

---

### Background Task Durability

FastAPI BackgroundTasks run in memory.

If the CRM service crashes, queued callback jobs may be lost.

Future solution:

Redis + Celery worker architecture.

---

### Database Lock Contention

Heavy callback throughput will increase row lock contention.

Future solution:

Kafka queue + worker pool architecture.

---

### Large Campaign Launch Bottleneck

Campaign message creation currently happens synchronously.

100,000+ customer campaigns will cause HTTP request timeouts.

Future solution:

Bulk inserts + background queue workers.

---

### Stateful Gateway Concurrency Limits

Current semaphore works only for single gateway instance.

Future solution:

Distributed queue-based concurrency control.

---

# Future Improvements

* ML-based churn prediction models
* Reinforcement learning campaign optimization
* Distributed queue workers using Redis/Celery
* Kafka event streaming architecture
* Multi-tenant brand support
* Real messaging provider integrations
* A/B testing engine
* Autonomous self-learning recommendation loop

---

# Why This Project Exists

This project explores a simple idea.

CRM systems should not wait for marketers to make decisions.

They should understand customer behavior continuously, identify growth opportunities autonomously, and execute customer engagement intelligently.

The future of CRM is not dashboards.

The future of CRM is autonomous decision systems.

---

