import React, { useState, useCallback } from 'react';
import { useFavorites } from '../contexts/FavoritesContext';
import './FavoriteButton.css';

/**
 * FavoriteButton Component
 * Displays a heart icon for favoriting/unfavoriting products
 * Includes smooth animation on toggle
 * 
 * @param {string} productId - ID of the product to favorite
 */
const FavoriteButton = ({ productId }) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [isAnimating, setIsAnimating] = useState(false);
  const favorited = isFavorite(productId);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    
    if (favorited) {
      removeFavorite(productId);
    } else {
      addFavorite(productId);
    }
  }, [favorited, productId, addFavorite, removeFavorite]);

  return (
    <button
      className={`favorite-button ${favorited ? 'favorited' : ''} ${isAnimating ? 'animating' : ''}`}
      onClick={handleClick}
      aria-label={favorited ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
      aria-pressed={favorited}
      title={favorited ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
    >
      {favorited ? '♥' : '♡'}
    </button>
  );
};

export default FavoriteButton;
