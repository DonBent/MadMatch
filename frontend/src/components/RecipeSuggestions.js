import React from 'react';
import './RecipeSuggestions.css';

const RecipeSuggestions = ({ recipes, loading }) => {
  if (loading) {
    return (
      <div className="recipe-suggestions">
        <h2 className="recipe-title">Opskriftsforslag</h2>
        <div className="recipe-loading">
          <div className="loading-spinner"></div>
          <p>Henter opskrifter...</p>
        </div>
      </div>
    );
  }

  if (!recipes || recipes.length === 0) {
    return (
      <div className="recipe-suggestions">
        <h2 className="recipe-title">Opskriftsforslag</h2>
        <div className="recipe-fallback">
          <p className="fallback-icon">🍽️</p>
          <p className="fallback-text">Ingen opskriftsforslag fundet for dette produkt</p>
        </div>
      </div>
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
    <div className="recipe-suggestions">
      <h2 className="recipe-title">Opskriftsforslag</h2>
      
      <div className="recipe-grid">
        {displayRecipes.map((recipe) => (
          <a
            key={recipe.id}
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="recipe-card"
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
              
              <div className="recipe-meta">
                <span className="recipe-meta-item">
                  <span className="meta-icon">⏱️</span>
                  {recipe.readyInMinutes} min
                </span>
                <span className="recipe-meta-divider">|</span>
                <span className="recipe-meta-item">
                  <span className="meta-icon">👥</span>
                  {recipe.servings} portioner
                </span>
                <span className="recipe-meta-divider">|</span>
                <span className="recipe-meta-item">
                  <span className="meta-icon">📊</span>
                  {getDifficultyLabel(recipe.complexity)}
                </span>
              </div>
            </div>
            
            <div className="recipe-link-indicator">
              <span>Se opskrift →</span>
            </div>
          </a>
        ))}
      </div>
      
      <div className="recipe-attribution">
        <p>Opskrifter fra Spoonacular</p>
      </div>
    </div>
  );
};

export default RecipeSuggestions;
