import React, { useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import './CartItem.css';

/**
 * CartItem Component
 * Displays a single item in the shopping cart with quantity controls
 * Optimized with memoized callbacks and accessible controls
 * 
 * @param {Object} product - Product object with cart data
 */
const CartItem = ({ product }) => {
  const { updateQuantity, removeFromCart } = useCart();
  
  if (!product) return null;

  const cartItem = product.cartItem;
  const quantity = cartItem?.quantity || 0;
  
  const subtotal = product.tilbudspris * quantity;
  const savings = (product.normalpris - product.tilbudspris) * quantity;

  const handleIncrement = useCallback(() => {
    if (quantity < 99) {
      updateQuantity(product.id, quantity + 1);
    }
  }, [quantity, product.id, updateQuantity]);

  const handleDecrement = useCallback(() => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
    }
  }, [quantity, product.id, updateQuantity]);

  const handleRemove = useCallback(() => {
    removeFromCart(product.id);
  }, [product.id, removeFromCart]);

  return (
    <div className="cart-item" role="article" aria-label={`${product.navn} fra ${product.butik}`}>
      <div className="cart-item-info">
        <h3 className="cart-item-name">{product.navn}</h3>
        <div className="cart-item-store">{product.butik}</div>
        <div className="cart-item-price">
          {product.tilbudspris.toFixed(2)} kr
        </div>
      </div>
      
      <div className="cart-item-controls">
        <div className="quantity-controls" role="group" aria-label="Antal kontroller">
          <button 
            className="quantity-btn"
            onClick={handleDecrement}
            disabled={quantity <= 1}
            aria-label="Reducer antal"
          >
            −
          </button>
          <span className="quantity-display" aria-label={`Antal: ${quantity}`}>
            {quantity}
          </span>
          <button 
            className="quantity-btn"
            onClick={handleIncrement}
            disabled={quantity >= 99}
            aria-label="Forøg antal"
          >
            +
          </button>
        </div>
        
        <div className="cart-item-subtotal">
          <div className="subtotal-label">Subtotal:</div>
          <div className="subtotal-amount">{subtotal.toFixed(2)} kr</div>
          {savings > 0 && (
            <div className="subtotal-savings">Spar {savings.toFixed(2)} kr</div>
          )}
        </div>
        
        <button 
          className="remove-btn"
          onClick={handleRemove}
          aria-label={`Fjern ${product.navn} fra kurv`}
        >
          <span aria-hidden="true">🗑️</span> Fjern
        </button>
      </div>
    </div>
  );
};

export default CartItem;
