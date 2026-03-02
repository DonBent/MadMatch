import React from 'react';
import { Link } from 'react-router-dom';
import './RecipeCard.css';

const RecipeCard = ({ recipe }) => {
  const difficultyLabels = {
    EASY: 'Let',
    MEDIUM: 'Middel',
    HARD: 'Svær'
  };

  const difficultyLabel = difficultyLabels[recipe.difficulty] || recipe.difficulty;

  return (
    <div className="recipe-card-link" data-testid="recipe-card-link">
      <Link to={`/opskrift/${recipe.id}`}>
        <div className="recipe-card" data-testid="recipe-card">
          {recipe.imageUrl && (
            <div className="recipe-card-image">
              <img 
                src={recipe.imageUrl} 
                alt={recipe.title}
                loading="lazy"
              />
            </div>
          )}
          
          <div className="recipe-card-body">
            <h3 className="recipe-title">{recipe.title}</h3>
            
            <div className="recipe-meta">
              {recipe.cookTimeMinutes && (
                <span className="recipe-meta-item" data-testid="recipe-prep-time">
                  <span className="icon">⏱️</span>
                  {recipe.cookTimeMinutes} min
                </span>
              )}
              
              {recipe.difficulty && (
                <span 
                  className={`recipe-meta-item difficulty-${recipe.difficulty.toLowerCase()}`}
                  data-testid="recipe-difficulty"
                >
                  <span className="icon">👨‍🍳</span>
                  {difficultyLabel}
                </span>
              )}
            </div>

            {recipe.servings && (
              <div className="recipe-servings" data-testid="recipe-servings">
                <span className="icon">🍽️</span>
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
