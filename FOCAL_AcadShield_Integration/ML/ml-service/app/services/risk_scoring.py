"""
FOCAL ML Service — Risk Scoring Engine.

Combines text, URL, and email analysis results into a single risk score
using configurable weights.  Includes a rule-based fallback used when the
ML model is unavailable.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.config import config
from app.utils.helpers import cap_score, get_risk_level, build_explanation

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Main scoring function
# ─────────────────────────────────────────────────────────────────────────────


def calculate_risk_score(
    text: Optional[str] = None,
    url: Optional[str] = None,
    email_content: Optional[str] = None,
    user_report_score: int = 0,
) -> Dict[str, Any]:
    """
    Calculate overall risk score from multiple signals.

    Weights (configurable in Config):
        Text analysis    → 40 %
        URL analysis     → 30 %
        Email analysis   → 20 %
        User reports     → 10 %

    Args:
        text:              Job posting / email body text.
        url:               URL to analyse.
        email_content:     Raw email string.
        user_report_score: Pre-calculated user-report risk (0-100).

    Returns:
        {
            "risk_score":  int (0-100),
            "risk_level":  "low" | "medium" | "high",
            "red_flags":   list[dict],
            "confidence":  float,
            "explanation": str,
            "breakdown":   dict   # component scores
        }
    """
    all_red_flags: List[Dict[str, Any]] = []
    text_score = url_score = email_score = 0
    confidence_total = 0.0

    # ── Text analysis ─────────────────────────────────────────────────────
    if text and text.strip():
        from app.services.text_analysis import analyze_text

        text_result = analyze_text(text)
        text_score = text_result.get("combined_score", 0)
        all_red_flags.extend(text_result.get("red_flags", []))
        confidence_total += text_result.get("confidence", 0.7) * config.TEXT_WEIGHT

    # ── URL analysis ──────────────────────────────────────────────────────
    if url and url.strip():
        from app.services.url_analysis import analyze_url

        url_result = analyze_url(url)
        url_score = url_result.get("risk_score", 0)
        all_red_flags.extend(url_result.get("red_flags", []))
        confidence_total += 0.85 * config.URL_WEIGHT

    # ── Email analysis ────────────────────────────────────────────────────
    if email_content and email_content.strip():
        from app.services.email_analysis import analyze_email

        email_result = analyze_email(email_content)
        email_score = email_result.get("risk_score", 0)
        all_red_flags.extend(email_result.get("red_flags", []))
        confidence_total += 0.80 * config.EMAIL_WEIGHT

    # ── Weighted combination ──────────────────────────────────────────────
    active_weight = (
        (config.TEXT_WEIGHT if text and text.strip() else 0)
        + (config.URL_WEIGHT if url and url.strip() else 0)
        + (config.EMAIL_WEIGHT if email_content and email_content.strip() else 0)
        + (config.USER_REPORT_WEIGHT if user_report_score > 0 else 0)
    )
    weighted = (
        text_score * (config.TEXT_WEIGHT if text and text.strip() else 0)
        + url_score * (config.URL_WEIGHT if url and url.strip() else 0)
        + email_score * (config.EMAIL_WEIGHT if email_content and email_content.strip() else 0)
        + user_report_score * (config.USER_REPORT_WEIGHT if user_report_score > 0 else 0)
    )

    # If no input was provided at all, fall back to rule-based
    if not any([text, url, email_content]):
        return rule_based_scoring("", "", "")

    # Normalize: divide by active weight so single-input scores aren't deflated
    # e.g. text-only: weighted=text*0.4, normalized=text*0.4/0.4 = text (full score)
    normalized = int(weighted / active_weight) if active_weight > 0 else int(weighted)
    final_score = cap_score(normalized)
    risk_level = get_risk_level(final_score)

    # Deduplicate red flags by flag name
    seen_flags: set = set()
    unique_flags: List[Dict[str, Any]] = []
    for flag in all_red_flags:
        key = flag.get("flag", "")
        if key not in seen_flags:
            seen_flags.add(key)
            unique_flags.append(flag)

    # Normalise confidence to [0, 1]
    # When no weights contributed, default to 0.6
    inputs_used = sum([
        bool(text and text.strip()),
        bool(url and url.strip()),
        bool(email_content and email_content.strip()),
    ])
    if inputs_used == 0:
        confidence = 0.0
    else:
        active_weight = (
            (config.TEXT_WEIGHT if text and text.strip() else 0)
            + (config.URL_WEIGHT if url and url.strip() else 0)
            + (config.EMAIL_WEIGHT if email_content and email_content.strip() else 0)
        )
        confidence = round(min(confidence_total / max(active_weight, 0.01), 1.0), 2)

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "red_flags": unique_flags,
        "confidence": confidence,
        "explanation": build_explanation(risk_level, unique_flags),
        "breakdown": {
            "text_score": text_score,
            "url_score": url_score,
            "email_score": email_score,
            "user_report_score": user_report_score,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Rule-based fallback
# ─────────────────────────────────────────────────────────────────────────────


def rule_based_scoring(
    text: str,
    url: str,
    email_content: str,
) -> Dict[str, Any]:
    """
    Simple rule-based scoring — used when the ML model is unavailable
    or as a standalone quick check.

    Uses keyword matching and basic heuristics only.
    """
    import re

    red_flags: List[Dict[str, Any]] = []
    risk_score = 0

    combined_text = " ".join(
        filter(None, [text, url, email_content])
    ).lower()

    _RULES: List[Dict[str, Any]] = [
        # Payment
        {
            "patterns": [
                "registration fee", "security deposit", "processing fee",
                "application fee", "joining fee", "training fee",
                "pay now", "payment required", "refundable deposit",
                "advance payment",
            ],
            "flag": "Payment Request",
            "description": "Found payment-related keywords. Legitimate employers NEVER ask for money.",
            "severity": "high",
            "weight": 25,
        },
        # Urgency
        {
            "patterns": [
                "urgent", "immediately", "limited time", "act now",
                "apply now", "last chance", "today only", "24 hours",
                "don't miss", "hurry",
            ],
            "flag": "Urgent Language",
            "description": "Uses pressure tactics to rush your decision.",
            "severity": "medium",
            "weight": 15,
        },
        # Unrealistic
        {
            "patterns": [
                "no experience needed", "guaranteed job", "instant hire",
                "no interview", "100% placement", "earn weekly",
                "earn daily", "earn per day",
            ],
            "flag": "Unrealistic Promises",
            "description": "Promises that no legitimate employer can make.",
            "severity": "medium",
            "weight": 15,
        },
        # Personal info
        {
            "patterns": [
                "aadhaar", "pan card", "bank details", "account number",
                "ifsc", "passport number", "send your id", "social security",
            ],
            "flag": "Personal Information Request",
            "description": "Requests sensitive personal or financial information upfront.",
            "severity": "high",
            "weight": 20,
        },
        # Free email
        {
            "patterns": [
                "@gmail.com", "@yahoo.com", "@hotmail.com",
                "@outlook.com", "@rediffmail.com",
            ],
            "flag": "Free Email Domain",
            "description": "Company contact uses a free email provider.",
            "severity": "low",
            "weight": 10,
        },
        # Crypto
        {
            "patterns": [
                "cryptocurrency", "bitcoin", "forex trading",
                "crypto investment", "wallet address",
            ],
            "flag": "Cryptocurrency / Forex Indicators",
            "description": "Mentions cryptocurrency or forex in a job context.",
            "severity": "high",
            "weight": 20,
        },
        # Suspicious TLD
        {
            "patterns": [
                ".xyz", ".tk", ".ml", ".ga", ".cf", ".gq",
                ".top", ".loan", ".work",
            ],
            "flag": "Suspicious TLD",
            "description": "Domain uses a TLD commonly associated with scam sites.",
            "severity": "medium",
            "weight": 10,
        },
    ]

    seen: set = set()
    for rule in _RULES:
        if rule["flag"] in seen:
            continue
        for pattern in rule["patterns"]:
            # Use word boundary search where practical
            search_pattern = re.escape(pattern)
            if re.search(search_pattern, combined_text):
                # Find evidence snippet
                m = re.search(search_pattern, combined_text)
                start = max(0, m.start() - 20)
                end = min(len(combined_text), m.end() + 40)
                evidence = f'Found: "{combined_text[start:end].strip()}"'

                red_flags.append({
                    "flag": rule["flag"],
                    "description": rule["description"],
                    "severity": rule["severity"],
                    "weight": rule["weight"],
                    "evidence": evidence,
                })
                risk_score += rule["weight"]
                seen.add(rule["flag"])
                break

    final_score = cap_score(risk_score)
    risk_level = get_risk_level(final_score)

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "red_flags": red_flags,
        "confidence": 0.70,
        "explanation": build_explanation(risk_level, red_flags)
        + " (Rule-based analysis — ML model unavailable)",
        "breakdown": {
            "text_score": final_score,
            "url_score": 0,
            "email_score": 0,
            "user_report_score": 0,
        },
    }
