#!/usr/bin/env node

// Debug script to scrape a single recipe

const puppeteer = require('puppeteer');

async function scrapeRecipe(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log(`\n📄 Loading: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('✅ Page loaded');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract recipe data
    const recipeData = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };
      
      const getAttr = (selector, attr) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) : null;
      };
      
      const extractTime = (text) => {
        if (!text) return null;
        const hours = text.match(/(\d+)\s*(time|timer|hour|h)/i)?.[1] || 0;
        const mins = text.match(/(\d+)\s*(min|minutter|m(?!e))/i)?.[1] || 0;
        const total = parseInt(hours) * 60 + parseInt(mins);
        return total > 0 ? total : null;
      };
      
      // Title
      const title = 
        getText('h1') ||
        getAttr('meta[property="og:title"]', 'content') ||
        '';
      
      // Description
      const description = 
        getAttr('meta[name="description"]', 'content') ||
        getAttr('meta[property="og:description"]', 'content') ||
        null;
      
      // Image
      const imageUrl = 
        getAttr('meta[property="og:image"]', 'content') ||
        getAttr('img[class*="recipe"]', 'src') ||
        getAttr('main img', 'src') ||
        null;
      
      // Times
      const timeElements = Array.from(document.querySelectorAll('[class*="time"], [class*="duration"], time'));
      let prepTime = null;
      let cookTime = null;
      let totalTime = null;
      
      timeElements.forEach(el => {
        const text = el.textContent.toLowerCase();
        const time = extractTime(el.textContent);
        
        if (text.includes('forbered') || text.includes('prep')) {
          prepTime = time;
        } else if (text.includes('tilbered') || text.includes('kog') || text.includes('cook')) {
          cookTime = time;
        } else if (text.includes('total') || text.includes('samlet')) {
          totalTime = time;
        } else if (!prepTime && !cookTime && time) {
          totalTime = time;
        }
      });
      
      // Servings
      const servingsText = 
        getText('[class*="serving"]') ||
        getText('[class*="portion"]') ||
        getText('[class*="person"]') ||
        '';
      const servings = servingsText.match(/(\d+)/)?.[1] ? parseInt(servingsText.match(/(\d+)/)[1]) : null;
      
      // Ingredients
      const ingredients = [];
      const ingredientElements = document.querySelectorAll(
        'li[class*="ingredient"], [class*="ingredient-list"] li, ul[class*="ingredient"] li, [class*="ingredients"] li'
      );
      
      ingredientElements.forEach((el, index) => {
        const text = el.textContent.trim();
        if (text) {
          const match = text.match(/^([0-9.,\s½¼¾]+\s*[a-zæøåA-ZÆØÅ]+\.?)\s+(.+)$/);
          if (match) {
            ingredients.push({
              quantity: match[1].trim(),
              name: match[2].trim(),
              order: index + 1
            });
          } else {
            ingredients.push({
              quantity: null,
              name: text,
              order: index + 1
            });
          }
        }
      });
      
      // Instructions
      const instructions = [];
      const instructionElements = document.querySelectorAll(
        'li[class*="instruction"], li[class*="step"], li[class*="method"], li[class*="directions"], [class*="instruction"] p, [class*="method"] p'
      );
      
      instructionElements.forEach(el => {
        const step = el.textContent.trim();
        if (step && step.length > 5) {
          instructions.push(step);
        }
      });
      
      // Debug info
      const debug = {
        h1Count: document.querySelectorAll('h1').length,
        imgCount: document.querySelectorAll('img').length,
        ingredientSelectors: {
          'li[class*="ingredient"]': document.querySelectorAll('li[class*="ingredient"]').length,
          '[class*="ingredient-list"] li': document.querySelectorAll('[class*="ingredient-list"] li').length,
          'ul[class*="ingredient"] li': document.querySelectorAll('ul[class*="ingredient"] li').length,
        },
        instructionSelectors: {
          'li[class*="instruction"]': document.querySelectorAll('li[class*="instruction"]').length,
          'li[class*="step"]': document.querySelectorAll('li[class*="step"]').length,
        }
      };
      
      return {
        title,
        description,
        imageUrl,
        prepTime,
        cookTime,
        totalTime,
        servings,
        ingredients,
        instructions: instructions.length > 0 ? instructions.join('\n\n') : null,
        debug
      };
    });
    
    console.log('\n📊 Scraped Data:');
    console.log('================\n');
    console.log('Title:', recipeData.title);
    console.log('Description:', recipeData.description?.substring(0, 100) + '...');
    console.log('Image:', recipeData.imageUrl);
    console.log('Prep Time:', recipeData.prepTime, 'mins');
    console.log('Cook Time:', recipeData.cookTime, 'mins');
    console.log('Total Time:', recipeData.totalTime, 'mins');
    console.log('Servings:', recipeData.servings);
    console.log('Ingredients:', recipeData.ingredients.length);
    recipeData.ingredients.slice(0, 5).forEach(ing => {
      console.log(`  - ${ing.quantity || ''} ${ing.name}`);
    });
    console.log('Instructions:', recipeData.instructions ? 'Yes' : 'No');
    console.log('\n🐛 Debug Info:');
    console.log(JSON.stringify(recipeData.debug, null, 2));
    
    // Save to file
    const fs = require('fs').promises;
    await fs.writeFile(
      '/opt/madmatch-dev/backend/logs/single-recipe-test.json',
      JSON.stringify(recipeData, null, 2)
    );
    console.log('\n💾 Full data saved to: backend/logs/single-recipe-test.json');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Test with a specific recipe
const testUrl = process.argv[2] || 'https://www.arla.dk/opskrifter/chia-oats-med-bar/';
console.log('🧪 Testing single recipe scraper...');
scrapeRecipe(testUrl).catch(console.error);
