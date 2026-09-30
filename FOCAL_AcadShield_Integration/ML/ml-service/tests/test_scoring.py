"""
tests/test_scoring.py
──────────────────────
Unit tests for the risk scoring engine and red-flag detection.

Run with:
    pytest tests/test_scoring.py -v
"""
from __future__ import annotations

import pytest

from app.services.risk_scoring import calculate_risk_score, rule_based_scoring
from app.utils.helpers import cap_score, get_risk_level, build_explanation
from app.utils.preprocess import clean_text, extract_red_flags


# ─────────────────────────────────────────────────────────────────────────────
# cap_score
# ─────────────────────────────────────────────────────────────────────────────


def test_cap_score_normal():
    assert cap_score(50) == 50


def test_cap_score_max():
    assert cap_score(150) == 100


def test_cap_score_negative():
    assert cap_score(-10) == 0


def test_cap_score_zero():
    assert cap_score(0) == 0


# ─────────────────────────────────────────────────────────────────────────────
# get_risk_level
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("score,expected", [
    (0, "low"),
    (15, "low"),
    (30, "low"),
    (31, "medium"),
    (60, "medium"),
    (61, "high"),
    (100, "high"),
])
def test_get_risk_level(score, expected):
    assert get_risk_level(score) == expected


# ─────────────────────────────────────────────────────────────────────────────
# clean_text
# ─────────────────────────────────────────────────────────────────────────────


def test_clean_text_removes_urls():
    text = "Visit https://scamsite.xyz now!"
    cleaned = clean_text(text)
    assert "https" not in cleaned
    assert "scamsite" not in cleaned


def test_clean_text_removes_email():
    text = "Contact us at hr@gmail.com for details"
    cleaned = clean_text(text)
    assert "@" not in cleaned


def test_clean_text_lowercase():
    cleaned = clean_text("URGENT JOB OFFER")
    assert cleaned == cleaned.lower()


def test_clean_text_empty():
    assert clean_text("") == ""
    assert clean_text("   ") == ""


def test_clean_text_none():
    assert clean_text(None) == ""  # type: ignore


# ─────────────────────────────────────────────────────────────────────────────
# extract_red_flags
# ─────────────────────────────────────────────────────────────────────────────


def test_red_flag_payment_detected():
    text = "Pay ₹2000 registration fee to secure your position."
    flags = extract_red_flags(text)
    flag_names = [f["flag"] for f in flags]
    assert any("Payment" in name for name in flag_names)


def test_red_flag_urgency_detected():
    text = "Act now! Limited time offer. Apply immediately."
    flags = extract_red_flags(text)
    flag_names = [f["flag"] for f in flags]
    assert any("Urgent" in name for name in flag_names)


def test_red_flag_personal_info():
    text = "Send your Aadhaar card and bank details to confirm."
    flags = extract_red_flags(text)
    flag_names = [f["flag"] for f in flags]
    assert any("Personal" in name for name in flag_names)


def test_red_flag_free_email():
    text = "Apply at hr@gmail.com"
    flags = extract_red_flags(text)
    flag_names = [f["flag"] for f in flags]
    assert any("Free Email" in name for name in flag_names)


def test_red_flag_clean_text_no_flags():
    text = (
        "We are looking for a software engineer with 3 years of experience. "
        "Apply at careers.techcorp.com."
    )
    flags = extract_red_flags(text)
    assert len(flags) == 0


def test_red_flag_severity_fields():
    text = "Pay ₹2000 registration fee immediately. Send your Aadhaar."
    flags = extract_red_flags(text)
    for flag in flags:
        assert "flag" in flag
        assert "description" in flag
        assert "severity" in flag
        assert flag["severity"] in ("low", "medium", "high")
        assert "weight" in flag


def test_red_flag_deduplication():
    """Each red flag category should only appear once."""
    text = (
        "Pay registration fee. Pay security deposit. Pay processing fee. "
        "Pay joining fee. Pay application fee."
    )
    flags = extract_red_flags(text)
    flag_names = [f["flag"] for f in flags]
    # Payment category should only appear once
    assert flag_names.count("Payment Request Detected") <= 1


# ─────────────────────────────────────────────────────────────────────────────
# rule_based_scoring
# ─────────────────────────────────────────────────────────────────────────────


def test_rule_based_high_risk():
    result = rule_based_scoring(
        text="Pay ₹2000 registration fee. Urgent! Send Aadhaar immediately.",
        url="",
        email_content="",
    )
    assert result["risk_score"] > 30
    assert result["risk_level"] in ("medium", "high")
    assert len(result["red_flags"]) > 0


def test_rule_based_low_risk():
    result = rule_based_scoring(
        text="Software engineer role at TechCorp. Apply via careers portal.",
        url="",
        email_content="",
    )
    assert result["risk_level"] == "low"


def test_rule_based_score_capped_at_100():
    text = (
        "Pay ₹5000 registration fee. Send Aadhaar, PAN card, bank details. "
        "Earn ₹50000 weekly. Urgent! Act now. Guaranteed job. Crypto investment."
    )
    result = rule_based_scoring(text=text, url="", email_content="")
    assert result["risk_score"] <= 100


def test_rule_based_confidence():
    result = rule_based_scoring("test text", "", "")
    assert 0.0 <= result["confidence"] <= 1.0


def test_rule_based_structure():
    result = rule_based_scoring("test", "", "")
    required = {"risk_score", "risk_level", "red_flags", "confidence", "explanation"}
    assert required.issubset(result.keys())


# ─────────────────────────────────────────────────────────────────────────────
# calculate_risk_score (full engine)
# ─────────────────────────────────────────────────────────────────────────────


def test_calculate_risk_score_empty_input():
    """No inputs → should return a valid fallback result."""
    result = calculate_risk_score()
    assert "risk_score" in result
    assert "risk_level" in result


def test_calculate_risk_score_text_only():
    result = calculate_risk_score(
        text="Pay ₹2000 registration fee! Urgent! No experience needed!"
    )
    assert result["risk_score"] > 0
    assert result["risk_level"] in ("low", "medium", "high")


def test_calculate_risk_score_url_only():
    result = calculate_risk_score(url="https://scamjobs.xyz/apply")
    assert 0 <= result["risk_score"] <= 100


def test_calculate_risk_score_combined():
    result = calculate_risk_score(
        text="Earn ₹50000 weekly. Pay registration fee.",
        url="https://fastjobs.tk/register",
        email_content="From: hr@gmail.com\nSubject: Urgent Offer",
    )
    assert 0 <= result["risk_score"] <= 100
    assert isinstance(result["red_flags"], list)
    assert isinstance(result["explanation"], str)


def test_calculate_risk_breakdown_keys():
    result = calculate_risk_score(text="Test text")
    assert "breakdown" in result
    breakdown = result["breakdown"]
    for key in ("text_score", "url_score", "email_score", "user_report_score"):
        assert key in breakdown


def test_calculate_risk_no_duplicate_flags():
    """Red flags should be deduplicated across components."""
    result = calculate_risk_score(
        text="Pay ₹2000 registration fee. Send Aadhaar.",
        email_content="Pay registration fee to confirm. From: hr@gmail.com",
    )
    flag_names = [f["flag"] for f in result["red_flags"]]
    assert len(flag_names) == len(set(flag_names))


# ─────────────────────────────────────────────────────────────────────────────
# build_explanation
# ─────────────────────────────────────────────────────────────────────────────


def test_explanation_low_risk():
    exp = build_explanation("low", [])
    assert "legitimate" in exp.lower() or "no significant" in exp.lower()


def test_explanation_high_risk():
    flags = [{"flag": "Payment Request", "severity": "high"}]
    exp = build_explanation("high", flags)
    assert "scam" in exp.lower() or "red flag" in exp.lower()


def test_explanation_medium_risk():
    flags = [{"flag": "Urgent Language", "severity": "medium"}]
    exp = build_explanation("medium", flags)
    assert exp  # Non-empty
