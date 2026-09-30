"""
FOCAL ML Service — URL analysis service.

Orchestrates domain analysis and blacklist checks, translates findings
into scored red flags, and returns a unified dict for the risk engine.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.models.url_analyzer import analyze_domain, check_blacklists
from app.config import config
from app.utils.helpers import cap_score

logger = logging.getLogger(__name__)


def analyze_url(url: str) -> Dict[str, Any]:
    """
    Full URL/domain risk analysis.

    Args:
        url: URL string to analyse.

    Returns:
        Dict with keys:
            - domain_info (dict)
            - risk_score (int 0-100)
            - red_flags (list)
    """
    if not url or not url.strip():
        return _empty_result()

    red_flags: List[Dict[str, Any]] = []
    risk_score = 0

    # ── 1. Domain analysis ───────────────────────────────────────────
    try:
        domain_info = analyze_domain(url)
    except Exception as exc:
        logger.warning("Domain analysis error for '%s': %s", url, exc)
        domain_info = {"error": str(exc)}

    # ── 2. Score domain signals ──────────────────────────────────────
    if domain_info.get("is_suspicious_tld"):
        risk_score += 10
        red_flags.append({
            "flag": "Suspicious TLD Detected",
            "description": (
                f"The domain uses a suspicious TLD ({domain_info.get('tld')}). "
                "Free or exotic TLDs are commonly used by scammers."
            ),
            "severity": "medium",
            "weight": 10,
            "evidence": f"TLD: {domain_info.get('tld')}",
        })

    age = domain_info.get("domain_age_days")
    if age is not None and age < config.MIN_DOMAIN_AGE_DAYS:
        risk_score += 20
        red_flags.append({
            "flag": "Newly Registered Domain",
            "description": (
                f"This domain was registered only {age} day(s) ago. "
                "Scam sites typically use freshly created domains."
            ),
            "severity": "high",
            "weight": 20,
            "evidence": f"Domain age: {age} days",
        })

    typo_matches = domain_info.get("typosquatting_matches", [])
    if typo_matches:
        risk_score += 25
        red_flags.append({
            "flag": "Typosquatting Detected",
            "description": (
                "This domain closely resembles a well-known job portal or company. "
                "It may be impersonating a legitimate site."
            ),
            "severity": "high",
            "weight": 25,
            "evidence": f"Similar to: {', '.join(typo_matches[:3])}",
        })

    # ── 3. Blacklist check ───────────────────────────────────────────
    registered = domain_info.get("registered_domain", "")
    blacklist_result: Dict[str, Any] = {"is_blacklisted": False, "sources": []}
    if registered:
        try:
            blacklist_result = check_blacklists(registered)
        except Exception as exc:
            logger.warning("Blacklist check failed for '%s': %s", registered, exc)

    if blacklist_result.get("is_blacklisted"):
        risk_score += 30
        sources = ", ".join(blacklist_result.get("sources", []))
        red_flags.append({
            "flag": "Blacklisted Domain",
            "description": (
                "This domain appears in known phishing/malware blacklists. "
                "Do NOT visit or interact with this site."
            ),
            "severity": "high",
            "weight": 30,
            "evidence": f"Listed in: {sources}",
        })

    return {
        "domain_info": domain_info,
        "is_blacklisted": blacklist_result.get("is_blacklisted", False),
        "blacklist_sources": blacklist_result.get("sources", []),
        "risk_score": cap_score(risk_score),
        "red_flags": red_flags,
    }


def _empty_result() -> Dict[str, Any]:
    return {
        "domain_info": {},
        "is_blacklisted": False,
        "blacklist_sources": [],
        "risk_score": 0,
        "red_flags": [],
    }
