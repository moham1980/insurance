#!/bin/bash
set -e

echo "=== CI Smoke Test ==="

# Start services
echo "Starting Docker Compose services..."
docker-compose -f docker-compose.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 30

# Run migrations
echo "Running migrations..."
docker-compose -f docker-compose.yml --profile migrate up
docker-compose -f docker-compose.yml --profile migrate down

# Run smoke tests
echo "Running smoke tests..."
bun run test:e2e --testNamePattern="smoke"

# Teardown
echo "Tearing down..."
docker-compose -f docker-compose.yml down -v

echo "=== CI Smoke Test Complete ==="
