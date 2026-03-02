import React, { useState, useEffect } from 'react';
import { recipeService } from '../services/recipeService';
import RecipeCard from '../components/RecipeCard';
import './RecipeBrowse.css';

const RecipeBrowse = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  const recipesPerPage = 20;

  useEffect(() => {
    loadRecipes();
  }, [currentPage]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (currentPage - 1) * recipesPerPage;
      const data = await recipeService.searchRecipes({
        query: '', // Empty query to get all recipes
        language: 'da',
        limit: recipesPerPage,
        offset: offset
      });

      setRecipes(data.recipes || []);
      setTotalRecipes(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError('Kunne ikke indlæse opskrifter. Prøv igen senere.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalRecipes / recipesPerPage);
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="recipe-browse">
        <div className="loading" data-testid="loading-spinner">
          <div className="spinner"></div>
          <p>Indlæser opskrifter...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recipe-browse">
        <div className="error" data-testid="error-message">
          <h2>⚠️ Fejl</h2>
          <p>{error}</p>
          <button onClick={loadRecipes} data-testid="retry-button">
            Prøv igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-browse">
      <header className="recipe-browse-header">
        <h1>Opskrifter</h1>
        <p className="recipe-count">
          Viser {recipes.length} af {totalRecipes.toLocaleString('da-DK')} opskrifter
        </p>
      </header>

      {recipes.length === 0 ? (
        <div className="no-results" data-testid="no-results">
          <p>Ingen opskrifter fundet.</p>
        </div>
      ) : (
        <>
          <div className="recipe-grid" data-testid="recipe-browse-grid">
            {recipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination" data-testid="pagination">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="pagination-button"
                data-testid="pagination-previous"
                aria-label="Forrige side"
              >
                ← Forrige
              </button>

              <div className="pagination-numbers">
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => handlePageClick(1)}
                      className="pagination-number"
                      data-testid="pagination-page-1"
                    >
                      1
                    </button>
                    {currentPage > 4 && <span className="pagination-ellipsis">...</span>}
                  </>
                )}

                {getPageNumbers().map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageClick(pageNum)}
                    className={`pagination-number ${pageNum === currentPage ? 'active' : ''}`}
                    data-testid={`pagination-page-${pageNum}`}
                    aria-current={pageNum === currentPage ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                ))}

                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="pagination-ellipsis">...</span>}
                    <button
                      onClick={() => handlePageClick(totalPages)}
                      className="pagination-number"
                      data-testid={`pagination-page-${totalPages}`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={handleNextPage}
                disabled={!hasMore}
                className="pagination-button"
                data-testid="pagination-next"
                aria-label="Næste side"
              >
                Næste →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecipeBrowse;
