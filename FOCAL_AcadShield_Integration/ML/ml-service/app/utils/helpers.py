"""
FOCAL ML Service — Miscellaneous helpers.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime
from typing import Any, Dict

logger = logging.getLogger(__name__)


def get_risk_level(score: int) -> str:
    """Map a numeric risk score (0-100) to a human-readable risk level."""
    if score <= 30:
        return "low"
    elif score <= 60:
        return "medium"
    return "high"


def cap_score(score: int, maximum: int = 100) -> int:
    """Clamp a score between 0 and maximum."""
    return max(0, min(score, maximum))


def build_explanation(risk_level: str, red_flags: list) -> str:
    """Generate a human-readable explanation string from scoring results."""
    count = len(red_flags)
    high_flags = [f for f in red_flags if f.get("severity") == "high"]

    if risk_level == "low" and count == 0:
        return (
            "No significant red flags found. This appears to be a legitimate opportunity. "
            "Always verify independently before sharing personal information."
        )
    elif risk_level == "low" and count > 0:
        flag_names = ", ".join(f["flag"] for f in red_flags[:2])
        return (
            f"{count} minor indicator(s) detected ({flag_names}). "
            "Overall risk is low, but verify the company independently before proceeding."
        )
    elif risk_level == "medium":
        return (
            f"{count} suspicious pattern(s) detected. "
            "Exercise caution and verify the company through official sources "
            "before proceeding."
        )
    else:
        high_names = ", ".join(f["flag"] for f in high_flags[:3])
        return (
            f"Multiple high-severity red flags detected ({high_names}). "
            "This is very likely a SCAM. Do NOT pay any money or share personal details. "
            "Report this to cybercrime.gov.in."
        )


def hash_text(text: str) -> str:
    """Return SHA-256 hex digest of text (for caching / deduplication)."""
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()


def now_iso() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.utcnow().isoformat() + "Z"


def safe_get(d: Dict[str, Any], key: str, default: Any = None) -> Any:
    """Safely retrieve a value from a dict, returning default on missing/None."""
    value = d.get(key, default)
    return value if value is not None else default
