#!/bin/bash
set -e

APP_NAME="moosematrix-dev"
PORT=2099
# Resolve absolute path to repo root (parent of the script's directory)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🛑 Stopping old container (if any)..."
docker stop $APP_NAME >/dev/null 2>&1 || true
docker rm $APP_NAME >/dev/null 2>&1 || true

echo "🐳 Building new image from $PROJECT_DIR ..."
docker build -t $APP_NAME "$PROJECT_DIR"

echo "🚀 Running new container on port $PORT..."
docker run -d -p $PORT:3000 --name $APP_NAME $APP_NAME

echo "✅ $APP_NAME is running at http://localhost:$PORT"
