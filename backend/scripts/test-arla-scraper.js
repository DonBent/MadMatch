#!/usr/bin/env node

// Epic 3.5: Arla Scraper Test Script
// Correlation ID: ZHC-MadMatch-20260301-PuppeteerScraper
// Tests the Puppeteer-based scraper on 5 recipes

const { ArlaScraper } = require('../services/scraping/ArlaScraper');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Arla Scraper Test - 5 Recipes                   ║');
  console.log('║   Puppeteer Refactor Validation                   ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const scraper = new ArlaScraper({
    dryRun: true,  // Don't save to database
    verbose: true,
    rateLimit: 2000
  });

  try {
    // Initialize
    console.log('🔧 Initializing scraper...');
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');

    // Scrape 5 recipes
    console.log('🚀 Starting test scrape (5 recipes)...\n');
    const stats = await scraper.scrapeRecipes(5);

    // Save test results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(__dirname, `../logs/test-results-${timestamp}.json`);
    
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(stats, null, 2), 'utf-8');
    
    console.log(`\n📄 Test results saved to: ${outputFile}`);
    
    // Validation
    if (stats.scraped >= 3) {
      console.log('\n✅ TEST PASSED: Successfully scraped at least 3 recipes');
      console.log('   The Puppeteer refactor is working correctly.');
      console.log('\n📋 Next steps:');
      console.log('   1. Review the test results JSON file');
      console.log('   2. If validation looks good, run without --dry-run');
      console.log('   3. CEO approval needed before full 3,000 recipe scrape');
      process.exit(0);
    } else {
      console.log('\n⚠️  TEST WARNING: Only scraped ' + stats.scraped + ' recipes');
      console.log('   Expected at least 3 successful scrapes.');
      if (stats.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        stats.errors.forEach(({ url, error }) => {
          console.log(`   - ${url}`);
          console.log(`     ${error}`);
        });
      }
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(130);
});

main();
