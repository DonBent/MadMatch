#!/usr/bin/env node

// Test single recipe with the actual scraper class

const { ArlaScraper } = require('../services/scraping/ArlaScraper');
const fs = require('fs').promises;

async function main() {
  console.log('🧪 Testing ArlaScraper on single recipe...\n');
  
  const scraper = new ArlaScraper({
    dryRun: true,
    verbose: true,
    rateLimit: 1000
  });
  
  try {
    await scraper.initialize();
    
    const testUrl = 'https://www.arla.dk/opskrifter/chia-oats-med-bar/';
    console.log(`\n📄 Scraping: ${testUrl}\n`);
    
    const recipe = await scraper.scrapeRecipePage(testUrl);
    
    console.log('\n📊 Scraped Recipe:');
    console.log('==================\n');
    console.log('Title:', recipe.title);
    console.log('Description:', recipe.description?.substring(0, 100) + '...');
    console.log('Image URL:', recipe.imageUrl);
    console.log('Prep Time:', recipe.prepTimeMinutes, 'mins');
    console.log('Cook Time:', recipe.cookTimeMinutes, 'mins');
    console.log('Total Time:', recipe.totalTimeMinutes, 'mins');
    console.log('Servings:', recipe.servings);
    console.log('Difficulty:', recipe.difficulty);
    console.log('Language:', recipe.language);
    console.log('\nIngredients:', recipe.ingredients.length);
    recipe.ingredients.forEach((ing, i) => {
      console.log(`  ${i + 1}. ${ing.quantity || ''} ${ing.name}`);
    });
    console.log('\nInstructions:');
    const steps = recipe.instructions?.split('\n\n') || [];
    steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step.substring(0, 80)}${step.length > 80 ? '...' : ''}`);
    });
    
    // Save full recipe
    await fs.writeFile(
      '/opt/madmatch-dev/backend/logs/scraped-recipe.json',
      JSON.stringify(recipe, null, 2)
    );
    console.log('\n💾 Full recipe saved to: backend/logs/scraped-recipe.json');
    
    // Validate
    const isValid = 
      recipe.title && 
      recipe.ingredients.length >= 3 &&
      recipe.instructions;
    
    if (isValid) {
      console.log('\n✅ TEST PASSED: Recipe scraped successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED: Missing required data');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main().catch(console.error);
