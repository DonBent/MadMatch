// Epic 3.5 Slice 3: Arla Recipe Scraper (Puppeteer Refactor)
// Correlation ID: ZHC-MadMatch-20260301-PuppeteerScraper
// Scrapes Danish recipes from Arla.dk (Vue.js SPA) using Puppeteer headless browser

require('dotenv').config();

const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

/**
 * ArlaScraper - Web scraper for Arla.dk recipes (Puppeteer-based)
 * 
 * Features:
 * - Headless browser automation with Puppeteer
 * - JavaScript-rendered content support (Vue.js SPA)
 * - Polite scraping with rate limiting (1 req/2 seconds)
 * - Database insertion via Prisma
 * - Duplicate detection
 * - Error handling and logging
 * - Progress tracking
 * 
 * AC-3.1: Respects robots.txt and rate limits
 * AC-3.2: Parses Arla recipe pages correctly (Vue.js rendered)
 * AC-3.3: Stores recipes in database with all fields
 */
class ArlaScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://www.arla.dk/opskrifter/';
    this.rateLimit = options.rateLimit || 2000; // ms between requests
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.sourceId = null;
    this.browser = null;
    this.page = null;
    
    // Initialize Prisma with adapter (unless mock provided for tests)
    if (options.prisma) {
      this.prisma = options.prisma;
      this.pool = null;
    } else {
      // Create connection pool
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
      });
      
      // Create Prisma adapter
      const adapter = new PrismaPg(this.pool);
      
      // Initialize Prisma Client with adapter
      this.prisma = new PrismaClient({
        adapter,
        log: this.verbose ? ['query', 'error', 'warn'] : ['error'],
      });
    }
    
    this.userAgent = 'MadMatch/1.4.0 (contact@madmatch.dk)';
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    // Puppeteer configuration - ZHC-MadMatch-20260301-DebugScraper
    this.puppeteerOptions = {
      headless: 'new',
      protocolTimeout: 0, // Disable Chrome DevTools Protocol timeout to prevent ~30min crashes
      dumpio: true, // Log Chrome stdout/stderr for crash detection
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--enable-logging',
        '--v=1' // Verbose logging
      ]
    };
  }

  /**
   * Initialize scraper - fetch Arla source ID from database and launch browser
   */
  async initialize() {
    try {
      const source = await this.prisma.recipeSource.findUnique({
        where: { name: 'Arla' }
      });

      if (!source) {
        throw new Error('Arla source not found in database. Please run seed script first.');
      }

      this.sourceId = source.id;
      this.log('info', `Initialized with Arla source ID: ${this.sourceId}`);
      
      // Launch browser
      this.log('info', 'Launching headless browser...');
      this.browser = await puppeteer.launch(this.puppeteerOptions);
      
      // Add browser crash detection - ZHC-MadMatch-20260301-DebugScraper
      this.browser.on('disconnected', () => {
        this.log('error', '❌ BROWSER DISCONNECTED EVENT - Chrome crashed or was killed!');
      });
      
      this.page = await this.browser.newPage();
      await this.page.setDefaultNavigationTimeout(30000);
      this.log('info', 'Browser launched successfully');
      
    } catch (error) {
      this.log('error', `Failed to initialize: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restart browser to prevent memory leaks and crashes
   */
  async restartBrowser() {
    this.log('info', '🔄 Restarting browser (memory cleanup)...');
    
    if (this.page) {
      await this.page.close().catch(() => {});
    }
    
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    
    // Reinitialize
    this.browser = await puppeteer.launch(this.puppeteerOptions);
    
    // Re-attach browser crash detection - ZHC-MadMatch-20260301-DebugScraper
    this.browser.on('disconnected', () => {
      this.log('error', '❌ BROWSER DISCONNECTED EVENT - Chrome crashed or was killed!');
    });
    
    this.page = await this.browser.newPage();
    await this.page.setDefaultNavigationTimeout(30000);
    
    this.log('info', '✅ Browser restarted successfully');
  }

  /**
   * Main scraping method
   * @param {number} limit - Maximum number of recipes to scrape
   * @param {string|null} category - Specific category to scrape
   * @returns {Promise<object>} Scraping statistics
   */
  async scrapeRecipes(limit = 1000, category = null) {
    this.log('info', `Starting Arla scraper (limit: ${limit}${category ? `, category: ${category}` : ''})`);

    // Create scraping job record
    let job = null;
    if (!this.dryRun) {
      job = await this.prisma.scrapingJob.create({
        data: {
          source: {
            connect: { id: this.sourceId }
          },
          status: 'RUNNING',
          startedAt: new Date()
        }
      });
      this.log('info', `Created scraping job: ${job.id}`);
    }

    const stats = {
      scraped: 0,
      failed: 0,
      duplicates: 0,
      errors: []
    };

    try {
      // Step 1: Get recipe URLs from category pages
      this.log('info', 'Fetching recipe URLs...');
      const recipeUrls = await this.fetchRecipeUrls(category, limit);
      this.log('info', `Found ${recipeUrls.length} recipe URLs`);

      // Step 1.5: Check for existing recipes to determine resume point
      this.log('info', 'Checking for existing recipes in database...');
      const existingRecipes = await this.getExistingRecipeUrls();
      this.log('info', `Database contains ${existingRecipes.length} existing recipes from this source`);

      // Find resume point
      let startIndex = 0;
      if (existingRecipes.length > 0) {
        // Convert to Set for O(1) lookup
        const existingSet = new Set(existingRecipes);
        
        // Find last URL that exists in our current URL list
        for (let i = recipeUrls.length - 1; i >= 0; i--) {
          if (existingSet.has(recipeUrls[i])) {
            startIndex = i + 1;
            if (startIndex < recipeUrls.length) {
              this.log('info', `✅ RESUME MODE: Starting from recipe #${startIndex + 1} (${recipeUrls[startIndex]})`);
              this.log('info', `Skipping ${startIndex} recipes already in database`);
            } else {
              this.log('info', `✅ All recipes already scraped! Nothing to do.`);
            }
            break;
          }
        }
        
        if (startIndex === 0 && existingRecipes.length > 0) {
          this.log('info', `⚠️  Found ${existingRecipes.length} existing recipes, but none match current URL list. Starting from beginning.`);
        }
      }

      // Step 2: Scrape each recipe (starting from resume point)
      for (let i = startIndex; i < recipeUrls.length; i++) {
        const url = recipeUrls[i];
        
        try {
          // Restart browser every 50 recipes to prevent memory leaks
          if (i > 0 && i % 50 === 0) {
            await this.restartBrowser();
          }

          // Rate limiting
          if (i > 0) {
            await this.sleep(this.rateLimit);
          }

          this.log('verbose', `[${i + 1}/${recipeUrls.length}] Fetching: ${url}`);
          
          const recipe = await this.scrapeRecipePage(url);

          // Memory tracking per recipe - ZHC-MadMatch-20260301-DebugScraper
          const mem = process.memoryUsage();
          this.log('debug', `Memory: heap=${Math.floor(mem.heapUsed/1024/1024)}MB, rss=${Math.floor(mem.rss/1024/1024)}MB`);

          if (!this.dryRun) {
            const inserted = await this.saveRecipe(recipe);
            if (inserted) {
              stats.scraped++;
              this.log('verbose', `✓ Saved: ${recipe.title}`);
            } else {
              stats.duplicates++;
              this.log('verbose', `⊘ Duplicate: ${recipe.title}`);
            }
          } else {
            stats.scraped++;
            this.log('info', `[DRY RUN] Would insert: ${recipe.title}`);
          }

          // Progress update with enhanced logging
          const total = stats.scraped + stats.duplicates + stats.failed;
          if (total % 50 === 0 && total > 0) {
            const processed = i + 1;
            const remaining = recipeUrls.length - processed;
            const percentComplete = Math.floor((processed / recipeUrls.length) * 100);
            const avgTimePerRecipe = 5; // ~5 seconds per recipe (2s rate limit + processing)
            const etaMinutes = Math.floor((remaining * avgTimePerRecipe) / 60);
            
            this.log('info', `\n📊 PROGRESS UPDATE:`);
            this.log('info', `   Processed: ${processed}/${recipeUrls.length} (${percentComplete}%)`);
            this.log('info', `   Scraped: ${stats.scraped} | Duplicates: ${stats.duplicates} | Failed: ${stats.failed}`);
            this.log('info', `   Remaining: ${remaining} recipes`);
            this.log('info', `   ETA: ~${etaMinutes} minutes\n`);
          }

        } catch (error) {
          stats.failed++;
          stats.errors.push({ url, error: error.message });
          this.log('error', `✗ Failed to scrape ${url}: ${error.message}`);
          await this.logError(url, error);
        }
      }

      // Update job status
      if (!this.dryRun && job) {
        await this.prisma.scrapingJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            recipesScraped: stats.scraped
          }
        });
      }

    } catch (error) {
      this.log('error', `Scraping failed: ${error.message}`);
      
      // Update job with failure
      if (!this.dryRun && job) {
        await this.prisma.scrapingJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: error.message
          }
        });
      }
      
      throw error;
    }

    this.printSummary(stats);
    
    // Return stats with aliases for backward compatibility
    return {
      ...stats,
      successCount: stats.scraped,
      failedCount: stats.failed
    };
  }

  /**
   * Get list of URLs for all recipes from this source already in database
   * Used for resume functionality
   * @returns {Promise<string[]>} Array of recipe URLs
   */
  async getExistingRecipeUrls() {
    try {
      const recipes = await this.prisma.recipe.findMany({
        where: { sourceId: this.sourceId },
        select: { externalId: true }
      });
      
      // externalId stores the full URL
      return recipes.map(r => r.externalId).filter(Boolean);
    } catch (error) {
      this.log('error', `Failed to fetch existing recipe URLs: ${error.message}`);
      return []; // Fail safe: return empty array to start from beginning
    }
  }

  /**
   * Fetch recipe URLs from sitemap.xml (fast and reliable)
   * @param {string|null} category - Category filter (not used with sitemap)
   * @param {number} limit - Max URLs to fetch
   * @returns {Promise<string[]>} Array of recipe URLs
   */
  async fetchRecipeUrls(category = null, limit = 1000) {
    const https = require('https');
    const { parseStringPromise } = require('xml2js');
    
    try {
      this.log('info', 'Fetching recipe URLs from sitemap.xml...');
      
      const sitemapUrl = 'https://www.arla.dk/sitemap.xml?type=Modules.Recipes.Business.SitemapUrlWriter.RecipeSitemapUrlWriter';
      
      // Fetch sitemap XML
      const xmlData = await new Promise((resolve, reject) => {
        https.get(sitemapUrl, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve(data));
          res.on('error', reject);
        }).on('error', reject);
      });
      
      // Parse XML
      const parsed = await parseStringPromise(xmlData);
      
      // Extract URLs from <url><loc> elements
      const urls = [];
      if (parsed.urlset && parsed.urlset.url) {
        for (const urlEntry of parsed.urlset.url) {
          if (urlEntry.loc && urlEntry.loc[0]) {
            const url = urlEntry.loc[0];
            // Filter only recipe URLs
            if (url.includes('/opskrifter/') && !url.match(/\/opskrifter\/$/)) {
              urls.push(url);
            }
          }
        }
      }
      
      this.log('info', `Sitemap contains ${urls.length} recipe URLs`);
      
      // Apply limit
      const limitedUrls = urls.slice(0, limit);
      this.log('info', `Returning ${limitedUrls.length} URLs (limit: ${limit})`);
      
      return limitedUrls;
      
    } catch (error) {
      this.log('error', `Failed to fetch recipe URLs from sitemap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scrape a single recipe page using Puppeteer
   * @param {string} url - Recipe URL
   * @returns {Promise<object>} Parsed recipe data
   */
  async scrapeRecipePage(url) {
    const page = this.page;
    
    try {
      await page.setUserAgent(this.userAgent);
      
      // Enhanced error handling for page navigation - ZHC-MadMatch-20260301-DebugScraper
      this.log('verbose', `Loading page: ${url}`);
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      } catch (error) {
        this.log('error', `❌ PAGE GOTO FAILED: ${error.message}`);
        this.log('error', `Stack: ${error.stack}`);
        throw error;
      }
      
      // Wait for Vue.js to render recipe content
      await page.waitForSelector('h1, [class*="title"], [class*="recipe"]', { timeout: 10000 });
      await this.sleep(1000); // Additional wait for dynamic content
      
      // Extract recipe data from JSON-LD (structured data)
      const recipeData = await page.evaluate(() => {
        // Try to extract from JSON-LD first (most reliable)
        const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        let recipeSchema = null;
        
        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse(script.textContent);
            // Data might be nested in arrays
            const findRecipe = (obj) => {
              if (!obj) return null;
              if (Array.isArray(obj)) {
                for (const item of obj) {
                  const found = findRecipe(item);
                  if (found) return found;
                }
              } else if (obj['@type'] === 'Recipe' || obj.type === 'Recipe') {
                return obj;
              }
              return null;
            };
            recipeSchema = findRecipe(data);
            if (recipeSchema) break;
          } catch (e) {
            // Skip invalid JSON
          }
        }
        
        // Helper functions for fallback HTML extraction
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };
        
        const getAttr = (selector, attr) => {
          const el = document.querySelector(selector);
          return el ? el.getAttribute(attr) : null;
        };
        
        const parseISODuration = (duration) => {
          if (!duration) return null;
          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          if (match) {
            const hours = parseInt(match[1]) || 0;
            const mins = parseInt(match[2]) || 0;
            return hours * 60 + mins;
          }
          return null;
        };
        
        // Extract data from JSON-LD if available, otherwise fallback to HTML
        let title, description, imageUrl, prepTime, cookTime, totalTime, servings, ingredients, instructions;
        
        if (recipeSchema) {
          // Use structured data
          title = recipeSchema.name || '';
          description = recipeSchema.description || null;
          imageUrl = Array.isArray(recipeSchema.image) ? recipeSchema.image[0] : recipeSchema.image || null;
          prepTime = parseISODuration(recipeSchema.prepTime);
          cookTime = parseISODuration(recipeSchema.cookTime);
          totalTime = parseISODuration(recipeSchema.totalTime);
          
          // Parse servings from recipeYield
          if (recipeSchema.recipeYield) {
            const yieldMatch = recipeSchema.recipeYield.toString().match(/(\d+)/);
            servings = yieldMatch ? parseInt(yieldMatch[1]) : null;
          } else {
            servings = null;
          }
          
          // Parse ingredients
          ingredients = [];
          if (recipeSchema.recipeIngredient && Array.isArray(recipeSchema.recipeIngredient)) {
            ingredients = recipeSchema.recipeIngredient.map((ing, index) => {
              // Try to split quantity and name
              const match = ing.match(/^([0-9.,\s½¼¾]+\s*[a-zæøåA-ZÆØÅ]+\.?)\s+(.+)$/i);
              if (match) {
                return {
                  quantity: match[1].trim(),
                  name: match[2].trim(),
                  order: index + 1
                };
              } else {
                return {
                  quantity: null,
                  name: ing.trim(),
                  order: index + 1
                };
              }
            });
          }
          
          // Parse instructions
          instructions = [];
          if (recipeSchema.recipeInstructions && Array.isArray(recipeSchema.recipeInstructions)) {
            recipeSchema.recipeInstructions.forEach(instruction => {
              if (typeof instruction === 'string') {
                instructions.push(instruction);
              } else if (instruction['@type'] === 'HowToStep' || instruction.type === 'HowToStep') {
                instructions.push(instruction.text);
              } else if (instruction['@type'] === 'HowToSection' || instruction.type === 'HowToSection') {
                if (instruction.itemListElement && Array.isArray(instruction.itemListElement)) {
                  instruction.itemListElement.forEach(step => {
                    if (step.text) instructions.push(step.text);
                  });
                }
              }
            });
          }
          
        } else {
          // Fallback to HTML scraping
          title = 
            getText('h1') ||
            getAttr('meta[property="og:title"]', 'content') ||
            '';
          
          description = 
            getAttr('meta[name="description"]', 'content') ||
            getAttr('meta[property="og:description"]', 'content') ||
            null;
          
          imageUrl = 
            getAttr('meta[property="og:image"]', 'content') ||
            getAttr('img[class*="recipe"]', 'src') ||
            null;
          
          prepTime = cookTime = totalTime = servings = null;
          ingredients = [];
          instructions = [];
          
          // Try to extract from HTML (basic implementation)
          const ingredientElements = document.querySelectorAll(
            '.c-recipe__ingredient-list li, [class*="ingredient-list"] li, [class*="ingredient"] li'
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
        }
        
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
          difficulty: null  // Will be inferred later
        };
      });
      
      // Validate required fields
      if (!recipeData.title || recipeData.ingredients.length === 0) {
        throw new Error('Missing required fields (title or ingredients)');
      }
      
      // Calculate difficulty if not provided
      if (!recipeData.difficulty) {
        const timeForDifficulty = recipeData.totalTime || (recipeData.prepTime || 0) + (recipeData.cookTime || 0);
        recipeData.difficulty = this.inferDifficulty(timeForDifficulty);
      }
      
      // Clean up image URL
      if (recipeData.imageUrl) {
        if (recipeData.imageUrl.startsWith('//')) {
          recipeData.imageUrl = 'https:' + recipeData.imageUrl;
        } else if (recipeData.imageUrl.startsWith('/')) {
          recipeData.imageUrl = 'https://www.arla.dk' + recipeData.imageUrl;
        }
      }
      
      // Build final recipe object
      const recipe = {
        title: recipeData.title,
        slug: this.generateSlug(recipeData.title),
        description: recipeData.description || null,
        imageUrl: recipeData.imageUrl || null,
        prepTimeMinutes: recipeData.prepTime || null,
        cookTimeMinutes: recipeData.cookTime || null,
        totalTimeMinutes: recipeData.totalTime || (recipeData.prepTime || 0) + (recipeData.cookTime || 0) || null,
        servings: recipeData.servings || null,
        difficulty: recipeData.difficulty,
        instructions: recipeData.instructions || null,
        language: 'da',
        ingredients: recipeData.ingredients,
        sourceUrl: url
      };
      
      return recipe;
      
    } catch (error) {
      this.log('error', `Failed to scrape ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate URL-safe slug from title
   * @param {string} title - Recipe title
   * @returns {string} URL slug
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[æ]/g, 'ae')
      .replace(/[ø]/g, 'oe')
      .replace(/[å]/g, 'aa')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 250); // Limit length
  }

  /**
   * Infer difficulty from total time
   * @param {number|null} totalTime - Total time in minutes
   * @returns {string|null} Difficulty level
   */
  inferDifficulty(totalTime) {
    if (!totalTime) return null;
    if (totalTime <= 30) return 'EASY';
    if (totalTime <= 60) return 'MEDIUM';
    return 'HARD';
  }

  /**
   * Save recipe to database
   * @param {object} recipeData - Parsed recipe data
   * @returns {Promise<boolean>} True if inserted, false if duplicate
   */
  async saveRecipe(recipeData) {
    try {
      // Check for duplicate (by title OR slug to handle unique constraint)
      const existing = await this.prisma.recipe.findFirst({
        where: {
          AND: [
            { sourceId: this.sourceId },
            {
              OR: [
                { title: recipeData.title },
                { slug: recipeData.slug }
              ]
            }
          ]
        }
      });

      if (existing) {
        this.log('verbose', `Duplicate found: ${recipeData.title}`);
        return false;
      }

      // Insert with transaction
      await this.prisma.$transaction(async (tx) => {
        const recipe = await tx.recipe.create({
          data: {
            sourceId: this.sourceId,
            title: recipeData.title,
            slug: recipeData.slug,
            description: recipeData.description,
            imageUrl: recipeData.imageUrl,
            prepTimeMinutes: recipeData.prepTimeMinutes,
            cookTimeMinutes: recipeData.cookTimeMinutes,
            totalTimeMinutes: recipeData.totalTimeMinutes,
            servings: recipeData.servings,
            difficulty: recipeData.difficulty,
            instructions: recipeData.instructions,
            language: recipeData.language,
            externalId: recipeData.sourceUrl // Store URL for resume functionality
          }
        });

        // Insert ingredients
        if (recipeData.ingredients.length > 0) {
          await tx.recipeIngredient.createMany({
            data: recipeData.ingredients.map(ing => ({
              recipeId: recipe.id,
              ingredientName: ing.name,
              quantity: ing.quantity,
              order: ing.order
            }))
          });
        }
      });

      return true;
      
    } catch (error) {
      this.log('error', `Failed to save recipe "${recipeData.title}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log error to file
   * @param {string} url - Failed URL
   * @param {Error} error - Error object
   */
  async logError(url, error) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${url}\n${error.stack}\n\n`;
    
    const logDir = path.join(__dirname, '../../logs');
    const logFile = path.join(logDir, `scraper-errors-${new Date().toISOString().split('T')[0]}.log`);
    
    try {
      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(logFile, logEntry, 'utf-8');
    } catch (err) {
      console.error('Failed to write error log:', err);
    }
  }

  /**
   * Log message
   * @param {string} level - Log level (info, warn, error, verbose, debug)
   * @param {string} message - Log message
   */
  log(level, message) {
    if (level === 'verbose' && !this.verbose) return;
    if (level === 'debug' && !this.verbose) return; // Debug messages also require verbose mode
    
    const timestamp = new Date().toISOString();
    const prefix = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      verbose: '🔍',
      debug: '🐛'
    }[level] || '';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  /**
   * Print summary statistics
   * @param {object} stats - Scraping statistics
   */
  printSummary(stats) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 SCRAPING SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successfully scraped: ${stats.scraped}`);
    console.log(`⊘  Duplicates skipped:  ${stats.duplicates}`);
    console.log(`❌ Failed:              ${stats.failed}`);
    console.log(`📈 Total processed:     ${stats.scraped + stats.duplicates + stats.failed}`);
    
    if (stats.errors.length > 0 && stats.errors.length <= 10) {
      console.log('\n⚠️  Errors:');
      stats.errors.forEach(({ url, error }) => {
        console.log(`   - ${url}: ${error}`);
      });
    } else if (stats.errors.length > 10) {
      console.log(`\n⚠️  ${stats.errors.length} errors (see log file for details)`);
    }
    
    console.log('='.repeat(50) + '\n');
  }

  /**
   * Clean up resources
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.log('info', 'Browser closed');
    }
    await this.prisma.$disconnect();
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = { ArlaScraper };
