// Epic 3.5: Database Service Tests
// Correlation ID: ZHC-MadMatch-20260301-004

require('dotenv').config();
const { getPrismaClient, healthCheck, disconnect } = require('./databaseService');

describe('DatabaseService', () => {
  afterAll(async () => {
    await disconnect();
  });

  describe('getPrismaClient', () => {
    it('should return a Prisma client instance', () => {
      const client = getPrismaClient();
      expect(client).toBeDefined();
      expect(client.recipeSource).toBeDefined();
    });

    it('should return the same instance (singleton)', () => {
      const client1 = getPrismaClient();
      const client2 = getPrismaClient();
      expect(client1).toBe(client2);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is accessible', async () => {
      const result = await healthCheck();
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('message');
      expect(result.healthy).toBe(true);
      expect(result.message).toContain('Connected to database');
    }, 10000); // 10s timeout for database connection

    it('should include recipe source count in health check', async () => {
      const result = await healthCheck();
      expect(result.message).toMatch(/\d+ recipe sources configured/);
    }, 10000);
  });

  describe('database schema', () => {
    it('should have recipe_sources table seeded', async () => {
      const client = getPrismaClient();
      const sources = await client.recipeSource.findMany();
      expect(sources.length).toBeGreaterThanOrEqual(2);
      
      const arla = sources.find(s => s.name === 'Arla');
      const spoonacular = sources.find(s => s.name === 'Spoonacular');
      
      expect(arla).toBeDefined();
      expect(arla.priority).toBe(1);
      expect(arla.scrapingEnabled).toBe(true);
      
      expect(spoonacular).toBeDefined();
      expect(spoonacular.priority).toBe(2);
      expect(spoonacular.scrapingEnabled).toBe(false);
    }, 10000);
  });
});
