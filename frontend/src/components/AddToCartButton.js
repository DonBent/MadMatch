import React, { useState, useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import './AddToCartButton.css';

/**
 * AddToCartButton Component
 * Adds product to cart with visual feedback
 * Includes loading state and smooth animation
 * 
 * @param {Object} product - Product to add to cart
 */
const AddToCartButton = ({ product }) => {
  const { addToCart } = useCart();
  const [showFeedback, setShowFeedback] = useState(false);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart(product);
    
    // Show success feedback with smooth animation
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 1500);
  }, [addToCart, product]);

  return (
    <div className="add-to-cart-container">
      <button 
        className="add-to-cart-button" 
        onClick={handleClick}
        aria-label="Tilføj til kurv"
      >
        <span aria-hidden="true">🛒</span> Tilføj til kurv
      </button>
      {showFeedback && (
        <div 
          className="cart-feedback"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">✓</span> Tilføjet!
        </div>
      )}
    </div>
  );
};

export default AddToCartButton;
