import React from 'react';
import { useCart } from '../contexts/CartContext';
import './CartItem.css';

const CartItem = ({ product }) => {
  const { updateQuantity, removeFromCart } = useCart();
  
  if (!product) return null;

  const cartItem = product.cartItem;
  const quantity = cartItem?.quantity || 0;
  
  const subtotal = product.tilbudspris * quantity;
  const savings = (product.normalpris - product.tilbudspris) * quantity;

  const handleIncrement = () => {
    if (quantity < 99) {
      updateQuantity(product.id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
    }
  };

  const handleRemove = () => {
    removeFromCart(product.id);
  };

  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <h3 className="cart-item-name">{product.navn}</h3>
        <div className="cart-item-store">{product.butik}</div>
        <div className="cart-item-price">
          {product.tilbudspris.toFixed(2)} kr
        </div>
      </div>
      
      <div className="cart-item-controls">
        <div className="quantity-controls">
          <button 
            className="quantity-btn"
            onClick={handleDecrement}
            disabled={quantity <= 1}
            aria-label="Reducer antal"
          >
            -
          </button>
          <span className="quantity-display">{quantity}</span>
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
          <div className="subtotal-savings">Spar {savings.toFixed(2)} kr</div>
        </div>
        
        <button 
          className="remove-btn"
          onClick={handleRemove}
          aria-label="Fjern vare"
        >
          🗑️ Fjern
        </button>
      </div>
    </div>
  );
};

export default CartItem;
