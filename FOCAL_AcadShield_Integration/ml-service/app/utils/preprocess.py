"""
FOCAL ML Service — Text preprocessing utilities.

Provides cleaning, tokenisation, lemmatisation, and red-flag pattern detection.
All functions are stateless and safe to call concurrently.
"""
from __future__ import annotations

import re
import logging
from typing import List, Dict, Any

# NOTE: spaCy is imported lazily inside _get_nlp() so the server starts
# even if spaCy is not installed in the current Python environment.

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-load spaCy model (only once per process)
# ---------------------------------------------------------------------------
_NLP = None


def _get_nlp():
    global _NLP
    if _NLP is None:
        try:
            import spacy  # lazy import — only runs when first needed
            _NLP = spacy.load("en_core_web_sm", disable=["parser", "ner"])
            logger.info("spaCy model loaded successfully.")
        except (OSError, ImportError):
            logger.warning(
                "spaCy or 'en_core_web_sm' not available. "
                "Run: pip install spacy && python -m spacy download en_core_web_sm"
            )
            import spacy as _spacy_blank  # type: ignore
            try:
                _NLP = _spacy_blank.blank("en")
            except Exception:
                _NLP = None  # Final fallback — tokenise() will use str.split()
    return _NLP


# ---------------------------------------------------------------------------
# Compiled regex patterns (module-level for performance)
# ---------------------------------------------------------------------------
_RE_URL = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_RE_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b", re.IGNORECASE)
_RE_PHONE = re.compile(
    r"(\+?\d[\d\s\-().]{7,}\d)", re.IGNORECASE
)
_RE_SPECIAL = re.compile(r"[^a-z0-9\s.,!?₹$%/-]")
_RE_WHITESPACE = re.compile(r"\s+")


# ---------------------------------------------------------------------------
# Red-flag pattern registry
# ---------------------------------------------------------------------------
RED_FLAG_PATTERNS: List[Dict[str, Any]] = [
    # --- Payment ---
    {
        "id": "payment_request",
        "flag": "Payment Request Detected",
        "severity": "high",
        "weight": 25,
        "patterns": [
            r"registration\s+fee",
            r"security\s+deposit",
            r"processing\s+fee",
            r"application\s+fee",
            r"joining\s+fee",
            r"training\s+fee",
            r"pay\s+now",
            r"payment\s+required",
            r"refundable\s+deposit",
            r"advance\s+payment",
            r"pay\s+[\₹$]?\s*\d+",
        ],
        "description": (
            "This posting requests a financial payment. "
            "Legitimate employers NEVER ask candidates for money."
        ),
    },
    # --- Urgency ---
    {
        "id": "urgency",
        "flag": "Urgent Language Detected",
        "severity": "medium",
        "weight": 15,
        "patterns": [
            r"\burgent\b",
            r"\bimmediately\b",
            r"\bimmediately\b",
            r"limited\s+time",
            r"\bact\s+now\b",
            r"\bapply\s+now\b",
            r"\blast\s+chance\b",
            r"\btoday\s+only\b",
            r"\b24\s*hours?\b",
            r"\bdon.t\s+miss\b",
            r"\bhurry\b",
            r"\bdeadline\s+today\b",
        ],
        "description": (
            "Uses high-pressure urgency tactics to rush your decision. "
            "Scammers create artificial urgency to prevent careful evaluation."
        ),
    },
    # --- Unrealistic promises ---
    {
        "id": "unrealistic_promises",
        "flag": "Unrealistic Promises Detected",
        "severity": "medium",
        "weight": 15,
        "patterns": [
            r"earn\s+[\₹$]?\s*\d[\d,]+\s*(weekly|daily|per\s+day|per\s+week)",
            r"no\s+experience\s+needed",
            r"guaranteed\s+job",
            r"guaranteed\s+salary",
            r"instant\s+hire",
            r"no\s+interview",
            r"100\s*%\s*(placement|guarantee)",
            r"work\s+from\s+home.{0,30}earn",
            r"be\s+your\s+own\s+boss",
        ],
        "description": (
            "Contains unrealistic salary or placement guarantees. "
            "Real jobs require interviews and cannot guarantee employment."
        ),
    },
    # --- Personal info ---
    {
        "id": "personal_info_request",
        "flag": "Excessive Personal Information Request",
        "severity": "high",
        "weight": 20,
        "patterns": [
            r"\baadhaar\b",
            r"\bpan\s+card\b",
            r"\bbank\s+details?\b",
            r"\baccount\s+number\b",
            r"\bifsc\b",
            r"\bpassport\s+number\b",
            r"\bsend\s+your\s+(id|details|documents?)\b",
            r"\bsocial\s+security\b",
        ],
        "description": (
            "Requests sensitive personal or financial information upfront. "
            "Legitimate employers collect such information only after you join."
        ),
    },
    # --- Crypto / forex ---
    {
        "id": "crypto_forex",
        "flag": "Cryptocurrency / Forex Scam Indicators",
        "severity": "high",
        "weight": 20,
        "patterns": [
            r"\bcryptocurrency\b",
            r"\bbitcoin\b",
            r"\bforex\s+trading\b",
            r"\bcrypto\s+investment\b",
            r"\bwallet\s+address\b",
            r"\bnft\s+investment\b",
        ],
        "description": (
            "Mentions cryptocurrency or forex trading in a job context. "
            "These are common vectors for investment scams."
        ),
    },
    # --- Free email domain ---
    {
        "id": "free_email_domain",
        "flag": "Free Email Domain Used",
        "severity": "low",
        "weight": 10,
        "patterns": [
            r"@gmail\.com",
            r"@yahoo\.com",
            r"@hotmail\.com",
            r"@outlook\.com",
            r"@rediffmail\.com",
            r"@ymail\.com",
        ],
        "description": (
            "Company contact uses a free email provider. "
            "Legitimate companies use their own corporate email domain."
        ),
    },
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def clean_text(text: str) -> str:
    """
    Clean raw text for NLP processing.

    Steps:
        1. Lowercase
        2. Remove URLs
        3. Remove email addresses
        4. Remove phone numbers
        5. Remove non-essential special characters
        6. Collapse whitespace

    Args:
        text: Raw input string.

    Returns:
        Cleaned, normalised string.
    """
    if not text:
        return ""
    text = text.lower()
    text = _RE_URL.sub(" ", text)
    text = _RE_EMAIL.sub(" ", text)
    text = _RE_PHONE.sub(" ", text)
    text = _RE_SPECIAL.sub(" ", text)
    text = _RE_WHITESPACE.sub(" ", text).strip()
    return text


def tokenize(text: str) -> List[str]:
    """
    Tokenise text and remove stop words / single-character tokens.
    Falls back to simple str.split() if spaCy is unavailable.
    """
    nlp = _get_nlp()
    if nlp is None:
        # Simple fallback
        return [w for w in text.split() if len(w) > 1]
    doc = nlp(text)
    tokens = [
        token.text
        for token in doc
        if not token.is_stop and not token.is_punct and len(token.text) > 1
    ]
    return tokens


def lemmatize(tokens: List[str]) -> List[str]:
    """
    Lemmatise a list of tokens using spaCy.
    Falls back to returning tokens unchanged if spaCy is unavailable.
    """
    nlp = _get_nlp()
    if nlp is None:
        return tokens  # Fallback — return as-is
    joined = " ".join(tokens)
    doc = nlp(joined)
    return [token.lemma_ for token in doc if len(token.lemma_) > 1]


def extract_red_flags(text: str) -> List[Dict[str, Any]]:
    """
    Scan text for known scam patterns and return matched red flags.

    Each returned dict contains:
        - flag (str): Human-readable flag name
        - description (str): Explanation
        - severity (str): "low" | "medium" | "high"
        - weight (int): Score contribution
        - evidence (str): Matched snippet

    Args:
        text: Raw input text (will be lowercased internally).

    Returns:
        List of matched red-flag dicts (deduplicated per category).
    """
    if not text:
        return []

    lowered = text.lower()
    results: List[Dict[str, Any]] = []
    seen_ids: set = set()

    for entry in RED_FLAG_PATTERNS:
        if entry["id"] in seen_ids:
            continue
        for pattern in entry["patterns"]:
            match = re.search(pattern, lowered)
            if match:
                # Find surrounding evidence snippet (up to 80 chars)
                start = max(0, match.start() - 20)
                end = min(len(text), match.end() + 40)
                evidence = f'Found text: "{text[start:end].strip()}"'
                results.append(
                    {
                        "flag": entry["flag"],
                        "description": entry["description"],
                        "severity": entry["severity"],
                        "weight": entry["weight"],
                        "evidence": evidence,
                    }
                )
                seen_ids.add(entry["id"])
                break  # Only report each category once

    return results
