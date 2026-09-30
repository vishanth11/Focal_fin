"""
FOCAL ML Service — Text Classifier model wrapper.

Wraps a trained scikit-learn pipeline (TF-IDF + classifier) with
load/predict/explain methods.  Falls back to None gracefully so the
API can switch to rule-based scoring when no trained model exists.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np

from app.config import config
from app.utils.preprocess import clean_text

logger = logging.getLogger(__name__)


class TextClassifier:
    """
    Wrapper around a trained sklearn classifier + TF-IDF vectorizer.

    Usage::

        clf = TextClassifier()
        prob, label = clf.predict("Pay ₹2000 to start working immediately!")
    """

    def __init__(self) -> None:
        self.vectorizer: Optional[Any] = None
        self.model: Optional[Any] = None
        self._model_meta: Dict[str, Any] = {}
        self._loaded: bool = False
        self.load_model()

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def load_model(self) -> None:
        """
        Attempt to load pre-trained model and vectorizer from disk.
        Sets self._loaded = True on success, False otherwise.
        """
        model_path = config.MODEL_PATH
        vectorizer_path = config.VECTORIZER_PATH

        if not os.path.exists(model_path) or not os.path.exists(vectorizer_path):
            logger.warning(
                "Model files not found at '%s' / '%s'. "
                "API will use rule-based fallback until model is trained.",
                model_path,
                vectorizer_path,
            )
            self._loaded = False
            return

        try:
            self.model = joblib.load(model_path)
            self.vectorizer = joblib.load(vectorizer_path)
            self._loaded = True
            logger.info("ML model loaded successfully from '%s'.", model_path)
        except Exception as exc:
            logger.error("Failed to load model: %s", exc)
            self._loaded = False

        # Load metadata (accuracy, f1, etc.) if available
        if os.path.exists(config.MODEL_META_PATH):
            try:
                with open(config.MODEL_META_PATH, "r", encoding="utf-8") as f:
                    self._model_meta = json.load(f)
            except Exception:
                pass

    @property
    def is_loaded(self) -> bool:
        """Return True if model is ready for inference."""
        return self._loaded

    @property
    def meta(self) -> Dict[str, Any]:
        """Return model metadata (accuracy, f1, training date, etc.)."""
        return self._model_meta

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(self, text: str) -> Tuple[float, str]:
        """
        Predict whether the text is a scam (fake) or legitimate.

        Args:
            text: Raw input text.

        Returns:
            Tuple of (scam_probability: float, label: str).
            label is "fake" or "legitimate".

        Raises:
            RuntimeError: If model is not loaded.
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Train the model first.")

        cleaned = clean_text(text)
        features = self.vectorizer.transform([cleaned])

        # Support both predict_proba and decision_function models
        if hasattr(self.model, "predict_proba"):
            proba = self.model.predict_proba(features)[0]
            # Class order: [legitimate=0, fake=1] — verify during training
            fake_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])
        else:
            # Decision function — convert to 0-1 range with sigmoid
            score = self.model.decision_function(features)[0]
            fake_prob = float(1 / (1 + np.exp(-score)))

        label = "fake" if fake_prob >= 0.5 else "legitimate"
        return round(fake_prob, 4), label

    def predict_score(self, text: str) -> int:
        """
        Return a 0-100 ML-derived risk score.
        Returns -1 if model is not loaded (caller should use fallback).
        """
        if not self._loaded:
            return -1
        try:
            prob, _ = self.predict(text)
            return int(prob * 100)
        except Exception as exc:
            logger.error("Prediction error: %s", exc)
            return -1

    # ------------------------------------------------------------------
    # Explanation
    # ------------------------------------------------------------------

    def explain(self, text: str, top_n: int = 10) -> List[Dict[str, Any]]:
        """
        Explain the model prediction using top TF-IDF feature weights.

        Args:
            text:  Input text.
            top_n: Number of top features to return.

        Returns:
            List of dicts with 'feature' and 'weight' keys.
        """
        if not self._loaded:
            return []

        try:
            cleaned = clean_text(text)
            features = self.vectorizer.transform([cleaned])
            feature_names = self.vectorizer.get_feature_names_out()

            # For linear models we can read coefficients directly
            if hasattr(self.model, "coef_"):
                coef = self.model.coef_[0]
                non_zero = features.nonzero()[1]
                scored = [
                    {"feature": feature_names[i], "weight": float(coef[i])}
                    for i in non_zero
                ]
                scored.sort(key=lambda x: abs(x["weight"]), reverse=True)
                return scored[:top_n]

            # For tree-based models use feature importances × TF-IDF value
            elif hasattr(self.model, "feature_importances_"):
                importances = self.model.feature_importances_
                non_zero = features.nonzero()[1]
                scored = [
                    {"feature": feature_names[i], "weight": float(importances[i])}
                    for i in non_zero
                ]
                scored.sort(key=lambda x: x["weight"], reverse=True)
                return scored[:top_n]

        except Exception as exc:
            logger.warning("Explanation failed: %s", exc)

        return []


# Module-level singleton — imported by services
_classifier: Optional[TextClassifier] = None


def get_classifier() -> TextClassifier:
    """Return the module-level TextClassifier singleton."""
    global _classifier
    if _classifier is None:
        _classifier = TextClassifier()
    return _classifier
