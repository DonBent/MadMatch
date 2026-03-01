#!/usr/bin/env node

// Test scraper with predefined URLs (5 recipes)

const { ArlaScraper } = require('../services/scraping/ArlaScraper');
const fs = require('fs').promises;
const path = require('path');

// Test URLs from Arla.dk
const TEST_URLS = [
  'https://www.arla.dk/opskrifter/chia-oats-med-bar/',
  'https://www.arla.dk/opskrifter/koldhavede-boller-med-kefir-og-graskarkerner/',
  'https://www.arla.dk/opskrifter/smoothie-med-kefir-og-blabar/',
  'https://www.arla.dk/opskrifter/chiagrod1/',
  'https://www.arla.dk/opskrifter/overnight-oats-med-havredrik/'
];

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Arla Scraper Test - 5 Specific Recipes         ║');
  console.log('║   Puppeteer Refactor Validation                   ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const scraper = new ArlaScraper({
    dryRun: true,
    verbose: false,  // Less verbose for cleaner output
    rateLimit: 2000
  });

  try {
    console.log('🔧 Initializing scraper...');
    await scraper.initialize();
    console.log('✅ Scraper initialized\n');

    const results = [];
    const stats = {
      scraped: 0,
      failed: 0,
      errors: []
    };

    console.log(`🚀 Testing ${TEST_URLS.length} recipes...\n`);

    for (let i = 0; i < TEST_URLS.length; i++) {
      const url = TEST_URLS[i];
      
      try {
        if (i > 0) {
          await scraper.sleep(scraper.rateLimit);
        }

        console.log(`[${i + 1}/${TEST_URLS.length}] Scraping: ${url}`);
        
        const recipe = await scraper.scrapeRecipePage(url);
        
        console.log(`   ✓ ${recipe.title}`);
        console.log(`     - Ingredients: ${recipe.ingredients.length}`);
        console.log(`     - Instructions: ${recipe.instructions ? 'Yes' : 'No'}`);
        console.log(`     - Time: ${recipe.totalTimeMinutes || 'N/A'} mins`);
        console.log(`     - Difficulty: ${recipe.difficulty || 'N/A'}`);
        
        results.push(recipe);
        stats.scraped++;

      } catch (error) {
        console.log(`   ✗ Failed: ${error.message}`);
        stats.failed++;
        stats.errors.push({ url, error: error.message });
      }
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(__dirname, `../logs/test-results-${timestamp}.json`);
    
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify({
      stats,
      recipes: results
    }, null, 2), 'utf-8');
    
    console.log(`\n📄 Test results saved to: ${outputFile}`);
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully scraped: ${stats.scraped}`);
    console.log(`❌ Failed:              ${stats.failed}`);
    console.log(`📈 Total:               ${TEST_URLS.length}`);
    console.log('='.repeat(50));
    
    // Validation
    if (stats.scraped >= 3) {
      console.log('\n✅ TEST PASSED: Successfully scraped at least 3 recipes');
      console.log('   The Puppeteer refactor is working correctly.');
      console.log('\n📋 Next steps:');
      console.log('   1. Review the test results JSON file');
      console.log('   2. If validation looks good, commit the changes');
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
