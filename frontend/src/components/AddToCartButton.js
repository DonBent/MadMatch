import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import './AddToCartButton.css';

const AddToCartButton = ({ product }) => {
  const { addToCart } = useCart();
  const [showFeedback, setShowFeedback] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart(product);
    
    // Show success feedback
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 1500);
  };

  return (
    <div className="add-to-cart-container">
      <button 
        className="add-to-cart-button" 
        onClick={handleClick}
        aria-label="Tilføj til kurv"
      >
        🛒 Tilføj til kurv
      </button>
      {showFeedback && (
        <div className="cart-feedback">
          ✓ Tilføjet!
        </div>
      )}
    </div>
  );
};

export default AddToCartButton;
