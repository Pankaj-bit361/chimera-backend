#!/bin/bash
# Elastic Beanstalk prebuild hook: build the TypeScript on the instance so the
# deploy works whether the pipeline ships raw source or a prebuilt artifact.
set -euo pipefail
cd "$(dirname "$0")/../../.."   # app staging dir
if [ ! -f dist/index.js ]; then
  echo "[prebuild] dist/ missing — installing deps and compiling"
  npm ci --no-audit --no-fund
  npm run build
  npm prune --omit=dev
else
  echo "[prebuild] dist/ present — skipping build"
  [ -d node_modules ] || npm ci --omit=dev --no-audit --no-fund
fi
