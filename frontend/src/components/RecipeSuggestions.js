import React, { useState, useEffect } from 'react';
import './RecipeSuggestions.css';
import * as recipeService from '../services/recipeService';

/**
 * SourceBadge Component
 * Displays recipe source (Arla/Spoonacular) with colored pill badge
 */
const SourceBadge = ({ sourceName }) => {
  const isArla = sourceName?.toLowerCase() === 'arla';
  const className = `source-badge ${isArla ? 'source-badge-arla' : 'source-badge-spoonacular'}`;
  
  return (
    <span className={className} aria-label={`Kilde: ${sourceName}`}>
      {sourceName || 'Spoonacular'}
    </span>
  );
};

/**
 * LanguageIndicator Component
 * Displays language flag (🇩🇰 Danish / 🇬🇧 English)
 */
const LanguageIndicator = ({ language }) => {
  const flag = language === 'da' ? '🇩🇰' : '🇬🇧';
  const label = language === 'da' ? 'Dansk' : 'English';
  
  return (
    <span className="language-indicator" aria-label={label} title={label}>
      {flag}
    </span>
  );
};

/**
 * RecipeSuggestions Component
 * Displays recipe suggestions with improved accessibility and Epic 3.5 integration
 */
const RecipeSuggestions = ({ productId, productName }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      if (!productId && !productName) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let fetchedRecipes = [];

        // Primary: Try new Recipe API with product name search
        if (productName) {
          try {
            const searchResult = await recipeService.searchRecipes(productName, {
              language: 'da',
              limit: 3
            });
            
            if (searchResult.recipes && searchResult.recipes.length > 0) {
              // Transform database recipes to component format
              fetchedRecipes = searchResult.recipes.map(recipe => ({
                id: recipe.id,
                title: recipe.title,
                image: recipe.imageUrl,
                sourceUrl: recipe.sourceUrl,
                readyInMinutes: recipe.totalTimeMinutes,
                servings: recipe.servings,
                complexity: mapDifficultyToComplexity(recipe.difficulty),
                source: recipe.source,
                language: recipe.language
              }));
            }
          } catch (searchError) {
            console.warn('[RecipeSuggestions] New API search failed, trying fallback:', searchError.message);
          }
        }

        // Fallback 1: Try legacy endpoint (backward compatibility with Epic 2)
        if (fetchedRecipes.length === 0 && productId) {
          try {
            const legacyRecipes = await recipeService.getRecipesForProduct(productId);
            
            if (legacyRecipes && legacyRecipes.length > 0) {
              fetchedRecipes = legacyRecipes.map(recipe => ({
                id: recipe.id,
                title: recipe.title,
                image: recipe.image,
                sourceUrl: recipe.sourceUrl,
                readyInMinutes: recipe.readyInMinutes,
                servings: recipe.servings,
                complexity: recipe.complexity,
                source: recipe.source || { name: 'Spoonacular' },
                language: recipe.language || 'en'
              }));
            }
          } catch (legacyError) {
            console.warn('[RecipeSuggestions] Legacy endpoint failed:', legacyError.message);
            // If both failed and we have no recipes, set error
            if (fetchedRecipes.length === 0) {
              throw new Error('All recipe sources failed');
            }
          }
        }

        setRecipes(fetchedRecipes);
      } catch (err) {
        console.error('[RecipeSuggestions] All recipe fetch attempts failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [productId, productName]);

  /**
   * Map difficulty string to complexity number for backward compatibility
   */
  const mapDifficultyToComplexity = (difficulty) => {
    const difficultyMap = {
      'easy': 20,
      'medium': 50,
      'hard': 80
    };
    return difficultyMap[difficulty?.toLowerCase()] || 50;
  };

  /**
   * Map complexity level to Danish difficulty label
   */
  const getDifficultyLabel = (complexity) => {
    if (complexity <= 30) return 'Let';
    if (complexity <= 60) return 'Middel';
    return 'Svær';
  };

  if (loading) {
    return (
      <section className="recipe-suggestions" aria-busy="true" aria-label="Indlæser opskrifter">
        <h2 id="recipes-title" className="recipe-title">Opskriftsforslag</h2>
        <div className="recipe-loading" role="status">
          <div className="loading-spinner" aria-hidden="true"></div>
          <p>Henter opskrifter...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="recipe-suggestions" aria-labelledby="recipes-title">
        <h2 id="recipes-title" className="recipe-title">Opskriftsforslag</h2>
        <div className="recipe-fallback" role="alert">
          <p className="fallback-icon" aria-hidden="true">⚠️</p>
          <p className="fallback-text">Der opstod en fejl ved indlæsning af opskrifter</p>
        </div>
      </section>
    );
  }

  if (!recipes || recipes.length === 0) {
    return (
      <section className="recipe-suggestions" aria-labelledby="recipes-title">
        <h2 id="recipes-title" className="recipe-title">Opskriftsforslag</h2>
        <div className="recipe-fallback" role="status">
          <p className="fallback-icon" aria-hidden="true">🍽️</p>
          <p className="fallback-text">Ingen opskriftsforslag fundet for dette produkt</p>
        </div>
      </section>
    );
  }

  // Display max 3 recipes
  const displayRecipes = recipes.slice(0, 3);

  return (
    <section className="recipe-suggestions" aria-labelledby="recipes-title">
      <h2 id="recipes-title" className="recipe-title">Opskriftsforslag</h2>
      
      <ul className="recipe-grid" role="list">
        {displayRecipes.map((recipe) => (
          <li key={recipe.id}>
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="recipe-card"
              aria-label={`${recipe.title}, ${recipe.readyInMinutes} minutter, ${recipe.servings} portioner, ${getDifficultyLabel(recipe.complexity)} sværhedsgrad`}
            >
              {recipe.image && (
                <div className="recipe-image-container">
                  <img 
                    src={recipe.image} 
                    alt={recipe.title}
                    className="recipe-image"
                    loading="lazy"
                  />
                  {/* Language indicator - top-right corner */}
                  <div className="recipe-language-badge">
                    <LanguageIndicator language={recipe.language} />
                  </div>
                </div>
              )}
              
              <div className="recipe-content">
                <div className="recipe-header">
                  <h3 className="recipe-name">{recipe.title}</h3>
                  {/* Source badge */}
                  <SourceBadge sourceName={recipe.source?.name} />
                </div>
                
                <div className="recipe-meta" aria-label="Opskriftsdetaljer">
                  <span className="recipe-meta-item">
                    <span className="meta-icon" aria-hidden="true">⏱️</span>
                    <span aria-label={`${recipe.readyInMinutes} minutter`}>
                      {recipe.readyInMinutes} min
                    </span>
                  </span>
                  <span className="recipe-meta-divider" aria-hidden="true">|</span>
                  <span className="recipe-meta-item">
                    <span className="meta-icon" aria-hidden="true">👥</span>
                    <span aria-label={`${recipe.servings} portioner`}>
                      {recipe.servings} portioner
                    </span>
                  </span>
                  <span className="recipe-meta-divider" aria-hidden="true">|</span>
                  <span className="recipe-meta-item">
                    <span className="meta-icon" aria-hidden="true">📊</span>
                    <span aria-label={`${getDifficultyLabel(recipe.complexity)} sværhedsgrad`}>
                      {getDifficultyLabel(recipe.complexity)}
                    </span>
                  </span>
                </div>
              </div>
              
              <div className="recipe-link-indicator" aria-hidden="true">
                <span>Se opskrift →</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
      
      <div className="recipe-attribution" role="contentinfo">
        <p><small>Opskrifter fra {displayRecipes.some(r => r.source?.name === 'Arla') ? 'Arla og Spoonacular' : 'Spoonacular'}</small></p>
      </div>
    </section>
  );
};

export default RecipeSuggestions;
