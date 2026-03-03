#!/bin/bash

# Epic 3.5 Slice 5: Arla Scraper Orchestrator V3
# Correlation ID: ZHC-MadMatch-20260302-ProcessRestartFix
# 
# FIX: True process isolation - spawn background job instead of exec
# Root cause: exec doesn't create new PID when run via nohup
#
# Strategy: After chunk, spawn new wrapper as background job, exit current

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRAPER_SCRIPT="${SCRIPT_DIR}/scrape-arla.js"
LOG_DIR="${SCRIPT_DIR}/../logs"
STATE_FILE="/tmp/arla-scraper-state.txt"

# Scraper parameters
TOTAL_LIMIT="${1:-1000}"
CHUNK_SIZE=200
RATE_LIMIT=2000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        ERROR) echo -e "${RED}[${timestamp}] ❌ ${message}${NC}" ;;
        SUCCESS) echo -e "${GREEN}[${timestamp}] ✅ ${message}${NC}" ;;
        INFO) echo -e "${BLUE}[${timestamp}] ℹ️  ${message}${NC}" ;;
        *) echo "[${timestamp}] ${message}" ;;
    esac
}

# Get scraped count
get_scraped_count() {
    node -e "
        const { PrismaClient } = require('@prisma/client');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const { Pool } = require('pg');
        require('dotenv').config({ path: '${SCRIPT_DIR}/../.env' });
        
        async function getCount() {
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            const adapter = new PrismaPg(pool);
            const prisma = new PrismaClient({ adapter });
            
            try {
                const source = await prisma.recipeSource.findUnique({
                    where: { name: 'Arla' }
                });
                
                if (!source) {
                    console.log('0');
                    return;
                }
                
                const count = await prisma.recipe.count({
                    where: { sourceId: source.id }
                });
                
                console.log(count);
            } catch (error) {
                console.error('Error:', error.message);
                console.log('0');
            } finally {
                await prisma.\$disconnect();
                await pool.end();
            }
        }
        
        getCount();
    " 2>/dev/null || echo "0"
}

# Run ONE chunk only, then spawn new wrapper
run_one_chunk() {
    local chunk_num="${2:-1}"
    local current_count=$(get_scraped_count)
    
    log INFO "════════════════════════════════════════"
    log INFO "Arla Scraper V3 - Chunk #${chunk_num}"
    log INFO "PID: $$ | Parent: $PPID"
    log INFO "════════════════════════════════════════"
    log INFO "Current: ${current_count}/${TOTAL_LIMIT} recipes"
    
    # Save state
    echo "${chunk_num}" > "$STATE_FILE"
    
    # Check if done
    if [[ $current_count -ge $TOTAL_LIMIT ]]; then
        log SUCCESS "🎉 TARGET REACHED! ${current_count}/${TOTAL_LIMIT}"
        rm -f "$STATE_FILE"
        exit 0
    fi
    
    # Calculate this chunk's limit
    local chunk_limit=$((current_count + CHUNK_SIZE))
    if [[ $chunk_limit -gt $TOTAL_LIMIT ]]; then
        chunk_limit=$TOTAL_LIMIT
    fi
    
    local recipes_this_chunk=$((chunk_limit - current_count))
    log INFO "Chunk target: ${recipes_this_chunk} recipes (${current_count} → ${chunk_limit})"
    log INFO "Starting scraper (PID $$)..."
    echo ""
    
    # Run scraper for this chunk
    if node "${SCRAPER_SCRIPT}" --limit "${chunk_limit}" --rate-limit "${RATE_LIMIT}"; then
        local new_count=$(get_scraped_count)
        local scraped=$((new_count - current_count))
        
        log SUCCESS "✅ Chunk #${chunk_num} completed: +${scraped} recipes"
        log INFO "Total: ${new_count}/${TOTAL_LIMIT} ($(( new_count * 100 / TOTAL_LIMIT ))%)"
        
        # Check if done
        if [[ $new_count -ge $TOTAL_LIMIT ]]; then
            log SUCCESS "🎉 ALL DONE! ${new_count}/${TOTAL_LIMIT} recipes"
            rm -f "$STATE_FILE"
            exit 0
        fi
        
        # NOT done - spawn NEW wrapper as background job
        local next_chunk=$((chunk_num + 1))
        log INFO "════════════════════════════════════════"
        log SUCCESS "✅ SPAWNING NEW WRAPPER (chunk #${next_chunk})"
        log INFO "Current PID $$ will exit, new wrapper will start"
        log INFO "════════════════════════════════════════"
        
        # Spawn new wrapper in background with new chunk number
        nohup "$0" "$TOTAL_LIMIT" "$next_chunk" >> "${LOG_DIR}/scraper-wrapper-$(date +%Y-%m-%d).log" 2>&1 &
        local new_pid=$!
        
        log SUCCESS "New wrapper spawned: PID ${new_pid}"
        log INFO "Current wrapper (PID $$) exiting now..."
        
        # Exit current process - new one takes over
        exit 0
    else
        log ERROR "Chunk #${chunk_num} failed!"
        exit 1
    fi
}

# Main
CHUNK_NUM="${2:-1}"
run_one_chunk "$TOTAL_LIMIT" "$CHUNK_NUM"
