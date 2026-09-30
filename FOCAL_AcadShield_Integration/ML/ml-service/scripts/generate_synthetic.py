"""
scripts/generate_synthetic.py
─────────────────────────────
Generate synthetic training data for the FOCAL scam detection model.

Outputs:
    data/synthetic/fake_jobs.csv          — 50 fake job postings (label=1)
    data/synthetic/legitimate_jobs.csv    — 50 real job postings (label=0)
    data/synthetic/phishing_emails.csv    — 30 phishing emails   (label=1)
    data/synthetic/legitimate_emails.csv  — 30 real emails       (label=0)
    data/synthetic/combined_dataset.csv   — All combined

Usage:
    python scripts/generate_synthetic.py
"""
from __future__ import annotations

import csv
import os
import random
from pathlib import Path

# ── Reproducible randomness ───────────────────────────────────────────────
random.seed(42)

OUTPUT_DIR = Path("data/synthetic")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# Template banks
# ─────────────────────────────────────────────────────────────────────────────

FAKE_JOB_TEMPLATES = [
    "URGENT HIRING! Work from home and earn ₹{amount} weekly. No experience needed. "
    "Pay ₹{fee} registration fee to start immediately. Apply now — limited seats!",

    "Guaranteed job offer for {role}. No interview required. Instant hire! "
    "Send your Aadhaar card and bank details to hr@{fake_domain}.xyz to receive your offer letter.",

    "Earn ₹{amount} daily from home doing simple data entry tasks. "
    "100% placement guaranteed. Registration fee ₹{fee} only. Act now!",

    "Dear Candidate, you have been selected for {role} at {fake_company}. "
    "To confirm your position, pay a security deposit of ₹{fee} via UPI. "
    "Contact: hr.{fake_company}@gmail.com",

    "Work from home opportunity! Earn ₹{amount} per week. "
    "No experience, no interview — instant hire! Limited time offer. "
    "Pay processing fee ₹{fee} to unlock your job kit.",

    "Mega recruitment drive for {role}. Salary ₹{amount}/month guaranteed. "
    "Apply now — last chance! Send PAN card and passport copy immediately.",

    "Join our forex trading team and earn ₹{amount} daily. "
    "No experience required. Pay ₹{fee} joining fee and get started today!",

    "Urgent opening for {role}. Work from home, earn ₹{amount} weekly. "
    "Registration fee: ₹{fee} (refundable). Don't miss this once-in-a-lifetime opportunity!",

    "Congratulations! You are selected for {role} at {fake_company}. "
    "Pay ₹{fee} training fee at the link below. Offer valid for 24 hours only!",

    "Simple copy-paste jobs. Earn ₹{amount} daily without any investment (almost). "
    "One-time registration fee: ₹{fee}. Gmail or Yahoo users preferred.",
]

LEGITIMATE_JOB_TEMPLATES = [
    "We are looking for a talented {role} to join our team at {company}. "
    "You will work on cutting-edge {tech} projects. Requirements: {exp} years of experience, "
    "strong problem-solving skills. Apply through our careers portal at careers.{company_domain}.",

    "{company} is hiring a {role}. The role involves designing and implementing scalable systems. "
    "Qualifications: Bachelor's in CS or related field, {exp}+ years experience. "
    "Competitive salary and benefits. No fees required.",

    "Join {company} as a {role}. We offer flexible work arrangements, health insurance, "
    "and professional development opportunities. "
    "Apply at: https://careers.{company_domain}/jobs/{role_slug}",

    "Exciting opportunity for a {role} at {company}. "
    "You'll collaborate with cross-functional teams to build {tech} solutions. "
    "{exp}+ years of relevant experience required. Send CV to careers@{company_domain}.",

    "{company} seeks an experienced {role} with expertise in {tech}. "
    "Responsibilities include system design, code review, and mentoring. "
    "Package: ₹{salary} LPA. Apply via LinkedIn or our website.",

    "We have an opening for {role} at {company} (established 2008). "
    "This is a full-time, permanent position with a clear growth path. "
    "Submit your application with resume and cover letter to hr@{company_domain}.",

    "Campus recruitment: {company} is visiting {college} for {role} roles. "
    "Eligibility: 70%+ aggregate, 2025 batch. Interview process: aptitude → technical → HR. "
    "Register at: https://campus.{company_domain}",

    "Senior {role} position at {company}. "
    "Skills required: {tech}, {exp} years of hands-on experience. "
    "Package: ₹{salary}–{salary2} LPA based on experience. "
    "Interview: 2 technical rounds + 1 cultural fit round.",

    "{company} is looking for a {role} intern for 6 months. "
    "Stipend: ₹{stipend}/month. You'll work on live projects with our engineering team. "
    "Apply at internshala.com or directly at hr@{company_domain}.",

    "Full-time {role} at {company} — {location}. "
    "We are a Series B startup building {tech} for the Indian market. "
    "Benefits: ESOPs, flexible hours, 25 days PTO. No placement fee, ever.",
]

PHISHING_EMAIL_TEMPLATES = [
    "From: HR Team <hr@{fake_domain}.tk>\n"
    "Reply-To: jobs.team@gmail.com\n"
    "Subject: Urgent: Your Application for {role} Has Been Approved!\n\n"
    "Dear Candidate,\n\nCongratulations! You have been shortlisted for {role}. "
    "To confirm, pay ₹{fee} registration fee at {link}. "
    "Offer expires in 24 hours.\n\nBest,\nHR Department",

    "From: {company} Recruitment <noreply@{fake_domain}.xyz>\n"
    "Subject: FINAL NOTICE — Complete Your Onboarding Now\n\n"
    "Your offer letter is ready. Send your Aadhaar and bank account details "
    "to secure your position. Click here: {link}\n\nHurry — limited positions!",

    "From: jobs@{fake_domain}.ml\n"
    "Reply-To: support.jobs@yahoo.com\n"
    "Subject: Work From Home Job — ₹{amount}/week\n\n"
    "We are pleased to offer you a data entry position earning ₹{amount} weekly. "
    "No experience needed. Pay ₹{fee} to unlock your job kit: {link}",

    "From: Career Advisor <advisor@{fake_domain}.top>\n"
    "Subject: Exclusive Job Offer for You\n\n"
    "You have been selected by our AI system. "
    "This is a guaranteed placement. Pay joining fee ₹{fee} via UPI: {upi_id}. "
    "Offer valid for 12 hours only!",

    "From: Placement Cell <placement@{fake_domain}.cf>\n"
    "Subject: 100% Job Guarantee — Confirm Now\n\n"
    "Dear Student, we guarantee your placement in {company}. "
    "Pay ₹{fee} training fee to our account: {account}. "
    "Share PAN card for verification.",
]

LEGITIMATE_EMAIL_TEMPLATES = [
    "From: Talent Acquisition <talent@{company_domain}>\n"
    "Reply-To: talent@{company_domain}\n"
    "Subject: Interview Invitation — {role} at {company}\n\n"
    "Dear {name},\n\nThank you for applying to {company}. "
    "We would like to invite you for a technical interview on {date}. "
    "No fees are required at any stage.\n\nBest regards,\nTalent Team, {company}",

    "From: HR <hr@{company_domain}>\n"
    "Subject: Offer Letter — {role}\n\n"
    "Dear {name},\n\nWe are pleased to offer you the position of {role} "
    "with a package of ₹{salary} LPA. Please review the attached offer letter "
    "and sign digitally via DocuSign.\n\nWelcome to the team!\n{company}",

    "From: Campus Recruitment <campus@{company_domain}>\n"
    "Subject: Campus Drive — {company} at {college}\n\n"
    "Dear Students,\n\n{company} is conducting a recruitment drive on {date}. "
    "Shortlisted students will be notified via official college email only. "
    "No application fee is required.\n\nGood luck!",

    "From: no-reply@{company_domain}\n"
    "Subject: Application Received — {role}\n\n"
    "Hi {name},\n\nWe have received your application for {role} at {company}. "
    "Our team will review it within 5-7 business days. "
    "You will hear from us at this email address.",

    "From: Recruiter <recruiter@{company_domain}>\n"
    "Subject: Next Steps for {role} Application\n\n"
    "Hi {name},\n\nYou have cleared the initial screening. "
    "The next step is a coding assessment on HackerRank. "
    "Link: https://hackerrank.com/test/{token}\n\n"
    "No payment is required. This is a merit-based process.\n\n{company}",
]

# ─────────────────────────────────────────────────────────────────────────────
# Data pools
# ─────────────────────────────────────────────────────────────────────────────

ROLES = ["Software Engineer", "Data Analyst", "HR Executive", "Marketing Manager",
         "Content Writer", "Customer Support", "Business Development", "Graphic Designer",
         "Product Manager", "QA Engineer"]
COMPANIES = ["TechNova", "InnoSoft", "DataBridge", "CloudSync", "NextStep Solutions",
             "PixelWave", "AlphaCore", "ZenithTech", "BrightMind", "QuickHire"]
COMPANY_DOMAINS = ["technova.in", "innosoft.com", "databridge.io", "cloudsync.co.in",
                   "nextstep.com", "pixelwave.in", "alphacore.com", "zenithtech.co",
                   "brightmind.in", "quickhire.com"]
FAKE_DOMAINS = ["quickjobs", "fastwork", "easyhire", "topearn", "jobguarantee",
                "earnfast", "remotework", "homejobs", "instantjob", "dailyearn"]
TECHS = ["Python", "React", "Node.js", "Machine Learning", "Cloud Infrastructure",
         "DevOps", "Cybersecurity", "Data Engineering", "iOS Development", "Blockchain"]
LOCATIONS = ["Bangalore", "Mumbai", "Chennai", "Hyderabad", "Pune", "Delhi", "Remote"]
COLLEGES = ["IIT Bombay", "NIT Trichy", "VIT Vellore", "Anna University", "BITS Pilani"]
NAMES = ["Rahul", "Priya", "Arjun", "Sneha", "Ravi", "Deepa", "Vikram", "Ananya"]
LINKS = ["http://pay.earnfast.tk/confirm", "http://secure-jobs.xyz/pay",
         "https://bit.ly/3xFakeSite", "http://joboffer.top/register"]


def _fake_data() -> dict:
    return {
        "role": random.choice(ROLES),
        "amount": random.randint(10, 80) * 1000,
        "fee": random.randint(5, 50) * 100,
        "fake_domain": random.choice(FAKE_DOMAINS),
        "fake_company": random.choice(COMPANIES),
        "link": random.choice(LINKS),
        "upi_id": f"pay.{random.choice(FAKE_DOMAINS)}@ybl",
        "account": f"HDFC00{random.randint(10000, 99999)}",
    }


def _real_data() -> dict:
    idx = random.randint(0, len(COMPANIES) - 1)
    return {
        "role": random.choice(ROLES),
        "role_slug": random.choice(ROLES).lower().replace(" ", "-"),
        "company": COMPANIES[idx],
        "company_domain": COMPANY_DOMAINS[idx],
        "tech": random.choice(TECHS),
        "exp": random.randint(1, 6),
        "salary": random.randint(5, 25),
        "salary2": random.randint(26, 50),
        "stipend": random.randint(8, 20) * 1000,
        "location": random.choice(LOCATIONS),
        "college": random.choice(COLLEGES),
        "name": random.choice(NAMES),
        "date": "2025-02-10",
        "token": f"abc{random.randint(1000, 9999)}",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Generation helpers
# ─────────────────────────────────────────────────────────────────────────────


def _gen(templates, data_fn, n: int, label: int) -> list:
    rows = []
    for _ in range(n):
        tpl = random.choice(templates)
        try:
            text = tpl.format(**data_fn())
        except KeyError:
            text = tpl  # Use as-is if a key is missing
        rows.append({"text": text, "label": label})
    return rows


def _save_csv(rows: list, path: Path) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "label"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Saved {len(rows):>3} rows -> {path}")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────


def main() -> None:
    print("Generating synthetic training data…\n")

    fake_jobs = _gen(FAKE_JOB_TEMPLATES, _fake_data, 50, label=1)
    legit_jobs = _gen(LEGITIMATE_JOB_TEMPLATES, _real_data, 50, label=0)
    phishing_emails = _gen(PHISHING_EMAIL_TEMPLATES, _fake_data, 30, label=1)
    legit_emails = _gen(LEGITIMATE_EMAIL_TEMPLATES, _real_data, 30, label=0)

    _save_csv(fake_jobs, OUTPUT_DIR / "fake_jobs.csv")
    _save_csv(legit_jobs, OUTPUT_DIR / "legitimate_jobs.csv")
    _save_csv(phishing_emails, OUTPUT_DIR / "phishing_emails.csv")
    _save_csv(legit_emails, OUTPUT_DIR / "legitimate_emails.csv")

    combined = fake_jobs + legit_jobs + phishing_emails + legit_emails
    random.shuffle(combined)
    _save_csv(combined, OUTPUT_DIR / "combined_dataset.csv")

    fake_total = sum(1 for r in combined if r["label"] == 1)
    legit_total = sum(1 for r in combined if r["label"] == 0)
    print(f"\nDone! Total: {len(combined)} samples "
          f"({fake_total} fake / {legit_total} legitimate)")


if __name__ == "__main__":
    main()
