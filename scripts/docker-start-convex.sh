#!/bin/sh
set -eu

cd /workspace

if [ ! -d node_modules/convex ]; then
  echo "Installing dependencies into the Docker volume..."
  npm ci
fi

if [ -n "${NEXT_PUBLIC_CONVEX_URL:-}" ] || [ -n "${CONVEX_DEPLOYMENT:-}" ] || [ -n "$(find .convex -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
  exec npm run convex:dev
fi

echo "Convex is not configured yet for this workspace."
echo "Recommended local-first bootstrap:"
echo "  docker compose exec convex-dev npm run convex:init:local"
echo "Cloud-backed alternative:"
echo "  docker compose exec convex-dev npm run convex:configure"
echo "Keeping the service alive so docker compose up remains healthy in placeholder mode."

exec tail -f /dev/null
