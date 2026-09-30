"""
FOCAL ML Service — Text analysis service.

Priority chain for ML scoring:
    1. HuggingFace pretrained BERT model  (no training needed, downloads automatically)
    2. Locally trained sklearn model       (if train_model.py has been run)
    3. Rule-based fallback                 (always works, zero dependencies)

Orchestrates preprocessing, ML inference, and red-flag pattern
matching to produce a unified text-based risk assessment.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.models.text_classifier import get_classifier
from app.models.pretrained_model import predict_score_pretrained, is_available as hf_available
from app.utils.preprocess import extract_red_flags
from app.utils.helpers import cap_score

logger = logging.getLogger(__name__)


def analyze_text(text: str) -> Dict[str, Any]:
    """
    Perform full text-based scam analysis.

    Scoring priority:
        1. HuggingFace BERT pretrained model (best, no training needed)
        2. Locally trained sklearn model     (if available)
        3. Rule-based heuristics only        (always-on fallback)

    Args:
        text: Raw job posting or email body text.

    Returns:
        Dict with keys:
            - ml_score        (int 0-100 or -1 if unavailable)
            - rule_score      (int 0-100)
            - combined_score  (int 0-100)
            - red_flags       (list of dicts)
            - confidence      (float)
            - model_used      (bool)
            - model_source    (str: "huggingface" | "sklearn" | "rules")
    """
    if not text or not text.strip():
        return _empty_result()

    # ── 1. Rule-based red flags (always runs) ─────────────────────────
    red_flags: List[Dict[str, Any]] = extract_red_flags(text)
    rule_score = cap_score(sum(f.get("weight", 0) for f in red_flags))

    # ── 2. ML inference — priority chain ──────────────────────────────
    ml_score = -1
    model_source = "rules"
    confidence = 0.70

    # Try HuggingFace pretrained first
    if hf_available():
        ml_score = predict_score_pretrained(text)
        if ml_score >= 0:
            model_source = "huggingface"
            confidence = 0.92
            logger.debug("Using HuggingFace pretrained model (score=%d)", ml_score)

    # Fall back to locally trained sklearn model
    if ml_score < 0:
        clf = get_classifier()
        ml_score = clf.predict_score(text)
        if ml_score >= 0:
            model_source = "sklearn"
            confidence = 0.88
            logger.debug("Using sklearn trained model (score=%d)", ml_score)

    # ── 3. Combine ML + rule scores ───────────────────────────────────
    model_used = ml_score >= 0
    if model_used:
        # 60% ML + 40% rules for balanced signal, with rules acting as a safety floor
        combined_score = cap_score(max(rule_score, int(ml_score * 0.6 + rule_score * 0.4)))
    else:
        # No ML available — rules only
        combined_score = rule_score
        model_source = "rules"

    return {
        "ml_score": ml_score,
        "rule_score": rule_score,
        "combined_score": combined_score,
        "red_flags": red_flags,
        "confidence": confidence,
        "model_used": model_used,
        "model_source": model_source,
    }


def _empty_result() -> Dict[str, Any]:
    return {
        "ml_score": -1,
        "rule_score": 0,
        "combined_score": 0,
        "red_flags": [],
        "confidence": 0.0,
        "model_used": False,
        "model_source": "rules",
    }
