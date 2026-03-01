#!/usr/bin/env node

// Epic 3.5 Slice 3: Arla Scraper CLI Tool
// Correlation ID: ZHC-MadMatch-20260301-004
// Command-line interface for scraping Arla.dk recipes

const { program } = require('commander');
const { ArlaScraper } = require('../services/scraping/ArlaScraper');
const path = require('path');

// Configure commander
program
  .name('scrape-arla')
  .description('Scrape Danish recipes from Arla.dk and store in database')
  .version('1.0.0')
  .option('-l, --limit <number>', 'Maximum number of recipes to scrape', '1000')
  .option('-d, --dry-run', 'Parse recipes without inserting to database', false)
  .option('-v, --verbose', 'Enable detailed logging', false)
  .option('-c, --category <name>', 'Scrape specific category (e.g., "koed", "fisk")', null)
  .option('--rate-limit <ms>', 'Milliseconds between requests', '2000')
  .parse(process.argv);

const options = program.opts();

/**
 * Main execution function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Arla Recipe Scraper - MadMatch v1.4.0           ║');
  console.log('║   Epic 3.5 Slice 3                                 ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Display configuration
  console.log('📋 Configuration:');
  console.log(`   • Limit:        ${options.limit} recipes`);
  console.log(`   • Dry Run:      ${options.dryRun ? 'Yes (no database writes)' : 'No'}`);
  console.log(`   • Verbose:      ${options.verbose ? 'Yes' : 'No'}`);
  console.log(`   • Category:     ${options.category || 'All categories'}`);
  console.log(`   • Rate Limit:   ${options.rateLimit}ms between requests`);
  console.log();

  // Confirmation for large scrapes
  if (!options.dryRun && parseInt(options.limit) > 100) {
    console.log('⚠️  You are about to scrape ' + options.limit + ' recipes to the database.');
    console.log('   This will take approximately ' + Math.round(parseInt(options.limit) * parseInt(options.rateLimit) / 1000 / 60) + ' minutes.');
    console.log();
  }

  const scraper = new ArlaScraper({
    dryRun: options.dryRun,
    verbose: options.verbose,
    rateLimit: parseInt(options.rateLimit)
  });

  try {
    // Initialize scraper
    console.log('🔧 Initializing scraper...');
    await scraper.initialize();
    console.log('✅ Scraper initialized successfully\n');

    // Start scraping
    const startTime = Date.now();
    console.log('🚀 Starting scraping process...\n');
    
    const stats = await scraper.scrapeRecipes(
      parseInt(options.limit),
      options.category
    );

    const duration = Math.round((Date.now() - startTime) / 1000);
    
    // Final report
    console.log('\n✨ Scraping completed successfully!');
    console.log(`⏱️  Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    
    if (!options.dryRun) {
      console.log('\n📊 Database Updated:');
      console.log(`   • ${stats.scraped} new recipes added`);
      console.log(`   • ${stats.duplicates} duplicates skipped`);
      console.log(`   • ${stats.failed} failed to scrape`);
    } else {
      console.log('\n🔍 Dry Run Results:');
      console.log(`   • ${stats.scraped} recipes would be added`);
      console.log(`   • ${stats.failed} recipes failed to parse`);
      console.log('\n💡 Run without --dry-run to save to database');
    }

    // Success recommendations
    if (!options.dryRun && stats.scraped > 0) {
      console.log('\n🎯 Next Steps:');
      console.log('   1. Verify recipes in database: npm run prisma:studio');
      console.log('   2. Test recipe search API: GET /api/recipes/search?q=kylling');
      console.log('   3. Check scraping job status in scraping_jobs table');
    }

    // Exit with success
    await scraper.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Scraping failed:', error.message);
    
    if (options.verbose) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }

    console.error('\n🔧 Troubleshooting:');
    console.error('   • Check database connection (DATABASE_URL in .env)');
    console.error('   • Verify Arla source exists: npm run seed');
    console.error('   • Check network connectivity to arla.dk');
    console.error('   • Review error logs in backend/logs/');

    await scraper.close();
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Scraping interrupted by user (Ctrl+C)');
  console.log('   Partial results may have been saved to database.');
  process.exit(130);
});

// Execute main function
main();
