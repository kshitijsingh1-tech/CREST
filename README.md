# CREST
### Complaint Resolution & Escalation Smart Technology
**India's first RBI-aligned Gen-AI grievance intelligence platform**
PSBs Hackathon 2026 · Union Bank of India · Gen Forge · IDEA 2.0 · AI-CSPARC

---

## Project Structure

```
crest/
├── backend/
│   ├── api/
│   │   ├── complaints.py       # All complaint lifecycle endpoints
│   │   └── analytics.py        # Dashboard metrics & chart data
│   ├── workers/
│   │   ├── celery_app.py       # Celery config + Beat schedule
│   │   ├── ingest_worker.py    # Full AI pipeline per complaint (Celery task)
│   │   ├── priority_worker.py  # Emotion-Decay refresh every 5 min
│   │   └── sla_worker.py       # SLA monitoring + Slack/SendGrid alerts
│   ├── services/
│   │   └── complaint_service.py # Core business logic: dedup, priority, SLA
│   ├── models/
│   │   ├── complaint.py        # SQLAlchemy ORM + Pydantic schemas
│   │   └── knowledge.py        # ResolutionKnowledge + SpikeSignal models
│   ├── utils/
│   │   ├── db.py               # Connection pool, SQLAlchemy engine
│   │   └── logger.py           # JSON structured logging
│   └── main.py                 # FastAPI app + Socket.IO mount
│
├── ai/
│   ├── agents/
│   │   └── classifier_agent.py # LangChain → Claude API: P0-P4, anger, category
│   ├── rag/
│   │   └── retriever.py        # LlamaIndex pgvector retrieval + Claude draft reply
│   ├── embeddings/
│   │   └── embedder.py         # 1536-dim Complaint DNA vector generation
│   └── ner/
│       └── extractor.py        # spaCy NER: amounts, txn IDs, dates, products
│
├── integrations/
│   ├── whatsapp/
│   │   └── webhook.py          # Meta Cloud API webhook + Whisper STT voice notes
│   ├── twitter/
│   │   └── stream.py           # Twitter API v2 filtered stream listener
│   ├── email/
│   │   └── listener.py         # IMAP poller for grievance inbox
│   └── kafka/
│       ├── consumer.py         # Reads 6 channel topics → Celery dispatch
│       └── producer.py         # Shared publisher for all channel integrations
│
├── frontend/
│   └── nextjs-app/
│       ├── app/
│       │   ├── page.tsx                    # Dashboard home (Server Component)
│       │   ├── analytics/page.tsx          # Analytics charts page
│       │   ├── complaints/[id]/page.tsx    # Complaint detail (Server Component)
│       │   ├── layout.tsx                  # Root layout
│       │   └── globals.css
│       ├── components/
│       │   ├── queue/PriorityQueue.tsx     # Live queue table (Socket.IO)
│       │   ├── complaint/ComplaintDetail.tsx # Full detail + agent actions
│       │   ├── sla/SLABadge.tsx            # SLA status pill
│       │   └── charts/VolumeTrendChart.tsx # Recharts line chart
│       └── lib/
│           ├── api.ts                      # Typed API client
│           └── useSocket.ts                # Socket.IO real-time hook
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.api      # FastAPI + Celery image
│   │   ├── Dockerfile.nextjs   # Next.js production image
│   │   └── schema.sql          # PostgreSQL + pgvector schema (auto-run on init)
│   ├── k8s/
│   │   └── deployments.yaml    # Kubernetes manifests + HPA for ingest workers
│   └── configs/
│       └── (env-specific overrides)
│
├── docker-compose.yml          # Full local dev stack (12 services)
├── requirements.txt            # Python deps
├── .env.example                # All environment variables documented
└── README.md
```

---

## Quick Start

### 1. Environment
```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY (or set EMBEDDING_MODE=mock for local dev without API keys)
```

### 2. Start all services
```bash
docker compose up -d
# Wait ~30 seconds for all health checks to pass
docker compose ps
```

### 3. Install Python deps (for running locally without Docker)
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 4. Seed sample data
```bash
python -m backend.utils.db    # verify DB connection
# Schema auto-applies from infra/docker/schema.sql on first postgres start
```

### 5. Run API (without Docker)
```bash
uvicorn backend.main:socket_app --reload --port 8000
```

### 6. Run Celery workers
```bash
# Ingest worker
celery -A backend.workers.celery_app worker -Q ingest -c 4 --loglevel=info

# Scheduler worker + Beat (separate terminals)
celery -A backend.workers.celery_app worker -Q scheduler -c 2 --loglevel=info
celery -A backend.workers.celery_app beat --loglevel=info
```

### 7. Run dashboard
```bash
cd frontend/nextjs-app
npm install && npm run dev
# Open http://localhost:3000
```

---

## How a Complaint Flows Through CREST

```
Customer (WhatsApp / Twitter / Email / App / Voice / Branch)
        │
        ▼
  Channel Integration  →  Kafka Topic  →  Celery Ingest Worker
                                                    │
                          ┌─────────────────────────┼─────────────────────────┐
                          │                         │                         │
                   Claude API                   spaCy NER              Embedder (1536-dim)
                 (classify P0-P4,            (extract amounts,        (Complaint DNA vector)
                 anger, category)             txn IDs, dates)
                          │                         │                         │
                          └─────────────────────────┼─────────────────────────┘
                                                    │
                                        PostgreSQL + pgvector
                                      ┌─────────────────────────┐
                                      │ Dedup check (cosine>0.92)│
                                      │ Priority score calc      │
                                      │ SLA timer created        │
                                      │ Audit log entry          │
                                      └─────────────────────────┘
                                                    │
                                         LlamaIndex RAG retrieval
                                         Claude API draft reply
                                                    │
                                      Next.js Agent Dashboard
                                      (Socket.IO live updates)
```

---

## The Three Core Innovations

### 1. Complaint DNA Fingerprinting
Every complaint gets a **1536-dimensional embedding vector** stored in PostgreSQL via pgvector. When a new complaint arrives, a cosine ANN query finds any existing open complaint with similarity > 0.92 — and automatically marks the new one as a duplicate. Zero manual deduplication.

### 2. Emotion-Decay Priority Queue
```
priority_score = severity_weight × anger_score × decay_factor
decay_factor   = MIN(3.0,  1 + LN(1 + hours_waiting / 8))
```
Recalculated every 5 minutes by Celery Beat. A 3-day-old furious customer always outranks a calm new ticket.

### 3. Proactive Spike Prediction
The `spike_signals` table logs outages, app updates, and rate changes. The ML model correlates these with historical complaint velocity to predict surges 24 hours in advance — shifting operations from reactive firefighting to truly predictive.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/complaints/ingest` | Sync ingest (test/low-volume) |
| GET | `/api/complaints/queue` | Live priority queue |
| GET | `/api/complaints/{id}` | Full complaint detail |
| GET | `/api/complaints/{id}/similar` | DNA-matched similar complaints |
| PATCH | `/api/complaints/{id}/assign` | Assign to agent |
| PATCH | `/api/complaints/{id}/approve-draft` | Approve AI draft reply |
| PATCH | `/api/complaints/{id}/resolve` | Resolve + push to KB |
| GET | `/api/complaints/{id}/audit` | Immutable RBI audit trail |
| GET | `/api/analytics/dashboard` | KPI summary |
| GET | `/api/analytics/by-category` | Category breakdown |
| GET | `/api/analytics/volume-trend` | Daily volume chart data |
| GET | `/api/analytics/spike-signals` | Recent spike predictions |

---

## Team — Gen Forge

| Name | Role |
|------|------|
| Saanvi Aggarwal | DevOps + Database Architecture |
| Laxya Gaba | AI / NLP Engineering |
| Aayush Jaiswal | Frontend + UI/UX |
| Kshitij Singh | Backend + API Design |

---

*CREST · PSBs Hackathon 2026 · Union Bank of India · 4× ROI · Zero SLA Breaches · 500M+ Customers*
