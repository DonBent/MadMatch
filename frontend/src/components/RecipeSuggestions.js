import React from 'react';
import './RecipeSuggestions.css';

/**
 * RecipeSuggestions Component
 * Displays recipe suggestions with improved accessibility
 */
const RecipeSuggestions = ({ recipes, loading }) => {
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

  // Map difficulty from complexity level
  const getDifficultyLabel = (complexity) => {
    if (complexity <= 30) return 'Let';
    if (complexity <= 60) return 'Middel';
    return 'Svær';
  };

  // Display max 3 recipes
  const displayRecipes = recipes.slice(0, 3);

  return (
    <section className="recipe-suggestions" aria-labelledby="recipes-title">
      <h2 id="recipes-title" className="recipe-title">Opskriftsforslag</h2>
      
      <div className="recipe-grid" role="list">
        {displayRecipes.map((recipe) => (
          <a
            key={recipe.id}
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="recipe-card"
            role="listitem"
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
              </div>
            )}
            
            <div className="recipe-content">
              <h3 className="recipe-name">{recipe.title}</h3>
              
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
        ))}
      </div>
      
      <div className="recipe-attribution" role="contentinfo">
        <p><small>Opskrifter fra Spoonacular</small></p>
      </div>
    </section>
  );
};

export default RecipeSuggestions;
