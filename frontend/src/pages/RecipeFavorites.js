import React, { useState, useEffect } from 'react';
import { useRecipeFavorites } from '../contexts/RecipeFavoriteContext';
import { searchRecipes } from '../services/recipeService';
import RecipeCard from '../components/RecipeCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './RecipeFavorites.css';

const RecipeFavorites = () => {
  const { favorites, getFavoriteCount, isLoaded } = useRecipeFavorites();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded) {
      loadFavoriteRecipes();
    }
  }, [favorites, isLoaded]);

  const loadFavoriteRecipes = async () => {
    try {
      setLoading(true);
      setError(null);

      if (favorites.length === 0) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      // Fetch all recipes and filter by favorites
      const result = await searchRecipes('', { limit: 1000 });
      const allRecipes = result.recipes || [];
      const favoriteRecipes = allRecipes.filter(recipe => 
        favorites.includes(recipe.id)
      );
      
      setRecipes(favoriteRecipes);
    } catch (err) {
      console.error('Failed to load favorite recipes:', err);
      setError('Kunne ikke indlæse favoritter.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <main className="recipe-favorites-page">
        <div className="page-header">
          <h1>Mine favoritter</h1>
        </div>
        <LoadingSkeleton />
      </main>
    );
  }

  if (error) {
    return (
      <main className="recipe-favorites-page">
        <div className="page-header">
          <h1>Mine favoritter</h1>
        </div>
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={loadFavoriteRecipes}>Prøv igen</button>
        </div>
      </main>
    );
  }

  const favoriteCount = getFavoriteCount();

  return (
    <main className="recipe-favorites-page">
      <div className="page-header">
        <h1>Mine favoritter {favoriteCount > 0 && `(${favoriteCount})`}</h1>
        <p className="page-description">
          Dine gemte opskrifter samlet ét sted
        </p>
      </div>

      {favoriteCount === 0 ? (
        <div className="empty-state" data-testid="favorites-empty-state">
          <div className="empty-state-icon">🤍</div>
          <h2>Ingen favoritter endnu</h2>
          <p>Klik på ♥ for at tilføje opskrifter til dine favoritter.</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </main>
  );
};

export default RecipeFavorites;
