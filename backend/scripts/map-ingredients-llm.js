#!/usr/bin/env node
/**
 * LLM Ingredient Mapping Script
 *
 * Purpose: Map raw ingredients to purchasable products using LLM
 *          with pantry staple detection
 *
 * Correlation ID: ZHC-madmatch-20260306-002
 * Created: 2026-03-06
 * Epic: 3.6 - Ingredient → Product Mapping System
 * Phase: 2+3 - LLM Mapping with Pantry Staple Detection
 */

import dotenv from 'dotenv';
import pg from 'pg';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pg;

// Determine LLM provider (OpenAI or Ollama)
const USE_OLLAMA = !process.env.OPENAI_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';

// Configuration
const CONFIG = {
  BATCH_SIZE: USE_OLLAMA ? 10 : 50,  // Reduced from 20 to 10 for Ollama (phi3 context limit)
  MODEL: USE_OLLAMA ? OLLAMA_MODEL : 'gpt-4o-mini',
  TEMPERATURE: 0.3,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  CHECKPOINT_INTERVAL: 100,
  LOG_INTERVAL: 5,  // More frequent logs for Ollama
  COST_PER_1K_INPUT: USE_OLLAMA ? 0 : 0.00015,    // GPT-4o-mini: $0.15/1M input tokens
  COST_PER_1K_OUTPUT: USE_OLLAMA ? 0 : 0.0006,    // GPT-4o-mini: $0.60/1M output tokens
};

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// LLM client (OpenAI or Ollama)
const openai = new OpenAI({
  apiKey: USE_OLLAMA ? 'ollama-local' : process.env.OPENAI_API_KEY,
  baseURL: USE_OLLAMA ? OLLAMA_BASE_URL : undefined
});

// Statistics tracking
const stats = {
  totalIngredients: 0,
  processed: 0,
  failed: 0,
  apiCalls: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  estimatedCost: 0,
  startTime: Date.now(),
  pantryStaples: 0,
  batchesFailed: 0,
};

// Failed ingredients log
const FAILED_LOG_PATH = path.join(import.meta.dirname, 'failed-ingredients.log');

/**
 * System prompt for LLM
 */
const SYSTEM_PROMPT = `You are a Danish grocery ingredient mapper. Convert recipe ingredients to purchasable products.

RULES:
1. Preserve preparation forms that define the purchasable product:
   - "hakket oksekød" → "hakket oksekød" (sold as ground beef)
   - "revet ost" → "revet ost" (sold shredded)
   - "kogt skinke" → "kogt skinke" (sold cooked)

2. Remove home preparation methods:
   - "hakket persille" → "persille, 1 bundt"
   - "revne gulerødder" → "gulerødder"
   - "kogt pasta" → "pasta"

3. Convert quantities to purchasable units:
   - "3 skiver løg" → product: "løg", quantity_factor: 0.33, unit: "stk"
   - "2 fed hvidløg" → product: "hvidløg", quantity_factor: 0.33, unit: "hoved"
   - "hakket persille" → product: "persille", quantity_factor: 1.0, unit: "bundt"

4. Mark pantry staples (is_pantry_staple=true):
   - Salt, peber, sukker
   - Olie (all types: olivenolie, rapsolie, kokosolie, neutral olie, etc.)
   - Eddike (all types: vineddike, balsamicoeddike, æbleeddike, etc.)
   - Vand
   - Mel (hvedemel, almindeligt mel - NOT specialty flours like rugmel, mandelmmel)
   - Common dried spices: kanel, paprika, karry, oregano, basilikum (dried), timian, rosmarin, spidskommen, gurkemeje, stødt koriander

   DO NOT MARK AS STAPLES:
   - Fresh herbs: persille, basilikum (fresh), koriander, mynte, dild
   - Refrigerated items: smør, æg, mælk, fløde, yoghurt
   - Fresh produce: løg, hvidløg, ingefær
   - Specialty items: saffran, vaniljestang, kardemomme
   - Specialty flours: rugmel, mandelmmel, durummel

5. Categorize by grocery section:
   - Grøntsager (vegetables & fresh produce)
   - Kød & Fisk (meat & fish)
   - Mejeri (dairy)
   - Tørvarer (dry goods: pasta, rice, canned)
   - Krydderier (spices & condiments)
   - Øvrigt (other)

OUTPUT FORMAT (JSON array):
[
  {
    "raw_ingredient": "3 skiver løg",
    "normalized_ingredient": "løg",
    "product_name": "løg",
    "quantity_factor": 0.33,
    "unit": "stk",
    "category": "Grøntsager",
    "is_pantry_staple": false,
    "confidence": 0.95
  }
]

Return ONLY valid JSON array. No markdown, no explanations.`;

/**
 * Fetch unprocessed ingredients from database
 */
async function fetchUnprocessedIngredients(limit) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT raw_ingredient FROM ingredient_mappings WHERE processed = false ORDER BY raw_ingredient LIMIT $1',
      [limit]
    );
    return result.rows.map(row => row.raw_ingredient);
  } finally {
    client.release();
  }
}

/**
 * Call OpenAI API with retry logic
 */
async function callLLM(ingredients, retryCount = 0) {
  const userPrompt = `CRITICAL: Return ONLY a valid JSON array with no explanatory text, markdown formatting, or code blocks. Start directly with '[' and end with ']'.

Map these Danish recipe ingredients to purchasable grocery products.
Return JSON array with exact fields shown in system prompt.

Ingredients:
${JSON.stringify(ingredients, null, 2)}

Remember: Your entire response must be a parseable JSON array. Do not include any text before '[' or after ']'.`;

  try {
    const requestParams = {
      model: CONFIG.MODEL,
      temperature: CONFIG.TEMPERATURE,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    };

    // Try response_format for both OpenAI and Ollama (may not work on all Ollama versions)
    try {
      requestParams.response_format = { type: 'json_object' };
    } catch (e) {
      // Ollama version may not support response_format, ignore
    }

    const completion = await openai.chat.completions.create(requestParams);

    // Track token usage
    const usage = completion.usage;
    if (usage) {
      stats.totalInputTokens += usage.prompt_tokens || 0;
      stats.totalOutputTokens += usage.completion_tokens || 0;
      stats.estimatedCost += ((usage.prompt_tokens || 0) / 1000) * CONFIG.COST_PER_1K_INPUT;
      stats.estimatedCost += ((usage.completion_tokens || 0) / 1000) * CONFIG.COST_PER_1K_OUTPUT;
    }
    
    let responseText = completion.choices[0].message.content;
    
    // Sanitize response before JSON parsing
    // Strip markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Ensure it starts with [ or {
    if (!responseText.startsWith('[') && !responseText.startsWith('{')) {
      console.error('❌ Invalid response format: does not start with "[" or "{". Got:', responseText.substring(0, 100));
      throw new Error(`Invalid response format: does not start with '[' or '{'. Got: ${responseText.substring(0, 100)}`);
    }
    
    // Parse JSON response - handle both pure JSON and markdown-wrapped JSON
    let parsed;
    try {
      parsed = JSON.parse(responseText);
      // Handle both direct array and wrapped in "ingredients" key
      const mappings = Array.isArray(parsed) ? parsed : (parsed.ingredients || parsed.results || []);
      
      if (!Array.isArray(mappings) || mappings.length === 0) {
        throw new Error('Parsed response is not an array or is empty');
      }
      
      return mappings;
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('Raw response:', responseText.substring(0, 500));
      throw new Error('Invalid JSON response from LLM');
    }

  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      const delay = CONFIG.RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`⚠️  API call failed (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callLLM(ingredients, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Update database with mapped ingredient
 */
async function updateIngredientMapping(client, mapping) {
  try {
    await client.query(
      `UPDATE ingredient_mappings
       SET
         normalized_ingredient = $1,
         product_name = $2,
         quantity_factor = $3,
         unit = $4,
         category = $5,
         is_pantry_staple = $6,
         confidence = $7,
         processed = true,
         verified_by = 'llm',
         last_verified = NOW(),
         updated_at = NOW()
       WHERE raw_ingredient = $8`,
      [
        mapping.normalized_ingredient,
        mapping.product_name,
        mapping.quantity_factor || 1.0,
        mapping.unit || '',
        mapping.category || 'Øvrigt',
        mapping.is_pantry_staple || false,
        mapping.confidence || 0.8,
        mapping.raw_ingredient
      ]
    );

    if (mapping.is_pantry_staple) {
      stats.pantryStaples++;
    }

  } catch (error) {
    console.error(`❌ Failed to update ingredient "${mapping.raw_ingredient}":`, error.message);
    throw error;
  }
}

/**
 * Process a single batch of ingredients
 */
async function processBatch(ingredients, batchNumber) {
  const client = await pool.connect();

  try {
    console.log(`\n📦 Batch ${batchNumber}: Processing ${ingredients.length} ingredients...`);

    // Call LLM
    const mappings = await callLLM(ingredients);
    stats.apiCalls++;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      throw new Error('LLM returned empty or invalid mappings');
    }

    // Update database
    await client.query('BEGIN');

    for (const mapping of mappings) {
      await updateIngredientMapping(client, mapping);
      stats.processed++;
    }

    await client.query('COMMIT');

    console.log(`✅ Batch ${batchNumber}: Successfully processed ${mappings.length} ingredients`);

    return { success: true, count: mappings.length };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Batch ${batchNumber} failed:`, error.message);

    // Log failed ingredients
    const failedEntry = `\n[${new Date().toISOString()}] Batch ${batchNumber} failed:\n${ingredients.join('\n')}\nError: ${error.message}\n`;
    fs.appendFileSync(FAILED_LOG_PATH, failedEntry);

    stats.failed += ingredients.length;
    stats.batchesFailed++;

    return { success: false, count: 0 };

  } finally {
    client.release();
  }
}

/**
 * Save checkpoint
 */
async function saveCheckpoint() {
  const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
  const rate = stats.processed / (elapsed / 60);

  console.log('\n📊 CHECKPOINT:');
  console.log(`   Processed: ${stats.processed}/${stats.totalIngredients} (${((stats.processed / stats.totalIngredients) * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Pantry staples: ${stats.pantryStaples}`);
  console.log(`   API calls: ${stats.apiCalls}`);
  console.log(`   Rate: ${rate.toFixed(1)} ingredients/min`);
  console.log(`   Cost: $${stats.estimatedCost.toFixed(4)}`);
  console.log(`   Elapsed: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 LLM Ingredient Mapping Script');
  console.log('====================================\n');
  console.log(`Provider: ${USE_OLLAMA ? 'Ollama (Local)' : 'OpenAI'}`);
  console.log(`Model: ${CONFIG.MODEL}`);
  console.log(`Batch size: ${CONFIG.BATCH_SIZE}`);
  console.log(`Temperature: ${CONFIG.TEMPERATURE}`);
  console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Unknown'}`);
  console.log('');

  // Check API availability
  if (!USE_OLLAMA && !process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.error('💡 Set OPENAI_API_KEY or use local Ollama (script will auto-detect)');
    process.exit(1);
  }
  
  if (USE_OLLAMA) {
    console.log('💡 Using local Ollama - zero API costs!\n');
  }

  // Initialize failed log
  if (!fs.existsSync(FAILED_LOG_PATH)) {
    fs.writeFileSync(FAILED_LOG_PATH, `# Failed Ingredients Log\nStarted: ${new Date().toISOString()}\n`);
  }

  // Count total unprocessed ingredients
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT COUNT(*) as count FROM ingredient_mappings WHERE processed = false'
    );
    stats.totalIngredients = parseInt(result.rows[0].count);
    console.log(`📊 Total unprocessed ingredients: ${stats.totalIngredients}\n`);
  } finally {
    client.release();
  }

  if (stats.totalIngredients === 0) {
    console.log('✅ No ingredients to process!');
    return;
  }

  // Process in batches
  let batchNumber = 0;
  while (stats.processed + stats.failed < stats.totalIngredients) {
    batchNumber++;

    // Fetch next batch
    const ingredients = await fetchUnprocessedIngredients(CONFIG.BATCH_SIZE);

    if (ingredients.length === 0) {
      break;
    }

    // Process batch
    await processBatch(ingredients, batchNumber);

    // Log progress
    if (batchNumber % CONFIG.LOG_INTERVAL === 0) {
      await saveCheckpoint();
    }

    // Save checkpoint every N ingredients
    if (stats.processed % CONFIG.CHECKPOINT_INTERVAL === 0) {
      await saveCheckpoint();
    }
  }

  // Final report
  const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
  const rate = stats.processed / (elapsed / 60);

  console.log('\n');
  console.log('====================================');
  console.log('🎉 PROCESSING COMPLETE');
  console.log('====================================');
  console.log(`✅ Processed: ${stats.processed}/${stats.totalIngredients}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`🧂 Pantry staples detected: ${stats.pantryStaples}`);
  console.log(`📞 API calls: ${stats.apiCalls}`);
  console.log(`📊 Batches failed: ${stats.batchesFailed}`);
  console.log(`⚡ Input tokens: ${stats.totalInputTokens.toLocaleString()}`);
  console.log(`⚡ Output tokens: ${stats.totalOutputTokens.toLocaleString()}`);
  console.log(`💰 Total cost: $${stats.estimatedCost.toFixed(4)}`);
  console.log(`⏱️  Total time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
  console.log(`📈 Rate: ${rate.toFixed(1)} ingredients/min`);
  console.log('');

  if (stats.failed > 0) {
    console.log(`⚠️  Failed ingredients logged to: ${FAILED_LOG_PATH}`);
    console.log('');
  }

  await pool.end();
}

// Run the script
main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  pool.end();
  process.exit(1);
});
