"""Demo GST records used only when GST_API_PROVIDER=mock."""

MOCK_GST_DATABASE = {
    "27ABCDE1234F1Z5": {
        "legal_name": "TechNova Private Limited",
        "trade_name": "TechNova",
        "registration_status": "Active",
        "business_type": "Private Limited Company",
        "registration_date": "2018-07-15",
        "principal_address": "123, Tech Park, Andheri East, Mumbai, Maharashtra - 400069",
        "state": "Maharashtra",
        "taxpayer_type": "Regular",
    },
    "27XYZAB5678G1Z2": {
        "legal_name": "FakeJobs India LLP",
        "trade_name": "FakeJobs",
        "registration_status": "Cancelled",
        "business_type": "Limited Liability Partnership",
        "registration_date": "2024-01-10",
        "principal_address": "Unknown Address, Mumbai, Maharashtra - 400001",
        "state": "Maharashtra",
        "taxpayer_type": "Composition",
    },
}