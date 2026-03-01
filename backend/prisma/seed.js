// Epic 3.5: Database Seed Script
// Correlation ID: ZHC-MadMatch-20260301-004
// Seeds initial recipe sources (Arla and Spoonacular)

const { PrismaClient } = require('@prisma/client');
require('dotenv/config');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed recipe sources
  const arla = await prisma.recipeSource.upsert({
    where: { name: 'Arla' },
    update: {},
    create: {
      name: 'Arla',
      baseUrl: 'https://www.arla.dk/opskrifter/',
      scrapingEnabled: true,
      priority: 1, // Higher priority (searched first)
    },
  });

  const spoonacular = await prisma.recipeSource.upsert({
    where: { name: 'Spoonacular' },
    update: {},
    create: {
      name: 'Spoonacular',
      baseUrl: 'https://api.spoonacular.com',
      scrapingEnabled: false, // API-based, not scraped
      priority: 2, // Fallback source
    },
  });

  console.log('✅ Recipe sources seeded:');
  console.log('  - Arla:', arla.id);
  console.log('  - Spoonacular:', spoonacular.id);

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
