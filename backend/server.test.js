const request = require('supertest');
const app = require('./server');

describe('MadMatch Backend API', () => {
  describe('GET /api/tilbud', () => {
    it('should return all tilbud', async () => {
      const response = await request(app).get('/api/tilbud');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(15);
    });

    it('should filter by butik', async () => {
      const response = await request(app).get('/api/tilbud?butik=Netto');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(t => t.butik === 'Netto')).toBe(true);
    });

    it('should filter by kategori', async () => {
      const response = await request(app).get('/api/tilbud?kategori=Mejeri');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(t => t.kategori === 'Mejeri')).toBe(true);
    });
  });

  describe('GET /api/tilbud/:id', () => {
    it('should return specific tilbud', async () => {
      const response = await request(app).get('/api/tilbud/1');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should return 404 for non-existent tilbud', async () => {
      const response = await request(app).get('/api/tilbud/9999');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/butikker', () => {
    it('should return list of butikker', async () => {
      const response = await request(app).get('/api/butikker');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/kategorier', () => {
    it('should return list of kategorier', async () => {
      const response = await request(app).get('/api/kategorier');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
