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
  const [isInitialized, setIsInitialized] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    console.log('[FavoritesContext] MOUNT - Starting hydration from storage');
    try {
      const stored = storage.getItem(STORAGE_KEY);
      console.log('[FavoritesContext] HYDRATE - Raw storage data:', stored ? `${stored.length} bytes` : 'null');
      
      if (stored) {
        const data = JSON.parse(stored);
        console.log('[FavoritesContext] HYDRATE - Parsed data:', {
          version: data.version,
          favoritesCount: data.favorites?.length,
          favorites: data.favorites
        });
        
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
          
          console.log('[FavoritesContext] HYDRATE - Setting state with', validFavorites.length, 'favorites:', validFavorites);
          setFavorites(validFavorites);
        } else {
          console.warn('[FavoritesContext] Favorites is not an array, using empty array');
          setFavorites([]);
        }
      } else {
        console.log('[FavoritesContext] HYDRATE - No stored data, initializing empty');
      }
    } catch (error) {
      console.error('[FavoritesContext] Failed to load favorites from localStorage:', error);
      setFavorites([]);
    } finally {
      console.log('[FavoritesContext] HYDRATE - Complete, marking as initialized');
      setIsInitialized(true);
    }
  }, []);

  // Save favorites to localStorage whenever they change (but skip initial render)
  useEffect(() => {
    // Skip saving on initial render to prevent race condition
    if (!isInitialized) {
      console.log('[FavoritesContext] SAVE - Skipping (not initialized yet)');
      return;
    }
    
    const saveFavorites = async () => {
      console.log('[FavoritesContext] SAVE - Triggered with', favorites.length, 'favorites:', favorites);
      const timestamp = new Date().toISOString();
      
      try {
        const data = {
          favorites,
          version: STORAGE_VERSION
        };
        console.log('[FavoritesContext] SAVE - Calling storage.setItem with data:', data);
        
        const result = await storage.setItem(STORAGE_KEY, data);
        
        console.log('[FavoritesContext] SAVE - Result:', result);
        
        if (!result.success) {
          console.error('[FavoritesContext] Failed to save:', result.error);
        } else if (result.warning) {
          console.warn('[FavoritesContext] Storage warning:', result.warning);
        } else {
          console.log('[FavoritesContext] SAVE - Success at', timestamp);
          
          // Verify persistence by reading back
          const verified = storage.getItem(STORAGE_KEY);
          if (verified) {
            const verifiedData = JSON.parse(verified);
            console.log('[FavoritesContext] VERIFY - Read back', verifiedData.favorites?.length, 'favorites:', verifiedData.favorites);
            
            if (JSON.stringify(verifiedData.favorites) !== JSON.stringify(favorites)) {
              console.error('[FavoritesContext] VERIFY FAILED - Data mismatch!', {
                expected: favorites,
                actual: verifiedData.favorites
              });
            } else {
              console.log('[FavoritesContext] VERIFY - Success ✓');
            }
          } else {
            console.error('[FavoritesContext] VERIFY FAILED - No data found after save!');
          }
        }
      } catch (error) {
        console.error('[FavoritesContext] Failed to save favorites:', error);
      }
    };
    
    saveFavorites();
  }, [favorites, isInitialized]);

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
