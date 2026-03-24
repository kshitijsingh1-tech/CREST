# CREST
### Complaint Resolution & Escalation Smart Technology
**India's first RBI-aligned Gen-AI grievance intelligence platform**
PSBs Hackathon 2026 Â· Union Bank of India Â· Gen Forge Â· IDEA 2.0 Â· AI-CSPARC

---

## Project Structure

```
crest/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”œâ”€â”€ complaints.py       # All complaint lifecycle endpoints
â”‚   â”‚   â””â”€â”€ analytics.py        # Dashboard metrics & chart data
â”‚   â”œâ”€â”€ workers/
â”‚   â”‚   â”œâ”€â”€ celery_app.py       # Celery config + Beat schedule
â”‚   â”‚   â”œâ”€â”€ ingest_worker.py    # Full AI pipeline per complaint (Celery task)
â”‚   â”‚   â”œâ”€â”€ priority_worker.py  # Emotion-Decay refresh every 5 min
â”‚   â”‚   â””â”€â”€ sla_worker.py       # SLA monitoring + Slack/SendGrid alerts
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â””â”€â”€ complaint_service.py # Core business logic: dedup, priority, SLA
â”‚   â”œâ”€â”€ models/
â”‚   â”‚   â”œâ”€â”€ complaint.py        # SQLAlchemy ORM + Pydantic schemas
â”‚   â”‚   â””â”€â”€ knowledge.py        # ResolutionKnowledge + SpikeSignal models
â”‚   â”œâ”€â”€ utils/
â”‚   â”‚   â”œâ”€â”€ db.py               # Connection pool, SQLAlchemy engine
â”‚   â”‚   â””â”€â”€ logger.py           # JSON structured logging
â”‚   â””â”€â”€ main.py                 # FastAPI app + Socket.IO mount
â”‚
â”œâ”€â”€ ai/
â”‚   â”œâ”€â”€ agents/
â”‚   â”‚   â””â”€â”€ classifier_agent.py # LangChain â†’ Claude API: P0-P4, anger, category
â”‚   â”œâ”€â”€ rag/
â”‚   â”‚   â””â”€â”€ retriever.py        # LlamaIndex pgvector retrieval + Claude draft reply
â”‚   â”œâ”€â”€ embeddings/
â”‚   â”‚   â””â”€â”€ embedder.py         # 1536-dim Complaint DNA vector generation
â”‚   â””â”€â”€ ner/
â”‚       â””â”€â”€ extractor.py        # spaCy NER: amounts, txn IDs, dates, products
â”‚
â”œâ”€â”€ integrations/
â”‚   â”œâ”€â”€ whatsapp/
â”‚   â”‚   â””â”€â”€ webhook.py          # Meta Cloud API webhook + Whisper STT voice notes
â”‚   â”œâ”€â”€ twitter/
â”‚   â”‚   â””â”€â”€ stream.py           # Twitter API v2 filtered stream listener
â”‚   â”œâ”€â”€ email/
â”‚   â”‚   â””â”€â”€ listener.py         # IMAP poller for grievance inbox
â”‚   â””â”€â”€ kafka/
â”‚       â”œâ”€â”€ consumer.py         # Reads 6 channel topics â†’ Celery dispatch
â”‚       â””â”€â”€ producer.py         # Shared publisher for all channel integrations
â”‚
â”œâ”€â”€ frontend/
â”‚   â””â”€â”€ nextjs-app/
â”‚       â”œâ”€â”€ app/
â”‚       â”‚   â”œâ”€â”€ page.tsx                    # Dashboard home (Server Component)
â”‚       â”‚   â”œâ”€â”€ analytics/page.tsx          # Analytics charts page
â”‚       â”‚   â”œâ”€â”€ complaints/[id]/page.tsx    # Complaint detail (Server Component)
â”‚       â”‚   â”œâ”€â”€ layout.tsx                  # Root layout
â”‚       â”‚   â””â”€â”€ globals.css
â”‚       â”œâ”€â”€ components/
â”‚       â”‚   â”œâ”€â”€ queue/PriorityQueue.tsx     # Live queue table (Socket.IO)
â”‚       â”‚   â”œâ”€â”€ complaint/ComplaintDetail.tsx # Full detail + agent actions
â”‚       â”‚   â”œâ”€â”€ sla/SLABadge.tsx            # SLA status pill
â”‚       â”‚   â””â”€â”€ charts/VolumeTrendChart.tsx # Recharts line chart
â”‚       â””â”€â”€ lib/
â”‚           â”œâ”€â”€ api.ts                      # Typed API client
â”‚           â””â”€â”€ useSocket.ts                # Socket.IO real-time hook
â”‚
â”œâ”€â”€ infra/
â”‚   â”œâ”€â”€ docker/
â”‚   â”‚   â”œâ”€â”€ Dockerfile.api      # FastAPI + Celery image
â”‚   â”‚   â”œâ”€â”€ Dockerfile.nextjs   # Next.js production image
â”‚   â”‚   â””â”€â”€ schema.sql          # PostgreSQL + pgvector schema (auto-run on init)
â”‚   â”œâ”€â”€ k8s/
â”‚   â”‚   â””â”€â”€ deployments.yaml    # Kubernetes manifests + HPA for ingest workers
â”‚   â””â”€â”€ configs/
â”‚       â””â”€â”€ (env-specific overrides)
â”‚
â”œâ”€â”€ docker-compose.yml          # Full local dev stack (12 services)
â”œâ”€â”€ requirements.txt            # Python deps
â”œâ”€â”€ .env.example                # All environment variables documented
â””â”€â”€ README.md
```

---

## Quick Start

### 1. Environment
```bash
cp .env.example .env
# Fill in GROQ_API_KEY (and OPENAI_API_KEY if using OpenAI embeddings)
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
python -m pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl
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
        â”‚
        â–¼
  Channel Integration  â†’  Kafka Topic  â†’  Celery Ingest Worker
                                                    â”‚
                          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                          â”‚                         â”‚                         â”‚
                     Groq API                   spaCy NER              Embedder (1536-dim)
                 (classify P0-P4,            (extract amounts,        (Complaint DNA vector)
                 anger, category)             txn IDs, dates)
                          â”‚                         â”‚                         â”‚
                          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                    â”‚
                                        PostgreSQL + pgvector
                                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                      â”‚ Dedup check (cosine>0.92)â”‚
                                      â”‚ Priority score calc      â”‚
                                      â”‚ SLA timer created        â”‚
                                      â”‚ Audit log entry          â”‚
                                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                    â”‚
                                         LlamaIndex RAG retrieval
                                           Groq draft reply
                                                    â”‚
                                      Next.js Agent Dashboard
                                      (Socket.IO live updates)
```

---

## The Three Core Innovations

### 1. Complaint DNA Fingerprinting
Every complaint gets a **1536-dimensional embedding vector** stored in PostgreSQL via pgvector. When a new complaint arrives, a cosine ANN query finds any existing open complaint with similarity > 0.92 â€” and automatically marks the new one as a duplicate. Zero manual deduplication.

### 2. Emotion-Decay Priority Queue
```
priority_score = severity_weight Ã— anger_score Ã— decay_factor
decay_factor   = MIN(3.0,  1 + LN(1 + hours_waiting / 8))
```
Recalculated every 5 minutes by Celery Beat. A 3-day-old furious customer always outranks a calm new ticket.

### 3. Proactive Spike Prediction
The `spike_signals` table logs outages, app updates, and rate changes. The ML model correlates these with historical complaint velocity to predict surges 24 hours in advance â€” shifting operations from reactive firefighting to truly predictive.

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

## Team â€” Gen Forge

| Name | Role |
|------|------|
| Saanvi Aggarwal | DevOps + Database Architecture |
| Laxya Gaba | AI / NLP Engineering |
| Aayush Jaiswal | Frontend + UI/UX |
| Kshitij Singh | Backend + API Design |

---

*CREST Â· PSBs Hackathon 2026 Â· Union Bank of India Â· 4Ã— ROI Â· Zero SLA Breaches Â· 500M+ Customers*
