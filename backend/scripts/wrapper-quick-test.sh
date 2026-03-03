#!/bin/bash

# Quick test: Verify V3 spawns new PID after chunk
# Uses tiny chunks (10 recipes) to test quickly

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRAPER_SCRIPT="${SCRIPT_DIR}/scrape-arla.js"
CHUNK_SIZE=10  # TINY chunks for quick test
RATE_LIMIT=100  # Faster for testing
TOTAL_LIMIT="${1:-1500}"
CHUNK_NUM="${2:-1}"

log() {
    echo "[$(date '+%H:%M:%S')] [CHUNK ${CHUNK_NUM}] [PID $$] $*"
}

get_count() {
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
                const source = await prisma.recipeSource.findUnique({ where: { name: 'Arla' } });
                if (!source) { console.log('0'); return; }
                const count = await prisma.recipe.count({ where: { sourceId: source.id } });
                console.log(count);
            } catch (error) {
                console.log('0');
            } finally {
                await prisma.\$disconnect();
                await pool.end();
            }
        }
        getCount();
    " 2>/dev/null || echo "0"
}

current=$(get_count)
log "Starting with ${current}/${TOTAL_LIMIT} recipes"

if [[ $current -ge $TOTAL_LIMIT ]]; then
    log "✅ TARGET REACHED! ${current}/${TOTAL_LIMIT}"
    exit 0
fi

# Calculate chunk limit
chunk_limit=$((current + CHUNK_SIZE))
if [[ $chunk_limit -gt $TOTAL_LIMIT ]]; then
    chunk_limit=$TOTAL_LIMIT
fi

log "Scraping to ${chunk_limit} (${CHUNK_SIZE} recipes max)"

# Run scraper
if node "${SCRAPER_SCRIPT}" --limit "${chunk_limit}" --rate-limit "${RATE_LIMIT}" 2>&1 | grep -E "Progress|completed|failed" | head -5; then
    new_count=$(get_count)
    scraped=$((new_count - current))
    log "✅ Chunk #${CHUNK_NUM} done: +${scraped} recipes (total: ${new_count})"
    
    if [[ $new_count -ge $TOTAL_LIMIT ]]; then
        log "✅ ALL DONE!"
        exit 0
    fi
    
    # Spawn next chunk
    next_chunk=$((CHUNK_NUM + 1))
    log "🔄 SPAWNING chunk #${next_chunk} in background..."
    
    nohup "$0" "$TOTAL_LIMIT" "$next_chunk" >> /tmp/wrapper-quick-test.log 2>&1 &
    new_pid=$!
    
    log "✅ Spawned PID ${new_pid}, current PID $$ exiting"
    exit 0
else
    log "❌ Chunk failed"
    exit 1
fi
