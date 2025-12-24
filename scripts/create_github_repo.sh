#!/usr/bin/env bash
set -euo pipefail

REPO_NAME=${1:-alshabandar-trading-app}
VISIBILITY=${2:-public}

if ! command -v gh >/dev/null 2>&1; then
  echo "gh (GitHub CLI) is not installed. Install it and authenticate (gh auth login)." >&2
  exit 2
fi

echo "Creating GitHub repo: $REPO_NAME (visibility: $VISIBILITY)"
gh repo create "$REPO_NAME" --$VISIBILITY --source=. --remote=origin --push

echo "Repository created and pushed. Set GitHub Actions secrets: FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID" 
