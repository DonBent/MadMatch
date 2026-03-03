#!/usr/bin/env node

// Find ingredient selectors

const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    
    const url = 'https://www.arla.dk/opskrifter/chia-oats-med-bar/';
    console.log(`📄 Loading: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find all possible ingredient containers
    const analysis = await page.evaluate(() => {
      // Get all list elements
      const allLists = Array.from(document.querySelectorAll('ul, ol'));
      
      const listInfo = allLists.map((list, i) => {
        const firstItems = Array.from(list.querySelectorAll('li')).slice(0, 3).map(li => li.textContent.trim());
        return {
          index: i,
          tagName: list.tagName,
          className: list.className,
          id: list.id,
          itemCount: list.querySelectorAll('li').length,
          firstItems,
          parentClass: list.parentElement?.className || '',
        };
      });
      
      // Look for text patterns that suggest ingredients
      const ingredientKeywords = ['gram', 'stk', 'dl', 'ml', 'tsk', 'spsk', 'kg', 'liter'];
      const likelyIngredientLists = listInfo.filter(list => {
        return list.firstItems.some(item => 
          ingredientKeywords.some(keyword => item.toLowerCase().includes(keyword))
        );
      });
      
      return {
        totalLists: listInfo.length,
        allLists: listInfo,
        likelyIngredients: likelyIngredientLists
      };
    });
    
    console.log(`\n📊 Found ${analysis.totalLists} total lists\n`);
    console.log('🎯 Likely ingredient lists:');
    analysis.likelyIngredients.forEach(list => {
      console.log(`\nList ${list.index}:`);
      console.log(`  Tag: ${list.tagName}`);
      console.log(`  Class: "${list.className}"`);
      console.log(`  ID: "${list.id}"`);
      console.log(`  Parent Class: "${list.parentClass}"`);
      console.log(`  Items: ${list.itemCount}`);
      console.log(`  Sample:`);
      list.firstItems.forEach(item => console.log(`    - ${item}`));
    });
    
    console.log('\n📋 All lists:');
    analysis.allLists.forEach(list => {
      if (list.itemCount > 0) {
        console.log(`\n  ${list.index}. ${list.tagName}.${list.className || '(no class)'} (${list.itemCount} items)`);
        if (list.firstItems.length > 0) {
          console.log(`     First: "${list.firstItems[0]?.substring(0, 60)}"`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
