#!/usr/bin/env node

// Debug script to inspect Arla.dk structure

const puppeteer = require('puppeteer');

async function main() {
  console.log('🔍 Inspecting Arla.dk structure...\n');
  
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
    
    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get page info
    const info = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        allLinks: Array.from(document.querySelectorAll('a')).length,
        recipeLinks: Array.from(document.querySelectorAll('a[href*="/opskrifter/"]')).length,
        sampleLinks: Array.from(document.querySelectorAll('a'))
          .slice(0, 20)
          .map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 50) })),
        bodyClasses: document.body.className,
        mainContent: document.querySelector('main')?.innerHTML.substring(0, 500) || 'No main element'
      };
    });
    
    console.log('📊 Page Information:');
    console.log('Title:', info.title);
    console.log('URL:', info.url);
    console.log('Total links:', info.allLinks);
    console.log('Recipe links:', info.recipeLinks);
    console.log('\n📋 Sample Links:');
    info.sampleLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.text}`);
      console.log(`     ${link.href}`);
    });
    
    console.log('\n🏷️  Body classes:', info.bodyClasses);
    console.log('\n📄 Main content preview:', info.mainContent.substring(0, 200));
    
    // Try to find recipe cards or containers
    const containers = await page.evaluate(() => {
      const selectors = [
        '[class*="recipe"]',
        '[class*="card"]',
        '[class*="item"]',
        '[data-recipe]',
        'article',
        '[class*="grid"] > div'
      ];
      
      const results = {};
      selectors.forEach(sel => {
        const els = document.querySelectorAll(sel);
        results[sel] = els.length;
      });
      return results;
    });
    
    console.log('\n🎯 Potential recipe containers:');
    Object.entries(containers).forEach(([sel, count]) => {
      if (count > 0) {
        console.log(`  ${sel}: ${count} elements`);
      }
    });
    
    // Take a screenshot for manual inspection
    await page.screenshot({ path: '/opt/madmatch-dev/backend/logs/arla-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved to: backend/logs/arla-debug.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
