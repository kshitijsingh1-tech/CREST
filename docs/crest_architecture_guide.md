# CREST Developer Guide: Building an AI-Powered Pipeline From Scratch
This is a deeply comprehensive, line-by-line technical deep-dive into the entire CREST (Complaint Resolution and Escalation Smart Technology) architecture. This guide is built so you can understand the exact Python, TypeScript, and SQL logic we implemented, completely from scratch.

---

## 1. The FastAPI Backend Core
*Files: `backend/main.py`, `backend/api/complaints.py`*

FastAPI serves as the core brain of the entire platform. It handles the RESTful HTTP API endpoints that the Next.js React frontend talks to.
FastAPI is built on **Pydantic** to brutally enforce variable shapes using static typing.

```python
# Create the ultra-fast asynchronous HTTP Server
app = FastAPI(title="CREST API", version="1.0.0")

# Apply CORS (Cross-Origin Resource Sharing)
# This prevents browsers from blocking requests returning to localhost:3000 (Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```
When you send an Email or hit an API, we use Python Decorators (`@router.post`) to bind raw code directly to the `/api/complaints/ingest` URL. Notice the `Depends(get_db_optional)`—this is called **Dependency Injection**, meaning FastAPI automatically creates and securely throws away your Postgres Database connection the precise millisecond the endpoint finishes processing!

---

## 2. Real-Time WebSockets (`backend/utils/socket.py`)
Standard HTTP APIs require the user to refresh the page (polling). To achieve Google-Docs-like instantaneous Live Queues, we wrapped FastAPI inside an **Asynchronous Server Gateway Interface (ASGI) Socket.IO Application**.

There is a Python trap called "Circular Imports." If `main.py` runs the socket, but `complaints.py` needs the socket, and `main.py` needs to load `complaints.py`... Python panics and crashes. 
We fixed this by totally isolating the socket variable into `utils/socket.py`:

```python
import socketio

# The master socket variable
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

# This is an "async" coroutine because WebSockets never block the main CPU Thread!
async def broadcast_queue_update(data: dict = None):
    # Sends a packet of JSON data instantly across the internet to ANY browser connected.
    await sio.emit("queue_updated", data or {"action": "refresh"})
```
Inside the synchronous `/api/complaints/resolve` endpoint, we use `async_to_sync` to translate our fast asynchronous websocket trigger into safe threaded code.

```python
from asgiref.sync import async_to_sync
async_to_sync(broadcast_queue_update)()
```

---

## 3. Database Modeling & PGVector (`backend/models/knowledge.py`)
To build the RAG (Retrieval-Augmented Generation) AI, we couldn't just use standard Postgres. We used **SQLAlchemy** to interface with data, and utilized the ultra-modern `PGVector` extension to let our database natively understand conceptual language mathematics.

```python
class ResolutionKnowledge(Base):
    __tablename__ = "resolution_knowledge"

    id = Column(UUID(as_uuid=True), primary_key=True)
    category = Column(String(100), nullable=False)
    title = Column(Text, nullable=False)
    resolution_text = Column(Text, nullable=False)
    
    # MAGIC: This is a 1,536-dimensional array of Floating Point numbers.
    # It stores the "concept" of the word as mathematical coordinates.
    embedding = Column(Vector(1536))
```

---

## 4. The LLM Retriever (The AI Brain)
*Files: `ai/rag/retriever.py`, `ai/providers/groq.py`*

When an email arrives complaining about a "Forgotten PIN":

**Step A: Determine Relevance (Keyword Matching & Cosine Similarity)**
Because we are in `EMBEDDING_MODE=mock` without an OpenAI key, we wrote an incredible `_keyword_score` algorithm entirely from scratch to calculate "Cosine Distance."

```python
def _keyword_score(query: str, title: str, content: str) -> float:
    # 1. We strip 'Stopwords' (the, a, and) so they don't corrupt the math
    query_tokens = _tokenize(query)
    title_tokens = _tokenize(title)
    
    # 2. We compare the "Intersection" (&) using native Math Sets to see how many words match
    title_hits = len(query_tokens & title_tokens)
    
    # 3. We weigh hits mathematically -> A title hit is worth 200% of a body hit!
    weighted_hits = (title_hits * 2) + len(query_tokens & _tokenize(content))
    return min(1.0, weighted_hits / (len(query_tokens) * 2))
```
If the score is `> 0.20`, we pull the official FAQ string directly from the Postgres database memory.

**Step B: The LLM Prompt Generation**
We don't ask the AI to guess; we structurally bind its hands. We built an incredible "F-String Formulation" prompt:

```python
DRAFT_SYSTEM = """You are a senior Union Bank of India grievance resolution officer.
Source priority:
1. If retrieved context is provided, use them as the primary grounding context.
..."""

user_prompt = f"""
Retrieved Context:
{context}

New Complaint to Draft Reply For:
Customer Name: {customer_name}
Complaint Body:
{complaint_body}
"""
```

**Step C: Groq Llama-3.3 Execution**
We securely use `httpx.post` (an ultra-fast asynchronous `requests` alternative) to hurl our massive strict prompt to `https://api.groq.com/openai/v1`. Groq parses it instantly and streams us back the AI reply perfectly obeying our bank standard operating procedures.

---

## 5. Automated Email Polling
*File: `integrations/email/listener.py`*

We built a script that runs an infinite `while True:` loop directly against Gmail's IMAP server using standard binary sockets:

```python
import imaplib
import email

# Logs exactly into the IMAP server over Port 993 securely
mail = imaplib.IMAP4_SSL(HOST, PORT)
mail.login(USER, PASSWORD)

# Selects the Master Inbox folder
mail.select("inbox")

# Searches the remote inbox specifically only for "UNSEEN" unread items
status, messages = mail.search(None, "UNSEEN")
```
When it finds an email, emails are horribly nested in "Multiparts" (PDF attachments, HTML tables, etc). The listener cleanly "Walks" through the parts, finds the `text/plain` section, drops the HTML, uses `.decode("utf-8")` to convert the 1s and 0s back into human language, and finally shoots it straight to `/ingest` via a `requests.post()` call to start the LLM cycle!

---

## 6. Next.js, React UI State, & Glassmorphism
*Files: `frontend/nextjs-app/components/ComplaintDetail.tsx`*

The frontend uses **Tailwind CSS** to build jaw-dropping, GPU-accelerated graphics incredibly easily.
`bg-white dark:bg-black/50 backdrop-blur-md` dynamically forces the browser to calculate a frosted glass blur effect underneath the component while making it 50% cleanly transparent.

For the **"Submit Button Friction Bug"**, the button was hard-disabled using a React conditional flag:
```tsx
// The button disables itself instantly if EITHER of those variables are empty
<button disabled={loading || !agent || !note} >
```
To eliminate clicking friction, we mapped `agent` globally to the initial Database state. We then manipulated the `setNote` React Hook:

```tsx
  const handleApproveDraft = async () => {
    // We ping the python backend API successfully
    await approveDraft(c.id, agent);
    
    // THE UX MAGIC:
    // Instead of forcing the user to type, we auto-trigger the setNote() hook.
    // This perfectly changes the "note" variable in browser-memory, evaluates disabled=false,
    // and magically unlocks the Green Return to Queue Button before their eyes!
    setNote("Resolved by approving AI generated draft reply.");
  };
```
