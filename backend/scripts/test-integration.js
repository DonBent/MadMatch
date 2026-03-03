#!/usr/bin/env node

/**
 * Quick Integration Test - Verify scrapeRecipes() works end-to-end
 * ZHC-MadMatch-20260301-URLDiscovery
 * 
 * Tests that scrapeRecipes() can fetch URLs and scrape 3 recipes
 */

const { ArlaScraper } = require('../services/scraping/ArlaScraper');

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Integration Test - scrapeRecipes(3)            ║');
  console.log('║   ZHC-MadMatch-20260301-URLDiscovery              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  const scraper = new ArlaScraper({
    dryRun: true,
    verbose: true,
    rateLimit: 1000,  // Faster for testing
  });

  try {
    console.log('🔧 Initializing scraper...\n');
    await scraper.initialize();
    
    console.log('🚀 Running scrapeRecipes(3)...\n');
    
    const startTime = Date.now();
    const results = await scraper.scrapeRecipes(3, null);
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   INTEGRATION TEST RESULTS                         ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`✅ Scraped: ${results.scraped}`);
    console.log(`❌ Failed:  ${results.failed}`);
    console.log(`⏱️  Duration: ${duration}s`);
    
    if (results.scraped === 3 && results.failed === 0) {
      console.log('\n✅ INTEGRATION TEST PASSED!');
      await scraper.close();
      process.exit(0);
    } else {
      console.log('\n❌ INTEGRATION TEST FAILED!');
      console.log(`   Expected: scraped=3, failed=0`);
      console.log(`   Got:      scraped=${results.scraped}, failed=${results.failed}`);
      await scraper.close();
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED WITH ERROR:', error.message);
    console.error(error.stack);
    await scraper.close();
    process.exit(1);
  }
}

main();
