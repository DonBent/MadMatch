#!/usr/bin/env node

// Debug script to get actual recipe URLs

const puppeteer = require('puppeteer');

async function main() {
  console.log('🔍 Extracting recipe URLs from Arla.dk...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log('📄 Loading https://www.arla.dk/opskrifter/...');
    await page.goto('https://www.arla.dk/opskrifter/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log('✅ Page loaded\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract all recipe links
    const recipeLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/opskrifter/"]'));
      return links.map(a => ({
        href: a.href,
        text: a.textContent.trim().substring(0, 80)
      }));
    });
    
    // Filter to actual recipe pages (not categories/indexes)
    const actualRecipes = recipeLinks.filter(link => {
      const path = link.href.split('/opskrifter/')[1];
      if (!path) return false;
      
      // Should have a single path segment (not nested)
      const segments = path.split('/').filter(s => s.length > 0);
      return segments.length === 1 && !path.includes('?') && !path.includes('#');
    });
    
    // Remove duplicates
    const unique = [...new Map(actualRecipes.map(item => [item.href, item])).values()];
    
    console.log(`📊 Found ${unique.length} unique recipe URLs\n`);
    console.log('📋 First 10 recipe URLs:');
    unique.slice(0, 10).forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.text}`);
      console.log(`     ${link.href}`);
    });
    
    // Save to file
    const fs = require('fs').promises;
    await fs.writeFile(
      '/opt/madmatch-dev/backend/logs/recipe-urls-sample.json',
      JSON.stringify(unique.slice(0, 10), null, 2)
    );
    
    console.log('\n💾 Saved 10 sample URLs to: backend/logs/recipe-urls-sample.json');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
