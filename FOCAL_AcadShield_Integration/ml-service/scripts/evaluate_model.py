"""
scripts/evaluate_model.py
──────────────────────────
Load the saved model and generate a comprehensive evaluation report.

Outputs (saved to models/evaluation/):
    - metrics.json          — Accuracy, precision, recall, F1
    - confusion_matrix.csv  — Raw confusion matrix
    - classification_report.txt
    - top_features.csv      — Top 20 predictive features (linear models)

Usage:
    python scripts/evaluate_model.py
"""
from __future__ import annotations

import json
import sys
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

MODELS_DIR = ROOT / "models"
EVAL_DIR = MODELS_DIR / "evaluation"
EVAL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODELS_DIR / "text_classifier.pkl"
VECTORIZER_PATH = MODELS_DIR / "vectorizer.pkl"
META_PATH = MODELS_DIR / "model_meta.json"


def load_test_data() -> pd.DataFrame:
    """Load combined synthetic dataset for evaluation."""
    from app.utils.preprocess import clean_text

    path = ROOT / "data" / "synthetic" / "combined_dataset.csv"
    if not path.exists():
        raise FileNotFoundError("Run generate_synthetic.py first.")

    df = pd.read_csv(path)
    df["cleaned"] = df["text"].astype(str).apply(clean_text)
    return df


def main() -> None:
    print("=" * 60)
    print("  FOCAL — Model Evaluation")
    print("=" * 60)

    # ── Load model ─────────────────────────────────────────────────────
    if not MODEL_PATH.exists() or not VECTORIZER_PATH.exists():
        print("ERROR: Model not found. Run train_model.py first.")
        sys.exit(1)

    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    print(f"\nLoaded model: {type(model).__name__}")

    # ── Load data ──────────────────────────────────────────────────────
    df = load_test_data()
    _, X_test_df, _, y_test = train_test_split(
        df["cleaned"], df["label"],
        test_size=0.20,
        random_state=42,
        stratify=df["label"],
    )
    X_test_tfidf = vectorizer.transform(X_test_df)

    # ── Predictions ────────────────────────────────────────────────────
    y_pred = model.predict(X_test_tfidf)

    # ROC-AUC (needs predict_proba)
    roc_auc = None
    if hasattr(model, "predict_proba"):
        y_proba = model.predict_proba(X_test_tfidf)[:, 1]
        roc_auc = round(roc_auc_score(y_test, y_proba), 4)

    # ── Metrics ────────────────────────────────────────────────────────
    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
        "roc_auc": roc_auc,
        "test_samples": int(len(y_test)),
    }

    print("\n-- Metrics ------------------------------------------------")
    for k, v in metrics.items():
        print(f"  {k:<20} {v}")

    # -- Confusion matrix -----------------------------------------------
    cm = confusion_matrix(y_test, y_pred)
    print("\n-- Confusion Matrix (rows=actual, cols=predicted) ---------")
    print(f"              Pred Legit  Pred Fake")
    print(f"  Actual Legit  {cm[0,0]:>8}   {cm[0,1]:>8}")
    print(f"  Actual Fake   {cm[1,0]:>8}   {cm[1,1]:>8}")
    pd.DataFrame(
        cm,
        index=["actual_legit", "actual_fake"],
        columns=["pred_legit", "pred_fake"],
    ).to_csv(EVAL_DIR / "confusion_matrix.csv")

    # -- Classification report ------------------------------------------
    report = classification_report(
        y_test, y_pred, target_names=["legitimate", "fake"]
    )
    print("\n-- Classification Report ----------------------------------")
    print(report)
    (EVAL_DIR / "classification_report.txt").write_text(report)

    # -- Feature importance (linear models) ----------------------------
    feature_names = vectorizer.get_feature_names_out()
    top_features = None

    if hasattr(model, "coef_"):
        coef = model.coef_[0]
        top_idx = np.argsort(np.abs(coef))[::-1][:20]
        top_features = pd.DataFrame({
            "feature": feature_names[top_idx],
            "coefficient": coef[top_idx],
        })
        print("\n-- Top 20 Predictive Features ----------------------------")
        print(top_features.to_string(index=False))
        top_features.to_csv(EVAL_DIR / "top_features.csv", index=False)

    elif hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        top_idx = np.argsort(importances)[::-1][:20]
        top_features = pd.DataFrame({
            "feature": feature_names[top_idx],
            "importance": importances[top_idx],
        })
        print("\n-- Top 20 Feature Importances ----------------------------")
        print(top_features.to_string(index=False))
        top_features.to_csv(EVAL_DIR / "top_features.csv", index=False)

    # ── Save metrics ───────────────────────────────────────────────────
    with open(EVAL_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nEvaluation results saved to: {EVAL_DIR}")
    print("Done!")


if __name__ == "__main__":
    main()
