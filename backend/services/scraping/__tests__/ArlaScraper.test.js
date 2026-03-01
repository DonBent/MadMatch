// Epic 3.5 Slice 3: ArlaScraper Unit Tests
// Correlation ID: ZHC-MadMatch-20260301-004

const { ArlaScraper } = require('../ArlaScraper');
const fs = require('fs').promises;
const path = require('path');

// Mock Prisma Client
const mockPrisma = {
  recipe: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  recipeIngredient: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

describe('ArlaScraper', () => {
  let scraper;

  beforeEach(() => {
    jest.clearAllMocks();
    scraper = new ArlaScraper({ 
      dryRun: true,
      prisma: mockPrisma 
    });
  });

  describe('parseTime()', () => {
    test('handles minutes only', () => {
      expect(scraper.parseTime('30 min')).toBe(30);
      expect(scraper.parseTime('45 minutter')).toBe(45);
    });

    test('handles hours only', () => {
      expect(scraper.parseTime('1 time')).toBe(60);
      expect(scraper.parseTime('2 timer')).toBe(120);
    });

    test('handles hours and minutes', () => {
      expect(scraper.parseTime('1 time 30 min')).toBe(90);
      expect(scraper.parseTime('2 timer 15 minutter')).toBe(135);
    });

    test('handles ISO 8601 duration format', () => {
      expect(scraper.parseTime('PT30M')).toBe(30);
      expect(scraper.parseTime('PT1H')).toBe(60);
      expect(scraper.parseTime('PT1H30M')).toBe(90);
      expect(scraper.parseTime('PT2H15M')).toBe(135);
    });

    test('returns null for invalid input', () => {
      expect(scraper.parseTime(null)).toBe(null);
      expect(scraper.parseTime('')).toBe(null);
      expect(scraper.parseTime('abc')).toBe(null);
    });
  });

  describe('generateSlug()', () => {
    test('creates valid URL slug', () => {
      expect(scraper.generateSlug('Grillet Kylling')).toBe('grillet-kylling');
      expect(scraper.generateSlug('Bøf med Løg')).toBe('boef-med-loeg');
    });

    test('handles Danish characters', () => {
      expect(scraper.generateSlug('Æblekage')).toBe('aeblekage');
      expect(scraper.generateSlug('Rødgrød')).toBe('roedgroed');
      expect(scraper.generateSlug('Smørrebrød')).toBe('smoerrebroed');
    });

    test('removes special characters', () => {
      expect(scraper.generateSlug('Kylling & Kartofler')).toBe('kylling-kartofler');
      expect(scraper.generateSlug('Pasta (hurtig)')).toBe('pasta-hurtig');
      expect(scraper.generateSlug('Bøf, løg & kartofler!')).toBe('boef-loeg-kartofler');
    });

    test('handles consecutive special characters', () => {
      expect(scraper.generateSlug('Test   Multiple   Spaces')).toBe('test-multiple-spaces');
      expect(scraper.generateSlug('Test---Dashes')).toBe('test-dashes');
    });

    test('removes leading and trailing dashes', () => {
      expect(scraper.generateSlug('-Leading')).toBe('leading');
      expect(scraper.generateSlug('Trailing-')).toBe('trailing');
      expect(scraper.generateSlug('-Both-')).toBe('both');
    });

    test('limits slug length', () => {
      const longTitle = 'A'.repeat(300);
      const slug = scraper.generateSlug(longTitle);
      expect(slug.length).toBeLessThanOrEqual(250);
    });
  });

  describe('inferDifficulty()', () => {
    test('returns EASY for short recipes', () => {
      expect(scraper.inferDifficulty(15)).toBe('EASY');
      expect(scraper.inferDifficulty(30)).toBe('EASY');
    });

    test('returns MEDIUM for moderate recipes', () => {
      expect(scraper.inferDifficulty(31)).toBe('MEDIUM');
      expect(scraper.inferDifficulty(45)).toBe('MEDIUM');
      expect(scraper.inferDifficulty(60)).toBe('MEDIUM');
    });

    test('returns HARD for long recipes', () => {
      expect(scraper.inferDifficulty(61)).toBe('HARD');
      expect(scraper.inferDifficulty(90)).toBe('HARD');
      expect(scraper.inferDifficulty(120)).toBe('HARD');
    });

    test('returns null for missing time', () => {
      expect(scraper.inferDifficulty(null)).toBe(null);
      expect(scraper.inferDifficulty(undefined)).toBe(null);
    });
  });

  describe('extractTitle()', () => {
    test('extracts from h1.recipe-title', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<h1 class="recipe-title">Grillet Kylling</h1>');
      expect(scraper.extractTitle($)).toBe('Grillet Kylling');
    });

    test('extracts from meta og:title', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<meta property="og:title" content="Bøf med Løg">');
      expect(scraper.extractTitle($)).toBe('Bøf med Løg');
    });

    test('cleans Arla suffix from title tag', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<title>Grillet Kylling | Arla Opskrifter</title>');
      expect(scraper.extractTitle($)).toBe('Grillet Kylling');
    });
  });

  describe('extractDescription()', () => {
    test('extracts from meta description', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<meta name="description" content="En lækker opskrift">');
      expect(scraper.extractDescription($)).toBe('En lækker opskrift');
    });

    test('extracts from og:description', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<meta property="og:description" content="Hurtig aftensmad">');
      expect(scraper.extractDescription($)).toBe('Hurtig aftensmad');
    });

    test('returns null if no description found', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<html></html>');
      expect(scraper.extractDescription($)).toBe(null);
    });
  });

  describe('extractImage()', () => {
    test('extracts from og:image', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<meta property="og:image" content="https://example.com/image.jpg">');
      expect(scraper.extractImage($)).toBe('https://example.com/image.jpg');
    });

    test('converts protocol-relative URL', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<meta property="og:image" content="//example.com/image.jpg">');
      expect(scraper.extractImage($)).toBe('https://example.com/image.jpg');
    });

    test('converts relative URL', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<div class="recipe-image"><img src="/images/recipe.jpg"></div>');
      const result = scraper.extractImage($);
      expect(result).toBe('https://www.arla.dk/images/recipe.jpg');
    });
  });

  describe('extractIngredients()', () => {
    test('parses ingredients with quantities', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load(`
        <ul class="ingredients">
          <li>500 g hakket oksekød</li>
          <li>2 stk løg</li>
          <li>1 dl fløde</li>
        </ul>
      `);
      
      const ingredients = scraper.extractIngredients($);
      expect(ingredients).toHaveLength(3);
      expect(ingredients[0]).toEqual({
        quantity: '500 g',
        name: 'hakket oksekød',
        order: 1
      });
      expect(ingredients[1]).toEqual({
        quantity: '2 stk',
        name: 'løg',
        order: 2
      });
    });

    test('handles ingredients without quantities', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load(`
        <ul class="ingredients">
          <li>Salt og peber</li>
          <li>Frisk timian</li>
        </ul>
      `);
      
      const ingredients = scraper.extractIngredients($);
      expect(ingredients[0]).toEqual({
        quantity: null,
        name: 'Salt og peber',
        order: 1
      });
    });

    test('returns empty array if no ingredients found', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load('<html></html>');
      expect(scraper.extractIngredients($)).toEqual([]);
    });
  });

  describe('extractInstructions()', () => {
    test('extracts instructions from list items', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load(`
        <ol class="instructions">
          <li>Steg kødet</li>
          <li>Tilsæt løg</li>
          <li>Simrer i 10 minutter</li>
        </ol>
      `);
      
      const instructions = scraper.extractInstructions($);
      expect(instructions).toContain('Steg kødet');
      expect(instructions).toContain('Tilsæt løg');
    });

    test('joins multiple steps with newlines', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load(`
        <div class="instructions">
          <p>Step 1</p>
          <p>Step 2</p>
        </div>
      `);
      
      const instructions = scraper.extractInstructions($);
      expect(instructions).toBe('Step 1\n\nStep 2');
    });

    test('filters out very short items', () => {
      const cheerio = require('cheerio');
      const $ = cheerio.load(`
        <ol class="instructions">
          <li>OK</li>
          <li>This is a proper instruction</li>
        </ol>
      `);
      
      const instructions = scraper.extractInstructions($);
      expect(instructions).not.toContain('OK');
      expect(instructions).toContain('This is a proper instruction');
    });
  });

  describe('sleep()', () => {
    test('delays execution', async () => {
      const start = Date.now();
      await scraper.sleep(100);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(90); // Allow some margin
      expect(duration).toBeLessThan(150);
    });
  });

  describe('log()', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('logs info messages', () => {
      scraper.log('info', 'Test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('logs error messages', () => {
      scraper.log('error', 'Error message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('skips verbose messages when verbose=false', () => {
      scraper.verbose = false;
      scraper.log('verbose', 'Verbose message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('shows verbose messages when verbose=true', () => {
      scraper.verbose = true;
      scraper.log('verbose', 'Verbose message');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
