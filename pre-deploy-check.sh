#!/bin/bash
# MadMatch Pre-Deployment Check Script
# Ensures .env file exists before deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo "🔍 Running pre-deployment checks..."

# Frontend .env check
if [ ! -f "$FRONTEND_DIR/.env" ]; then
  if [ -f "$FRONTEND_DIR/.env.example" ]; then
    echo "⚠️  Missing frontend/.env - copying from .env.example"
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
    echo "✅ Created frontend/.env"
  else
    echo "❌ ERROR: Missing both .env and .env.example in frontend/"
    exit 1
  fi
else
  echo "✅ frontend/.env exists"
fi

# Backend .env check (if needed in future)
if [ -f "$BACKEND_DIR/.env.example" ] && [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "⚠️  Missing backend/.env - copying from .env.example"
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "✅ Created backend/.env"
fi

echo "✅ All pre-deployment checks passed"
