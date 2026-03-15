const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');

const stores = {
  netto: 'https://netto.dk/netto-avisen/',
  foetex: 'https://www.foetex.dk/foetex-avis/',
  bilka: 'https://www.bilka.dk/bilka-avis/'
};

async function scrapeNetto() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(stores.netto, { waitUntil: 'networkidle2' });
  const imageUrl = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    const avisImg = imgs.find(img => img.src.includes('image-transformer-api.tjek.com') && img.alt && img.alt.includes('-'));
    return avisImg ? avisImg.src : null;
  });
  await browser.close();

  if (!imageUrl) {
    console.log('No avis image found for Netto');
    return [];
  }

  console.log('Downloading image from:', imageUrl);
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error('Failed to fetch image');
  const buffer = await response.buffer();

  const tempDir = path.join(__dirname, 'temp');
  fs.mkdirSync(tempDir, { recursive: true });
  const originalPath = path.join(tempDir, 'netto-avis.webp');
  fs.writeFileSync(originalPath, buffer);

  // Preprocess
  const processedBuffer = await sharp(buffer)
    .greyscale()
    .normalize()
    .threshold(128)
    .png()
    .toBuffer();
  const processedPath = path.join(tempDir, 'netto-avis-processed.png');
  fs.writeFileSync(processedPath, processedBuffer);

  const worker = await createWorker('dan');
  const { data: { text } } = await worker.recognize(processedPath);
  await worker.terminate();

  console.log('OCR Text:', text);

  // Parse text for offers
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const offers = [];
  const pricePattern = /(\\d+[ ,]\\d{2})|(\\d+%)/g;
  for (let i = 0; i < lines.length && offers.length < 5; i++) {
    const line = lines[i];
    const priceMatches = line.match(pricePattern);
    if (priceMatches && priceMatches.length >= 2) {
      let original = '0';
      let discountPrice = '0';
      let percentOff = '0%';
      const prices = priceMatches.filter(m => m.includes(',') || m.includes('.'));
      const percents = priceMatches.filter(m => m.includes('%'));
      if (prices.length >= 2) {
        original = prices[0];
        discountPrice = prices[1];
      }
      if (percents.length > 0) {
        percentOff = percents[0];
      }
      const product = lines[i-1] || line.split(pricePattern)[0].trim() || 'Unknown product';
      offers.push({
        name: product,
        originalPrice: original,
        discountPrice: discountPrice,
        percentOff: percentOff,
        store: 'netto'
      });
    } else if (line.match(/\\d+%/) && line.match(/\\d+[ ,]\\d{2}/)) {
      let original = '0';
      let discountPrice = '0';
      let percentOff = '0%';
      const percentMatch = line.match(/(\\d+)%/);
      percentOff = percentMatch ? percentMatch[1] + '%' : '0%';
      const priceMatch = line.match(/(\\d+[ ,]\\d{2})/g);
      if (priceMatch) {
        discountPrice = priceMatch[priceMatch.length - 1];
        original = priceMatch[0] || discountPrice;
      }
      const product = line.replace(/\\d+[ ,]\\d{2}/g, '').replace(/\\d+%/g, '').trim() || 'Unknown';
      offers.push({
        name: product,
        originalPrice: original,
        discountPrice: discountPrice,
        percentOff: percentOff,
        store: 'netto'
      });
    }
  }

  // Clean up
  fs.unlinkSync(processedPath);
  fs.unlinkSync(originalPath);
  fs.rmdirSync(tempDir, { recursive: true });

  console.log(`Extracted ${offers.length} offers for Netto`);
  return offers;
}

async function scrapeStore(store) {
  if (store === 'netto') {
    return await scrapeNetto();
  }

  // For other stores, fallback to basic scraping
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(stores[store], { waitUntil: 'networkidle2' });

  const offers = await page.evaluate(() => {
    const items = [];
    const offerElements = document.querySelectorAll('.offer-item, .product, .discount, [class*=\"offer\"], [class*=\"product\"]');
    offerElements.forEach(el => {
      const name = el.querySelector('.title, .name, h3, img')?.textContent?.trim() || el.querySelector('img')?.alt?.trim() || 'Unknown';
      const normalPrice = el.querySelector('.normal-price, .original-price')?.textContent?.trim() || '0';
      const offerPrice = el.querySelector('.offer-price, .new-price')?.textContent?.trim() || '0';
      const discount = el.querySelector('.discount, .percent')?.textContent?.trim() || '0%';
      if (name !== 'Unknown') {
        items.push({ name, normalPrice, offerPrice, discount });
      }
    });
    return items.slice(0, 10);
  });

  await browser.close();
  return offers.map(o => ({ ...o, store }));
}

async function main() {
  const allOffers = [];
  for (const store of Object.keys(stores)) {
    console.log(`Scraping ${store}...`);
    const offers = await scrapeStore(store);
    allOffers.push(...offers);
    console.log(`Found ${offers.length} offers for ${store}`);
  }

  const outputPath = path.join(__dirname, '../data/tilbud-live.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allOffers, null, 2));
  console.log('Scraping complete. Data saved to tilbud-live.json');
}

main().catch(console.error);