# CREST RAG Implementation Reference

## Scope

This file is the quick-reference map for the RAG, embeddings, pgvector, and
draft-reply work implemented in this repository.

Use this file when you want to know:

1. what was implemented,
2. which file is responsible for which feature,
3. which environment variables and commands matter,
4. what the current local state is,
5. how the system behaves in mock mode versus real vector mode.

For the full explanation of architecture and design decisions, read
`docs/RAG_IMPLEMENTATION_DEEP_DIVE.md`.

## Current Local State

The current verified local state is:

- Dataset directory: `ragdataset`
- PDF files discovered: `5`
- Extracted chunks: `248`
- Persisted rows in `rag_document_chunks`: `248`
- Rows in `resolution_knowledge`: `10`
- Rows in `complaints`: `15`
- pgvector extension version: `0.8.1`
- `complaints.embedding` type: `vector`
- `resolution_knowledge.embedding` type: `vector`
- `rag_document_chunks.embedding` type: `vector`
- `CREST_USE_PGVECTOR`: enabled
- Current embedding mode: `mock`

Meaning:

- the database is fully ready for vector search,
- the app is taking pgvector-aware code paths,
- semantic quality is still limited until real embeddings are used,
- local mock mode now uses keyword retrieval so local RAG remains useful.

## What Was Implemented

### PDF-backed RAG knowledge base

Implemented:

- PDF discovery from `ragdataset`
- PDF text extraction with `pypdf`
- text normalization
- chunking
- document-type inference
- embedding generation for chunks
- persistence to `rag_document_chunks`
- retrieval over stored chunks

Main files:

- `ai/rag/knowledge_base.py`
- `ai/rag/ingest_dataset.py`
- `backend/models/knowledge.py`
- `infra/docker/schema.sql`

### pgvector-backed storage and retrieval

Implemented:

- `vector(1536)` embedding columns
- pgvector registration on raw DB connections
- cosine-similarity SQL queries
- IVFFlat ANN indexes
- migration from legacy `jsonb` embedding columns to `vector`

Main files:

- `backend/utils/db.py`
- `backend/models/complaint.py`
- `backend/models/knowledge.py`
- `infra/docker/schema.sql`

### Embedding system

Implemented:

- runtime-configured embedding mode
- OpenAI embedding support
- deterministic mock embedding fallback
- batch embedding support
- runtime helper to detect current embedding mode

Main file:

- `ai/embeddings/embedder.py`

### RAG retrieval and draft generation

Implemented:

- retrieval from `resolution_knowledge`
- retrieval from `rag_document_chunks`
- prompt construction using retrieved context
- ability for the chat model to answer from own knowledge when no context exists
- context-aware fallback draft if the LLM call fails
- keyword-first retrieval in mock mode

Main files:

- `ai/rag/retriever.py`
- `ai/rag/knowledge_base.py`

### Provider compatibility

Implemented:

- OpenAI-compatible chat wrapper
- support for `GROQ_*` environment variable names
- support for `XAI_*` environment variable names

Main file:

- `ai/providers/groq.py`

### Complaint pipeline integration

Implemented:

- complaint classification
- entity extraction
- complaint embeddings
- duplicate detection
- priority scoring
- draft generation
- persistence and audit logging

Main files:

- `backend/api/complaints.py`
- `backend/workers/ingest_worker.py`
- `backend/services/complaint_service.py`

## File Responsibility Map

### `ai/embeddings/embedder.py`

Purpose:

- generate embeddings for complaints and PDF chunks

Important functions:

- `get_embedding_mode()`
- `embed(text)`
- `embed_batch(texts)`

### `ai/providers/groq.py`

Purpose:

- provider abstraction for chat completions

Important functions:

- `get_api_key()`
- `has_api_key()`
- `get_base_url()`
- `get_model(env_var, default)`
- `create_chat_completion(...)`

### `ai/agents/classifier_agent.py`

Purpose:

- classify complaint text into category, severity, anger, sentiment, and summary

Important function:

- `classify(complaint_body)`

### `ai/ner/extractor.py`

Purpose:

- extract banking entities from complaint text

Important function:

- `extract(text)`

### `ai/rag/knowledge_base.py`

Purpose:

- ingest PDFs and retrieve document chunks

Important functions:

- `ingest_rag_dataset(...)`
- `search_document_chunks(...)`

### `ai/rag/ingest_dataset.py`

Purpose:

- CLI entrypoint for dataset ingest

Command:

- `python -m ai.rag.ingest_dataset --purge-existing`

### `ai/rag/retriever.py`

Purpose:

- retrieve RAG context and generate the draft reply

Important function:

- `generate_draft_reply(...)`

### `backend/models/knowledge.py`

Purpose:

- defines `resolution_knowledge`, `rag_document_chunks`, and `spike_signals`

### `backend/models/complaint.py`

Purpose:

- defines complaint lifecycle schema including complaint embeddings and draft
  reply storage

### `backend/utils/runtime.py`

Purpose:

- loads `.env` from the repo root and exposes runtime flags

### `backend/utils/db.py`

Purpose:

- owns SQLAlchemy engine setup, raw psycopg2 connections, and vector
  serialization

### `backend/utils/init_db.py`

Purpose:

- creates ORM-managed tables and seeds default channel rows

### `backend/services/complaint_service.py`

Purpose:

- duplicate search, similar-complaint search, priority scoring, complaint
  creation, resolution handling, and audit writes

### `backend/api/complaints.py`

Purpose:

- FastAPI router that wires the AI pipeline into complaint endpoints

### `backend/workers/ingest_worker.py`

Purpose:

- Celery ingest path for the same AI pipeline used by the sync API path

### `backend/main.py`

Purpose:

- FastAPI and Socket.IO startup, DB initialization, and `/health`

### `infra/docker/schema.sql`

Purpose:

- SQL reference schema for complaint tables, knowledge tables, document chunk
  tables, and vector indexes

### Startup scripts

Files:

- `scripts/start_api.cmd`
- `scripts/start_frontend.cmd`
- `scripts/start_email_listener.cmd`
- `scripts/start_cloudflare_tunnel.cmd`

Purpose:

- convenience commands for local startup

## RAG-Relevant Tables

### `complaints`

Relevant columns:

- `embedding`
- `category`
- `sub_category`
- `named_entities`
- `draft_reply`
- `is_duplicate`
- `duplicate_of`
- `similarity_score`

### `resolution_knowledge`

Relevant columns:

- `problem_desc`
- `resolution_text`
- `embedding`
- `avg_csat`
- `is_active`

### `rag_document_chunks`

Relevant columns:

- `source_path`
- `source_name`
- `document_title`
- `document_type`
- `page_number`
- `chunk_index`
- `content`
- `chunk_metadata`
- `embedding`
- `is_active`

## Retrieval Mode Matrix

| Mode | Embeddings | DB vector support | Actual retrieval behavior |
|---|---|---:|---|
| Local mock mode | `mock` | on or off | keyword retrieval for document and resolution context |
| Real semantic mode | `openai` | on | pgvector retrieval first, keyword fallback if nothing passes threshold |
| Vector-disabled mode | `openai` | off | Python cosine fallback |

Important note:

- mock embeddings are deterministic but not semantically meaningful,
- that is why the current implementation bypasses vector ranking for RAG in
  mock mode.

## Important Constants

Chunking:

- chunk size default: `1200`
- chunk overlap default: `200`

Retrieval:

- resolution top-k: `3`
- document top-k: `4`
- resolution min relevance: `0.60`
- document min relevance: `0.45`
- keyword minimum relevance for resolution retrieval in mock mode: `0.20`

Complaint similarity:

- duplicate threshold: `0.92`
- similar-complaint threshold: `0.75`

## Environment Variables That Matter

Core runtime:

- `CREST_DB_URL`
- `CREST_USE_PGVECTOR`
- `CREST_DEV_MOCK`

Embeddings:

- `OPENAI_API_KEY`
- `EMBEDDING_MODE`
- `EMBED_BATCH_SIZE`

RAG dataset:

- `CREST_RAG_DATASET_DIR`
- `CREST_RAG_CHUNK_SIZE`
- `CREST_RAG_CHUNK_OVERLAP`

Chat provider:

- `GROQ_API_KEY`
- `GROQ_BASE_URL`
- `GROQ_CLASSIFIER_MODEL`
- `GROQ_DRAFT_MODEL`

Alternative supported names:

- `XAI_API_KEY`
- `XAI_BASE_URL`
- `XAI_CLASSIFIER_MODEL`
- `XAI_DRAFT_MODEL`

Frontend and API:

- `NEXT_PUBLIC_API_URL`
- `BACKEND_INTERNAL_URL`
- `CORS_ORIGINS`
- `CORS_ALLOW_ALL`

## Commands

Re-ingest PDF dataset:

```powershell
cd d:\crest\CREST_v3\crest
.\.venv\Scripts\python.exe -m ai.rag.ingest_dataset --purge-existing
```

Dry-run ingest:

```powershell
cd d:\crest\CREST_v3\crest
.\.venv\Scripts\python.exe -m ai.rag.ingest_dataset --dry-run
```

Start API:

```powershell
cd d:\crest\CREST_v3\crest
scripts\start_api.cmd
```

Build frontend and start it:

```powershell
cd d:\crest\CREST_v3\crest\frontend\nextjs-app
npm.cmd run build
cd d:\crest\CREST_v3\crest
scripts\start_frontend.cmd
```

Start email listener:

```powershell
cd d:\crest\CREST_v3\crest
scripts\start_email_listener.cmd
```

Start Cloudflare tunnel:

```powershell
cd d:\crest\CREST_v3\crest
scripts\start_cloudflare_tunnel.cmd
```

## Key Fixes Included in This Implementation

- Fixed embedding mode being read too early before `.env` load.
- Added PDF chunk storage and retrieval.
- Added ingest CLI for `ragdataset`.
- Enabled both `GROQ_*` and `XAI_*` provider env names.
- Changed prompt policy so the LLM can use own knowledge when no context exists.
- Changed fallback draft generation so retrieved context is not lost when the
  LLM call fails.
- Installed and enabled pgvector locally.
- Migrated embedding columns from `jsonb` to `vector`.
- Added keyword-first retrieval in mock mode so local RAG stays useful.

## Validation Checklist

- `vector` extension exists.
- all three embedding columns use the `vector` type.
- `rag_document_chunks` contains the ingested PDF chunks.
- `/health` returns `200`.
- a grievance-portal question returns document-backed details instead of a bland
  acknowledgment.

## Known Limitations

- `EMBEDDING_MODE=mock` does not provide true semantic similarity.
- Real semantic retrieval requires a valid `OPENAI_API_KEY`.
- If the chat provider is unreachable, the app falls back to the context-aware
  template path.
- This documentation focuses on the RAG/vector-search complaint path and the
  surrounding implementation that was modified with it.

## Suggested Reading Order

1. Read this file first.
2. Read `docs/RAG_IMPLEMENTATION_DEEP_DIVE.md`.
3. Then open these code files:
   - `ai/embeddings/embedder.py`
   - `ai/rag/knowledge_base.py`
   - `ai/rag/retriever.py`
   - `backend/services/complaint_service.py`
   - `backend/api/complaints.py`
