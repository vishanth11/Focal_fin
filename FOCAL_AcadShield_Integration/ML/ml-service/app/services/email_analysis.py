"""
FOCAL ML Service — Email analysis service.

Parses email headers, checks SPF/DKIM/DMARC DNS records, detects spoofing
and free-domain senders, and extracts all embedded URLs.
"""
from __future__ import annotations

import email
import logging
import re
from email.parser import HeaderParser
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import dns.resolver

from app.config import config
from app.utils.helpers import cap_score

logger = logging.getLogger(__name__)

_RE_URL_IN_TEXT = re.compile(r"https?://[^\s\"'<>]+", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Header parsing
# ---------------------------------------------------------------------------


def parse_email_headers(email_content: str) -> Dict[str, Optional[str]]:
    """
    Extract key headers from raw email content.

    Returns:
        Dict with keys: from_header, reply_to, return_path,
                        sender_domain, subject, date.
    """
    try:
        parser = HeaderParser()
        msg = parser.parsestr(email_content)
    except Exception:
        # Fall back to simple regex extraction
        return _regex_extract_headers(email_content)

    from_header = msg.get("From", "")
    reply_to = msg.get("Reply-To", "")
    return_path = msg.get("Return-Path", "")
    subject = msg.get("Subject", "")
    date = msg.get("Date", "")

    sender_domain = _extract_domain_from_header(from_header)

    return {
        "from_header": from_header,
        "reply_to": reply_to,
        "return_path": return_path,
        "sender_domain": sender_domain,
        "subject": subject,
        "date": date,
    }


def _regex_extract_headers(content: str) -> Dict[str, Optional[str]]:
    """Fallback header extractor using simple regex."""
    def grab(pattern: str) -> str:
        m = re.search(pattern, content, re.IGNORECASE | re.MULTILINE)
        return m.group(1).strip() if m else ""

    from_h = grab(r"^From:\s*(.+)$")
    return {
        "from_header": from_h,
        "reply_to": grab(r"^Reply-To:\s*(.+)$"),
        "return_path": grab(r"^Return-Path:\s*(.+)$"),
        "sender_domain": _extract_domain_from_header(from_h),
        "subject": grab(r"^Subject:\s*(.+)$"),
        "date": grab(r"^Date:\s*(.+)$"),
    }


def _extract_domain_from_header(header_value: str) -> Optional[str]:
    """Extract the email domain from a 'From' or similar header."""
    if not header_value:
        return None
    m = re.search(r"@([\w.\-]+)", header_value)
    return m.group(1).lower() if m else None


# ---------------------------------------------------------------------------
# DNS checks
# ---------------------------------------------------------------------------


def check_spf_dkim_dmarc(domain: str) -> Dict[str, bool]:
    """
    Check whether a domain has SPF, DKIM, and DMARC DNS records.

    Args:
        domain: Email sender domain (e.g. "company.com").

    Returns:
        Dict with boolean keys: has_spf, has_dkim, has_dmarc.
    """
    result = {"has_spf": False, "has_dkim": False, "has_dmarc": False}
    if not domain:
        return result

    # SPF — TXT record at root domain
    try:
        answers = dns.resolver.resolve(domain, "TXT", lifetime=5)
        for rdata in answers:
            txt = b"".join(rdata.strings).decode("utf-8", errors="ignore")
            if txt.startswith("v=spf1"):
                result["has_spf"] = True
                break
    except Exception:
        pass

    # DMARC — TXT record at _dmarc.<domain>
    try:
        answers = dns.resolver.resolve(f"_dmarc.{domain}", "TXT", lifetime=5)
        for rdata in answers:
            txt = b"".join(rdata.strings).decode("utf-8", errors="ignore")
            if "v=DMARC1" in txt:
                result["has_dmarc"] = True
                break
    except Exception:
        pass

    # DKIM — check common selectors (google, default, mail)
    for selector in ("google", "default", "mail", "dkim", "s1", "s2"):
        try:
            dns.resolver.resolve(f"{selector}._domainkey.{domain}", "TXT", lifetime=3)
            result["has_dkim"] = True
            break
        except Exception:
            continue

    return result


# ---------------------------------------------------------------------------
# Spoofing detection
# ---------------------------------------------------------------------------


def detect_email_spoofing(
    headers: Dict[str, Optional[str]],
) -> Tuple[bool, List[str]]:
    """
    Detect common email spoofing techniques.

    Args:
        headers: Dict returned by parse_email_headers().

    Returns:
        Tuple of (is_spoofed: bool, indicators: list[str]).
    """
    indicators: List[str] = []

    sender_domain = headers.get("sender_domain") or ""
    reply_to_val = headers.get("reply_to") or ""
    return_path_val = headers.get("return_path") or ""

    reply_to_domain = _extract_domain_from_header(reply_to_val)
    return_path_domain = _extract_domain_from_header(return_path_val)

    # 1. From domain ≠ Reply-To domain
    if reply_to_domain and sender_domain and reply_to_domain != sender_domain:
        indicators.append(
            f"From domain ({sender_domain}) differs from Reply-To domain ({reply_to_domain})"
        )

    # 2. From domain ≠ Return-Path domain
    if return_path_domain and sender_domain and return_path_domain != sender_domain:
        indicators.append(
            f"From domain ({sender_domain}) differs from Return-Path domain ({return_path_domain})"
        )

    # 3. Sender uses free email
    if sender_domain and sender_domain in config.FREE_EMAIL_DOMAINS:
        indicators.append(
            f"Sender uses a free email provider ({sender_domain}) instead of a corporate domain"
        )

    # 4. Display name spoofing — check if display name mentions a company
    #    but email is from a different domain
    from_header = headers.get("from_header") or ""
    display_name_match = re.match(r"^(.+?)\s*<", from_header)
    if display_name_match:
        display = display_name_match.group(1).strip().lower()
        known = ["google", "linkedin", "amazon", "microsoft", "infosys", "tcs",
                 "wipro", "accenture", "ibm", "deloitte", "oracle"]
        for brand in known:
            if brand in display and sender_domain and brand not in sender_domain:
                indicators.append(
                    f"Display name mentions '{brand}' but email comes from '{sender_domain}'"
                )

    return bool(indicators), indicators


# ---------------------------------------------------------------------------
# URL extraction
# ---------------------------------------------------------------------------


def extract_links_from_email(email_content: str) -> List[Dict[str, Any]]:
    """
    Find all hyperlinks in an email body and flag mismatches.

    Args:
        email_content: Raw email string.

    Returns:
        List of dicts with keys: url, is_mismatch, anchor_text.
    """
    links: List[Dict[str, Any]] = []

    # Extract plain-text URLs
    plain_urls = _RE_URL_IN_TEXT.findall(email_content)
    for url in plain_urls:
        links.append({"url": url, "is_mismatch": False, "anchor_text": None})

    # If HTML body is present, parse with BeautifulSoup
    try:
        from bs4 import BeautifulSoup  # type: ignore

        # Try to get HTML part from email
        try:
            msg = email.message_from_string(email_content)
            html_body = ""
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    html_body = part.get_payload(decode=True).decode(
                        "utf-8", errors="ignore"
                    )
                    break
        except Exception:
            html_body = email_content  # Treat entire content as HTML

        if html_body:
            soup = BeautifulSoup(html_body, "lxml")
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                anchor = a.get_text(strip=True)
                # Mismatch: anchor looks like a URL but differs from href
                is_mismatch = bool(
                    anchor.startswith("http") and anchor != href
                )
                links.append({
                    "url": href,
                    "is_mismatch": is_mismatch,
                    "anchor_text": anchor or None,
                })
    except Exception as exc:
        logger.debug("BeautifulSoup parsing error: %s", exc)

    # Deduplicate
    seen = set()
    unique_links = []
    for link in links:
        key = link["url"]
        if key not in seen:
            seen.add(key)
            unique_links.append(link)

    return unique_links


# ---------------------------------------------------------------------------
# Full email analysis entry point
# ---------------------------------------------------------------------------


def analyze_email(email_content: str) -> Dict[str, Any]:
    """
    Run full email analysis pipeline.

    Args:
        email_content: Raw email text (headers + body).

    Returns:
        Comprehensive analysis dict consumed by the risk engine.
    """
    if not email_content or not email_content.strip():
        return _empty_result()

    red_flags: List[Dict[str, Any]] = []
    risk_score = 0

    # ── 1. Parse headers ─────────────────────────────────────────────
    headers = parse_email_headers(email_content)
    sender_domain = headers.get("sender_domain") or ""

    # ── 2. DNS checks ─────────────────────────────────────────────────
    dns_result = {"has_spf": False, "has_dkim": False, "has_dmarc": False}
    if sender_domain:
        try:
            dns_result = check_spf_dkim_dmarc(sender_domain)
        except Exception as exc:
            logger.warning("DNS check error for '%s': %s", sender_domain, exc)

    missing_auth = [
        k.replace("has_", "").upper()
        for k, v in dns_result.items()
        if not v
    ]
    if missing_auth:
        risk_score += 10
        red_flags.append({
            "flag": "Missing Email Authentication Records",
            "description": (
                f"The sender domain is missing {', '.join(missing_auth)} records. "
                "Legitimate companies always configure email authentication."
            ),
            "severity": "low",
            "weight": 10,
            "evidence": f"Missing: {', '.join(missing_auth)} for {sender_domain}",
        })

    # ── 3. Spoofing detection ─────────────────────────────────────────
    is_spoofed, spoof_indicators = detect_email_spoofing(headers)
    if is_spoofed:
        risk_score += 25
        for indicator in spoof_indicators:
            red_flags.append({
                "flag": "Email Spoofing Detected",
                "description": indicator,
                "severity": "high",
                "weight": 25,
                "evidence": indicator,
            })

    # ── 4. Free email domain ──────────────────────────────────────────
    if sender_domain in config.FREE_EMAIL_DOMAINS:
        risk_score += 10
        red_flags.append({
            "flag": "Free Email Domain Used",
            "description": (
                f"Email sent from {sender_domain}. "
                "Legitimate companies use their own corporate domain for official communication."
            ),
            "severity": "low",
            "weight": 10,
            "evidence": f"Sender domain: {sender_domain}",
        })

    # ── 5. Link extraction ────────────────────────────────────────────
    links = extract_links_from_email(email_content)
    mismatch_links = [l for l in links if l.get("is_mismatch")]
    if mismatch_links:
        risk_score += 15
        red_flags.append({
            "flag": "Misleading Hyperlinks",
            "description": (
                "Email contains links where the visible text differs from the actual URL. "
                "This is a common phishing tactic."
            ),
            "severity": "high",
            "weight": 15,
            "evidence": f"Found {len(mismatch_links)} misleading link(s)",
        })

    reply_to_domain = _extract_domain_from_header(headers.get("reply_to") or "")

    return {
        "headers": headers,
        "sender_domain": sender_domain,
        "reply_to_domain": reply_to_domain,
        "has_spf": dns_result["has_spf"],
        "has_dkim": dns_result["has_dkim"],
        "has_dmarc": dns_result["has_dmarc"],
        "is_spoofed": is_spoofed,
        "spoofing_indicators": spoof_indicators,
        "links": links,
        "risk_score": cap_score(risk_score),
        "red_flags": red_flags,
    }


def _empty_result() -> Dict[str, Any]:
    return {
        "headers": {},
        "sender_domain": None,
        "reply_to_domain": None,
        "has_spf": False,
        "has_dkim": False,
        "has_dmarc": False,
        "is_spoofed": False,
        "spoofing_indicators": [],
        "links": [],
        "risk_score": 0,
        "red_flags": [],
    }
