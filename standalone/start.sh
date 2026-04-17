#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
  echo "Node.js is not installed. Please install Node.js v18+ from https://nodejs.org"
  exit 1
fi

if [ ! -d "node_modules/express" ]; then
  echo "Installing dependencies..."
  npm install --omit=dev
fi

echo ""
echo "Starting TELA ERP at http://localhost:4321 ..."
echo "Press Ctrl+C to stop."
echo ""
node server.cjs
