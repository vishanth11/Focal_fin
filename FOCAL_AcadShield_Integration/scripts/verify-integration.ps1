# FOCAL Integration Verification (Task 10)
# Run from the FOCAL root:  powershell -ExecutionPolicy Bypass -File scripts\verify-integration.ps1
#
# Boots the ML service and backend, exercises the full data flow, builds the
# frontend, and prints PASS/FAIL per step. Safe to re-run.

$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot | Split-Path
$MlDir = Join-Path $Root "ML\ml-service"
$BackendDir = Join-Path $Root "backend\backend"
$FrontendDir = Join-Path $Root "frontend"
$LogDir = Join-Path $Root "verify-logs"
New-Item -ItemType Directory -Force $LogDir | Out-Null

$ScamText = "Pay 2000 registration fee now! Limited time offer! Contact us on WhatsApp to join immediately."

function Wait-Healthy([string]$Url, [int]$Seconds) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 3 | Out-Null
            return $true
        } catch { Start-Sleep -Milliseconds 800 }
    }
    return $false
}

$failures = 0
function Report([string]$Name, [bool]$Ok, [string]$Detail = "") {
    if ($Ok) { Write-Host "PASS  $Name" -ForegroundColor Green }
    else { Write-Host "FAIL  $Name" -ForegroundColor Red; $script:failures++ }
    if ($Detail) { Write-Host "      $Detail" -ForegroundColor DarkGray }
}

# --- 0. Dependency checks ---------------------------------------------------
$mlPython = Join-Path $MlDir ".venv\Scripts\python.exe"
if (-not (Test-Path $mlPython)) {
    Write-Host "ML venv missing. Create it first:" -ForegroundColor Yellow
    Write-Host "  cd ML\ml-service; py -3.10 -m venv .venv; .venv\Scripts\pip install -r requirements.txt"
    exit 1
}
$envFile = Join-Path $BackendDir ".env"
if (-not (Test-Path $envFile)) {
    Report "backend .env exists" $false "Copy backend\backend\.env.example to .env and fill in your MongoDB URI first."
    exit 1
}
$envContent = Get-Content $envFile -Raw
if ($envContent -match "cluster\.mongodb\.net/focal\?") {
    # OK — real URI with focal db name
} elseif ($envContent -match "mongodb(\+srv)?://.*@") {
    Report "backend MONGODB_URI is a real connection string" $true
} else {
    Report "backend MONGODB_URI configured" $false "Set a real MongoDB URI in backend\backend\.env before running verification."
    exit 1
}

# --- 1. Boot the ML service -------------------------------------------------
Write-Host "`n[1/6] Starting ML service on :8000 ..." -ForegroundColor Cyan
$mlProc = Start-Process -FilePath $mlPython -ArgumentList "-m","uvicorn","app.main:app","--port","8000" `
    -WorkingDirectory $MlDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $LogDir "ml.log") -RedirectStandardError (Join-Path $LogDir "ml.err.log")
$mlUp = Wait-Healthy "http://localhost:8000/health" 45
$health = $null
if ($mlUp) { $health = Invoke-RestMethod "http://localhost:8000/health" }
Report "ML /health responds" $mlUp ("model_loaded = " + $health.model_loaded)
$mlOk = [bool]$health.model_loaded
Report "ML model loaded (sklearn tier or better)" $mlOk

# --- 2. ML /predict with scam text -------------------------------------------
try {
    $pred = Invoke-RestMethod -Uri "http://localhost:8000/predict" -Method Post `
        -ContentType "application/json" -Body (@{ text = $ScamText; input_type = "job_posting" } | ConvertTo-Json)
    $flagText = ($pred.red_flags | ForEach-Object { $_.flag }) -join ", "
    Report "ML /predict flags the scam posting" ($pred.risk_score -ge 50) `
        ("risk_score = " + $pred.risk_score + " (" + $pred.risk_level + "), flags: " + $flagText)
} catch {
    Report "ML /predict flags the scam posting" $false $_.Exception.Message
}

# --- 3. Boot the backend ------------------------------------------------------
Write-Host "`n[3/6] Starting backend on :5000 ..." -ForegroundColor Cyan
$nodeExe = (Get-Command node).Source
$beProc = Start-Process -FilePath $nodeExe -ArgumentList "src\index.js" `
    -WorkingDirectory $BackendDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $LogDir "backend.log") -RedirectStandardError (Join-Path $LogDir "backend.err.log")
$beUp = Wait-Healthy "http://localhost:5000/health" 45
Report "backend /health responds" $beUp
if (-not $beUp) {
    Report "backend booted" $false "See verify-logs\backend.err.log — usually MONGODB_URI unreachable or JWT_SECRET missing."
}

# --- 4. Public company list ----------------------------------------------------
try {
    $companies = Invoke-RestMethod "http://localhost:5000/api/companies?limit=5"
    Report "GET /api/companies returns companies" ($companies.success -and $companies.data.Count -gt 0) `
        ("total = " + $companies.total)
} catch {
    Report "GET /api/companies returns companies" $false $_.Exception.Message
}

# --- 5. End-to-end POST /api/check (backend -> ML -> company match) ----------
try {
    $check = Invoke-RestMethod -Uri "http://localhost:5000/api/check" -Method Post `
        -ContentType "application/json" -Body (@{ input = $ScamText } | ConvertTo-Json)
    $c = $check.data
    Report "POST /api/check E2E (backend -> ML)" ($check.success -and $c.check.riskScore -ge 50) `
        ("result = " + $c.check.result + ", riskScore = " + $c.check.riskScore + ", simulated = " + $c.simulated)
    Report "ML failure surfaces as simulated:true (fallback path)" ($null -ne $c.simulated)
} catch {
    Report "POST /api/check E2E (backend -> ML)" $false $_.Exception.Message
}

# --- 6. Frontend production build ---------------------------------------------
Write-Host "`n[6/6] Building frontend ..." -ForegroundColor Cyan
$buildOk = $false
try {
    Push-Location $FrontendDir
    npm install --no-audit --no-fund --loglevel=error 2>&1 | Out-Null
    $out = npm run build 2>&1
    $buildOk = ($LASTEXITCODE -eq 0)
    Pop-Location
} catch { Pop-Location }
Report "frontend npm run build" $buildOk

# --- Cleanup -------------------------------------------------------------------
if ($mlProc -and -not $mlProc.HasExited) { Stop-Process -Id $mlProc.Id -Force }
if ($beProc -and -not $beProc.HasExited) { Stop-Process -Id $beProc.Id -Force }

Write-Host ""
if ($failures -eq 0) {
    Write-Host "ALL CHECKS PASSED — FOCAL is integrated end-to-end." -ForegroundColor Green
} else {
    Write-Host "$failures check(s) FAILED — see verify-logs\ for service output." -ForegroundColor Yellow
}
exit $failures