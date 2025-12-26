<#
PowerShell script: deploy-and-verify.ps1
- Deploys Firebase functions (or all functions) and verifies that the expected callable exists.
- Reads projectId from public/config/firebase.json by default (falls back to FIREBASE_PROJECT env var).
- Requires the Firebase CLI to be installed and the user to be logged in (`firebase login`).
#>

Param(
  [switch]$AllFunctions,
  [string]$ProjectId
)

Set-StrictMode -Version Latest

try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    if (-not $ProjectId) {
        $cfgPath = Join-Path $scriptDir "..\public\config\firebase.json"
        if (Test-Path $cfgPath) {
            $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
            $ProjectId = $cfg.projectId
        } else {
            $ProjectId = $env:FIREBASE_PROJECT
        }
    }

    if (-not $ProjectId) {
        Write-Error "Project ID not found. Provide -ProjectId or set FIREBASE_PROJECT or ensure public/config/firebase.json exists."
        exit 2
    }

    Write-Host "Using Firebase project:`t$ProjectId"

    # Ensure user is logged in
    Write-Host "Checking Firebase CLI authentication..."
    $whoami = firebase login:list --project $ProjectId 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Not authenticated. Running 'firebase login'..."
        $res = firebase login
        if ($LASTEXITCODE -ne 0) { Write-Error "Firebase login failed"; exit 3 }
    }

    # Deploy functions
    if ($AllFunctions) {
        Write-Host "Deploying all Firebase functions to project $ProjectId..."
        firebase deploy --only functions --project $ProjectId
    } else {
        Write-Host "Deploying named functions (recommended) to project $ProjectId..."
        # Deploy only functions that changed or new ones; fallback to all if CLI fails
        firebase deploy --only functions:isPlatformAdmin --project $ProjectId 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Named deployment failed, falling back to deploying all functions..."
            firebase deploy --only functions --project $ProjectId
        }
    }

    if ($LASTEXITCODE -ne 0) { Write-Error "Deployment failed"; exit 4 }

    # Verify function exists
    Write-Host "Verifying deployed functions list..."
    $listJson = firebase functions:list --project $ProjectId --json 2>$null | ConvertFrom-Json
    if (-not $listJson) {
        Write-Warning "Could not list functions via CLI JSON output; attempting textual list..."
        firebase functions:list --project $ProjectId
    } else {
        $names = $listJson.functions | ForEach-Object { $_.name }
        Write-Host "Functions deployed:`n" -NoNewline
        $names | ForEach-Object { Write-Host "  - $_" }
        if ($names -contains "projects/$ProjectId/locations/us-central1/functions/isPlatformAdmin") {
            Write-Host "Detected isPlatformAdmin successfully deployed." -ForegroundColor Green
        } else {
            Write-Warning "isPlatformAdmin not detected in functions list. Verify deployment logs in Firebase console."
        }
    }

    # Tail logs for a short time to confirm no runtime initialization errors
    Write-Host "Fetching recent logs for isPlatformAdmin (may require gcloud permissions)..."
    try {
        firebase functions:log --only isPlatformAdmin --project $ProjectId --limit 20
    } catch {
        Write-Warning "Could not fetch function logs using Firebase CLI. Use Firebase Console for logs if needed."
    }

    Write-Host "Deployment and verification finished. Restart your frontend (disable mock mode) and confirm behavior." -ForegroundColor Cyan
    exit 0
} catch {
    Write-Error "Error: $_"
    exit 10
}
