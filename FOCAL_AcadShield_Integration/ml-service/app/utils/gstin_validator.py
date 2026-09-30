"""Validation helpers for Indian GSTIN values."""
from __future__ import annotations

import re
from typing import Any, Dict, Optional

STATE_CODES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
    "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
    "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
    "35": "Andaman & Nicobar", "36": "Telangana", "37": "Andhra Pradesh",
    "38": "Ladakh",
}

GSTIN_PATTERN = re.compile(
    r"^([0-3][0-9])([A-Z]{5}[0-9]{4}[A-Z])([1-9A-Z])Z([0-9A-Z])$",
    re.IGNORECASE,
)


def validate_gstin_format(gstin: Optional[str]) -> Dict[str, Any]:
    if not isinstance(gstin, str) or not gstin.strip():
        return {"valid": False, "error": "GSTIN is missing or empty.", "state_name": None}

    value = gstin.strip().upper()
    if len(value) != 15:
        return {"valid": False, "error": "GSTIN must be exactly 15 characters long.", "state_name": None}

    state_name = STATE_CODES.get(value[:2])
    if not state_name:
        return {"valid": False, "error": "GSTIN contains an invalid state code.", "state_name": None}
    if not GSTIN_PATTERN.fullmatch(value):
        return {"valid": False, "error": "GSTIN structure is invalid.", "state_name": state_name}
    return {"valid": True, "error": None, "state_name": state_name}