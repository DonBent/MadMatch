import React, { useState, useEffect, useCallback, useRef } from 'react';
import { searchRecipes } from '../services/recipeService';
import RecipeCard from '../components/RecipeCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './RecipeBrowse.css';

const RecipeBrowse = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const recipesPerPage = 20;
  const debounceTimeout = useRef(null);

  // Debounce search input (500ms delay)
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (searchQuery !== debouncedQuery) {
      setSearching(true);
    }

    debounceTimeout.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
      setSearching(false);
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    loadRecipes();
  }, [currentPage, debouncedQuery]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (currentPage - 1) * recipesPerPage;
      const data = await searchRecipes(debouncedQuery, {
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setCurrentPage(1);
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
        <header className="recipe-browse-header">
          <h1>Opskrifter</h1>
        </header>
        <div className="recipe-grid-loading">
          <LoadingSkeleton type="recipe-card" />
          <LoadingSkeleton type="recipe-card" />
          <LoadingSkeleton type="recipe-card" />
          <LoadingSkeleton type="recipe-card" />
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
        
        {/* Search Bar */}
        <div className="search-container">
          <label htmlFor="recipe-search" className="sr-only">Søg efter opskrifter</label>
          <div className="search-input-wrapper">
            <svg 
              className="search-icon" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              id="recipe-search"
              type="text"
              className="search-input"
              placeholder="Søg efter opskrifter..."
              value={searchQuery}
              onChange={handleSearchChange}
              data-testid="recipe-search-input"
              aria-label="Søg efter opskrifter"
            />
            {searching && (
              <div className="search-loading-indicator" data-testid="search-loading" aria-label="Søger...">
                <div className="mini-spinner"></div>
              </div>
            )}
            {searchQuery && !searching && (
              <button
                className="clear-search-button"
                onClick={handleClearSearch}
                data-testid="clear-search-button"
                aria-label="Ryd søgning"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <p className="recipe-count" aria-live="polite" aria-atomic="true">
          Viser {recipes.length} af {totalRecipes.toLocaleString('da-DK')} opskrifter
          {debouncedQuery && ` for "${debouncedQuery}"`}
        </p>
      </header>

      {recipes.length === 0 && !loading ? (
        <div className="no-results" data-testid="no-results" role="status">
          <p>
            {debouncedQuery 
              ? 'Ingen opskrifter fundet. Prøv et andet søgeord.'
              : 'Ingen opskrifter fundet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="recipe-grid" data-testid="recipe-browse-grid" role="list">
            {recipes.map(recipe => (
              <div key={recipe.id} role="listitem">
                <RecipeCard recipe={recipe} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="pagination" data-testid="pagination" aria-label="Paginering">
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
                      aria-label="Gå til side 1"
                    >
                      1
                    </button>
                    {currentPage > 4 && <span className="pagination-ellipsis" aria-hidden="true">...</span>}
                  </>
                )}

                {getPageNumbers().map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageClick(pageNum)}
                    className={`pagination-number ${pageNum === currentPage ? 'active' : ''}`}
                    data-testid={`pagination-page-${pageNum}`}
                    aria-current={pageNum === currentPage ? 'page' : undefined}
                    aria-label={`Gå til side ${pageNum}`}
                  >
                    {pageNum}
                  </button>
                ))}

                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="pagination-ellipsis" aria-hidden="true">...</span>}
                    <button
                      onClick={() => handlePageClick(totalPages)}
                      className="pagination-number"
                      data-testid={`pagination-page-${totalPages}`}
                      aria-label={`Gå til side ${totalPages}`}
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
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default RecipeBrowse;
