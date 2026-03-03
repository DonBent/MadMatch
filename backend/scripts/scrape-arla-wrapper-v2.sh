#!/bin/bash

# Epic 3.5 Slice 5: Arla Scraper Process Restart Wrapper V2
# Correlation ID: ZHC-MadMatch-20260302-ProcessRestartFix
# 
# FIX: Wrapper itself must restart every chunk to reset CDP session
# Root cause: CDP timeout tied to original bash process, not just Node.js
#
# Strategy: After each chunk, exec restart wrapper itself

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRAPER_SCRIPT="${SCRIPT_DIR}/scrape-arla.js"
LOG_DIR="${SCRIPT_DIR}/../logs"
LOG_FILE="${LOG_DIR}/scraper-wrapper-$(date +%Y-%m-%d).log"

# Scraper parameters
TOTAL_LIMIT="${1:-1000}"
CHUNK_SIZE=200
RATE_LIMIT=2000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    mkdir -p "$LOG_DIR"
    echo "[${timestamp}] [${level}] ${message}" >> "$LOG_FILE"
    
    case "$level" in
        ERROR) echo -e "${RED}[${timestamp}] ❌ ${message}${NC}" ;;
        SUCCESS) echo -e "${GREEN}[${timestamp}] ✅ ${message}${NC}" ;;
        INFO) echo -e "${BLUE}[${timestamp}] ℹ️  ${message}${NC}" ;;
        WARN) echo -e "${YELLOW}[${timestamp}] ⚠️  ${message}${NC}" ;;
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

# Run ONE chunk only, then exit
run_one_chunk() {
    local current_count=$(get_scraped_count)
    
    log INFO "════════════════════════════════════════"
    log INFO "Arla Scraper Wrapper V2 - Single Chunk"
    log INFO "════════════════════════════════════════"
    log INFO "Current: ${current_count}/${TOTAL_LIMIT} recipes"
    
    # Check if done
    if [[ $current_count -ge $TOTAL_LIMIT ]]; then
        log SUCCESS "🎉 TARGET REACHED! ${current_count}/${TOTAL_LIMIT}"
        log SUCCESS "════════════════════════════════════════"
        log INFO "All recipes scraped successfully!"
        exit 0
    fi
    
    # Calculate this chunk's limit
    local chunk_limit=$((current_count + CHUNK_SIZE))
    if [[ $chunk_limit -gt $TOTAL_LIMIT ]]; then
        chunk_limit=$TOTAL_LIMIT
    fi
    
    local recipes_this_chunk=$((chunk_limit - current_count))
    log INFO "This chunk: ${recipes_this_chunk} recipes (${current_count} → ${chunk_limit})"
    log INFO "Starting scraper..."
    echo ""
    
    # Run scraper for this chunk
    if node "${SCRAPER_SCRIPT}" --limit "${chunk_limit}" --rate-limit "${RATE_LIMIT}"; then
        local new_count=$(get_scraped_count)
        local scraped=$((new_count - current_count))
        
        log SUCCESS "✅ Chunk completed: +${scraped} recipes"
        log INFO "Total: ${new_count}/${TOTAL_LIMIT} ($(( new_count * 100 / TOTAL_LIMIT ))%)"
        
        # Check if done
        if [[ $new_count -ge $TOTAL_LIMIT ]]; then
            log SUCCESS "🎉 ALL DONE! ${new_count}/${TOTAL_LIMIT} recipes"
            exit 0
        fi
        
        # NOT done - restart wrapper entirely
        log INFO "════════════════════════════════════════"
        log SUCCESS "✅ RESTARTING WRAPPER (reset CDP timer)"
        log INFO "════════════════════════════════════════"
        sleep 2
        
        # EXEC RESTART - replaces current process entirely
        exec "$0" "$TOTAL_LIMIT"
    else
        log ERROR "Chunk failed!"
        exit 1
    fi
}

# Main
run_one_chunk
