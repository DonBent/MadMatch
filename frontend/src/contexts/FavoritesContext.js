import React, { createContext, useContext, useState, useEffect } from 'react';
import * as storage from '../utils/storage';

const FavoritesContext = createContext();

const STORAGE_KEY = 'madmatch_favorites';
const { STORAGE_VERSION } = storage;

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
      const stored = storage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Data is already validated and migrated by storage.getItem()
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
      }
    } catch (error) {
      console.error('[FavoritesContext] Failed to load favorites from localStorage:', error);
      setFavorites([]);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    const saveFavorites = async () => {
      try {
        const data = {
          favorites,
          version: STORAGE_VERSION
        };
        const result = await storage.setItem(STORAGE_KEY, data);
        
        if (!result.success) {
          console.error('[FavoritesContext] Failed to save:', result.error);
        } else if (result.warning) {
          console.warn('[FavoritesContext] Storage warning:', result.warning);
        }
      } catch (error) {
        console.error('[FavoritesContext] Failed to save favorites:', error);
      }
    };
    
    saveFavorites();
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
