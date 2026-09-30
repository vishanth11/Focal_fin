"""
scripts/evaluate_bert.py
────────────────────────
Evaluate the HuggingFace Pretrained BERT model (mrm8488/bert-tiny-finetuned-fake-job-postings)
on test data and print accuracy, precision, recall, F1 score, and sample predictions.

Usage:
    python scripts/evaluate_bert.py
"""
from __future__ import annotations

import sys
import warnings
from pathlib import Path
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)

warnings.filterwarnings("ignore")

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.models.pretrained_model import predict_pretrained, get_model_info, is_available


def main():
    print("=" * 60)
    print("  FOCAL - Pretrained BERT Model Evaluation")
    print("=" * 60)

    info = get_model_info()
    print(f"\nModel ID:   {info['model_id']}")
    print(f"Model Type: {info['model_type']}")

    if not is_available():
        print(f"\n[ERROR] HuggingFace BERT model is not available: {info.get('error')}")
        print("Please install transformers: pip install transformers torch")
        return

    print("Model Status: Loaded and Ready!\n")

    # Load test dataset
    data_path = ROOT / "data" / "synthetic" / "combined_dataset.csv"
    if not data_path.exists():
        print("Test dataset not found. Generating dataset...")
        from scripts.generate_synthetic import main as gen_main
        gen_main()

    df = pd.read_csv(data_path)
    print(f"Evaluating on {len(df)} test samples...\n")

    y_true = df["label"].values
    y_pred = []
    scores = []

    for idx, row in df.iterrows():
        prob, label_str = predict_pretrained(row["text"])
        pred_label = 1 if prob >= 0.5 else 0
        y_pred.append(pred_label)
        scores.append(prob)

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    print("-- Metrics (HuggingFace BERT) -----------------------------")
    print(f"  Accuracy:  {acc:.4f} ({acc*100:.2f}%)")
    print(f"  Precision: {prec:.4f}")
    print(f"  Recall:    {rec:.4f}")
    print(f"  F1-Score:  {f1:.4f}")

    print("\n-- Confusion Matrix (rows=actual, cols=predicted) ---------")
    cm = confusion_matrix(y_true, y_pred)
    print(f"              Pred Legit  Pred Fake")
    print(f"  Actual Legit  {cm[0,0]:>8}   {cm[0,1]:>8}")
    print(f"  Actual Fake   {cm[1,0]:>8}   {cm[1,1]:>8}")

    print("\n-- Classification Report ----------------------------------")
    print(classification_report(y_true, y_pred, target_names=["legitimate", "fake"]))

    print("-- Sample Predictions -------------------------------------")
    sample_df = df.sample(min(5, len(df)), random_state=42)
    for _, r in sample_df.iterrows():
        prob, _ = predict_pretrained(r["text"])
        actual = "FAKE" if r["label"] == 1 else "LEGIT"
        snippet = r["text"][:70].replace("\n", " ")
        print(f"[{actual}] Prob: {prob*100:>5.1f}% | Text: \"{snippet}...\"")

    print("\nBERT Evaluation complete!")


if __name__ == "__main__":
    main()
