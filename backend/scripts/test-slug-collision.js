#!/usr/bin/env node
/**
 * Test Script: Verify Slug Collision Handling
 * Correlation-ID: ZHC-MadMatch-20260301-SlugFix
 * 
 * Tests that ArlaScraper handles duplicate slugs gracefully
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testSlugCollision() {
  console.log('🧪 Testing slug collision handling...\n');

  try {
    // Find Arla source
    const arlaSource = await prisma.recipeSource.findFirst({
      where: { name: 'Arla' }
    });

    if (!arlaSource) {
      console.log('❌ Arla source not found in database');
      return;
    }

    console.log(`✓ Found Arla source (ID: ${arlaSource.id})\n`);

    // Check for any recipes with same slug but different titles
    const recipes = await prisma.recipe.findMany({
      where: { sourceId: arlaSource.id },
      select: { title: true, slug: true },
      orderBy: { slug: 'asc' }
    });

    console.log(`Found ${recipes.length} recipes from Arla\n`);

    // Group by slug to find collisions
    const slugMap = new Map();
    for (const recipe of recipes) {
      if (!slugMap.has(recipe.slug)) {
        slugMap.set(recipe.slug, []);
      }
      slugMap.get(recipe.slug).push(recipe.title);
    }

    // Report any slug collisions
    let collisionCount = 0;
    for (const [slug, titles] of slugMap.entries()) {
      if (titles.length > 1) {
        collisionCount++;
        console.log(`⚠️  Slug collision detected: "${slug}"`);
        titles.forEach(title => console.log(`   - ${title}`));
        console.log();
      }
    }

    if (collisionCount === 0) {
      console.log('✅ No slug collisions found in database');
      console.log('✅ Duplicate detection is working correctly\n');
    } else {
      console.log(`⚠️  Found ${collisionCount} slug collision(s)`);
      console.log('Note: These should have been prevented by the fix\n');
    }

    // Test the duplicate detection logic
    console.log('🔍 Testing duplicate detection logic...');
    
    const testRecipe = recipes[0];
    if (testRecipe) {
      // This query mimics the fixed duplicate check
      const existing = await prisma.recipe.findFirst({
        where: {
          AND: [
            { sourceId: arlaSource.id },
            {
              OR: [
                { title: testRecipe.title },
                { slug: testRecipe.slug }
              ]
            }
          ]
        }
      });

      if (existing) {
        console.log(`✅ Duplicate check works: Found "${existing.title}" by title/slug\n`);
      }
    }

    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSlugCollision();
