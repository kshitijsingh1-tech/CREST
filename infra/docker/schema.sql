-- ============================================================
-- CREST — Complaint Resolution & Escalation Smart Technology
-- PostgreSQL + pgvector Schema
-- Embedding dim: 1536 (OpenAI text-embedding-3-small)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- fast LIKE/text search

-- ============================================================
-- 1. CHANNELS — source systems
-- ============================================================
CREATE TABLE IF NOT EXISTS channels (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,   -- email, whatsapp, app, twitter, voice, branch
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO channels (name) VALUES
    ('email'), ('whatsapp'), ('app'), ('twitter'), ('voice'), ('branch')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. COMPLAINTS — core table with vector embedding
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source & identity
    channel_id      INT REFERENCES channels(id),
    external_ref    TEXT,                        -- original ticket ID from source system
    customer_id     TEXT NOT NULL,               -- masked CIF / phone hash
    customer_name   TEXT,

    -- Content
    subject         TEXT,
    body            TEXT NOT NULL,
    language        TEXT DEFAULT 'en',

    -- Complaint DNA — 1536-dim semantic vector (core innovation)
    embedding       VECTOR(1536),

    -- AI classification (Groq output)
    category        TEXT,                        -- UPI, KYC, Loan, Card, NetBanking, …
    sub_category    TEXT,
    severity        SMALLINT CHECK (severity BETWEEN 0 AND 4),  -- P0–P4
    anger_score     NUMERIC(4,3) CHECK (anger_score BETWEEN 0 AND 1),
    sentiment       TEXT CHECK (sentiment IN ('positive','neutral','negative','hostile')),
    named_entities  JSONB DEFAULT '{}',          -- spaCy NER output

    -- Priority queue (Emotion-Decay formula)
    -- priority = severity_weight × anger_score × wait_decay_factor
    priority_score  NUMERIC(8,4) DEFAULT 0,      -- recalculated every 5 min
    priority_rank   INT,                         -- materialized rank in queue

    -- SLA
    sla_deadline    TIMESTAMPTZ,
    sla_status      TEXT DEFAULT 'on_track'
                        CHECK (sla_status IN ('on_track','at_risk','breached','resolved')),
    sla_breach_fine NUMERIC(10,2),               -- Rs. fine if breached

    -- Deduplication
    duplicate_of    UUID REFERENCES complaints(id),
    is_duplicate    BOOLEAN DEFAULT FALSE,
    similarity_score NUMERIC(5,4),               -- cosine similarity to parent

    -- Lifecycle
    status          TEXT DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','escalated','resolved','closed')),
    assigned_agent  TEXT,
    assigned_at     TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,

    -- RAG draft
    draft_reply     TEXT,
    draft_approved  BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. COMPLAINT_AUDIT — immutable TimescaleDB-style log
-- ============================================================
CREATE TABLE IF NOT EXISTS complaint_audit (
    id              BIGSERIAL PRIMARY KEY,
    complaint_id    UUID NOT NULL REFERENCES complaints(id),
    actor           TEXT NOT NULL,               -- agent_id | 'system' | 'groq-api'
    action          TEXT NOT NULL,               -- created, classified, assigned, escalated, resolved …
    old_value       JSONB,
    new_value       JSONB,
    ts              TIMESTAMPTZ DEFAULT NOW()
);
-- Append-only enforcement via rule (mimics TimescaleDB immutability)
CREATE RULE no_update_audit AS ON UPDATE TO complaint_audit DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO complaint_audit DO INSTEAD NOTHING;

-- ============================================================
-- 4. RESOLUTION_KNOWLEDGE — RAG knowledge base with vectors
-- ============================================================
CREATE TABLE IF NOT EXISTS resolution_knowledge (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category        TEXT NOT NULL,
    sub_category    TEXT,
    title           TEXT NOT NULL,
    problem_desc    TEXT NOT NULL,
    resolution_text TEXT NOT NULL,
    embedding       VECTOR(1536),               -- embedded from problem_desc
    success_count   INT DEFAULT 1,              -- times this resolution worked
    avg_csat        NUMERIC(3,2),               -- customer satisfaction 1–5
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. RAG_DOCUMENT_CHUNKS -- PDF-backed knowledge base
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_document_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_path     TEXT NOT NULL,
    source_name     TEXT NOT NULL,
    document_title  TEXT NOT NULL,
    document_type   TEXT NOT NULL DEFAULT 'reference',
    page_number     INT NOT NULL,
    chunk_index     INT NOT NULL,
    content         TEXT NOT NULL,
    chunk_metadata  JSONB DEFAULT '{}'::jsonb,
    embedding       VECTOR(1536),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_rag_document_chunk UNIQUE (source_path, chunk_index)
);

-- ============================================================
-- 6. SPIKE_SIGNALS -- external event feed for Spike Predictor
-- ============================================================
CREATE TABLE IF NOT EXISTS spike_signals (
    id              SERIAL PRIMARY KEY,
    signal_type     TEXT NOT NULL,              -- app_update, outage, rate_change, maintenance
    description     TEXT,
    expected_impact TEXT,                       -- high | medium | low
    affected_category TEXT[],                   -- ['UPI','NetBanking']
    signal_ts       TIMESTAMPTZ NOT NULL,
    predicted_surge_pct NUMERIC(5,2),           -- e.g. 45.00 → 45% spike expected
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. SLA_TIMERS — Temporal.io checkpoint mirror
-- ============================================================
CREATE TABLE IF NOT EXISTS sla_timers (
    complaint_id        UUID PRIMARY KEY REFERENCES complaints(id),
    deadline            TIMESTAMPTZ NOT NULL,
    alert_50pct_sent    BOOLEAN DEFAULT FALSE,
    alert_80pct_sent    BOOLEAN DEFAULT FALSE,
    alert_95pct_sent    BOOLEAN DEFAULT FALSE,
    workflow_id         TEXT,                   -- Temporal workflow ID
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Vector ANN index — IVFFlat for 1536-dim cosine similarity
-- (switch to HNSW for production with pgvector >= 0.5)
CREATE INDEX IF NOT EXISTS idx_complaints_embedding
    ON complaints USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
    ON resolution_knowledge USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_rag_document_chunks_embedding
    ON rag_document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_rag_document_source
    ON rag_document_chunks (source_path, chunk_index);

CREATE INDEX IF NOT EXISTS idx_rag_document_fts
    ON rag_document_chunks USING GIN (to_tsvector('english', content));

-- Priority queue index
CREATE INDEX IF NOT EXISTS idx_complaints_priority
    ON complaints (priority_score DESC, created_at ASC)
    WHERE status IN ('open', 'in_progress');

-- SLA breach monitoring
CREATE INDEX IF NOT EXISTS idx_complaints_sla
    ON complaints (sla_deadline ASC)
    WHERE sla_status NOT IN ('resolved');

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_complaints_fts
    ON complaints USING GIN (to_tsvector('english', coalesce(subject,'') || ' ' || body));

-- Dedup lookup
CREATE INDEX IF NOT EXISTS idx_complaints_customer
    ON complaints (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_complaint
    ON complaint_audit (complaint_id, ts DESC);

-- ============================================================
-- VIEWS
-- ============================================================

-- Live priority queue (recalculated via priority_score)
CREATE OR REPLACE VIEW v_priority_queue AS
SELECT
    c.id,
    c.customer_id,
    c.subject,
    c.category,
    c.severity,
    c.anger_score,
    c.priority_score,
    c.sla_deadline,
    c.sla_status,
    EXTRACT(EPOCH FROM (c.sla_deadline - NOW()))/3600 AS hours_remaining,
    c.status,
    c.assigned_agent,
    ch.name AS channel,
    c.created_at
FROM complaints c
JOIN channels ch ON ch.id = c.channel_id
WHERE c.status IN ('open','in_progress')
  AND c.is_duplicate = FALSE
ORDER BY c.priority_score DESC;

-- SLA breach risk dashboard
CREATE OR REPLACE VIEW v_sla_risk AS
SELECT
    c.id,
    c.customer_id,
    c.severity,
    c.sla_deadline,
    c.sla_status,
    ROUND(
        (EXTRACT(EPOCH FROM (NOW() - c.created_at)) /
         EXTRACT(EPOCH FROM (c.sla_deadline - c.created_at))) * 100, 1
    ) AS pct_elapsed,
    c.assigned_agent,
    ch.name AS channel
FROM complaints c
JOIN channels ch ON ch.id = c.channel_id
WHERE c.sla_status IN ('at_risk','breached')
  AND c.status NOT IN ('resolved','closed')
ORDER BY c.sla_deadline ASC;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Emotion-Decay Priority Score
-- formula: severity_weight(0–4 mapped 1–5) × anger_score × time_decay_factor
CREATE OR REPLACE FUNCTION calc_priority_score(
    p_severity      SMALLINT,
    p_anger_score   NUMERIC,
    p_created_at    TIMESTAMPTZ
) RETURNS NUMERIC AS $$
DECLARE
    severity_weight  NUMERIC;
    hours_waiting    NUMERIC;
    decay_factor     NUMERIC;
BEGIN
    -- Map P0→5, P1→4, P2→3, P3→2, P4→1
    severity_weight := 5 - p_severity;

    hours_waiting := EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600.0;

    -- Exponential decay amplifier: longer wait → higher priority
    -- caps at 3.0x after ~72 hours
    decay_factor := LEAST(3.0, 1.0 + LN(1 + hours_waiting / 8.0));

    RETURN ROUND(severity_weight * COALESCE(p_anger_score, 0.5) * decay_factor, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recalculate priority scores for all open complaints (run every 5 min via pg_cron)
CREATE OR REPLACE FUNCTION refresh_priority_scores() RETURNS void AS $$
BEGIN
    UPDATE complaints
    SET priority_score = calc_priority_score(severity, anger_score, created_at),
        updated_at     = NOW()
    WHERE status IN ('open','in_progress')
      AND is_duplicate = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_complaints_updated
    BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_knowledge_updated
    BEFORE UPDATE ON resolution_knowledge
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE TRIGGER trg_rag_document_chunks_updated
    BEFORE UPDATE ON rag_document_chunks
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
