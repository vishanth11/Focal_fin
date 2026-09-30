"""
FOCAL ML Service — URL & Domain Analyser.

Provides domain extraction, WHOIS age checking, suspicious-TLD detection,
typosquatting detection, and optional blacklist API queries.
All network calls have timeouts and fail gracefully.
"""
from __future__ import annotations

import ipaddress
import logging
import socket
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import requests
import tldextract

from app.config import config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# SSRF guard — user-supplied URLs are fetched by this service, so only public
# http(s) endpoints on standard ports may be contacted.
# ---------------------------------------------------------------------------
def _fetch_is_safe(target_url: str) -> bool:
    """
    Return True only when the URL is http(s) on a standard port and its host
    resolves to a globally routable address. Blocks loopback, private,
    link-local (e.g. cloud metadata 169.254.169.254), and CGNAT ranges.
    """
    try:
        parsed = urlparse(target_url)
        if parsed.scheme not in ("http", "https"):
            return False
        port = parsed.port
        if port is not None and port not in (80, 443):
            return False
        host = parsed.hostname or ""
        if not host:
            return False
        addrinfos = socket.getaddrinfo(host, None)
        # Every resolved address must be globally routable — reject if any
        # record points at an internal network.
        return all(
            ipaddress.ip_address(sockaddr[0]).is_global
            for _, _, _, _, sockaddr in addrinfos
        )
    except Exception:
        return False

# ---------------------------------------------------------------------------
# Levenshtein distance (used for typosquatting)
# ---------------------------------------------------------------------------
try:
    from Levenshtein import distance as _lev_distance  # type: ignore
except ImportError:
    # Pure-Python fallback
    def _lev_distance(a: str, b: str) -> int:  # type: ignore
        if len(a) < len(b):
            a, b = b, a
        prev = list(range(len(b) + 1))
        for i, ca in enumerate(a):
            curr = [i + 1]
            for j, cb in enumerate(b):
                curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (ca != cb)))
            prev = curr
        return prev[-1]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def extract_domain_info(url: str) -> Dict[str, Any]:
    """
    Extract structured domain information from a URL.

    Args:
        url: A full URL or bare domain string.

    Returns:
        Dict with keys: subdomain, domain, suffix, registered_domain, fqdn.
    """
    if not url:
        return {}
    if not url.startswith(("http://", "https://")):
        url = "http://" + url
    ext = tldextract.extract(url)
    return {
        "subdomain": ext.subdomain,
        "domain": ext.domain,
        "suffix": ext.suffix,
        "registered_domain": getattr(ext, "top_domain_under_public_suffix", getattr(ext, "registered_domain", "")),
        "fqdn": ext.fqdn,
    }


def analyze_domain(url: str) -> Dict[str, Any]:
    """
    Full domain analysis pipeline: age, TLD, typosquatting, redirects.

    Args:
        url: URL to analyse.

    Returns:
        Comprehensive domain analysis dict.
    """
    info = extract_domain_info(url)
    if not info:
        return {"error": "Could not parse URL"}

    registered = info.get("registered_domain", "")
    suffix = "." + info.get("suffix", "") if info.get("suffix") else ""

    result: Dict[str, Any] = {
        "registered_domain": registered,
        "fqdn": info.get("fqdn", ""),
        "tld": suffix,
        "is_suspicious_tld": suffix.lower() in config.SUSPICIOUS_TLDS,
        "domain_age_days": None,
        "is_new_domain": False,
        "typosquatting_matches": [],
        "redirects_to": None,
    }

    # --- Domain age ---
    age = check_domain_age(registered)
    result["domain_age_days"] = age
    if age is not None:
        result["is_new_domain"] = age < config.MIN_DOMAIN_AGE_DAYS

    # --- Typosquatting ---
    result["typosquatting_matches"] = detect_typosquatting(
        info.get("domain", ""), config.KNOWN_JOB_PORTALS
    )

    # --- Redirect check (lightweight, SSRF-guarded) ---
    target = url if url.startswith("http") else f"http://{url}"
    if not _fetch_is_safe(target):
        # Never fetch internal/private targets from user-supplied URLs.
        logger.info("SSRF guard blocked URL fetch for: %s", registered or target)
        result["redirects_to"] = None
    else:
        try:
            # Do NOT follow redirects automatically — read the Location header
            # instead, so a redirector cannot bounce this service to internal
            # networks.
            resp = requests.head(target, allow_redirects=False, timeout=4)
            location = resp.headers.get("Location")
            if location and location.rstrip("/") != target.rstrip("/"):
                result["redirects_to"] = location
        except Exception:
            pass  # Redirect check is best-effort

    return result


def check_domain_age(domain: str) -> Optional[int]:
    """
    Return domain age in days via WHOIS, or None if lookup fails.

    Args:
        domain: Registered domain (e.g. "example.com").
    """
    if not domain:
        return None
    try:
        import whois  # type: ignore

        w = whois.whois(domain)
        creation = w.creation_date
        if isinstance(creation, list):
            creation = creation[0]
        if creation is None:
            return None

        # Make timezone-aware
        if creation.tzinfo is None:
            creation = creation.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        age = (now - creation).days
        return max(0, age)
    except Exception as exc:
        logger.debug("WHOIS lookup failed for '%s': %s", domain, exc)
        return None


def detect_typosquatting(
    domain_name: str,
    known_domains: List[str],
    threshold: int = 2,
) -> List[str]:
    """
    Detect potential typosquatting by comparing domain_name against known domains.

    Args:
        domain_name:   The bare domain name (without TLD) to check.
        known_domains: List of trusted domain strings (e.g. "linkedin.com").
        threshold:     Maximum Levenshtein distance to flag as suspicious.

    Returns:
        List of known domains that are suspiciously similar.
    """
    if not domain_name:
        return []

    matches: List[str] = []
    for known in known_domains:
        known_bare = known.split(".")[0]  # e.g. "linkedin"
        dist = _lev_distance(domain_name.lower(), known_bare.lower())
        if 0 < dist <= threshold:
            matches.append(known)
    return matches


def check_blacklists(domain: str) -> Dict[str, Any]:
    """
    Check domain against external blacklist APIs.

    Currently supports:
        - Google Safe Browsing API
        - VirusTotal API
        - DNS-based blocklist (SURBL)

    All checks are optional and skipped when API keys are absent.

    Args:
        domain: Registered domain string.

    Returns:
        Dict with keys: is_blacklisted, sources.
    """
    result: Dict[str, Any] = {"is_blacklisted": False, "sources": []}

    # --- Google Safe Browsing ---
    gsb_key = config.GOOGLE_SAFE_BROWSING_API_KEY
    if gsb_key:
        try:
            resp = requests.post(
                f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={gsb_key}",
                json={
                    "client": {"clientId": "focal-ml", "clientVersion": "1.0"},
                    "threatInfo": {
                        "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                        "platformTypes": ["ANY_PLATFORM"],
                        "threatEntryTypes": ["URL"],
                        "threatEntries": [{"url": domain}],
                    },
                },
                timeout=5,
            )
            data = resp.json()
            if data.get("matches"):
                result["is_blacklisted"] = True
                result["sources"].append("Google Safe Browsing")
        except Exception as exc:
            logger.debug("GSB check failed: %s", exc)

    # --- VirusTotal ---
    vt_key = config.VIRUSTOTAL_API_KEY
    if vt_key:
        try:
            import base64
            domain_id = base64.urlsafe_b64encode(domain.encode()).decode().strip("=")
            resp = requests.get(
                f"https://www.virustotal.com/api/v3/domains/{domain}",
                headers={"x-apikey": vt_key},
                timeout=5,
            )
            if resp.status_code == 200:
                stats = (
                    resp.json()
                    .get("data", {})
                    .get("attributes", {})
                    .get("last_analysis_stats", {})
                )
                malicious = stats.get("malicious", 0)
                if malicious > 0:
                    result["is_blacklisted"] = True
                    result["sources"].append(f"VirusTotal ({malicious} engines)")
        except Exception as exc:
            logger.debug("VirusTotal check failed: %s", exc)

    # --- DNS-based SURBL check ---
    try:
        bare = domain.split(".")[0]
        check_host = f"{bare}.multi.surbl.org"
        socket.gethostbyname(check_host)
        # If resolution succeeds, the domain is listed
        result["is_blacklisted"] = True
        result["sources"].append("SURBL")
    except socket.gaierror:
        pass  # Domain not listed — expected for clean domains
    except Exception as exc:
        logger.debug("SURBL check error: %s", exc)

    return result
