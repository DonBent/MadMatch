#!/usr/bin/env node

/**
 * Full Arla Recipe Scraper - 3,000 Recipes
 * ZHC-MadMatch-20260301-PuppeteerScraper
 * 
 * This script scrapes ALL recipes from Arla.dk in batches.
 * Estimated time: 2-3 hours with 2-second rate limiting.
 */

const { ArlaScraper } = require('../services/scraping/ArlaScraper');
const fs = require('fs').promises;
const path = require('path');

const BATCH_SIZE = 100;
const TOTAL_TARGET = 3000;

// ==============================================================================
// PROCESS MONITORING & DEBUGGING - ZHC-MadMatch-20260301-DebugScraper
// ==============================================================================

let lastHeartbeat = Date.now();
setInterval(() => {
  const elapsed = Math.floor((Date.now() - lastHeartbeat) / 1000);
  console.log(`[HEARTBEAT] Process alive: ${process.pid}, memory: ${Math.floor(process.memoryUsage().heapUsed / 1024 / 1024)}MB, uptime: ${elapsed}s`);
  lastHeartbeat = Date.now();
}, 30000); // Every 30 seconds

// Add exit handlers
process.on('exit', (code) => {
  console.log(`[EXIT] Process exiting with code: ${code}`);
});

process.on('beforeExit', (code) => {
  console.log(`[BEFORE_EXIT] Process about to exit with code: ${code}`);
});

process.on('disconnect', () => {
  console.log(`[DISCONNECT] Process disconnected from parent`);
});

// ==============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Arla Full Scraper - 3,000 Recipes               ║');
  console.log('║   ZHC-MadMatch-20260301-PuppeteerScraper          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`🎯 Target: ${TOTAL_TARGET} recipes`);
  console.log(`📦 Batch size: ${BATCH_SIZE}\n`);

  const scraper = new ArlaScraper({
    dryRun: false,  // WRITE TO DATABASE
    verbose: true,
    rateLimit: 2000,  // 2 seconds between requests
    maxRecipes: TOTAL_TARGET
  });

  const startTime = Date.now();
  let totalScraped = 0;
  let totalFailed = 0;

  try {
    console.log('🔧 Initializing scraper...\n');
    await scraper.initialize();
    
    console.log('🚀 Starting full scrape...\n');
    
    // Scrape all recipes (limit=3000, category=null for all)
    const results = await scraper.scrapeRecipes(TOTAL_TARGET, null);
    
    totalScraped = results.successCount || 0;
    totalFailed = results.failedCount || 0;
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   SCRAPE COMPLETE                                  ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`✅ Successfully scraped: ${totalScraped}`);
    console.log(`❌ Failed:               ${totalFailed}`);
    console.log(`⏱️  Total time:          ${minutes}m ${seconds}s`);
    console.log(`📊 Success rate:        ${Math.round((totalScraped / (totalScraped + totalFailed)) * 100)}%`);
    
    // Save summary
    const summary = {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: duration,
      targetRecipes: TOTAL_TARGET,
      successCount: totalScraped,
      failedCount: totalFailed,
      successRate: Math.round((totalScraped / (totalScraped + totalFailed)) * 100)
    };
    
    const summaryPath = path.join(__dirname, '../logs', `scrape-summary-${new Date().toISOString().replace(/:/g, '-')}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Summary saved: ${summaryPath}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ SCRAPE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ UNHANDLED REJECTION:');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  if (reason && reason.stack) {
    console.error('Stack:', reason.stack);
  }
  // Log but don't exit - let the scraper try to continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ UNCAUGHT EXCEPTION:', error.message);
  console.error('Stack:', error.stack);
  // Exit on uncaught exceptions as they're fatal
  process.exit(1);
});

main();
