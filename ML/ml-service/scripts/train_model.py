"""
scripts/train_model.py
───────────────────────
Train the FOCAL fake-job / scam detection classifier.

Steps:
    1. Load data from data/raw and data/synthetic
    2. Combine and shuffle datasets
    3. Preprocess text
    4. Split 80/20 train/test
    5. Train TF-IDF vectorizer
    6. Train & compare multiple models
    7. Save best model + vectorizer + metadata
    8. Print evaluation metrics table

Usage:
    python scripts/train_model.py
"""
from __future__ import annotations

import json
import os
import sys
import time
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
DATA_SYNTHETIC = ROOT / "data" / "synthetic"
DATA_RAW = ROOT / "data" / "raw"
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)

MODEL_PATH = MODELS_DIR / "text_classifier.pkl"
VECTORIZER_PATH = MODELS_DIR / "vectorizer.pkl"
META_PATH = MODELS_DIR / "model_meta.json"

# ── Add project root to path ──────────────────────────────────────────────
sys.path.insert(0, str(ROOT))
from app.utils.preprocess import clean_text
from app.utils.features import extract_tfidf_features


# ─────────────────────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────────────────────


def load_data() -> pd.DataFrame:
    frames = []

    # 1. Synthetic data (always available after generate_synthetic.py)
    synthetic_file = DATA_SYNTHETIC / "combined_dataset.csv"
    if synthetic_file.exists():
        df = pd.read_csv(synthetic_file)
        df = df[["text", "label"]].dropna()
        frames.append(df)
        print(f"  Loaded {len(df):>4} rows from synthetic dataset")
    else:
        print("  WARNING: Synthetic dataset not found. Run generate_synthetic.py first.")

    # 2. Raw Kaggle dataset (optional — user must download manually)
    #    Expected format: CSV with 'description'/'title' and 'fraudulent' columns
    kaggle_path = DATA_RAW / "fake_job_postings.csv"
    if kaggle_path.exists():
        kdf = pd.read_csv(kaggle_path)
        # Combine text columns
        kdf["text"] = (
            kdf.get("title", "").fillna("") + " " +
            kdf.get("company_profile", "").fillna("") + " " +
            kdf.get("description", "").fillna("") + " " +
            kdf.get("requirements", "").fillna("")
        ).str.strip()
        kdf = kdf[kdf["text"].str.len() > 20]
        kdf = kdf.rename(columns={"fraudulent": "label"})[["text", "label"]].dropna()
        frames.append(kdf)
        print(f"  Loaded {len(kdf):>4} rows from Kaggle dataset")

    if not frames:
        raise FileNotFoundError(
            "No training data found.\n"
            "Run: python scripts/generate_synthetic.py\n"
            "Or download the Kaggle dataset to data/raw/fake_job_postings.csv"
        )

    combined = pd.concat(frames, ignore_index=True)
    combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)
    print(f"\n  Total: {len(combined)} samples "
          f"({combined['label'].sum()} fake / {(combined['label'] == 0).sum()} legitimate)\n")
    return combined


# ─────────────────────────────────────────────────────────────────────────────
# Preprocessing
# ─────────────────────────────────────────────────────────────────────────────


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    print("  Cleaning text…")
    df = df.copy()
    df["cleaned"] = df["text"].astype(str).apply(clean_text)
    df = df[df["cleaned"].str.len() > 5].reset_index(drop=True)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Model comparison
# ─────────────────────────────────────────────────────────────────────────────


MODELS = {
    "Logistic Regression": LogisticRegression(
        max_iter=1000, C=1.0, class_weight="balanced", random_state=42
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=200, class_weight="balanced", random_state=42, n_jobs=-1
    ),
    "Linear SVM": LinearSVC(
        C=1.0, class_weight="balanced", max_iter=2000, random_state=42
    ),
    "Naive Bayes": MultinomialNB(alpha=0.1),
}

# Try to add XGBoost if available
try:
    from xgboost import XGBClassifier  # type: ignore
    MODELS["XGBoost"] = XGBClassifier(
        n_estimators=200,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
except ImportError:
    pass


def evaluate_model(model, X_test, y_test) -> dict:
    y_pred = model.predict(X_test)
    return {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main training loop
# ─────────────────────────────────────────────────────────────────────────────


def main() -> None:
    print("=" * 60)
    print("  FOCAL — Scam Detection Model Training")
    print("=" * 60)

    # 1. Load data
    print("\n[1/5] Loading data…")
    df = load_data()

    # 2. Preprocess
    print("[2/5] Preprocessing…")
    df = preprocess(df)

    # 3. Split
    print("[3/5] Splitting dataset (80/20)…")
    X_train, X_test, y_train, y_test = train_test_split(
        df["cleaned"], df["label"],
        test_size=0.20,
        random_state=42,
        stratify=df["label"],
    )
    print(f"  Train: {len(X_train)} | Test: {len(X_test)}")

    # 4. TF-IDF
    print("[4/5] Fitting TF-IDF vectorizer…")
    X_train_tfidf, vectorizer = extract_tfidf_features(
        X_train.tolist(), fit=True
    )
    X_test_tfidf, _ = extract_tfidf_features(
        X_test.tolist(), vectorizer=vectorizer
    )
    print(f"  Vocabulary size: {len(vectorizer.vocabulary_)}")

    # 5. Train & evaluate all models
    print("[5/5] Training models…\n")
    results: dict[str, dict] = {}

    header = f"{'Model':<25} {'Accuracy':>10} {'Precision':>10} {'Recall':>10} {'F1':>10}"
    print(header)
    print("-" * 65)

    for name, model in MODELS.items():
        t0 = time.perf_counter()
        model.fit(X_train_tfidf, y_train)
        elapsed = time.perf_counter() - t0

        metrics = evaluate_model(model, X_test_tfidf, y_test)
        metrics["train_time_s"] = round(elapsed, 2)
        results[name] = metrics

        print(
            f"{name:<25} {metrics['accuracy']:>10.4f} "
            f"{metrics['precision']:>10.4f} {metrics['recall']:>10.4f} "
            f"{metrics['f1_score']:>10.4f}  [{elapsed:.1f}s]"
        )

    # Select best model by F1
    best_name = max(results, key=lambda k: results[k]["f1_score"])
    best_metrics = results[best_name]
    best_model = MODELS[best_name]

    print(f"\n[OK] Best model: {best_name} (F1 = {best_metrics['f1_score']:.4f})")

    # ── Save ───────────────────────────────────────────────────────────
    joblib.dump(best_model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print(f"\nModel saved   -> {MODEL_PATH}")
    print(f"Vectorizer    -> {VECTORIZER_PATH}")

    # Metadata
    from app.utils.helpers import now_iso
    meta = {
        "model_type": f"{best_name} with TF-IDF",
        "accuracy": best_metrics["accuracy"],
        "precision": best_metrics["precision"],
        "recall": best_metrics["recall"],
        "f1_score": best_metrics["f1_score"],
        "trained_on": "Synthetic + Kaggle (if available)",
        "training_date": now_iso()[:10],
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "all_results": results,
    }
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"Metadata      -> {META_PATH}")

    # Full classification report
    y_pred = best_model.predict(X_test_tfidf)
    print("\n-- Classification Report ----------------------------------")
    print(classification_report(y_test, y_pred, target_names=["legitimate", "fake"]))

    print("-- Confusion Matrix ---------------------------------------")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  TN={cm[0,0]}  FP={cm[0,1]}")
    print(f"  FN={cm[1,0]}  TP={cm[1,1]}")
    print("\nTraining complete!")


if __name__ == "__main__":
    main()
