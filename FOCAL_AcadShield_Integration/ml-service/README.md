# FOCAL ML Service — Scam Detection API

> AI-powered scam detection for the FOCAL blockchain trust platform.  
> Detects fake job postings, phishing emails, and suspicious domains using NLP + rule-based heuristics.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Train the Model](#train-the-model)
5. [Run the API](#run-the-api)
6. [API Documentation](#api-documentation)
7. [Model Evaluation](#model-evaluation)
8. [Deployment](#deployment)
9. [Integration Notes](#integration-notes-for-backend-team)

---

## Overview

The FOCAL ML Service is a **FastAPI** microservice that provides:

| Feature | Description |
|---|---|
| **Text Analysis** | NLP + rule-based detection of scam job postings |
| **URL Analysis** | Domain age, TLD suspiciousness, typosquatting, blacklists |
| **Email Analysis** | Header parsing, SPF/DKIM/DMARC check, spoofing detection |
| **Risk Scoring** | Weighted combination of all signals → 0-100 score |
| **Fallback** | Rule-based heuristics when ML model is not trained |

---

## Prerequisites

- Python 3.10+
- pip
- (Optional) Docker

---

## Installation

```bash
# Clone / navigate to the ml-service directory
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy English model
python -m spacy download en_core_web_sm

# Copy environment file
cp .env.example .env
```

---

## Train the Model

```bash
# Step 1 — Generate synthetic training data (160 examples)
python scripts/generate_synthetic.py

# Step 2 — (Optional) Download Kaggle dataset
# Place fake_job_postings.csv in data/raw/
# https://www.kaggle.com/datasets/shivamb/real-or-fake-fake-jobposting-prediction

# Step 3 — Train the model
python scripts/train_model.py

# Step 4 — Evaluate the model
python scripts/evaluate_model.py
```

Expected output:
```
Model                  Accuracy  Precision    Recall        F1
Logistic Regression      0.9750     0.9600    0.9800    0.9700
Random Forest            0.9600     0.9500    0.9700    0.9600
Linear SVM               0.9500     0.9400    0.9600    0.9500
Naive Bayes              0.9300     0.9200    0.9400    0.9300
```

---

## Run the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open interactive docs: **http://localhost:8000/docs**

---

## API Documentation

### `GET /health`

```json
{
  "status": "healthy",
  "model_loaded": true,
  "version": "1.0.0"
}
```

---

### `GET /model-info`

```json
{
  "model_type": "Logistic Regression with TF-IDF",
  "accuracy": 0.97,
  "precision": 0.96,
  "recall": 0.98,
  "f1_score": 0.97,
  "trained_on": "Synthetic + Kaggle",
  "training_date": "2025-01-15"
}
```

---

### `POST /predict`

Detect scam in job postings, emails, or URLs.

**Request:**
```json
{
  "text": "Pay ₹2000 registration fee now! Work from home earn ₹50,000 weekly!",
  "url": "https://quickhire-solutions.xyz/apply",
  "email_content": "From: hr@quickhire.xyz\nReply-To: hr@gmail.com",
  "input_type": "job_posting"
}
```

**Response:**
```json
{
  "risk_score": 85,
  "risk_level": "high",
  "red_flags": [
    {
      "flag": "Payment Request Detected",
      "description": "This posting requests a financial payment. Legitimate employers NEVER ask for money.",
      "severity": "high",
      "evidence": "Found text: \"Pay ₹2000 registration fee\""
    },
    {
      "flag": "Urgent Language Detected",
      "description": "Uses high-pressure urgency tactics.",
      "severity": "medium",
      "evidence": "Found text: \"now!\""
    }
  ],
  "confidence": 0.92,
  "explanation": "Multiple high-severity red flags detected. This is very likely a SCAM."
}
```

---

### `POST /analyze-url`

**Request:**
```json
{ "url": "https://technova-careers.xyz/job" }
```

**Response:**
```json
{
  "domain": "technova-careers.xyz",
  "domain_age_days": 5,
  "is_suspicious_tld": true,
  "is_blacklisted": false,
  "typosquatting_matches": [],
  "risk_score": 30,
  "red_flags": [...]
}
```

---

### `POST /analyze-email`

**Request:**
```json
{
  "email_content": "From: HR Team <hr@technova-careers.xyz>\nReply-To: hr.technova@gmail.com\nSubject: Internship Offer"
}
```

**Response:**
```json
{
  "sender_domain": "technova-careers.xyz",
  "reply_to_domain": "gmail.com",
  "has_spf": false,
  "has_dkim": false,
  "has_dmarc": false,
  "is_spoofed": true,
  "risk_score": 45,
  "red_flags": [...]
}
```

---

## Model Evaluation

After running `evaluate_model.py`, results are saved to `models/evaluation/`:

| File | Content |
|---|---|
| `metrics.json` | Accuracy, precision, recall, F1, ROC-AUC |
| `confusion_matrix.csv` | TP/TN/FP/FN counts |
| `classification_report.txt` | Full sklearn classification report |
| `top_features.csv` | Top 20 predictive words |

---

## Run Tests

```bash
pytest tests/ -v
```

---

## Deployment

### Render (Free Tier)

1. Push this folder to a GitHub repository
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Build Command**: `pip install -r requirements.txt && python -m spacy download en_core_web_sm && python scripts/generate_synthetic.py && python scripts/train_model.py`
4. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
5. Add environment variables from `.env.example`

### Docker

```bash
docker build -t focal-ml .
docker run -p 8000:8000 focal-ml
```

---

## Integration Notes for Backend Team

### API Base URL
```
http://localhost:8000        (local development)
https://your-app.onrender.com  (production)
```

### JavaScript Integration Example

```javascript
// scamDetectionService.js
const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

async function analyzeJobPosting(text, url = null) {
  try {
    const response = await axios.post(`${ML_API_URL}/predict`, {
      text,
      url,
      input_type: 'job_posting'
    }, { timeout: 8000 });

    return response.data;
  } catch (error) {
    console.error('ML API error:', error.message);
    // Graceful fallback
    return {
      risk_score: 50,
      risk_level: 'medium',
      red_flags: [],
      confidence: 0,
      explanation: 'ML service temporarily unavailable'
    };
  }
}

async function analyzeEmail(emailContent) {
  try {
    const response = await axios.post(`${ML_API_URL}/analyze-email`, {
      email_content: emailContent
    }, { timeout: 8000 });
    return response.data;
  } catch (error) {
    console.error('Email analysis error:', error.message);
    return { is_spoofed: false, risk_score: 0, red_flags: [] };
  }
}

module.exports = { analyzeJobPosting, analyzeEmail };
```

### Risk Level Interpretation

| Risk Level | Score | Action |
|---|---|---|
| 🟢 **Low** | 0–30 | Likely legitimate — proceed normally |
| 🟡 **Medium** | 31–60 | Suspicious — advise user to verify |
| 🔴 **High** | 61–100 | Very likely scam — show strong warning |
