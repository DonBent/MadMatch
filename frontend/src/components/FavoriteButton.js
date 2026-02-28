import React from 'react';
import { useFavorites } from '../contexts/FavoritesContext';
import './FavoriteButton.css';

const FavoriteButton = ({ productId }) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorited = isFavorite(productId);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (favorited) {
      removeFavorite(productId);
    } else {
      addFavorite(productId);
    }
  };

  return (
    <button
      className={`favorite-button ${favorited ? 'favorited' : ''}`}
      onClick={handleClick}
      aria-label={favorited ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
      title={favorited ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
    >
      {favorited ? '♥' : '♡'}
    </button>
  );
};

export default FavoriteButton;
