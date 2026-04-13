#!/bin/sh
set -eu

cd /workspace

if [ ! -d node_modules/next ]; then
  echo "Installing dependencies into the Docker volume..."
  npm ci
fi

exec npm run dev
