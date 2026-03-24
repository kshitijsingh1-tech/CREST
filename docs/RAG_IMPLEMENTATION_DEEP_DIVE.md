# CREST RAG Implementation Deep Dive

## 1. Goal of This Implementation

The goal of this implementation is to make complaint drafting and complaint
processing context-aware instead of generic.

The system tries to do four things together:

1. understand the complaint,
2. retrieve relevant internal knowledge,
3. retrieve relevant policy and procedure text from PDFs,
4. generate a grounded draft reply.

In short, the system answers:

"Given a new complaint, can we find the most relevant historical resolutions and
policy documents, and use them to produce a better reply?"

That is the RAG layer in this project.

## 2. What RAG Means Here

RAG stands for Retrieval-Augmented Generation.

In this repository it means:

1. retrieve useful context,
2. attach that context to the prompt,
3. ask the model to draft a reply from that context first,
4. fall back safely if retrieval or model calls are weak or unavailable.

This implementation retrieves context from two sources:

### Historical resolution knowledge

Stored in:

- `resolution_knowledge`

This table stores previously resolved complaints that can help future complaints.

### PDF-backed reference knowledge

Stored in:

- `rag_document_chunks`

This table stores chunks extracted from PDFs in `ragdataset`.

That is how the system answers highly bank-specific questions like grievance
portal steps, policy actions, or procedure details.

## 3. Relevant Architecture

The implementation path is:

1. complaint comes in,
2. classifier assigns category, severity, anger, and sentiment,
3. NER extracts banking entities,
4. embedder creates complaint vector,
5. complaint is deduplicated and persisted,
6. retriever gathers past-resolution context and PDF context,
7. draft reply is generated and saved.

The PDF ingestion path is:

1. scan `ragdataset`,
2. read each PDF,
3. normalize extracted text,
4. split into chunks,
5. embed chunks,
6. persist them in PostgreSQL.

Main implementation files:

- `ai/embeddings/embedder.py`
- `ai/providers/groq.py`
- `ai/agents/classifier_agent.py`
- `ai/ner/extractor.py`
- `ai/rag/knowledge_base.py`
- `ai/rag/retriever.py`
- `backend/models/knowledge.py`
- `backend/models/complaint.py`
- `backend/utils/db.py`
- `backend/services/complaint_service.py`
- `backend/api/complaints.py`
- `backend/workers/ingest_worker.py`
- `infra/docker/schema.sql`

## 4. Runtime Configuration and Why It Matters

The repo uses `backend/utils/runtime.py` to load `.env` from the repository
root. That module exposes:

- `REPO_ROOT`
- `DEV_MOCK`
- `USE_PGVECTOR`

This is important because configuration controls which retrieval path runs.

### Why the embedder needed a fix

Earlier, the embedding mode could be read too early at import time. That caused
confusing behavior because:

- the app could be configured for `EMBEDDING_MODE=mock`,
- but the embedder might have already decided to behave differently.

The fix was:

1. load `.env` before config is used,
2. read embedding mode at runtime instead of import time.

That is why `ai/embeddings/embedder.py` now uses runtime helpers instead of a
static mode constant.

## 5. Embedding Design

Embeddings are used for:

- complaint deduplication,
- similar complaint lookup,
- resolution retrieval,
- document chunk retrieval.

The embedding dimension is `1536`.

### Supported modes

The current embedder supports:

- `mock`
- `openai`

### Mock mode

Mock mode creates a deterministic normalized pseudo-random vector from the text.

That is useful for:

- local development,
- running the app without an embedding API key,
- keeping DB schema and code paths exercised.

But mock vectors are not semantically meaningful.

### OpenAI mode

OpenAI mode uses:

- model: `text-embedding-3-small`
- dimensions: `1536`

This is the real semantic mode.

### Why mock mode caused confusion

Even if pgvector is installed and enabled, mock embeddings still do not express
true semantic similarity. So vector search can technically run while still
producing weak rankings.

That is why the implementation was changed so that mock mode uses keyword
retrieval for RAG instead of trusting random-vector cosine similarity.

## 6. PostgreSQL and pgvector

The project uses PostgreSQL as both:

- the transactional database,
- and the vector-search backend.

That is possible because of pgvector.

### Vector-enabled tables

Three tables matter for vectors:

1. `complaints`
2. `resolution_knowledge`
3. `rag_document_chunks`

Each now uses `vector(1536)` for the `embedding` column.

### ANN indexes

IVFFlat cosine indexes exist for:

- complaint embeddings,
- resolution knowledge embeddings,
- PDF chunk embeddings.

### What had to be fixed locally

The local machine originally had two separate problems:

1. the `vector` extension was not installed,
2. the embedding columns already existed as `jsonb`.

So the complete solution was:

1. install pgvector for PostgreSQL 18,
2. run `CREATE EXTENSION vector`,
3. migrate embedding columns from `jsonb` to `vector(1536)`,
4. create IVFFlat indexes.

The local database is now verified to have:

- `pgvector 0.8.1`,
- `complaints.embedding -> vector`,
- `resolution_knowledge.embedding -> vector`,
- `rag_document_chunks.embedding -> vector`.

## 7. PDF Ingestion Pipeline

The PDF ingestion logic lives in `ai/rag/knowledge_base.py` and is exposed by
`ai/rag/ingest_dataset.py`.

### Dataset discovery

The default dataset directory is:

- `ragdataset`

This can be overridden by:

- `CREST_RAG_DATASET_DIR`

### PDF extraction

The function `extract_pdf_pages(...)` uses `pypdf.PdfReader` and:

- reads each page,
- decrypts the file if needed,
- extracts page text,
- normalizes the result,
- keeps only non-empty pages.

### Text normalization

The normalizer removes:

- null characters,
- noisy whitespace,
- broken line spacing,
- excessive blank lines.

This matters because raw PDF text is usually messy.

### Chunking strategy

Chunking is character-based with defaults:

- chunk size: `1200`
- chunk overlap: `200`

The splitter tries to end chunks on better boundaries by preferring:

- blank lines,
- sentence boundaries,
- semicolons,
- spaces.

This is a heuristic chunker, not a token-aware chunker, but it is predictable
and stable for local use.

### Document metadata

Each chunk stores:

- source path,
- source name,
- document title,
- document type,
- page number,
- chunk index,
- content,
- chunk metadata,
- embedding.

### Persistence behavior

`ingest_rag_dataset(...)` does the following:

1. discover PDFs,
2. build chunks,
3. batch-embed all chunk text,
4. optionally purge previous chunks,
5. insert the new chunk rows into `rag_document_chunks`.

### Current dataset result

The current dataset summary is:

- documents: `5`
- chunks: `248`

Breakdown:

- `Accessing_IB_Portal_with_Keyboard_and_Screen_Reader.pdf` -> `92` chunks
- `grievance -redressal-policy-2020-21.pdf` -> `105` chunks
- `policy-on-compensation-grievance-redressal-customer-rights-2024-25.pdf` -> `46` chunks
- `Procedure_to_lodge_grievance_online.pdf` -> `2` chunks
- `union_bank_rag_dataset.pdf` -> `3` chunks

## 8. Document Retrieval Logic

Document retrieval is handled by `search_document_chunks(...)` in
`ai/rag/knowledge_base.py`.

Three retrieval strategies exist:

1. pgvector retrieval
2. Python cosine retrieval
3. keyword retrieval

### pgvector retrieval

The pgvector path:

- computes `1 - (embedding <=> query_vector)` as relevance,
- filters by `is_active`,
- optionally filters by document type,
- applies a minimum relevance threshold,
- returns the top results ordered by relevance.

This is the preferred path when real embeddings are available.

### Python cosine retrieval

This is a slower fallback path that:

- loads rows through SQLAlchemy,
- computes cosine similarity in Python,
- filters and sorts results in application code.

### Keyword retrieval

Keyword retrieval scores chunks by overlapping query tokens with:

- document title,
- document content.

Title hits are weighted more heavily than content hits.

### Current behavior by mode

The system now behaves like this:

#### If `EMBEDDING_MODE=mock`

- skip vector-based document retrieval,
- use keyword retrieval directly.

#### If real embeddings are used and pgvector is enabled

- try pgvector retrieval first,
- fall back to Python cosine if SQL vector search fails,
- fall back to keyword retrieval if no vector hits pass the threshold.

This design makes local behavior honest and useful while preserving real vector
search for production-style operation.

## 9. Resolution Retrieval Logic

Resolution retrieval lives in `ai/rag/retriever.py` and searches the
`resolution_knowledge` table.

This source gives the model access to:

- how similar cases were handled before,
- what resolution wording may be helpful,
- what action patterns are common for similar complaints.

### Why this source matters

PDFs provide policy and procedure details.

Resolved complaints provide practical operational history.

Using both gives the draft generator better context than either source alone.

### Resolution retrieval behavior

There are two broad paths:

#### Mock mode

- use keyword retrieval over title, problem text, and resolution text,
- require a minimum keyword relevance of `0.20`.

This relevance floor was added because weak keyword matches were letting junk
rows into the prompt.

#### Real vector mode

- use pgvector retrieval first,
- fall back to Python cosine retrieval if needed.

Current resolution settings:

- top-k: `3`
- minimum relevance: `0.60`

## 10. Draft Generation Logic

Draft generation is implemented in `generate_draft_reply(...)` inside
`ai/rag/retriever.py`.

It accepts:

- complaint body,
- complaint subject,
- named entities,
- category,
- complaint embedding,
- optional customer name.

### Sequence inside the function

The function does the following:

1. retrieve similar past resolutions,
2. retrieve relevant PDF chunks,
3. log how much context was found,
4. build one combined context payload,
5. assemble the final user prompt,
6. call the chat provider if available,
7. otherwise or on failure, build a safe fallback draft.

### Prompt policy

The system prompt now explicitly tells the model:

1. use retrieved context as the primary source if present,
2. supplement with general knowledge only when needed,
3. answer from own knowledge only when no context is available.

It also tells the model:

- include at least two concrete retrieved details when context exists,
- avoid generic acknowledgment-only replies,
- avoid inventing unsupported bank-specific details.

This was added because generic replies made it look like RAG was not working,
even when retrieval had already succeeded.

## 11. Context-Aware Fallback Design

One of the biggest practical improvements in this implementation is the fallback
path.

### Old problem

If the chat call failed, the app could return a generic acknowledgment like:

- "We have registered your complaint and our team will review it..."

That made it seem as if retrieval had done nothing.

### New behavior

Now, if resolutions or document chunks were retrieved, the fallback draft:

- extracts useful lines from the top document chunks,
- includes actionable details in the reply,
- optionally includes a hint from the top historical resolution,
- preserves customer name, amount, and transaction reference if available.

This means the system can still produce visibly RAG-backed output even when the
external LLM call is unavailable.

## 12. Why the Generic Reply Happened Before

There were several reasons:

### Reason 1

pgvector was not fully installed or enabled initially.

### Reason 2

The embedding columns had been created as `jsonb`, not `vector`.

### Reason 3

The environment was still using `EMBEDDING_MODE=mock`.

### Reason 4

The chat call failed and the previous fallback was too generic.

### Full fix

The final solution included:

1. installing pgvector,
2. enabling the `vector` extension,
3. migrating columns to `vector(1536)`,
4. updating the embedder runtime behavior,
5. updating the retrieval logic for mock mode,
6. improving fallback drafts,
7. tightening the draft prompt.

## 13. Complaint Ingest Flow

The complaint pipeline around RAG is implemented in two main places:

- `backend/api/complaints.py`
- `backend/workers/ingest_worker.py`

### Sync ingest path

The synchronous local test route is:

- `POST /api/complaints/ingest`

This path:

1. classifies the complaint,
2. extracts entities,
3. embeds the complaint,
4. generates a draft reply,
5. persists the complaint.

### Async worker path

The Celery worker path runs the same logical pipeline asynchronously:

1. classify,
2. extract entities,
3. embed,
4. persist complaint,
5. generate draft for non-duplicates.

### Why embeddings matter outside RAG

Complaint embeddings are also used for:

- duplicate detection,
- similar complaint lookup,
- future knowledge reuse.

So embeddings are not only a document-search feature. They are also part of the
core complaint-processing engine.

## 14. Duplicate Detection and Similar Complaint Search

This logic lives in `backend/services/complaint_service.py`.

### Duplicate detection

`find_duplicate(...)` searches open non-duplicate complaints and treats a new
complaint as a duplicate when similarity exceeds `0.92`.

### Similar complaint assistance

`find_similar(...)` uses a lower threshold of `0.75` and is meant for agent
context, not automatic duplicate merging.

## 15. Priority and SLA Logic Around the AI Layer

The RAG system sits inside a larger complaint engine.

Important surrounding logic includes:

- priority scoring,
- SLA deadline tracking,
- breach monitoring,
- audit logging,
- assignment and resolution lifecycle.

Priority score is based on:

- severity,
- anger score,
- waiting-time decay factor.

This means the AI pipeline is not isolated. It feeds a real complaint
operations flow.

## 16. Provider Abstraction and xAI Support

The provider wrapper in `ai/providers/groq.py` accepts both:

- `GROQ_*`
- `XAI_*`

This matters because the code can run against a Groq endpoint or any compatible
OpenAI-style endpoint such as xAI, without rewriting the classifier or draft
generator logic.

That provider wrapper:

- reads the correct API key,
- reads the base URL,
- selects the model from env vars,
- sends a chat-completions payload,
- returns plain text back to the caller.

## 17. Local Service Startup

Main local commands relevant to this implementation:

Re-ingest the dataset:

```powershell
cd d:\crest\CREST_v3\crest
.\.venv\Scripts\python.exe -m ai.rag.ingest_dataset --purge-existing
```

Start API:

```powershell
cd d:\crest\CREST_v3\crest
scripts\start_api.cmd
```

Build and start frontend:

```powershell
cd d:\crest\CREST_v3\crest\frontend\nextjs-app
npm.cmd run build
cd d:\crest\CREST_v3\crest
scripts\start_frontend.cmd
```

Useful local URLs:

- `http://127.0.0.1:3000`
- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/api/complaints/queue`
- `http://127.0.0.1:8000/api/analytics/dashboard`

## 18. How To Enable Real Semantic Vector Search

The database side is already ready. The remaining step for real semantic search
is to use real embeddings instead of mock embeddings.

Set these values in `.env`:

```env
OPENAI_API_KEY=your_real_key
EMBEDDING_MODE=openai
CREST_USE_PGVECTOR=1
```

Then re-ingest the dataset so stored mock embeddings are replaced with real
semantic embeddings:

```powershell
cd d:\crest\CREST_v3\crest
.\.venv\Scripts\python.exe -m ai.rag.ingest_dataset --purge-existing
```

Then restart the API:

```powershell
cd d:\crest\CREST_v3\crest
scripts\start_api.cmd
```

After that:

- complaint embeddings become meaningful,
- document chunk embeddings become meaningful,
- resolution retrieval becomes meaningful,
- pgvector ranking becomes genuinely semantic.

## 19. Why Mock Mode Still Matters

Mock mode is still useful because it lets you:

- run the app without external embedding cost,
- validate ingestion and storage,
- validate prompt assembly,
- validate fallback logic,
- validate startup and operational behavior.

The important distinction is:

- mock mode is for local plumbing and development,
- openai mode is for true semantic quality.

This implementation makes that distinction explicit instead of hiding it.

## 20. How To Test Whether RAG Is Working

### Best testing rule

Ask questions that require PDF-specific answers rather than generic banking
knowledge.

Good examples:

- "How do I lodge a grievance online?"
- "What details do I need to fill in the grievance portal?"
- "What is the grievance portal URL?"
- "What happens after I submit a grievance ticket?"

### What a good answer should contain

A good answer should mention concrete details such as:

- grievance portal URL,
- login process,
- area or sub-area selection,
- description or ticket-entry fields,
- next steps after submission.

### What a weak answer looks like

A weak answer usually contains:

- generic apology,
- no bank-specific details,
- no procedure terms,
- no sign that PDF context was used.

## 21. Troubleshooting

### Problem: same generic reply every time

Check:

- did the API restart after code changes,
- is `EMBEDDING_MODE=mock`,
- did the chat call fail,
- are document chunks actually present in `rag_document_chunks`.

The current code should still provide document-backed fallback text when
retrieval succeeds.

### Problem: vector search seems inactive

Check:

- `CREST_USE_PGVECTOR=1`
- `vector` extension exists
- embedding columns are `vector`
- `EMBEDDING_MODE=openai`
- `OPENAI_API_KEY` is set
- dataset was re-ingested after switching modes

### Problem: database is ready but results still look weak

Likely cause:

- stored vectors are still mock-generated.

Fix:

- switch to `openai`,
- purge and re-ingest.

### Problem: provider call fails

Check:

- `GROQ_API_KEY` or `XAI_API_KEY`
- `GROQ_BASE_URL` or `XAI_BASE_URL`
- network reachability from the local machine

If the call still fails, the app should use the context-aware fallback path.

## 22. Strengths of the Current Implementation

The current implementation is strong in these ways:

- PDF ingestion is real and persisted,
- pgvector is actually installed and enabled,
- embedding columns are vector-backed,
- retrieval is wired into draft generation,
- mock mode behaves honestly instead of pretending to be semantic,
- fallback replies now preserve retrieved context,
- real semantic mode can be enabled with env changes and re-ingestion.

## 23. What This Implementation Does Not Claim

To keep expectations accurate:

- mock embeddings are not true semantic embeddings,
- keyword fallback is not a substitute for strong vector retrieval,
- provider connectivity is not guaranteed in every environment,
- every answer is not guaranteed to come only from PDFs.

The system is designed to degrade gracefully, not to hide limitations.

## 24. Recommended Next Improvements

The most valuable next improvements are:

1. switch fully to real embeddings in local or staging,
2. add a retrieval-debug endpoint that returns raw retrieved chunks,
3. expose sources and page numbers in the UI,
4. add automated tests for mock-mode and vector-mode retrieval behavior,
5. tune retrieval thresholds using real complaints,
6. optionally add reranking after initial retrieval.

## 25. Final Mental Model

If you want one compact mental model for the system, use this:

- `embedder.py` converts text into vectors.
- `knowledge_base.py` converts PDFs into searchable chunks.
- `retriever.py` gathers historical and document context, then prepares the LLM
  prompt.
- `groq.py` talks to the configured chat provider.
- `complaint_service.py` handles duplicate detection, priority logic, and
  complaint persistence.
- `complaints.py` wires the AI pipeline into the API.
- `ingest_worker.py` runs the same logic asynchronously.
- pgvector provides the vector search layer.
- keyword fallback keeps local development honest and usable.

That is the implemented RAG system in CREST.
