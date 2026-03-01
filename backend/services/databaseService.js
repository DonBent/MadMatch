// Epic 3.5: Database Service
// Correlation ID: ZHC-MadMatch-20260301-004
// Provides database connection and query interface

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

let prisma;
let pool;

/**
 * Get or create Prisma Client instance
 * Implements singleton pattern with connection pooling
 */
function getPrismaClient() {
  if (!prisma) {
    // Create connection pool
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Maximum 10 connections as per specification
    });

    // Create Prisma adapter
    const adapter = new PrismaPg(pool);

    // Initialize Prisma Client with adapter
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

/**
 * Database health check
 * Tests connection by querying recipe_sources table
 * @returns {Promise<{healthy: boolean, message: string}>}
 */
async function healthCheck() {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    const sourceCount = await client.recipeSource.count();
    return {
      healthy: true,
      message: `Connected to database. ${sourceCount} recipe sources configured.`,
    };
  } catch (error) {
    console.error('[DatabaseService] Health check failed:', error.message);
    return {
      healthy: false,
      message: `Database connection failed: ${error.message}`,
    };
  }
}

/**
 * Graceful shutdown - disconnect from database
 */
async function disconnect() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
  console.log('[DatabaseService] Disconnected from database');
}

// Handle process termination
process.on('beforeExit', async () => {
  await disconnect();
});

module.exports = {
  getPrismaClient,
  healthCheck,
  disconnect,
};
