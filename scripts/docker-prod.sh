#!/bin/bash
# Build and start production server in Docker on port 6080

echo "🏗️  Building CloudMigrate for production..."
echo "🌐 App will be available at http://localhost:6080"
echo ""

docker compose --profile prod up --build
