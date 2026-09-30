"""GST evidence service used by the existing FOCAL ML API."""
from __future__ import annotations

from typing import Any, Dict, Optional

from app.config import config
from app.data.mock_gst_database import MOCK_GST_DATABASE
from app.utils.gstin_validator import validate_gstin_format
from app.utils.helpers import build_explanation, cap_score, get_risk_level


def _result(
    gstin: str,
    format_valid: bool,
    status: str,
    state: Optional[str],
    legal_name: Optional[str] = None,
    trade_name: Optional[str] = None,
    record: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "gstin": gstin,
        "format_valid": format_valid,
        "format_error": error,
        "verified": format_valid and status.lower() == "active",
        "registration_status": status,
        "identity_match": True,
        "legal_name": legal_name,
        "trade_name": trade_name,
        "business_type": record.get("business_type") if record else None,
        "registration_date": record.get("registration_date") if record else None,
        "principal_address": record.get("principal_address") if record else None,
        "state": state or (record.get("state") if record else None),
        "principal_address": record.get("principal_address") if record else None,
        "taxpayer_type": record.get("taxpayer_type") if record else None,
        "source": f"{config.GST_API_PROVIDER}_api",
        "simulated": config.GST_API_PROVIDER == "mock",
    }


def verify_gstin(
    gstin: str,
    company_name: Optional[str] = None,
    company_state: Optional[str] = None,
    company_address: Optional[str] = None,
) -> Dict[str, Any]:
    validation = validate_gstin_format(gstin)
    value = (gstin or "").strip().upper()
    if not validation["valid"]:
        result = _result(value, False, "Invalid Format", validation.get("state_name"), error=validation["error"])
        return _score(result, company_name, company_state, company_address)

    if config.GST_API_PROVIDER != "mock":
        raise RuntimeError(f"GST provider '{config.GST_API_PROVIDER}' is not implemented")
    record = MOCK_GST_DATABASE.get(value)
    if not record:
        result = _result(value, True, "Not Found", validation.get("state_name"))
        return _score(result, company_name, company_state, company_address)

    result = _result(
        value,
        True,
        record.get("registration_status", "Unknown"),
        record.get("state"),
        record.get("legal_name"),
        record.get("trade_name"),
        record,
    )
    return _score(result, company_name, company_state, company_address)


def _score(
    result: Dict[str, Any],
    company_name: Optional[str],
    company_state: Optional[str],
    company_address: Optional[str],
) -> Dict[str, Any]:
    flags = []
    status = result["registration_status"].lower()
    if not result["format_valid"]:
        flags.append({"flag": "Invalid GSTIN Format", "description": result["format_error"], "severity": "high"})
    elif status == "not found":
        flags.append({"flag": "GSTIN Not Found", "description": "GSTIN was not found in the configured GST source.", "severity": "high"})
    elif status in {"cancelled", "suspended"}:
        flags.append({"flag": f"GST Registration {result['registration_status']}", "description": "GST registration is not active.", "severity": "high"})

    identity_match = True
    if company_name and (result.get("legal_name") or result.get("trade_name")):
        claimed = company_name.lower().strip()
        names = [result.get("legal_name", "").lower(), result.get("trade_name", "").lower()]
        if not any(claimed in name or name in claimed for name in names if name):
            identity_match = False
            flags.append({"flag": "Company Name Mismatch", "description": "Submitted name does not match the GST record.", "severity": "medium"})
    if company_state and result.get("state") and company_state.lower().strip() not in result["state"].lower():
        identity_match = False
        flags.append({"flag": "State Mismatch", "description": "Submitted state does not match the GST record.", "severity": "medium"})
    if company_address and result.get("principal_address"):
        claimed_tokens = {token for token in company_address.lower().replace(",", " ").split() if len(token) > 3}
        registered = result["principal_address"].lower()
        if claimed_tokens and sum(token in registered for token in claimed_tokens) / len(claimed_tokens) < 0.3:
            identity_match = False
            flags.append({"flag": "Address Mismatch", "description": "Submitted address differs from the GST record.", "severity": "low"})

    result["identity_match"] = identity_match
    result["verified"] = bool(result["verified"] and identity_match)
    score = cap_score(len(flags) * 15)
    if status == "cancelled":
        score = max(score, 40)
    elif status == "not found":
        score = max(score, 35)
    level = get_risk_level(score)
    return {
        **result,
        "risk_score": score,
        "risk_level": level,
        "red_flags": flags,
        "confidence": 0.95 if not result["format_valid"] else 0.90,
        "explanation": build_explanation(level, flags) if flags else "GSTIN is valid, active, and matches company details.",
    }