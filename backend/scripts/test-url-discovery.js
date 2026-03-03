#!/usr/bin/env node

/**
 * Test URL Discovery - Verify sitemap.xml fetching
 * ZHC-MadMatch-20260301-URLDiscovery
 * 
 * Tests that fetchRecipeUrls() returns at least 100 URLs
 */

const { ArlaScraper } = require('../services/scraping/ArlaScraper');

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Test URL Discovery - Sitemap.xml Validation     ║');
  console.log('║   ZHC-MadMatch-20260301-URLDiscovery              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  const scraper = new ArlaScraper({
    dryRun: true,
    verbose: true,
  });

  try {
    console.log('🔧 Initializing scraper...\n');
    await scraper.initialize();
    
    console.log('🔍 Testing URL discovery from sitemap.xml...\n');
    
    const startTime = Date.now();
    const urls = await scraper.fetchRecipeUrls(null, 150);
    const duration = Date.now() - startTime;
    
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   TEST RESULTS                                     ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`📊 URLs discovered: ${urls.length}`);
    console.log(`⏱️  Time taken: ${duration}ms`);
    console.log(`✅ Minimum required: 100 URLs`);
    
    if (urls.length >= 100) {
      console.log(`\n✅ TEST PASSED! Found ${urls.length} URLs (≥100 required)`);
      
      // Show first 10 URLs as samples
      console.log('\n📋 Sample URLs:');
      urls.slice(0, 10).forEach((url, i) => {
        console.log(`   ${i + 1}. ${url}`);
      });
      
      await scraper.close();
      process.exit(0);
    } else {
      console.log(`\n❌ TEST FAILED! Found only ${urls.length} URLs (<100 required)`);
      await scraper.close();
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error.message);
    console.error(error.stack);
    await scraper.close();
    process.exit(1);
  }
}

main();
