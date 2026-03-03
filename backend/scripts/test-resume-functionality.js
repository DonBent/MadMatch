#!/usr/bin/env node

/**
 * Test Resume Functionality
 * ZHC-MadMatch-20260301-ResumeFeature
 * 
 * This script verifies that the resume functionality works correctly.
 */

const { ArlaScraper } = require('../services/scraping/ArlaScraper');

async function testResume() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Testing Resume Functionality                     ║');
  console.log('║   ZHC-MadMatch-20260301-ResumeFeature             ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const scraper = new ArlaScraper({
    dryRun: false,
    verbose: true,
    rateLimit: 2000
  });

  try {
    console.log('🔧 Initializing scraper...\n');
    await scraper.initialize();
    
    console.log('📊 Fetching recipe URLs...\n');
    const urls = await scraper.fetchRecipeUrls(null, 100); // Test with 100 URLs
    console.log(`Found ${urls.length} recipe URLs\n`);
    
    console.log('🔍 Checking existing recipes in database...\n');
    const existingRecipes = await scraper.getExistingRecipeUrls();
    console.log(`Database contains ${existingRecipes.length} existing recipes\n`);
    
    // Find resume point (same logic as scraper)
    let startIndex = 0;
    if (existingRecipes.length > 0) {
      const existingSet = new Set(existingRecipes);
      
      for (let i = urls.length - 1; i >= 0; i--) {
        if (existingSet.has(urls[i])) {
          startIndex = i + 1;
          console.log(`✅ RESUME POINT FOUND:`);
          console.log(`   Would start from recipe #${startIndex + 1}`);
          console.log(`   URL: ${urls[startIndex] || 'N/A - all scraped!'}`);
          console.log(`   Skipping: ${startIndex} recipes`);
          break;
        }
      }
      
      if (startIndex === 0 && existingRecipes.length > 0) {
        console.log(`⚠️  No matching recipes found in current URL list`);
        console.log(`   Would start from beginning`);
      }
    } else {
      console.log('ℹ️  No existing recipes found - would start from beginning');
    }
    
    console.log('\n✅ Resume functionality test complete!\n');
    
    await scraper.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testResume();
