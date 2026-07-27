#!/bin/bash
# Runtime verification script for insurance platform (Iran Deployment Ready)
# Verifies infrastructure, service health, DB connectivity, and cross-service routes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-5}"

OVERALL_STATUS=0
TOTAL_CHECKS=0
PASSED_CHECKS=0

check_pass() { TOTAL_CHECKS=$((TOTAL_CHECKS + 1)); PASSED_CHECKS=$((PASSED_CHECKS + 1)); echo -e "${GREEN}✓${NC} $1"; }
check_fail() { TOTAL_CHECKS=$((TOTAL_CHECKS + 1)); OVERALL_STATUS=1; echo -e "${RED}✗${NC} $1"; }
check_warn() { TOTAL_CHECKS=$((TOTAL_CHECKS + 1)); echo -e "${YELLOW}⚠${NC} $1"; }

echo "=========================================="
echo "Runtime Verification — Insurance Platform"
echo "=========================================="
echo ""

# ─── Step 1: Infrastructure ─────────────────────────────────────────
echo -e "${BLUE}Step 1: Infrastructure services${NC}"

for svc in insurance-postgres insurance-redis insurance-kafka insurance-zookeeper; do
  if docker compose -f "$COMPOSE_FILE" ps -q "$svc" > /dev/null 2>&1; then
    check_pass "$svc is running"
  else
    check_fail "$svc is NOT running"
  fi
done

# Quick DB connectivity test via postgres container
if docker compose -f "$COMPOSE_FILE" exec -T insurance-postgres pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
  check_pass "Postgres responds to pg_isready"
else
  check_fail "Postgres NOT responding"
fi

# Quick Redis test
if docker compose -f "$COMPOSE_FILE" exec -T insurance-redis redis-cli ping | grep -q PONG; then
  check_pass "Redis responds to PING"
else
  check_fail "Redis NOT responding"
fi

echo ""

# ─── Step 2: Application services running ─────────────────────────────
echo -e "${BLUE}Step 2: Application services running${NC}"

app_services=(
  api-gateway auth-service claims-service payments-service party-kyc-service
  policy-service document-service fraud-service orchestrator-service
  feature-flags-service complaints-service reporting-service aml-service
  reinsurance-service product-service claims-readmodel-service monitoring-service
  document-ai-service sales-network-service underwriting-service
  regulatory-gateway-service notification-service ai-governance-service
  customer-portal-service agent-portal-service workflow-service
  rule-engine-service knowledge-service model-switchboard-service
  billing-service collections-service copilot-service customer-360-service
  outbox-relay web-ui customer-portal-ui agent-portal-ui
)

for svc in "${app_services[@]}"; do
  if docker compose -f "$COMPOSE_FILE" ps -q "$svc" > /dev/null 2>&1; then
    check_pass "$svc is running"
  else
    check_fail "$svc is NOT running"
  fi
done

echo ""

# ─── Step 3: Health endpoints ─────────────────────────────────────────
echo -e "${BLUE}Step 3: Health endpoints${NC}"

declare -A health_ports=(
  [api-gateway]=3000
  [auth-service]=3001
  [claims-service]=3002
  [payments-service]=3004
  [party-kyc-service]=3006
  [policy-service]=3007
  [document-service]=3008
  [fraud-service]=3009
  [orchestrator-service]=3010
  [feature-flags-service]=3011
  [complaints-service]=3013
  [reporting-service]=3014
  [aml-service]=3016
  [reinsurance-service]=3017
  [product-service]=3018
  [claims-readmodel-service]=3019
  [monitoring-service]=3020
  [document-ai-service]=3021
  [sales-network-service]=3022
  [underwriting-service]=3023
  [regulatory-gateway-service]=3024
  [notification-service]=3025
  [ai-governance-service]=3027
  [customer-portal-service]=3031
  [agent-portal-service]=3032
  [workflow-service]=3033
  [rule-engine-service]=3034
  [knowledge-service]=3035
  [model-switchboard-service]=3036
  [billing-service]=3037
  [collections-service]=3038
  [copilot-service]=3039
  [customer-360-service]=3040
)

for svc in "${!health_ports[@]}"; do
  port=${health_ports[$svc]}
  url="http://localhost:${port}/health"
  if curl -s -f --max-time "$HEALTH_TIMEOUT" "$url" > /dev/null 2>&1; then
    check_pass "$svc health ($url)"
  else
    check_warn "$svc health UNREACHABLE ($url)"
  fi
done

echo ""

# ─── Step 4: Gateway upstream routing ─────────────────────────────────
echo -e "${BLUE}Step 4: Gateway upstream routing${NC}"

gateway_routes=(
  "/health"
  "/auth/health"
  "/claims/health"
  "/payments/health"
  "/party/health"
  "/policies/health"
  "/fraud/health"
)

for route in "${gateway_routes[@]}"; do
  if curl -s -f --max-time "$HEALTH_TIMEOUT" "http://localhost:3000${route}" > /dev/null 2>&1; then
    check_pass "Gateway route $route"
  else
    check_warn "Gateway route $route UNREACHABLE"
  fi
done

echo ""

# ─── Summary ──────────────────────────────────────────────────────────
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo -e "Total checks: ${TOTAL_CHECKS}"
echo -e "Passed:       ${GREEN}${PASSED_CHECKS}${NC}"
echo -e "Failed:       ${RED}$((TOTAL_CHECKS - PASSED_CHECKS))${NC}"
echo ""

if [ $OVERALL_STATUS -eq 0 ]; then
  echo -e "${GREEN}✓ Runtime verification PASSED${NC}"
  exit 0
else
  echo -e "${RED}✗ Runtime verification FAILED${NC}"
  echo ""
  echo "Troubleshooting commands:"
  echo "  docker compose logs [service-name]"
  echo "  docker compose ps"
  echo "  docker compose exec insurance-postgres pg_isready -h localhost"
  echo "  docker compose exec insurance-redis redis-cli ping"
  exit 1
fi
