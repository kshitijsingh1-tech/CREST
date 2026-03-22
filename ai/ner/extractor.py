"""
CREST — Named Entity Recognition
Extracts structured banking entities from raw complaint text using spaCy.
Entities: amounts, account numbers, dates, bank product names, branch names.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Optional

from backend.utils.logger import get_logger

logger = get_logger("crest.ner")

# Lazy-load spaCy model so imports don't fail if spaCy isn't installed
_nlp = None
_ENABLE_SPACY = os.getenv("ENABLE_SPACY_NER", "0").strip().lower() in {"1", "true", "yes", "on"}


def _get_nlp():
    global _nlp
    if not _ENABLE_SPACY:
        if _nlp is None:
            _nlp = False
        return _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
        except Exception as e:
            _nlp = False
            logger.warning(f"spaCy model load failed: {e}. Using regex-only NER.")
    return _nlp


# ── Banking-domain regex patterns ───────────────────────────
_AMOUNT_RE    = re.compile(r"(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)
_ACCOUNT_RE   = re.compile(r"\b(?:account|A/C|acc)\s*(?:no\.?|number)?\s*[:\-]?\s*(\d{9,18})\b", re.IGNORECASE)
_TXNID_RE     = re.compile(r"\b(?:UPI|UTR|TXN|REF|NEFT|RTGS|transaction)\s*(?:ID|ref|no\.?)?\s*[:\-]?\s*([A-Z0-9]{10,30})\b", re.IGNORECASE)
_CARD_RE      = re.compile(r"\bcard\s+(?:ending|no\.?|number)?\s*[:\-]?\s*(\d{4})\b", re.IGNORECASE)
_LOANID_RE    = re.compile(r"\b(?:loan|HL|PL|CC)\s*(?:account|no\.?)?\s*[:\-]?\s*([A-Z0-9]{8,20})\b", re.IGNORECASE)

BANKING_PRODUCTS = [
    "UPI", "NEFT", "RTGS", "IMPS", "FD", "RD", "KYC",
    "debit card", "credit card", "net banking", "internet banking",
    "mobile banking", "ATM", "EMI", "home loan", "personal loan",
]


@dataclass
class BankingEntities:
    amounts:     list[str] = field(default_factory=list)
    account_nos: list[str] = field(default_factory=list)
    txn_ids:     list[str] = field(default_factory=list)
    card_last4:  list[str] = field(default_factory=list)
    loan_ids:    list[str] = field(default_factory=list)
    dates:       list[str] = field(default_factory=list)
    products:    list[str] = field(default_factory=list)
    persons:     list[str] = field(default_factory=list)
    locations:   list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v}


def extract(text: str) -> BankingEntities:
    """
    Extract banking entities from complaint text.

    Returns a BankingEntities dataclass.
    Call .to_dict() for JSON serialisation (stored in named_entities JSONB).

    Usage:
        entities = extract(complaint.body)
        db_value = entities.to_dict()
    """
    entities = BankingEntities()

    # ── Regex extraction (banking-specific) ──────────────────
    entities.amounts     = [m.group(1).replace(",", "") for m in _AMOUNT_RE.finditer(text)]
    entities.account_nos = [m.group(1) for m in _ACCOUNT_RE.finditer(text)]
    entities.txn_ids     = [m.group(1).upper() for m in _TXNID_RE.finditer(text)]
    entities.card_last4  = [m.group(1) for m in _CARD_RE.finditer(text)]
    entities.loan_ids    = [m.group(1).upper() for m in _LOANID_RE.finditer(text)]

    # Banking product mentions (case-insensitive keyword match)
    text_lower = text.lower()
    entities.products = [p for p in BANKING_PRODUCTS if p.lower() in text_lower]

    # ── spaCy extraction (dates, persons, locations) ─────────
    nlp = _get_nlp()
    if nlp:
        doc = nlp(text)
        for ent in doc.ents:
            if ent.label_ == "DATE":
                entities.dates.append(ent.text)
            elif ent.label_ == "PERSON":
                entities.persons.append(ent.text)
            elif ent.label_ in ("GPE", "LOC", "FAC"):
                entities.locations.append(ent.text)

    # Deduplicate all lists
    for attr in ("amounts", "account_nos", "txn_ids", "card_last4",
                 "loan_ids", "dates", "products", "persons", "locations"):
        setattr(entities, attr, list(dict.fromkeys(getattr(entities, attr))))

    return entities
