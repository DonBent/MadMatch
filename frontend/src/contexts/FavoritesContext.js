import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_VERSION } from '../utils/storage';

const FavoritesContext = createContext();

const STORAGE_KEY = 'madmatch_favorites';

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Validate version and data structure
        if (data.version === STORAGE_VERSION) {
          if (Array.isArray(data.favorites)) {
            // Validate each favorite ID
            const validFavorites = data.favorites.filter(id => {
              const isValid = typeof id === 'string' || typeof id === 'number';
              if (!isValid) {
                console.warn('[FavoritesContext] Invalid favorite ID removed:', id);
              }
              return isValid;
            });
            
            if (validFavorites.length !== data.favorites.length) {
              console.warn('[FavoritesContext] Some favorites were invalid and removed');
            }
            
            setFavorites(validFavorites);
          } else {
            console.warn('[FavoritesContext] Favorites is not an array, using empty array');
            setFavorites([]);
          }
        } else {
          console.warn('[FavoritesContext] Schema version mismatch, clearing favorites');
          localStorage.removeItem(STORAGE_KEY);
          setFavorites([]);
        }
      }
    } catch (error) {
      console.error('[FavoritesContext] Failed to load favorites from localStorage:', error);
      setFavorites([]);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      const data = {
        favorites,
        version: STORAGE_VERSION
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save favorites to localStorage:', error);
    }
  }, [favorites]);

  const addFavorite = (id) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const removeFavorite = (id) => {
    setFavorites(prev => prev.filter(favId => favId !== id));
  };

  const isFavorite = (id) => {
    return favorites.includes(id);
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const value = {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearFavorites
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
