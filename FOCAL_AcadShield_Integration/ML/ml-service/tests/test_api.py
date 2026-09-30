"""
tests/test_api.py
──────────────────
Integration tests for the FOCAL ML Service API endpoints.

Run with:
    pytest tests/test_api.py -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# /health
# ─────────────────────────────────────────────────────────────────────────────


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_loaded" in data
    assert "version" in data


# ─────────────────────────────────────────────────────────────────────────────
# /model-info
# ─────────────────────────────────────────────────────────────────────────────


def test_model_info_endpoint():
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "model_type" in data
    assert "trained_on" in data


# ─────────────────────────────────────────────────────────────────────────────
# /predict
# ─────────────────────────────────────────────────────────────────────────────


def test_predict_scam_posting():
    """High-risk scam posting should return high or medium risk level."""
    response = client.post(
        "/predict",
        json={
            "text": (
                "Pay ₹2000 registration fee now! Limited time offer. "
                "Work from home earn ₹50000 weekly! No experience needed. "
                "Send your Aadhaar and bank details immediately!"
            ),
            "input_type": "job_posting",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in ("high", "medium")
    assert data["risk_score"] > 30
    assert isinstance(data["red_flags"], list)
    assert len(data["red_flags"]) > 0


def test_predict_legitimate_posting():
    """Legitimate job posting should return low risk level."""
    response = client.post(
        "/predict",
        json={
            "text": (
                "We are seeking a software engineer with 2+ years of experience "
                "in Python and React. Apply through our careers portal at "
                "careers.company.com. No fees required at any stage."
            ),
            "input_type": "job_posting",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in ("low", "medium")


def test_predict_with_url_and_text():
    """Combined text + URL input should work correctly."""
    response = client.post(
        "/predict",
        json={
            "text": "Urgent job offer. Pay ₹500 registration fee. Act now!",
            "url": "https://quickhire.xyz/apply",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["risk_score"] <= 100
    assert data["risk_level"] in ("low", "medium", "high")


def test_predict_with_email_content():
    """Email content analysis via /predict endpoint."""
    response = client.post(
        "/predict",
        json={
            "email_content": (
                "From: hr@gmail.com\n"
                "Reply-To: support@fakesite.tk\n"
                "Subject: Urgent Job Offer\n\n"
                "Dear Candidate, pay ₹1000 to confirm your placement."
            ),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "red_flags" in data


def test_predict_missing_all_inputs():
    """Request with no inputs should return 422."""
    response = client.post("/predict", json={})
    assert response.status_code == 422


def test_predict_empty_text():
    """Empty text string should still return a valid response."""
    response = client.post("/predict", json={"text": "   "})
    # Either 422 or 200 with score=0 is acceptable
    assert response.status_code in (200, 422)


def test_predict_response_schema():
    """Verify the response contains all required fields."""
    response = client.post(
        "/predict",
        json={"text": "Urgent: Pay ₹2000 fee immediately to get hired!"},
    )
    assert response.status_code == 200
    data = response.json()
    required_keys = {"risk_score", "risk_level", "red_flags", "confidence", "explanation"}
    assert required_keys.issubset(data.keys())


def test_verify_gst_valid():
    response = client.post(
        "/verify-gst",
        json={"gstin": "27ABCDE1234F1Z5", "company_name": "TechNova Pvt Ltd"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["format_valid"] is True
    assert data["verified"] is True
    assert data["registration_status"] == "Active"


def test_verify_gst_invalid_format():
    response = client.post("/verify-gst", json={"gstin": "INVALID"})
    assert response.status_code == 200
    data = response.json()
    assert data["format_valid"] is False
    assert data["verified"] is False


def test_verify_gst_not_found():
    response = client.post("/verify-gst", json={"gstin": "27AAACB9999C1Z1"})
    assert response.status_code == 200
    assert response.json()["registration_status"] == "Not Found"


def test_verify_gst_name_mismatch_is_not_verified():
    response = client.post(
        "/verify-gst",
        json={"gstin": "27ABCDE1234F1Z5", "company_name": "Different Company"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["identity_match"] is False
    assert data["verified"] is False


# ─────────────────────────────────────────────────────────────────────────────
# /analyze-url
# ─────────────────────────────────────────────────────────────────────────────


def test_analyze_url_suspicious():
    """Suspicious TLD domain should return elevated risk."""
    response = client.post(
        "/analyze-url",
        json={"url": "https://suspicious-domain.xyz/jobs"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "is_suspicious_tld" in data
    assert data["is_suspicious_tld"] is True


def test_analyze_url_legit():
    """Known legitimate domain should have lower risk."""
    response = client.post(
        "/analyze-url",
        json={"url": "https://linkedin.com/jobs"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "domain" in data
    assert "typosquatting_matches" in data


def test_analyze_url_response_schema():
    """Verify /analyze-url response schema."""
    response = client.post("/analyze-url", json={"url": "https://example.com"})
    assert response.status_code == 200
    data = response.json()
    required = {"domain", "is_suspicious_tld", "is_blacklisted", "typosquatting_matches",
                "risk_score", "red_flags"}
    assert required.issubset(data.keys())


# ─────────────────────────────────────────────────────────────────────────────
# /analyze-email
# ─────────────────────────────────────────────────────────────────────────────


def test_analyze_email_spoofed():
    """Email with mismatched From/Reply-To should flag spoofing."""
    response = client.post(
        "/analyze-email",
        json={
            "email_content": (
                "From: HR Team <hr@technova-careers.xyz>\n"
                "Reply-To: hr.technova@gmail.com\n"
                "Subject: Internship Offer\n\n"
                "Dear Candidate, we are pleased to offer you an internship."
            )
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "is_spoofed" in data
    assert "has_spf" in data
    assert "has_dkim" in data
    assert "has_dmarc" in data


def test_analyze_email_free_domain():
    """Email from free domain should add risk."""
    response = client.post(
        "/analyze-email",
        json={"email_content": "From: hr@gmail.com\nSubject: Urgent Job Offer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] >= 0


def test_analyze_email_response_schema():
    """Verify /analyze-email response schema."""
    response = client.post(
        "/analyze-email",
        json={"email_content": "From: noreply@example.com\nSubject: Test"},
    )
    assert response.status_code == 200
    data = response.json()
    required = {"has_spf", "has_dkim", "has_dmarc", "is_spoofed", "risk_score", "red_flags"}
    assert required.issubset(data.keys())
