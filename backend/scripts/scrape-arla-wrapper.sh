#!/bin/bash

# Epic 3.5 Slice 5: Arla Scraper Process Restart Wrapper
# Correlation ID: ZHC-MadMatch-20260302-ProcessRestartFix
# 
# Purpose: Prevent Chrome CDP 30-minute timeout by restarting entire Node.js process
# Strategy: Run scraper in chunks, restart process between chunks, use database resume
#
# Key Features:
# - Restarts entire Node.js process (not just browser)
# - Preserves progress via database resume capability
# - Transparent to user (automatic continuation)
# - Logs all restart events
# - Handles interruptions gracefully

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRAPER_SCRIPT="${SCRIPT_DIR}/scrape-arla.js"
LOG_DIR="${SCRIPT_DIR}/../logs"
LOG_FILE="${LOG_DIR}/scraper-wrapper-$(date +%Y-%m-%d).log"

# Scraper parameters
TOTAL_LIMIT="${1:-1000}"           # Total recipes to scrape (from command line arg or default 1000)
CHUNK_SIZE=200                     # Recipes per process restart (~20 min @ 2s/recipe)
RATE_LIMIT=2000                    # 2 seconds between requests
DRY_RUN="${2:-}"                   # Optional --dry-run flag

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Write to log file
    echo "[${timestamp}] [${level}] ${message}" >> "$LOG_FILE"
    
    # Write to console with colors
    case "$level" in
        ERROR)
            echo -e "${RED}[${timestamp}] ❌ ${message}${NC}"
            ;;
        SUCCESS)
            echo -e "${GREEN}[${timestamp}] ✅ ${message}${NC}"
            ;;
        INFO)
            echo -e "${BLUE}[${timestamp}] ℹ️  ${message}${NC}"
            ;;
        WARN)
            echo -e "${YELLOW}[${timestamp}] ⚠️  ${message}${NC}"
            ;;
        *)
            echo "[${timestamp}] ${message}"
            ;;
    esac
}

# Error handler
handle_error() {
    local exit_code=$?
    local line_number=$1
    log ERROR "Script failed at line ${line_number} with exit code ${exit_code}"
    log ERROR "Check log file: ${LOG_FILE}"
    exit $exit_code
}

trap 'handle_error ${LINENO}' ERR

# Signal handler for graceful shutdown
handle_signal() {
    log WARN "Received interrupt signal (Ctrl+C)"
    log INFO "Current progress has been saved to database"
    log INFO "Resume by running: ${0} ${TOTAL_LIMIT}"
    exit 130
}

trap 'handle_signal' SIGINT SIGTERM

# Validate environment
validate_environment() {
    log INFO "Validating environment..."
    
    # Check if scraper script exists
    if [[ ! -f "$SCRAPER_SCRIPT" ]]; then
        log ERROR "Scraper script not found: ${SCRAPER_SCRIPT}"
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log ERROR "Node.js not found in PATH"
        exit 1
    fi
    
    # Check if database is accessible (via .env file)
    if [[ ! -f "${SCRIPT_DIR}/../.env" ]]; then
        log WARN "No .env file found in backend directory"
    fi
    
    log SUCCESS "Environment validation passed"
}

# Get count of recipes already scraped from database
get_scraped_count() {
    local count=$(node -e "
        const { PrismaClient } = require('@prisma/client');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const { Pool } = require('pg');
        require('dotenv').config({ path: '${SCRIPT_DIR}/../.env' });
        
        async function getCount() {
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            const adapter = new PrismaPg(pool);
            const prisma = new PrismaClient({ adapter });
            
            try {
                // Get Arla source ID
                const source = await prisma.recipeSource.findUnique({
                    where: { name: 'Arla' }
                });
                
                if (!source) {
                    console.log('0');
                    return;
                }
                
                // Count recipes from Arla
                const count = await prisma.recipe.count({
                    where: { sourceId: source.id }
                });
                
                console.log(count);
            } catch (error) {
                console.error('Error getting count:', error.message);
                console.log('0');
            } finally {
                await prisma.\$disconnect();
                await pool.end();
            }
        }
        
        getCount();
    " 2>/dev/null || echo "0")
    
    echo "$count"
}

# Run scraper with specified limit
run_scraper() {
    local limit=$1
    local chunk_number=$2
    
    log INFO "=========================================="
    log INFO "Starting scraper chunk #${chunk_number}"
    log INFO "Limit: ${limit} recipes"
    log INFO "Rate limit: ${RATE_LIMIT}ms"
    log INFO "=========================================="
    
    # Build command
    local cmd="node ${SCRAPER_SCRIPT} --limit ${limit} --rate-limit ${RATE_LIMIT}"
    
    if [[ -n "$DRY_RUN" ]]; then
        cmd="${cmd} ${DRY_RUN}"
        log INFO "DRY RUN MODE - No database writes"
    fi
    
    # Run scraper
    log INFO "Command: ${cmd}"
    
    if $cmd; then
        log SUCCESS "Scraper chunk #${chunk_number} completed successfully"
        return 0
    else
        local exit_code=$?
        log ERROR "Scraper chunk #${chunk_number} failed with exit code ${exit_code}"
        return $exit_code
    fi
}

# Main execution
main() {
    log INFO "╔════════════════════════════════════════════════════╗"
    log INFO "║   Arla Scraper Process Restart Wrapper            ║"
    log INFO "║   Epic 3.5 Slice 5 - CDP Timeout Fix              ║"
    log INFO "║   Correlation ID: ZHC-MadMatch-20260302-ProcessRestartFix"
    log INFO "╚════════════════════════════════════════════════════╝"
    echo ""
    
    validate_environment
    
    log INFO "Configuration:"
    log INFO "  • Total limit:        ${TOTAL_LIMIT} recipes"
    log INFO "  • Chunk size:         ${CHUNK_SIZE} recipes per process"
    log INFO "  • Rate limit:         ${RATE_LIMIT}ms between requests"
    log INFO "  • Estimated time:     ~$((CHUNK_SIZE * RATE_LIMIT / 1000 / 60)) minutes per chunk"
    log INFO "  • Log file:           ${LOG_FILE}"
    
    if [[ -n "$DRY_RUN" ]]; then
        log WARN "DRY RUN MODE - No database writes will occur"
    fi
    
    echo ""
    
    # Check for existing progress
    local existing_count=$(get_scraped_count)
    log INFO "Database contains ${existing_count} existing recipes from Arla"
    
    if [[ $existing_count -ge $TOTAL_LIMIT ]]; then
        log SUCCESS "Target already reached! ${existing_count} >= ${TOTAL_LIMIT}"
        log INFO "All recipes already scraped. Nothing to do."
        exit 0
    fi
    
    local remaining=$((TOTAL_LIMIT - existing_count))
    log INFO "Remaining to scrape: ${remaining} recipes"
    
    # Calculate number of chunks needed
    local chunks_needed=$(( (remaining + CHUNK_SIZE - 1) / CHUNK_SIZE ))
    log INFO "Will run ${chunks_needed} process chunks to complete scraping"
    echo ""
    
    # Run scraper in chunks with process restarts
    local chunk_number=1
    local total_scraped=$existing_count
    
    while [[ $total_scraped -lt $TOTAL_LIMIT ]]; do
        log INFO "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log INFO "CHUNK ${chunk_number}/${chunks_needed}"
        log INFO "Progress: ${total_scraped}/${TOTAL_LIMIT} recipes scraped"
        log INFO "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        # Run scraper chunk (it will auto-resume from database)
        # Calculate limit for this chunk: min(CHUNK_SIZE, remaining recipes)
        local remaining=$((TOTAL_LIMIT - total_scraped))
        local chunk_limit=$((total_scraped + CHUNK_SIZE))
        if [[ $chunk_limit -gt $TOTAL_LIMIT ]]; then
            chunk_limit=$TOTAL_LIMIT
        fi
        
        if ! run_scraper $chunk_limit $chunk_number; then
            log ERROR "Chunk ${chunk_number} failed. Check logs for details."
            log INFO "Progress has been saved. You can resume by running:"
            log INFO "  ${0} ${TOTAL_LIMIT}"
            exit 1
        fi
        
        echo ""
        log SUCCESS "✅ PROCESS RESTART - Resetting CDP session timer"
        log INFO "Node.js process terminated and will restart for next chunk"
        echo ""
        
        # Check updated count
        local new_count=$(get_scraped_count)
        local scraped_this_chunk=$((new_count - total_scraped))
        
        log INFO "Chunk ${chunk_number} results:"
        log INFO "  • Scraped this chunk: ${scraped_this_chunk} recipes"
        log INFO "  • Total in database:  ${new_count} recipes"
        log INFO "  • Progress:           $(( new_count * 100 / TOTAL_LIMIT ))%"
        echo ""
        
        total_scraped=$new_count
        chunk_number=$((chunk_number + 1))
        
        # Check if we've reached the target
        if [[ $total_scraped -ge $TOTAL_LIMIT ]]; then
            log SUCCESS "🎉 TARGET REACHED! ${total_scraped}/${TOTAL_LIMIT} recipes scraped"
            break
        fi
        
        # Small delay between chunks to ensure clean process termination
        log INFO "Waiting 3 seconds before next chunk..."
        sleep 3
    done
    
    echo ""
    log INFO "╔════════════════════════════════════════════════════╗"
    log SUCCESS "║            SCRAPING COMPLETED SUCCESSFULLY         ║"
    log INFO "╚════════════════════════════════════════════════════╝"
    log INFO ""
    log INFO "📊 Final Statistics:"
    log INFO "  • Total recipes scraped:  ${total_scraped}"
    log INFO "  • Process chunks run:     ${chunk_number}"
    log INFO "  • Log file:               ${LOG_FILE}"
    echo ""
    log INFO "🎯 Next Steps:"
    log INFO "  1. Verify recipes: npm run prisma:studio"
    log INFO "  2. Test search API: curl localhost:3001/api/recipes/search?q=kylling"
    log INFO "  3. Review logs: cat ${LOG_FILE}"
    echo ""
}

# Execute main function
main "$@"
