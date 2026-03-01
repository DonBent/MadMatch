-- Add GIN indexes for full-text search performance
-- These indexes use PostgreSQL's tsvector for Danish language full-text search

CREATE INDEX idx_recipes_title_fts ON recipes 
USING gin(to_tsvector('danish', title));

CREATE INDEX idx_recipe_ingredients_name_fts ON recipe_ingredients 
USING gin(to_tsvector('danish', ingredient_name));
