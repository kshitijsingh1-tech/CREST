"""
CREST — Database Connection & Session Management
Single connection pool shared across all FastAPI workers and Celery tasks.
"""

import os
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from pgvector.psycopg2 import register_vector
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv(
    "CREST_DB_URL",
    "postgresql://crest_user:crest_pass@localhost:5432/crest_db",
)

# ── SQLAlchemy engine (used by models & FastAPI dependency) ──
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,          # auto-reconnect on stale connections
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ── Raw psycopg2 connection (used for pgvector ANN queries) ──
def get_raw_conn():
    """psycopg2 connection with pgvector registered. Caller must close."""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    register_vector(conn)
    return conn


@contextmanager
def raw_conn():
    """Context manager for psycopg2 + pgvector connections."""
    conn = get_raw_conn()
    try:
        yield conn
    finally:
        conn.close()


# ── FastAPI dependency ───────────────────────────────────────
def get_db():
    """FastAPI dependency — yields SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
