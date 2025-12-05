#!/bin/bash
# Start development server in Docker on port 6080

echo "🚀 Starting CloudMigrate in Docker (dev mode)..."
echo "📦 Installing dependencies inside container..."
echo "🌐 App will be available at http://localhost:6080"
echo ""

docker compose --profile dev up
