#!/usr/bin/env node

// Correlation ID: ZHC-MadMatch-20260302-DebugCrashRecipes
// Debug script for recipes #336 and #351 that cause Chrome crashes

require('dotenv').config();

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Debug script to isolate and diagnose Chrome crashes at specific recipe URLs
 * 
 * Test URLs:
 * - Recipe #336: https://www.arla.dk/opskrifter/sma-islagkager-med-appelsin--og-sveskesalat/
 * - Recipe #351: https://www.arla.dk/opskrifter/bowl-med-rodbedetzatziki/
 * 
 * Instrumentation:
 * - Page resource monitoring (images, scripts, size)
 * - Memory tracking before/after each page load
 * - Network request logging
 * - Console error capture
 * - Page size/complexity metrics
 */

class CrashDebugger {
  constructor() {
    this.logEntries = [];
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('-').substring(0, 19);
    this.logFile = path.join('/opt/madmatch-dev/backend/logs', `crash-debug-${this.timestamp}.log`);
  }

  /**
   * Log message to console and internal buffer
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = {
      error: '❌',
      warn: '⚠️ ',
      info: 'ℹ️ ',
      success: '✅',
      debug: '🐛'
    }[level] || 'ℹ️ ';
    
    const logLine = `[${timestamp}] ${prefix} ${message}`;
    console.log(logLine);
    
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    this.logEntries.push(logEntry);
  }

  /**
   * Save all log entries to file
   */
  async saveLogs() {
    const logDir = path.dirname(this.logFile);
    await fs.mkdir(logDir, { recursive: true });
    
    const content = this.logEntries.map(entry => {
      let line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
      if (entry.data) {
        line += '\n' + JSON.stringify(entry.data, null, 2);
      }
      return line;
    }).join('\n\n');
    
    await fs.writeFile(this.logFile, content, 'utf-8');
    this.log('success', `Logs saved to: ${this.logFile}`);
  }

  /**
   * Get memory usage in MB
   */
  getMemoryUsage() {
    const mem = process.memoryUsage();
    return {
      heapUsed: Math.floor(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.floor(mem.heapTotal / 1024 / 1024),
      rss: Math.floor(mem.rss / 1024 / 1024),
      external: Math.floor(mem.external / 1024 / 1024)
    };
  }

  /**
   * Test a single recipe URL with comprehensive instrumentation
   */
  async testRecipeUrl(url, recipeId, attempt = 1) {
    this.log('info', `\n${'='.repeat(80)}`);
    this.log('info', `Testing Recipe #${recipeId} (Attempt ${attempt}/3)`);
    this.log('info', `URL: ${url}`);
    this.log('info', `${'='.repeat(80)}\n`);

    let browser = null;
    let page = null;
    
    const testResult = {
      recipeId,
      url,
      attempt,
      success: false,
      crashed: false,
      error: null,
      metrics: {
        memoryBefore: null,
        memoryAfter: null,
        memoryDelta: null,
        loadTime: null,
        resources: {
          total: 0,
          images: 0,
          scripts: 0,
          stylesheets: 0,
          fonts: 0,
          xhr: 0,
          other: 0
        },
        resourceSizes: {
          total: 0,
          largest: null
        },
        consoleErrors: [],
        networkErrors: [],
        pageMetrics: null
      }
    };

    try {
      // Memory snapshot BEFORE browser launch
      const memBefore = this.getMemoryUsage();
      testResult.metrics.memoryBefore = memBefore;
      this.log('debug', 'Memory before browser launch:', memBefore);

      // Launch browser with verbose logging
      this.log('info', 'Launching browser...');
      browser = await puppeteer.launch({
        headless: 'new',
        dumpio: true, // Log Chrome stdout/stderr
        protocolTimeout: 0,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--enable-logging',
          '--v=1', // Verbose Chrome logging
          '--disable-features=site-per-process', // Simplify process model
          '--single-process', // Run in single process (easier to debug)
        ]
      });

      // Browser disconnection handler
      browser.on('disconnected', () => {
        this.log('error', '🔥 BROWSER DISCONNECTED - CHROME CRASHED!');
        testResult.crashed = true;
      });

      this.log('success', 'Browser launched successfully');

      page = await browser.newPage();
      await page.setUserAgent('MadMatch/1.4.0 DebugCrawler (contact@madmatch.dk)');
      await page.setDefaultNavigationTimeout(60000); // 60s timeout

      // Network request tracking
      const resourceTypes = testResult.metrics.resources;
      let totalBytes = 0;
      let largestResource = { url: null, size: 0 };

      page.on('response', async (response) => {
        try {
          const url = response.url();
          const resourceType = response.request().resourceType();
          const status = response.status();
          
          // Track resource types
          resourceTypes.total++;
          if (resourceType === 'image') resourceTypes.images++;
          else if (resourceType === 'script') resourceTypes.scripts++;
          else if (resourceType === 'stylesheet') resourceTypes.stylesheets++;
          else if (resourceType === 'font') resourceTypes.fonts++;
          else if (resourceType === 'xhr' || resourceType === 'fetch') resourceTypes.xhr++;
          else resourceTypes.other++;

          // Track sizes (be careful with large responses)
          try {
            const buffer = await response.buffer();
            const size = buffer.length;
            totalBytes += size;
            
            if (size > largestResource.size) {
              largestResource = { url: url.substring(0, 200), size, type: resourceType };
            }
          } catch (err) {
            // Some responses can't be buffered (e.g., 204, redirects)
          }

          // Log failed requests
          if (status >= 400) {
            testResult.metrics.networkErrors.push({
              url: url.substring(0, 200),
              status,
              resourceType
            });
            this.log('warn', `Network error: ${status} ${resourceType} ${url.substring(0, 100)}`);
          }

        } catch (err) {
          this.log('warn', `Error tracking response: ${err.message}`);
        }
      });

      // Console error tracking
      page.on('console', (msg) => {
        const type = msg.type();
        const text = msg.text();
        
        if (type === 'error' || type === 'warning') {
          testResult.metrics.consoleErrors.push({
            type,
            text: text.substring(0, 500)
          });
          this.log('warn', `Console ${type}: ${text.substring(0, 200)}`);
        }
      });

      // Page error tracking
      page.on('pageerror', (error) => {
        testResult.metrics.consoleErrors.push({
          type: 'pageerror',
          text: error.message.substring(0, 500)
        });
        this.log('error', `Page error: ${error.message.substring(0, 200)}`);
      });

      // Navigate to page
      this.log('info', 'Navigating to page...');
      const startTime = Date.now();
      
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 60000 
        });
        
        const loadTime = Date.now() - startTime;
        testResult.metrics.loadTime = loadTime;
        this.log('success', `Page loaded successfully in ${loadTime}ms`);

      } catch (error) {
        testResult.error = error.message;
        this.log('error', `Page navigation failed: ${error.message}`);
        throw error;
      }

      // Wait for content to render
      this.log('info', 'Waiting for content to render...');
      await page.waitForSelector('h1, [class*="title"], [class*="recipe"]', { timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Extra 2s for dynamic content

      // Gather page metrics
      this.log('info', 'Gathering page metrics...');
      const pageMetrics = await page.evaluate(() => {
        return {
          title: document.title || null,
          h1Count: document.querySelectorAll('h1').length,
          imageCount: document.querySelectorAll('img').length,
          scriptCount: document.querySelectorAll('script').length,
          linkCount: document.querySelectorAll('link').length,
          domNodeCount: document.querySelectorAll('*').length,
          bodyHTML_length: document.body ? document.body.innerHTML.length : 0,
          jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
          hasRecipeSchema: (() => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            for (const script of scripts) {
              try {
                const data = JSON.parse(script.textContent);
                const findRecipe = (obj) => {
                  if (!obj) return false;
                  if (Array.isArray(obj)) {
                    return obj.some(item => findRecipe(item));
                  }
                  if (obj['@type'] === 'Recipe' || obj.type === 'Recipe') {
                    return true;
                  }
                  return false;
                };
                if (findRecipe(data)) return true;
              } catch (e) {}
            }
            return false;
          })()
        };
      });
      
      testResult.metrics.pageMetrics = pageMetrics;
      this.log('debug', 'Page metrics:', pageMetrics);

      // Finalize resource metrics
      testResult.metrics.resourceSizes.total = Math.floor(totalBytes / 1024); // KB
      testResult.metrics.resourceSizes.largest = {
        ...largestResource,
        size: Math.floor(largestResource.size / 1024) // KB
      };

      this.log('info', `Total resources loaded: ${resourceTypes.total}`);
      this.log('info', `  - Images: ${resourceTypes.images}`);
      this.log('info', `  - Scripts: ${resourceTypes.scripts}`);
      this.log('info', `  - Stylesheets: ${resourceTypes.stylesheets}`);
      this.log('info', `  - XHR/Fetch: ${resourceTypes.xhr}`);
      this.log('info', `Total data loaded: ${testResult.metrics.resourceSizes.total} KB`);
      if (largestResource.url) {
        this.log('info', `Largest resource: ${largestResource.size} KB (${largestResource.type}) - ${largestResource.url}`);
      }

      // Memory snapshot AFTER page load
      const memAfter = this.getMemoryUsage();
      testResult.metrics.memoryAfter = memAfter;
      testResult.metrics.memoryDelta = {
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
        heapTotal: memAfter.heapTotal - memBefore.heapTotal,
        rss: memAfter.rss - memBefore.rss
      };
      
      this.log('debug', 'Memory after page load:', memAfter);
      this.log('info', `Memory delta: heap=${testResult.metrics.memoryDelta.heapUsed}MB, rss=${testResult.metrics.memoryDelta.rss}MB`);

      // Take screenshot for verification
      const screenshotPath = path.join('/opt/madmatch-dev/backend/logs', `crash-debug-recipe-${recipeId}-attempt-${attempt}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      this.log('success', `Screenshot saved: ${screenshotPath}`);

      testResult.success = true;
      this.log('success', `✅ Recipe #${recipeId} loaded successfully (attempt ${attempt})!`);

    } catch (error) {
      testResult.success = false;
      testResult.error = error.message;
      testResult.crashed = testResult.crashed || error.message.includes('Target closed') || error.message.includes('Protocol error');
      
      this.log('error', `❌ Recipe #${recipeId} failed (attempt ${attempt}): ${error.message}`);
      this.log('debug', 'Error stack:', { stack: error.stack });

    } finally {
      // Cleanup
      if (page) {
        try {
          await page.close();
          this.log('debug', 'Page closed');
        } catch (err) {
          this.log('warn', `Failed to close page: ${err.message}`);
        }
      }

      if (browser) {
        try {
          await browser.close();
          this.log('debug', 'Browser closed');
        } catch (err) {
          this.log('warn', `Failed to close browser: ${err.message}`);
        }
      }

      // Wait 2 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return testResult;
  }

  /**
   * Test a control recipe (known to work) for comparison
   */
  async testControlRecipe() {
    // Pick a recipe that works - first one from sitemap
    const controlUrl = 'https://www.arla.dk/opskrifter/karrysuppe-med-gronsager/';
    this.log('info', '\n' + '='.repeat(80));
    this.log('info', 'Testing CONTROL recipe (known working)');
    this.log('info', '='.repeat(80));
    
    return await this.testRecipeUrl(controlUrl, 'CONTROL', 1);
  }

  /**
   * Run full debug session
   */
  async run() {
    this.log('info', '╔════════════════════════════════════════════════════════════════════╗');
    this.log('info', '║  Arla Scraper Crash Debugger                                       ║');
    this.log('info', '║  Correlation ID: ZHC-MadMatch-20260302-DebugCrashRecipes          ║');
    this.log('info', '╚════════════════════════════════════════════════════════════════════╝\n');

    const problematicRecipes = [
      {
        id: 336,
        url: 'https://www.arla.dk/opskrifter/sma-islagkager-med-appelsin--og-sveskesalat/'
      },
      {
        id: 351,
        url: 'https://www.arla.dk/opskrifter/bowl-med-rodbedetzatziki/'
      }
    ];

    const allResults = {
      control: null,
      problematic: []
    };

    try {
      // Test control recipe first
      this.log('info', 'PHASE 1: Testing control recipe for baseline\n');
      allResults.control = await this.testControlRecipe();

      // Test each problematic recipe 3 times
      this.log('info', '\nPHASE 2: Testing problematic recipes (3 attempts each)\n');
      
      for (const recipe of problematicRecipes) {
        const recipeResults = [];
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          const result = await this.testRecipeUrl(recipe.url, recipe.id, attempt);
          recipeResults.push(result);
          
          // If all 3 attempts succeed, no need to continue testing
          if (attempt === 3 || result.crashed) {
            break;
          }
        }
        
        allResults.problematic.push({
          recipeId: recipe.id,
          url: recipe.url,
          attempts: recipeResults
        });
      }

      // Generate analysis
      this.log('info', '\n\n' + '='.repeat(80));
      this.log('info', 'ANALYSIS & FINDINGS');
      this.log('info', '='.repeat(80) + '\n');

      // Control recipe summary
      this.log('info', '📊 Control Recipe (Baseline):');
      if (allResults.control) {
        this.log('info', `  Status: ${allResults.control.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (allResults.control.metrics.pageMetrics) {
          this.log('info', `  DOM Nodes: ${allResults.control.metrics.pageMetrics.domNodeCount}`);
          this.log('info', `  Total Resources: ${allResults.control.metrics.resources.total}`);
          this.log('info', `  Total Size: ${allResults.control.metrics.resourceSizes.total} KB`);
          this.log('info', `  Load Time: ${allResults.control.metrics.loadTime}ms`);
          this.log('info', `  Memory Delta: ${allResults.control.metrics.memoryDelta?.heapUsed || 'N/A'} MB heap`);
        }
      }

      // Problematic recipes summary
      this.log('info', '\n📊 Problematic Recipes:');
      for (const recipe of allResults.problematic) {
        this.log('info', `\n  Recipe #${recipe.recipeId}:`);
        this.log('info', `  URL: ${recipe.url}`);
        
        const successCount = recipe.attempts.filter(a => a.success).length;
        const crashCount = recipe.attempts.filter(a => a.crashed).length;
        
        this.log('info', `  Success Rate: ${successCount}/3 attempts`);
        this.log('info', `  Crash Rate: ${crashCount}/3 attempts`);

        // Compare with control
        const lastAttempt = recipe.attempts[recipe.attempts.length - 1];
        if (lastAttempt.success && allResults.control?.success) {
          const metrics = lastAttempt.metrics;
          const controlMetrics = allResults.control.metrics;
          
          if (metrics.pageMetrics && controlMetrics.pageMetrics) {
            const domDiff = metrics.pageMetrics.domNodeCount - controlMetrics.pageMetrics.domNodeCount;
            const resourceDiff = metrics.resources.total - controlMetrics.resources.total;
            const sizeDiff = metrics.resourceSizes.total - controlMetrics.resourceSizes.total;
            const memDiff = (metrics.memoryDelta?.heapUsed || 0) - (controlMetrics.memoryDelta?.heapUsed || 0);
            
            this.log('info', `  Comparison vs Control:`);
            this.log('info', `    DOM Nodes: ${metrics.pageMetrics.domNodeCount} (${domDiff > 0 ? '+' : ''}${domDiff})`);
            this.log('info', `    Resources: ${metrics.resources.total} (${resourceDiff > 0 ? '+' : ''}${resourceDiff})`);
            this.log('info', `    Total Size: ${metrics.resourceSizes.total} KB (${sizeDiff > 0 ? '+' : ''}${sizeDiff} KB)`);
            this.log('info', `    Memory: ${metrics.memoryDelta?.heapUsed || 'N/A'} MB (${memDiff > 0 ? '+' : ''}${memDiff} MB)`);
            
            if (metrics.resourceSizes.largest) {
              this.log('info', `    Largest Resource: ${metrics.resourceSizes.largest.size} KB (${metrics.resourceSizes.largest.type})`);
            }
          }
        }

        // Log errors
        if (lastAttempt.metrics.consoleErrors.length > 0) {
          this.log('warn', `  Console Errors (${lastAttempt.metrics.consoleErrors.length}):`);
          lastAttempt.metrics.consoleErrors.slice(0, 5).forEach(err => {
            this.log('warn', `    - [${err.type}] ${err.text.substring(0, 100)}`);
          });
        }

        if (lastAttempt.metrics.networkErrors.length > 0) {
          this.log('warn', `  Network Errors (${lastAttempt.metrics.networkErrors.length}):`);
          lastAttempt.metrics.networkErrors.slice(0, 5).forEach(err => {
            this.log('warn', `    - ${err.status} ${err.resourceType} ${err.url.substring(0, 80)}`);
          });
        }
      }

      // Recommendations
      this.log('info', '\n\n' + '='.repeat(80));
      this.log('info', '🎯 RECOMMENDATIONS');
      this.log('info', '='.repeat(80) + '\n');

      const allCrashed = allResults.problematic.every(r => 
        r.attempts.some(a => a.crashed)
      );
      
      const allSucceeded = allResults.problematic.every(r => 
        r.attempts.every(a => a.success)
      );

      if (allCrashed) {
        this.log('error', '❌ CONFIRMED: Both recipes cause reproducible crashes');
        this.log('info', '   → Recommendation: SKIP these specific recipes in production scraper');
        this.log('info', '   → Root cause: Likely Chrome crash triggered by specific page content/structure');
        this.log('info', '   → Workaround: Add URL blacklist to scraper configuration');
      } else if (allSucceeded) {
        this.log('success', '✅ INTERESTING: Recipes load successfully in isolation');
        this.log('info', '   → Recommendation: Investigate bulk scraping conditions (memory accumulation)');
        this.log('info', '   → Root cause: Likely memory leak or accumulated state in long-running scraper');
        this.log('info', '   → Fix: Implement more aggressive browser restart strategy');
      } else {
        this.log('warn', '⚠️  INCONSISTENT: Crashes are non-deterministic');
        this.log('info', '   → Recommendation: Implement retry logic with exponential backoff');
        this.log('info', '   → Root cause: Race condition or timing-sensitive issue');
        this.log('info', '   → Fix: Add retry mechanism + browser restart on failure');
      }

      // Save all results to log file
      await this.saveLogs();

      this.log('success', '\n✅ Debug session completed successfully!');
      this.log('info', `📝 Full logs saved to: ${this.logFile}\n`);

      return allResults;

    } catch (error) {
      this.log('error', `Fatal error during debug session: ${error.message}`);
      this.log('debug', 'Error stack:', { stack: error.stack });
      
      await this.saveLogs();
      throw error;
    }
  }
}

// Main execution
async function main() {
  const crashDebugger = new CrashDebugger();
  
  try {
    await crashDebugger.run();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Debug session failed:', error.message);
    process.exit(1);
  }
}

// Handle interrupts
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Debug session interrupted (Ctrl+C)');
  process.exit(130);
});

process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

main();
