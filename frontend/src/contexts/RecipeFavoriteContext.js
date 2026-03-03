import React, { createContext, useContext, useState, useEffect } from 'react';

const RecipeFavoriteContext = createContext();

const STORAGE_KEY = 'madmatch_favorite_recipes';
const STORAGE_VERSION = 1;

/**
 * RecipeFavoriteProvider
 * 
 * Manages recipe favorite state across the application.
 * Persists favorites to localStorage with versioning.
 * 
 * LocalStorage schema:
 * {
 *   "version": 1,
 *   "favorites": ["recipe-id-1", "recipe-id-2"],
 *   "updatedAt": "2026-03-02T22:30:00Z"
 * }
 */
export const RecipeFavoriteProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      saveFavorites(favorites);
    }
  }, [favorites, isLoaded]);

  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Version migration support
        if (data.version === STORAGE_VERSION) {
          setFavorites(data.favorites || []);
        } else {
          // Future: handle version migrations
          console.warn('Recipe favorites storage version mismatch, resetting');
          setFavorites([]);
        }
      }
    } catch (error) {
      console.error('Failed to load recipe favorites:', error);
      setFavorites([]);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveFavorites = (favoriteList) => {
    try {
      const data = {
        version: STORAGE_VERSION,
        favorites: favoriteList,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save recipe favorites:', error);
    }
  };

  const toggleFavorite = (recipeId) => {
    setFavorites(prev => {
      if (prev.includes(recipeId)) {
        return prev.filter(id => id !== recipeId);
      } else {
        return [...prev, recipeId];
      }
    });
  };

  const isFavorite = (recipeId) => {
    return favorites.includes(recipeId);
  };

  const getFavoriteCount = () => {
    return favorites.length;
  };

  const clearAllFavorites = () => {
    setFavorites([]);
  };

  const value = {
    favorites,
    toggleFavorite,
    isFavorite,
    getFavoriteCount,
    clearAllFavorites,
    isLoaded
  };

  return (
    <RecipeFavoriteContext.Provider value={value}>
      {children}
    </RecipeFavoriteContext.Provider>
  );
};

export const useRecipeFavorites = () => {
  const context = useContext(RecipeFavoriteContext);
  if (!context) {
    throw new Error('useRecipeFavorites must be used within RecipeFavoriteProvider');
  }
  return context;
};
