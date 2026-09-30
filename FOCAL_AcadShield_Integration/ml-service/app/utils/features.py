"""
FOCAL ML Service — Feature extraction utilities.

Provides TF-IDF vectorisation and hand-crafted feature extraction
for text, URLs, and domain-level signals.
"""
from __future__ import annotations

import re
import logging
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regex helpers
# ---------------------------------------------------------------------------
_RE_IP = re.compile(
    r"(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)"
)
_URGENT_WORDS = re.compile(
    r"\b(urgent|immediately|asap|limited time|act now|apply now|"
    r"last chance|today only|hurry|deadline today|don.t miss)\b",
    re.IGNORECASE,
)
_PAYMENT_WORDS = re.compile(
    r"\b(fee|deposit|payment|pay|charge|refund|transfer|wallet|"
    r"registration fee|processing fee|joining fee)\b",
    re.IGNORECASE,
)
_PERSONAL_INFO_WORDS = re.compile(
    r"\b(aadhaar|pan card|passport|bank details|account number|"
    r"ifsc|ssn|social security|send your id)\b",
    re.IGNORECASE,
)

# Suspicious TLDs (kept as a frozenset for O(1) look-up)
_SUSPICIOUS_TLDS = frozenset(
    [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top",
     ".loan", ".work", ".click", ".men", ".download", ".racing", ".stream"]
)


# ---------------------------------------------------------------------------
# TF-IDF helpers
# ---------------------------------------------------------------------------


def extract_tfidf_features(
    texts: List[str],
    vectorizer: Optional[TfidfVectorizer] = None,
    fit: bool = False,
) -> Tuple[Any, TfidfVectorizer]:
    """
    Extract TF-IDF features from a list of texts.

    Args:
        texts:      List of cleaned text strings.
        vectorizer: Pre-fitted TfidfVectorizer, or None when fit=True.
        fit:        If True, fit a new vectorizer and return it.

    Returns:
        Tuple of (feature matrix, vectorizer).
    """
    if fit or vectorizer is None:
        vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            sublinear_tf=True,
            strip_accents="unicode",
            analyzer="word",
        )
        features = vectorizer.fit_transform(texts)
        logger.info("TF-IDF vectorizer fitted on %d documents.", len(texts))
    else:
        features = vectorizer.transform(texts)
    return features, vectorizer


# ---------------------------------------------------------------------------
# Hand-crafted text features
# ---------------------------------------------------------------------------


def extract_text_features(text: str) -> Dict[str, float]:
    """
    Extract heuristic numerical features from raw text.

    Returns a flat dictionary suitable for model input.
    """
    if not text:
        return _empty_text_features()

    length = len(text)
    words = text.split()
    num_words = len(words) if words else 1  # guard division by zero

    features: Dict[str, float] = {
        "text_length": length,
        "word_count": num_words,
        "avg_word_length": sum(len(w) for w in words) / num_words,
        "exclamation_count": text.count("!"),
        "question_count": text.count("?"),
        "capital_ratio": sum(1 for c in text if c.isupper()) / max(length, 1),
        "digit_ratio": sum(1 for c in text if c.isdigit()) / max(length, 1),
        "has_urgent_words": float(bool(_URGENT_WORDS.search(text))),
        "has_payment_words": float(bool(_PAYMENT_WORDS.search(text))),
        "has_personal_info_request": float(bool(_PERSONAL_INFO_WORDS.search(text))),
        "rupee_sign_count": text.count("₹"),
        "dollar_sign_count": text.count("$"),
        "uppercase_word_count": sum(1 for w in words if w.isupper() and len(w) > 1),
    }
    return features


def _empty_text_features() -> Dict[str, float]:
    """Return a zeroed feature dict when text is empty."""
    return {
        "text_length": 0.0,
        "word_count": 0.0,
        "avg_word_length": 0.0,
        "exclamation_count": 0.0,
        "question_count": 0.0,
        "capital_ratio": 0.0,
        "digit_ratio": 0.0,
        "has_urgent_words": 0.0,
        "has_payment_words": 0.0,
        "has_personal_info_request": 0.0,
        "rupee_sign_count": 0.0,
        "dollar_sign_count": 0.0,
        "uppercase_word_count": 0.0,
    }


# ---------------------------------------------------------------------------
# URL / domain features
# ---------------------------------------------------------------------------


def extract_url_features(url: str) -> Dict[str, float]:
    """
    Extract heuristic features from a URL string.

    Returns a flat dictionary of numeric signals.
    """
    if not url:
        return _empty_url_features()

    # Normalise
    url_lower = url.lower()

    # Extract domain part (crude, tldextract is used in the analyser)
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url if url.startswith("http") else f"http://{url}")
        hostname = parsed.hostname or ""
        path = parsed.path or ""
    except Exception:
        hostname = url_lower
        path = ""

    # Count subdomains
    parts = hostname.split(".")
    subdomain_count = max(0, len(parts) - 2)

    # TLD suspiciousness
    tld = "." + parts[-1] if parts else ""
    is_suspicious_tld = float(tld in _SUSPICIOUS_TLDS)

    features: Dict[str, float] = {
        "url_length": len(url),
        "hostname_length": len(hostname),
        "path_length": len(path),
        "subdomain_count": subdomain_count,
        "has_ip_address": float(bool(_RE_IP.search(hostname))),
        "has_at_symbol": float("@" in url),
        "hyphen_count_in_domain": hostname.count("-"),
        "dot_count": url.count("."),
        "is_suspicious_tld": is_suspicious_tld,
        "has_https": float(url_lower.startswith("https")),
        "has_port": float(":" in hostname),
        "numeric_in_domain": float(any(c.isdigit() for c in hostname)),
        "special_chars_in_path": float(bool(re.search(r"[%@!]", path))),
    }
    return features


def _empty_url_features() -> Dict[str, float]:
    return {k: 0.0 for k in [
        "url_length", "hostname_length", "path_length", "subdomain_count",
        "has_ip_address", "has_at_symbol", "hyphen_count_in_domain",
        "dot_count", "is_suspicious_tld", "has_https", "has_port",
        "numeric_in_domain", "special_chars_in_path",
    ]}
