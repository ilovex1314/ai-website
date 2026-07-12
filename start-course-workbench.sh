#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repository_root"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required (^20.19.0 or >=22.12.0)." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing locked dependencies with npm ci..."
  npm ci
fi

echo "Starting Course Workbench..."
echo "Studio:  http://127.0.0.1:5173/topics/remotion-course"
echo "Actions: http://127.0.0.1:5173/topics/remotion-course/actions"
echo "Service: http://127.0.0.1:${WORKBENCH_PORT:-4319}"
echo "Press Ctrl+C to stop both processes."

exec npm run dev:course
