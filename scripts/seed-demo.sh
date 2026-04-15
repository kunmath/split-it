#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: sh /workspace/scripts/seed-demo.sh <owner-email>" >&2
  exit 1
fi

cd /workspace 2>/dev/null || cd "$(dirname "$0")/.."

OWNER_EMAIL="$1"

npx convex run internal.demo.seedForEmail "$(printf '{"ownerEmail":"%s"}' "$OWNER_EMAIL")"
