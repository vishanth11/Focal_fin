"""
FOCAL ML Service — Pretrained HuggingFace Model Wrapper.

Uses a BERT-based model fine-tuned on fake job postings from Hugging Face Hub.
No local training required — model downloads automatically on first use (~17MB).

Primary model: mrm8488/bert-tiny-finetuned-fake-job-postings
Fallback:      rule-based scoring (if transformers not installed)
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-loaded pipeline (downloads on first call, cached afterwards)
# ---------------------------------------------------------------------------
_pipeline = None
_pipeline_error: Optional[str] = None

HF_MODEL_ID = "AventIQ-AI/BERT-Spam-Job-Posting-Detection-Model"
MAX_TOKEN_LENGTH = 512  # BERT limit


def _get_pipeline():
    """Load (and cache) the HuggingFace text-classification pipeline."""
    global _pipeline, _pipeline_error

    if _pipeline is not None:
        return _pipeline
    if _pipeline_error:
        return None  # Already failed — don't retry

    try:
        from transformers import pipeline  # type: ignore

        logger.info("Loading HuggingFace model '%s'…", HF_MODEL_ID)
        _pipeline = pipeline(
            "text-classification",
            model=HF_MODEL_ID,
            truncation=True,
            max_length=MAX_TOKEN_LENGTH,
        )
        logger.info("HuggingFace model loaded successfully.")
        return _pipeline
    except ImportError:
        _pipeline_error = "transformers library not installed. Run: pip install transformers torch"
        logger.warning(_pipeline_error)
    except Exception as exc:
        _pipeline_error = str(exc)
        logger.error("Failed to load HuggingFace model: %s", exc)

    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def is_available() -> bool:
    """Return True if the HuggingFace pipeline loaded successfully."""
    return _get_pipeline() is not None


def predict_pretrained(text: str) -> Tuple[float, str]:
    """
    Run inference using the pretrained BERT model.

    Args:
        text: Raw input text (truncated to 512 tokens internally).

    Returns:
        Tuple of (scam_probability: float 0-1, label: str "fake"|"legitimate").
        Returns (-1.0, "unavailable") if model is not loaded.
    """
    pipe = _get_pipeline()
    if pipe is None:
        return -1.0, "unavailable"

    try:
        # Truncate text to avoid token limit issues
        truncated = text[:2000]  # ~512 tokens ≈ 2000 chars
        result = pipe(truncated)[0]

        label_raw = result["label"].upper()  # e.g. "LABEL_1" or "FAKE"
        score = float(result["score"])

        # Normalise label — model may use LABEL_0/LABEL_1 or FAKE/REAL
        if "1" in label_raw or "FAKE" in label_raw or "FRAUD" in label_raw:
            fake_prob = score
        else:
            fake_prob = 1.0 - score

        label = "fake" if fake_prob >= 0.5 else "legitimate"
        return round(fake_prob, 4), label

    except Exception as exc:
        logger.error("HuggingFace inference error: %s", exc)
        return -1.0, "unavailable"


def predict_score_pretrained(text: str) -> int:
    """
    Return a 0-100 risk score from the pretrained model.
    Returns -1 if unavailable.
    """
    prob, label = predict_pretrained(text)
    if prob < 0:
        return -1
    return int(prob * 100)


def get_model_info() -> Dict[str, Any]:
    """Return metadata about the pretrained model."""
    available = is_available()
    return {
        "model_id": HF_MODEL_ID,
        "model_type": "BERT-tiny fine-tuned on Fake Job Postings",
        "source": "Hugging Face Hub",
        "available": available,
        "error": _pipeline_error if not available else None,
        "trained_on": "Fake Job Postings dataset (Kaggle)",
        "note": "Downloads automatically on first use (~17MB)",
    }
