-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ScrapingStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "recipe_sources" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "base_url" VARCHAR(500),
    "scraping_enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "recipe_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "external_id" VARCHAR(255),
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "prep_time_minutes" INTEGER,
    "cook_time_minutes" INTEGER,
    "total_time_minutes" INTEGER,
    "servings" INTEGER,
    "difficulty" "Difficulty",
    "instructions" TEXT,
    "language" VARCHAR(2) NOT NULL DEFAULT 'da',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "ingredient_name" VARCHAR(255) NOT NULL,
    "quantity" VARCHAR(100),
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraping_jobs" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "status" "ScrapingStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "recipes_scraped" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraping_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_sources_name_key" ON "recipe_sources"("name");

-- CreateIndex
CREATE INDEX "recipe_sources_priority_idx" ON "recipe_sources"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");

-- CreateIndex
CREATE INDEX "recipes_source_id_idx" ON "recipes"("source_id");

-- CreateIndex
CREATE INDEX "recipes_slug_idx" ON "recipes"("slug");

-- CreateIndex
CREATE INDEX "recipes_language_idx" ON "recipes"("language");

-- CreateIndex
CREATE INDEX "recipes_difficulty_idx" ON "recipes"("difficulty");

-- CreateIndex
CREATE INDEX "recipes_language_source_id_idx" ON "recipes"("language", "source_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_order_idx" ON "recipe_ingredients"("recipe_id", "order");

-- CreateIndex
CREATE INDEX "scraping_jobs_source_id_idx" ON "scraping_jobs"("source_id");

-- CreateIndex
CREATE INDEX "scraping_jobs_status_idx" ON "scraping_jobs"("status");

-- CreateIndex
CREATE INDEX "scraping_jobs_created_at_idx" ON "scraping_jobs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "recipe_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraping_jobs" ADD CONSTRAINT "scraping_jobs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "recipe_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
