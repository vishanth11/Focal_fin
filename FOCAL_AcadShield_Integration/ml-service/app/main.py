"""
FOCAL ML Service — FastAPI Application Entry Point.

Provides the following endpoints:
    GET  /health          — Service health check
    GET  /model-info      — Trained model metadata
    POST /predict         — Full scam risk analysis
    POST /analyze-url     — URL / domain analysis
    POST /analyze-email   — Email header analysis
"""
from __future__ import annotations

import logging
import os
import time
from collections import defaultdict, deque
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import config
from app.models.text_classifier import get_classifier
from app.models.url_analyzer import extract_domain_info
from app.schemas.request import (
    EmailAnalysisResponse,
    EmailRequest,
    GSTVerifyRequest,
    GSTVerifyResponse,
    HealthResponse,
    ModelInfoResponse,
    PredictRequest,
    PredictResponse,
    RedFlag,
    URLAnalysisResponse,
    URLRequest,
)
from app.services.email_analysis import analyze_email
from app.services.risk_scoring import calculate_risk_score
from app.services.gst_verification import verify_gstin
from app.services.url_analysis import analyze_url

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App initialisation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="FOCAL ML Service",
    description=(
        "AI-powered scam detection API for the FOCAL Trust Platform. "
        "Detects fake job postings, phishing emails, and suspicious domains."
    ),
    version=config.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow only the configured origins (backend service + local frontends).
# Wildcard origins must not be combined with credentials, so we list origins
# explicitly and disable allow_credentials.
_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ML_CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Rate limiting — simple in-memory sliding window per client IP
# ---------------------------------------------------------------------------
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))
RATE_LIMIT_WINDOW_S = int(os.getenv("RATE_LIMIT_WINDOW_S", "60"))
_request_log: defaultdict = defaultdict(deque)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window = _request_log[client_ip]
    while window and now - window[0] > RATE_LIMIT_WINDOW_S:
        window.popleft()
    if len(window) >= RATE_LIMIT_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please try again later."},
        )
    window.append(now)
    return await call_next(request)


# ---------------------------------------------------------------------------
# Request timing middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(elapsed)
    return response


# ---------------------------------------------------------------------------
# Startup — warm up the classifier singleton
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event() -> None:
    logger.info("FOCAL ML Service starting up…")
    clf = get_classifier()
    if clf.is_loaded:
        logger.info("ML model loaded — ready for inference.")
    else:
        logger.warning("ML model NOT loaded — rule-based fallback active.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _to_red_flag_schema(raw: Dict[str, Any]) -> RedFlag:
    return RedFlag(
        flag=raw.get("flag", "Unknown"),
        description=raw.get("description", ""),
        severity=raw.get("severity", "medium"),
        evidence=raw.get("evidence"),
    )


@app.post("/verify-gst", response_model=GSTVerifyResponse, tags=["Verification"])
async def verify_gst_endpoint(payload: GSTVerifyRequest) -> GSTVerifyResponse:
    """Return GST verification evidence without making the OMEN decision."""
    try:
        result = verify_gstin(
            gstin=payload.gstin,
            company_name=payload.company_name,
            company_state=payload.company_state,
            company_address=payload.company_address,
        )
    except Exception as exc:
        logger.exception("GST verification error: %s", exc)
        raise HTTPException(status_code=502, detail="GST verification service unavailable.") from exc

    return GSTVerifyResponse(
        gstin=result["gstin"],
        format_valid=result["format_valid"],
        verified=result["verified"],
        registration_status=result["registration_status"],
        identity_match=result["identity_match"],
        legal_name=result.get("legal_name"),
        trade_name=result.get("trade_name"),
        business_type=result.get("business_type"),
        state=result.get("state"),
        principal_address=result.get("principal_address"),
        taxpayer_type=result.get("taxpayer_type"),
        source=result["source"],
        simulated=result["simulated"],
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        red_flags=[_to_red_flag_schema(flag) for flag in result["red_flags"]],
        confidence=result["confidence"],
        explanation=result["explanation"],
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Service health check",
)
async def health() -> HealthResponse:
    clf = get_classifier()
    return HealthResponse(
        status="healthy",
        model_loaded=clf.is_loaded,
        version=config.VERSION,
    )


@app.get(
    "/model-info",
    response_model=ModelInfoResponse,
    tags=["System"],
    summary="Trained model metadata",
)
async def model_info() -> ModelInfoResponse:
    clf = get_classifier()
    meta = clf.meta
    return ModelInfoResponse(
        model_type=meta.get("model_type", "Logistic Regression with TF-IDF"),
        accuracy=meta.get("accuracy"),
        precision=meta.get("precision"),
        recall=meta.get("recall"),
        f1_score=meta.get("f1_score"),
        trained_on=meta.get("trained_on", "Kaggle Fake Job Postings + Synthetic Data"),
        training_date=meta.get("training_date"),
    )


@app.post(
    "/predict",
    response_model=PredictResponse,
    tags=["Detection"],
    summary="Analyse text / URL / email for scam indicators",
    status_code=status.HTTP_200_OK,
)
async def predict(payload: PredictRequest) -> PredictResponse:
    """
    Run the full scam risk analysis pipeline.

    At least one of `text`, `url`, or `email_content` must be provided.
    """
    if not any([payload.text, payload.url, payload.email_content]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one of 'text', 'url', or 'email_content' is required.",
        )

    try:
        result = calculate_risk_score(
            text=payload.text,
            url=payload.url,
            email_content=payload.email_content,
        )
    except Exception as exc:
        logger.exception("Prediction error: %s", exc)
        raise HTTPException(status_code=500, detail="Internal analysis error.")

    return PredictResponse(
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        red_flags=[_to_red_flag_schema(f) for f in result["red_flags"]],
        confidence=result["confidence"],
        explanation=result["explanation"],
    )


@app.post(
    "/analyze-url",
    response_model=URLAnalysisResponse,
    tags=["Detection"],
    summary="Analyse a URL / domain for risk signals",
    status_code=status.HTTP_200_OK,
)
async def analyze_url_endpoint(payload: URLRequest) -> URLAnalysisResponse:
    try:
        result = analyze_url(payload.url)
    except Exception as exc:
        logger.exception("URL analysis error: %s", exc)
        raise HTTPException(status_code=500, detail="URL analysis failed.")

    domain_info = result.get("domain_info", {})
    age = domain_info.get("domain_age_days")

    return URLAnalysisResponse(
        domain=domain_info.get("registered_domain", payload.url),
        domain_age_days=age,
        is_suspicious_tld=domain_info.get("is_suspicious_tld", False),
        is_blacklisted=result.get("is_blacklisted", False),
        typosquatting_matches=domain_info.get("typosquatting_matches", []),
        risk_score=result["risk_score"],
        red_flags=[_to_red_flag_schema(f) for f in result["red_flags"]],
    )


@app.post(
    "/analyze-email",
    response_model=EmailAnalysisResponse,
    tags=["Detection"],
    summary="Analyse email headers and body for phishing indicators",
    status_code=status.HTTP_200_OK,
)
async def analyze_email_endpoint(payload: EmailRequest) -> EmailAnalysisResponse:
    try:
        result = analyze_email(payload.email_content)
    except Exception as exc:
        logger.exception("Email analysis error: %s", exc)
        raise HTTPException(status_code=500, detail="Email analysis failed.")

    return EmailAnalysisResponse(
        sender_domain=result.get("sender_domain"),
        reply_to_domain=result.get("reply_to_domain"),
        has_spf=result["has_spf"],
        has_dkim=result["has_dkim"],
        has_dmarc=result["has_dmarc"],
        is_spoofed=result["is_spoofed"],
        risk_score=result["risk_score"],
        red_flags=[_to_red_flag_schema(f) for f in result["red_flags"]],
    )


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )
