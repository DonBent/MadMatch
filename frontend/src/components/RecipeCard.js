import React from 'react';
import { Link } from 'react-router-dom';
import { useRecipeFavorites } from '../contexts/RecipeFavoriteContext';
import './RecipeCard.css';

const RecipeCard = ({ recipe }) => {
  const { isFavorite, toggleFavorite } = useRecipeFavorites();
  const isRecipeFavorite = isFavorite(recipe.id);

  const difficultyLabels = {
    EASY: 'Let',
    MEDIUM: 'Middel',
    HARD: 'Svær'
  };

  const difficultyLabel = difficultyLabels[recipe.difficulty] || recipe.difficulty;

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(recipe.id);
  };

  return (
    <div className="recipe-card-link" data-testid="recipe-card-link">
      <Link to={`/opskrift/${recipe.id}`} aria-label={`Gå til opskrift: ${recipe.title}`}>
        <div className="recipe-card" data-testid="recipe-card">
          {recipe.imageUrl && (
            <div className="recipe-card-image">
              <img 
                src={recipe.imageUrl} 
                alt={`Billede af ${recipe.title}`}
                loading="lazy"
              />
              <button
                className={`recipe-favorite-button ${isRecipeFavorite ? 'favorited' : ''}`}
                onClick={handleFavoriteClick}
                data-testid="recipe-favorite-button"
                aria-label={isRecipeFavorite ? `Fjern ${recipe.title} fra favoritter` : `Tilføj ${recipe.title} til favoritter`}
                tabIndex={0}
              >
                {isRecipeFavorite ? '❤️' : '🤍'}
              </button>
            </div>
          )}
          
          <div className="recipe-card-body">
            <h3 className="recipe-title">{recipe.title}</h3>
            
            <div className="recipe-meta">
              {recipe.cookTimeMinutes && (
                <span className="recipe-meta-item" data-testid="recipe-prep-time">
                  <span className="icon" aria-hidden="true">⏱️</span>
                  <span className="sr-only">Tilberedningstid: </span>
                  {recipe.cookTimeMinutes} min
                </span>
              )}
              
              {recipe.difficulty && (
                <span 
                  className={`recipe-meta-item difficulty-${recipe.difficulty.toLowerCase()}`}
                  data-testid="recipe-difficulty"
                >
                  <span className="icon" aria-hidden="true">👨‍🍳</span>
                  <span className="sr-only">Sværhedsgrad: </span>
                  {difficultyLabel}
                </span>
              )}
            </div>

            {recipe.servings && (
              <div className="recipe-servings" data-testid="recipe-servings">
                <span className="icon" aria-hidden="true">🍽️</span>
                <span className="sr-only">Portioner: </span>
                {recipe.servings} portioner
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default RecipeCard;
