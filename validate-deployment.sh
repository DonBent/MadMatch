#!/bin/bash

###############################################################################
# MadMatch Deployment Validation Test Suite
# Correlation ID: ZHC-MadMatch-20260227-002
# 
# Tests backend health, frontend availability, API data, and service status
# Exit codes: 0=success, 1=failure
###############################################################################

set -euo pipefail

# Configuration
DEV_BASE_URL="http://192.168.1.203:8080"
PROD_BASE_URL="http://192.168.1.203:8081"
TIMEOUT=5
MAX_TEST_TIME=30

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Start timer
START_TIME=$(date +%s)

###############################################################################
# Helper Functions
###############################################################################

log_test() {
    echo -e "\n${YELLOW}TEST: $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

log_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo -e "  ${RED}ERROR${NC}: $2"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

log_info() {
    echo -e "  ℹ $1"
}

check_timeout() {
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    if [ $ELAPSED -gt $MAX_TEST_TIME ]; then
        echo -e "\n${RED}TIMEOUT: Tests exceeded ${MAX_TEST_TIME}s limit${NC}"
        exit 1
    fi
}

###############################################################################
# Test 1: Backend Health Checks
###############################################################################

test_backend_health() {
    local env=$1
    local url=$2
    
    log_test "Backend Health Check - $env"
    
    # Test HTTP 200 response
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url/api/health" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "$env backend responds with HTTP 200"
    else
        log_fail "$env backend responds with HTTP 200" "Got HTTP $HTTP_CODE from $url/api/health"
        return 1
    fi
    
    # Test JSON response with status:ok
    HEALTH_JSON=$(curl -s --connect-timeout $TIMEOUT "$url/api/health" || echo "{}")
    STATUS=$(echo "$HEALTH_JSON" | grep -o '"status":"ok"' || echo "")
    
    if [ -n "$STATUS" ]; then
        log_pass "$env health endpoint returns valid JSON with status:ok"
    else
        log_fail "$env health endpoint returns valid JSON with status:ok" "Response: $HEALTH_JSON"
        return 1
    fi
    
    check_timeout
}

###############################################################################
# Test 2: Frontend Availability
###############################################################################

test_frontend_availability() {
    local env=$1
    local url=$2
    
    log_test "Frontend Availability - $env"
    
    # Test serves HTML
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url/" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "$env frontend serves HTML with HTTP 200"
    else
        log_fail "$env frontend serves HTML with HTTP 200" "Got HTTP $HTTP_CODE from $url/"
        return 1
    fi
    
    # Test HTML content
    HTML_CONTENT=$(curl -s --connect-timeout $TIMEOUT "$url/" || echo "")
    
    # Check for MadMatch title
    if echo "$HTML_CONTENT" | grep -q "MadMatch"; then
        log_pass "$env HTML contains 'MadMatch' title"
    else
        log_fail "$env HTML contains 'MadMatch' title" "Title not found in HTML"
    fi
    
    # Check for JavaScript bundle
    if echo "$HTML_CONTENT" | grep -qE "(bundle\.js|main\.js)"; then
        log_pass "$env HTML references bundle.js or main.js"
    else
        log_fail "$env HTML references bundle.js or main.js" "No bundle reference found in HTML"
    fi
    
    check_timeout
}

###############################################################################
# Test 3: API Data Validation
###############################################################################

test_api_data() {
    local env=$1
    local url=$2
    
    log_test "API Data Validation - $env"
    
    # Fetch tilbud API
    API_RESPONSE=$(curl -s --connect-timeout $TIMEOUT "$url/api/tilbud" || echo "{}")
    
    # Check if response is valid JSON object with data array
    if echo "$API_RESPONSE" | jq -e '.data | type == "array"' > /dev/null 2>&1; then
        log_pass "$env API returns valid JSON with data array"
    else
        log_fail "$env API returns valid JSON with data array" "Response format invalid: $API_RESPONSE"
        return 1
    fi
    
    # Extract the data array
    TILBUD_ARRAY=$(echo "$API_RESPONSE" | jq '.data' 2>/dev/null || echo "[]")
    
    # Check for at least 1 tilbud
    TILBUD_COUNT=$(echo "$TILBUD_ARRAY" | jq 'length' 2>/dev/null || echo "0")
    
    if [ "$TILBUD_COUNT" -ge 1 ]; then
        log_pass "$env API returns at least 1 tilbud (found: $TILBUD_COUNT)"
    else
        log_fail "$env API returns at least 1 tilbud" "Found 0 tilbud"
        return 1
    fi
    
    # Validate data structure (check first item has required fields)
    FIRST_ITEM=$(echo "$TILBUD_ARRAY" | jq '.[0]' 2>/dev/null || echo "{}")
    
    REQUIRED_FIELDS=("id" "navn" "butik" "kategori")
    ALL_FIELDS_PRESENT=true
    
    for field in "${REQUIRED_FIELDS[@]}"; do
        if ! echo "$FIRST_ITEM" | jq -e ".$field" > /dev/null 2>&1; then
            ALL_FIELDS_PRESENT=false
            log_fail "$env tilbud data structure has '$field' field" "Field missing in: $FIRST_ITEM"
        fi
    done
    
    if [ "$ALL_FIELDS_PRESENT" = true ]; then
        log_pass "$env tilbud data matches expected schema (id, navn, butik, kategori)"
    fi
    
    check_timeout
}

###############################################################################
# Test 4: Service Status
###############################################################################

test_service_status() {
    log_test "Service Status Checks"
    
    # Check systemd services
    SERVICES=(
        "madmatch-dev-backend"
        "madmatch-dev-frontend"
        "madmatch-prod-backend"
        "nginx"
    )
    
    for service in "${SERVICES[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            log_pass "Service $service is running"
        else
            log_fail "Service $service is running" "Service is not active (use: systemctl status $service)"
        fi
    done
    
    # Check nginx error logs for critical errors (last 100 lines)
    NGINX_ERRORS=$(sudo tail -n 100 /var/log/nginx/error.log 2>/dev/null | grep -c "\[emerg\]\|\[alert\]\|\[crit\]" || echo "0")
    
    if [ "$NGINX_ERRORS" -eq 0 ]; then
        log_pass "No critical errors in nginx error log (last 100 lines)"
    else
        log_fail "No critical errors in nginx error log" "Found $NGINX_ERRORS critical errors in last 100 lines"
        log_info "Run: sudo tail -n 100 /var/log/nginx/error.log | grep -E '\[emerg\]|\[alert\]|\[crit\]'"
    fi
    
    check_timeout
}

###############################################################################
# Main Test Execution
###############################################################################

echo "=================================================="
echo "MadMatch Deployment Validation Test Suite"
echo "Correlation ID: ZHC-MadMatch-20260227-002"
echo "Started: $(date)"
echo "=================================================="

# Run all tests
test_backend_health "DEV" "$DEV_BASE_URL"
test_backend_health "PROD" "$PROD_BASE_URL"

test_frontend_availability "DEV" "$DEV_BASE_URL"
test_frontend_availability "PROD" "$PROD_BASE_URL"

test_api_data "DEV" "$DEV_BASE_URL"
test_api_data "PROD" "$PROD_BASE_URL"

test_service_status

# Calculate elapsed time
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# Summary
echo ""
echo "=================================================="
echo "TEST SUMMARY"
echo "=================================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo "Duration: ${ELAPSED}s"
echo "=================================================="

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
