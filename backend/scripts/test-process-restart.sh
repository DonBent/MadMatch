#!/bin/bash

# Test Script for Process Restart Wrapper
# Tests with small batch: 50 recipes, restart every 25

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WRAPPER="${SCRIPT_DIR}/scrape-arla-wrapper.sh"

echo "╔════════════════════════════════════════════════════╗"
echo "║   Testing Process Restart Wrapper                 ║"
echo "║   Small Batch Test: 50 recipes, restart @ 25      ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Temporarily modify wrapper script to use smaller chunk size
echo "📝 Configuring test parameters..."
echo "   • Total recipes: 50"
echo "   • Chunk size: 25 (will restart once)"
echo "   • Rate limit: 500ms (fast test)"
echo ""

# Create temporary test wrapper
TEST_WRAPPER="${SCRIPT_DIR}/test-wrapper-temp.sh"
cp "$WRAPPER" "$TEST_WRAPPER"

# Modify chunk size and rate limit for testing
sed -i 's/^CHUNK_SIZE=200/CHUNK_SIZE=25/' "$TEST_WRAPPER"
sed -i 's/^RATE_LIMIT=2000/RATE_LIMIT=500/' "$TEST_WRAPPER"

chmod +x "$TEST_WRAPPER"

echo "🚀 Starting test run..."
echo ""

# Run test
if "$TEST_WRAPPER" 50; then
    echo ""
    echo "✅ TEST PASSED - Wrapper completed successfully"
    echo ""
    echo "Verification checklist:"
    echo "  ☐ Check that process restarted after 25 recipes"
    echo "  ☐ Verify resume worked (no duplicates)"
    echo "  ☐ Confirm total of 50 recipes in database"
    echo "  ☐ Review log file for restart events"
else
    echo ""
    echo "❌ TEST FAILED - Check logs for details"
    rm -f "$TEST_WRAPPER"
    exit 1
fi

# Cleanup
rm -f "$TEST_WRAPPER"

echo ""
echo "✨ Test completed. Temporary test wrapper removed."
