#!/usr/bin/env node

// Search for ingredient data in different formats

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
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Look for ingredient data in different ways
    const data = await page.evaluate(() => {
      // 1. Check for JSON-LD structured data
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      const jsonLdData = jsonLdScripts.map(script => {
        try {
          return JSON.parse(script.textContent);
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      // 2. Look for ingredients in data attributes
      const elementsWithData = Array.from(document.querySelectorAll('[data-ingredients], [data-recipe]'));
      
      // 3. Search for divs/sections with ingredient-related classes
      const ingredientContainers = Array.from(document.querySelectorAll(
        '[class*="ingred"], [id*="ingred"], section:has(h2, h3)'
      ));
      
      const containerInfo = ingredientContainers.map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id,
        textPreview: el.textContent.trim().substring(0, 200),
        childrenCount: el.children.length
      }));
      
      // 4. Find all h2/h3 headers that might label ingredient sections
      const headers = Array.from(document.querySelectorAll('h2, h3')).map(h => ({
        text: h.textContent.trim(),
        nextSiblingTag: h.nextElementSibling?.tagName,
        nextSiblingClass: h.nextElementSibling?.className,
        nextSiblingText: h.nextElementSibling?.textContent.trim().substring(0, 100)
      }));
      
      // 5. Check window object for Vue/React data
      const hasVue = typeof window.__VUE__ !== 'undefined' || !!document.querySelector('[data-v-]');
      const hasReact = typeof window.React !== 'undefined' || !!document.querySelector('[data-reactroot], [data-react-]');
      
      return {
        jsonLd: jsonLdData,
        dataAttributes: elementsWithData.length,
        ingredientContainers: containerInfo,
        headers,
        frameworks: { hasVue, hasReact }
      };
    });
    
    console.log('\n📊 Analysis:');
    console.log('\n1. JSON-LD Structured Data:');
    if (data.jsonLd.length > 0) {
      data.jsonLd.forEach((item, i) => {
        console.log(`\n   Schema ${i + 1}:`);
        console.log(`   Type: ${item['@type'] || 'Unknown'}`);
        if (item.recipeIngredient) {
          console.log(`   ✅ Has recipeIngredient! (${item.recipeIngredient.length} items)`);
          item.recipeIngredient.slice(0, 5).forEach(ing => {
            console.log(`      - ${ing}`);
          });
        }
        if (item.name) console.log(`   Name: ${item.name}`);
      });
    } else {
      console.log('   None found');
    }
    
    console.log('\n2. Elements with data attributes:', data.dataAttributes);
    
    console.log('\n3. Ingredient Containers:', data.ingredientContainers.length);
    data.ingredientContainers.slice(0, 5).forEach((container, i) => {
      console.log(`\n   ${i + 1}. ${container.tag}.${container.className}`);
      console.log(`      ${container.textPreview}`);
    });
    
    console.log('\n4. Headers:');
    data.headers.forEach(h => {
      console.log(`\n   "${h.text}"`);
      if (h.nextSiblingTag) {
        console.log(`      → ${h.nextSiblingTag}.${h.nextSiblingClass || ''}`);
        console.log(`         ${h.nextSiblingText}`);
      }
    });
    
    console.log('\n5. Frameworks:', JSON.stringify(data.frameworks));
    
    // Save full JSON-LD to file
    if (data.jsonLd.length > 0) {
      const fs = require('fs').promises;
      await fs.writeFile(
        '/opt/madmatch-dev/backend/logs/jsonld-data.json',
        JSON.stringify(data.jsonLd, null, 2)
      );
      console.log('\n💾 JSON-LD data saved to: backend/logs/jsonld-data.json');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
