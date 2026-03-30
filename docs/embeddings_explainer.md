# Embeddings Explained — From Scratch

## 1. What is an Embedding?

Imagine trying to teach a computer what **"I forgot my PIN"** and **"can't access my account"** have in common. They use completely different words, yet a human knows they're basically the same problem.

An **embedding** is how we teach machines to understand meaning. It converts any piece of text into a **list of numbers (a vector)** where texts with *similar meanings* produce *similar numbers*.

```
"I forgot my PIN"         → [0.21, -0.88, 0.54, 0.03, ...]  (768 numbers)
"Can't access my account" → [0.19, -0.91, 0.57, 0.01, ...]  (768 numbers, very close!)
"My card was stolen"      → [-0.44, 0.31, -0.12, 0.77, ...]  (very different)
```

The key insight: **similar meaning → similar numbers → close together in space**.

---

## 2. What are "Dimensions"?

Each number in the vector is called a **dimension**. More dimensions = the model captures more nuance about the text.

- `nomic-embed-text-v1_5` (Groq) → **768 dimensions** *(what we'll use)*
- `text-embedding-3-small` (OpenAI) → **1536 dimensions** *(what the DB was built for)*

Think of dimensions like coordinates. 2D gives you a point on a map. 768D gives you a "location" in a 768-dimensional semantic space where meaning is geography.

---

## 3. What Were We Doing Before? (Mock Embeddings)

The current `EMBEDDING_MODE=mock` works like this:

```python
def _mock_embed(text: str) -> list[float]:
    # Uses a hash of the text as a random seed
    rng = np.random.default_rng(abs(hash(text)) % (2**32))
    vector = rng.standard_normal(1536)
    return (vector / norm(vector)).tolist()
```

**The problem:** Two complaints with identical meaning but slightly different wording get completely random vectors with no similarity. This means:

| Feature | With Mock | With Real Embeddings |
|---|---|---|
| Deduplication | ❌ Misses similar complaints | ✅ Catches "same issue, different words" |
| RAG (draft replies) | ❌ Retrieves irrelevant knowledge | ✅ Finds actually related resolved cases |
| Semantic Search | ❌ Useless | ✅ Works as expected |

---

## 4. How Does CREST Use Embeddings?

### A. Deduplication
When a new complaint arrives, CREST embeds its text and searches for the **nearest neighbour** in pgvector. If the cosine similarity > 0.92, it's marked as a duplicate of an existing complaint.

```
New complaint: "I can't log into Union Ease"
→ Embed → compare with all existing vectors
→ Finds "Union Ease login not working" (similarity: 0.96) → DUPLICATE ✅
```

### B. RAG (Retrieval-Augmented Generation)
When generating a draft reply, CREST embeds the complaint body, searches the `resolution_knowledge` table for the **most semantically similar resolved cases**, and feeds those into the Groq LLM prompt.

```
Complaint: "My NEFT transfer is delayed"
→ Embed → find similar resolved cases in knowledge base
→ "NEFT delayed by 2 hours — resolution: check beneficiary details"
→ Feed to Groq → generate personalised draft reply
```

---

## 5. What is pgvector?

`pgvector` is a PostgreSQL extension that lets you store vectors as a column type (`VECTOR(768)`) and run **Approximate Nearest Neighbour (ANN)** queries using an IVFFlat index.

```sql
-- Find the 5 most similar complaints
SELECT id, 1 - (embedding <=> query_vector) AS similarity
FROM complaints
ORDER BY similarity DESC
LIMIT 5;
```

The `<=>` operator is cosine distance. `1 - distance = similarity`.

---

## 6. The Schema Migration

Our DB has `VECTOR(1536)` but Groq gives us `768`-dim vectors. Mixing dimensions would crash. So we:

1. **Migrate** the column type with `ALTER TABLE ... TYPE vector(768)`
2. **Clear** existing mock-embedded records (their vectors are meaningless anyway)
3. **Re-ingest** fresh complaints which will now get real Groq embeddings

---

## 7. Groq's Embedding Model

**Model:** `nomic-embed-text-v1_5`
**Dimensions:** 768
**Cost:** Free within Groq's rate limits (same API key as chat)

It calls the same Groq base URL but the `/embeddings` endpoint:

```http
POST https://api.groq.com/openai/v1/embeddings
{
  "model": "nomic-embed-text-v1_5",
  "input": "I forgot my Union Ease PIN"
}
→ { "data": [{ "embedding": [0.21, -0.88, ...768 numbers...] }] }
```

---

## Summary

```
User sends complaint
        ↓
  Groq embeds it → [0.21, -0.88, ..., 0.54]  (768 real numbers)
        ↓
  pgvector searches for similar past complaints (cosine similarity)
        ↓
  If similarity > 0.92 → mark as DUPLICATE
  Else → store & find similar resolved cases for RAG
        ↓
  Groq LLM generates a draft reply grounded in real similar solutions
```

**Before:** Mock vectors → dedup never works, RAG retrieves random noise
**After:** Real vectors → semantically similar complaints cluster together ✅
