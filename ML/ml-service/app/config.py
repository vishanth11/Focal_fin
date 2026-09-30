"""
FOCAL ML Service — Configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # --------------- API settings ---------------
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", 8000))
    VERSION: str = "1.0.0"

    # --------------- Model paths ---------------
    MODEL_PATH: str = os.getenv("MODEL_PATH", "models/text_classifier.pkl")
    VECTORIZER_PATH: str = os.getenv("VECTORIZER_PATH", "models/vectorizer.pkl")
    MODEL_META_PATH: str = "models/model_meta.json"

    # --------------- External APIs ---------------
    PHISHTANK_API_KEY: str = os.getenv("PHISHTANK_API_KEY", "")
    GOOGLE_SAFE_BROWSING_API_KEY: str = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", "")
    VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "")
    GST_API_PROVIDER: str = os.getenv("GST_API_PROVIDER", "mock")
    GST_API_KEY: str = os.getenv("GST_API_KEY", "")
    GST_API_SECRET: str = os.getenv("GST_API_SECRET", "")
    GST_API_URL: str = os.getenv("GST_API_URL", "https://api.cleartax.in/v2/gstin")

    # --------------- Risk scoring weights ---------------
    TEXT_WEIGHT: float = 0.40
    URL_WEIGHT: float = 0.30
    EMAIL_WEIGHT: float = 0.20
    GST_WEIGHT: float = 0.25
    USER_REPORT_WEIGHT: float = 0.10

    # --------------- Thresholds ---------------
    LOW_RISK_THRESHOLD: int = int(os.getenv("LOW_RISK_THRESHOLD", 30))
    MEDIUM_RISK_THRESHOLD: int = int(os.getenv("MEDIUM_RISK_THRESHOLD", 60))
    HIGH_RISK_THRESHOLD: int = 100

    # --------------- Domain settings ---------------
    MIN_DOMAIN_AGE_DAYS: int = int(os.getenv("MIN_DOMAIN_AGE_DAYS", 30))

    # Suspicious TLDs
    SUSPICIOUS_TLDS: list = [
        ".tk", ".ml", ".ga", ".cf", ".gq",
        ".xyz", ".top", ".loan", ".work", ".click",
        ".men", ".download", ".racing", ".stream",
    ]

    # Known legitimate job portals (for typosquatting checks)
    KNOWN_JOB_PORTALS: list = [
        "linkedin.com",
        "naukri.com",
        "indeed.com",
        "glassdoor.com",
        "monster.com",
        "shine.com",
        "timesjobs.com",
        "freshersworld.com",
        "internshala.com",
        "hirist.com",
        "foundit.in",
        "instahyre.com",
        "wellfound.com",
        "dice.com",
        "ziprecruiter.com",
    ]

    # Free email providers
    FREE_EMAIL_DOMAINS: list = [
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "rediffmail.com",
        "ymail.com",
        "aol.com",
        "protonmail.com",
        "icloud.com",
        "mail.com",
    ]


config = Config()
