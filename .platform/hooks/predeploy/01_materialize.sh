#!/bin/bash
# Elastic Beanstalk predeploy hook: put seed-derived files (product photos,
# placeholder PDFs/SVGs) back into local storage on this instance. Runs from the
# staging dir; env properties may not be exported to hooks, so give the config
# loader harmless values for the two it insists on.
set -uo pipefail
cd "$(dirname "$0")/../../.."
export MONGODB_URI="${MONGODB_URI:-mongodb://localhost/unused}"
export JWT_SECRET="${JWT_SECRET:-materialize-only}"
if [ -f dist/seed/materialize.js ]; then
  node dist/seed/materialize.js || echo "[predeploy] materialize failed (continuing)"
else
  echo "[predeploy] dist/seed/materialize.js missing — skipping"
fi
# The app runs as webapp and must be able to write uploads.
mkdir -p var/uploads var/private var/mail
chown -R webapp:webapp var 2>/dev/null || true
