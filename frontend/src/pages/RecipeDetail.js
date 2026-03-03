import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipeFavorites } from '../contexts/RecipeFavoriteContext';
import { getRecipe } from '../services/recipeService';
import { extractKeyIngredients, formatIngredientsForQuery } from '../utils/ingredientExtractor';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';
import './RecipeDetail.css';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useRecipeFavorites();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isRecipeFavorite = recipe ? isFavorite(recipe.id) : false;

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecipe(id);
      setRecipe(data);
    } catch (err) {
      console.error('Failed to load recipe:', err);
      setError(err.response?.status === 404 ? 'Opskrift ikke fundet' : 'Kunne ikke indlæse opskrift');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/opskrifter');
  };

  const handleFavoriteClick = () => {
    if (recipe) {
      toggleFavorite(recipe.id);
    }
  };

  const handleFindTilbud = () => {
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      // Navigate to tilbud page without search params if no ingredients
      navigate('/tilbud');
      return;
    }

    // Extract key ingredients
    const keyIngredients = extractKeyIngredients(recipe.ingredients, { maxIngredients: 5 });
    
    if (keyIngredients.length === 0) {
      // Navigate to tilbud page without search params if no usable ingredients
      navigate('/tilbud');
      return;
    }

    // Format for query string
    const searchQuery = formatIngredientsForQuery(keyIngredients);
    
    // Navigate with search params
    navigate(`/tilbud?search=${encodeURIComponent(searchQuery)}`);
  };

  const handleViewFullRecipe = () => {
    if (recipe?.sourceUrl) {
      window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const difficultyLabels = {
    EASY: 'Let',
    MEDIUM: 'Middel',
    HARD: 'Svær'
  };

  const getSourceDisplayName = () => {
    if (!recipe?.source) return null;
    
    const sourceNameMap = {
      'arla': 'Arla',
      'valdemarsro': 'Valdemarsro',
      // Add more source mappings as needed
    };
    
    return sourceNameMap[recipe.source.name.toLowerCase()] || 
           recipe.source.name.charAt(0).toUpperCase() + recipe.source.name.slice(1);
  };

  if (loading) {
    return <LoadingSkeleton type="recipe" />;
  }

  if (error) {
    return (
      <div className="recipe-detail-page">
        <div className="error-container" role="alert">
          <h2>⚠️ {error}</h2>
          <button 
            onClick={handleBack} 
            className="btn-back"
            aria-label="Tilbage til opskrifter"
          >
            ← Tilbage til opskrifter
          </button>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="recipe-detail-page">
        <div className="error-container" role="alert">
          <h2>⚠️ Opskrift ikke fundet</h2>
          <button 
            onClick={handleBack} 
            className="btn-back"
            aria-label="Tilbage til opskrifter"
          >
            ← Tilbage til opskrifter
          </button>
        </div>
      </div>
    );
  }

  const sourceDisplayName = getSourceDisplayName();

  return (
    <ErrorBoundary onReset={loadRecipe}>
      <div className="recipe-detail-page">
        <header className="recipe-header">
          <nav className="breadcrumb" aria-label="Breadcrumb navigation">
            <button 
              onClick={handleBack}
              className="breadcrumb-link"
              aria-label="Tilbage til opskrifter"
            >
              Opskrifter
            </button>
            <span className="breadcrumb-separator" aria-hidden="true"> &gt; </span>
            <span className="breadcrumb-current">{recipe.title}</span>
          </nav>
        </header>

        <div className="recipe-detail-container">
          <div className="recipe-image-section">
            {recipe.imageUrl ? (
              <img 
                src={recipe.imageUrl} 
                alt={recipe.title}
                className="recipe-image"
                loading="lazy"
              />
            ) : (
              <div className="recipe-image-placeholder" role="img" aria-label="Intet opskriftsbillede">
                <span className="placeholder-icon" aria-hidden="true">🍽️</span>
                <span className="placeholder-text">Intet billede tilgængeligt</span>
              </div>
            )}

            {recipe.source && (
              <div className="recipe-source-badge">
                {recipe.source.name === 'arla' && (
                  <>
                    <img 
                      src="/arla-logo.png" 
                      alt="Arla logo" 
                      className="source-logo"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="source-text">Arla</span>
                  </>
                )}
                {recipe.source.name !== 'arla' && (
                  <span className="source-text">{sourceDisplayName}</span>
                )}
              </div>
            )}
          </div>

          <div className="recipe-info-section">
            <h1 className="recipe-title" data-testid="recipe-detail-title">
              {recipe.title}
            </h1>

            {recipe.description && (
              <div className="recipe-description">
                <p>{recipe.description}</p>
              </div>
            )}

            <div className="recipe-meta-info" role="region" aria-label="Opskriftsinformation">
              {recipe.prepTimeMinutes && (
                <div className="meta-item">
                  <span className="meta-icon" aria-hidden="true">🔪</span>
                  <span className="meta-label">Forberedelse:</span>
                  <span className="meta-value">{recipe.prepTimeMinutes} min</span>
                </div>
              )}

              {recipe.cookTimeMinutes && (
                <div className="meta-item">
                  <span className="meta-icon" aria-hidden="true">⏱️</span>
                  <span className="meta-label">Tilberedningstid:</span>
                  <span className="meta-value">{recipe.cookTimeMinutes} min</span>
                </div>
              )}

              {recipe.totalTimeMinutes && (
                <div className="meta-item">
                  <span className="meta-icon" aria-hidden="true">⏰</span>
                  <span className="meta-label">Total tid:</span>
                  <span className="meta-value">{recipe.totalTimeMinutes} min</span>
                </div>
              )}

              {recipe.servings && (
                <div className="meta-item">
                  <span className="meta-icon" aria-hidden="true">🍽️</span>
                  <span className="meta-label">Portioner:</span>
                  <span className="meta-value">{recipe.servings}</span>
                </div>
              )}

              {recipe.difficulty && (
                <div className="meta-item">
                  <span className="meta-icon" aria-hidden="true">👨‍🍳</span>
                  <span className="meta-label">Sværhedsgrad:</span>
                  <span className={`meta-value difficulty-${recipe.difficulty.toLowerCase()}`}>
                    {difficultyLabels[recipe.difficulty] || recipe.difficulty}
                  </span>
                </div>
              )}
            </div>

            <div className="recipe-actions">
              <button
                className={`btn-favorite ${isRecipeFavorite ? 'favorited' : ''}`}
                onClick={handleFavoriteClick}
                aria-label={isRecipeFavorite ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
              >
                <span className="btn-icon">{isRecipeFavorite ? '❤️' : '🤍'}</span>
                {isRecipeFavorite ? 'Fjern favorit' : 'Tilføj til favoritter'}
              </button>

              <button
                className="btn-add-to-plan"
                disabled
                title="Kommer i næste version"
                aria-label="Tilføj til ugeplan (kommer snart)"
              >
                <span className="btn-icon">📅</span>
                Tilføj til ugeplan
              </button>

              <button
                className="btn-find-tilbud"
                onClick={handleFindTilbud}
                aria-label="Find matchende tilbud"
                data-testid="recipe-to-tilbud-button"
              >
                <span className="btn-icon">🛒</span>
                Find matchende tilbud
              </button>
            </div>

            {/* Copyright-friendly call-to-action */}
            <section className="recipe-source-cta" role="region" aria-labelledby="source-cta-heading">
              <div className="source-cta-content">
                <h2 id="source-cta-heading" className="source-cta-title">
                  Se den fulde opskrift
                </h2>
                <p className="source-cta-description">
                  {sourceDisplayName ? (
                    <>For den fulde opskrift med ingredienser og fremgangsmåde, besøg <strong>{sourceDisplayName}</strong>.</>
                  ) : (
                    <>For den fulde opskrift med ingredienser og fremgangsmåde, besøg den originale kilde.</>
                  )}
                </p>
                {recipe.sourceUrl ? (
                  <button
                    className="btn-view-full-recipe"
                    onClick={handleViewFullRecipe}
                    aria-label={`Se fuld opskrift hos ${sourceDisplayName || 'kilden'}`}
                    data-testid="view-full-recipe-button"
                  >
                    <span className="btn-icon">📖</span>
                    Se fuld opskrift
                    <span className="external-link-icon" aria-hidden="true">↗</span>
                  </button>
                ) : (
                  <p className="source-cta-unavailable">
                    Link til opskrift er ikke tilgængelig i øjeblikket.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default RecipeDetail;
