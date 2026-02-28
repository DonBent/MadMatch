import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useBudget } from '../contexts/BudgetContext';
import { tilbudService } from '../services/tilbudService';
import CartItem from '../components/CartItem';
import BudgetDisplay from '../components/BudgetDisplay';
import './Handlekurv.css';

/**
 * Handlekurv (Shopping Cart) Page
 * Displays cart items with budget tracking and loading states
 */
const Handlekurv = () => {
  const { cart, clearCart, totalItems } = useCart();
  const { budgetEnabled } = useBudget();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const loadCartProducts = useCallback(async () => {
    if (cart.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Try to fetch fresh product data from API
      const allTilbud = await tilbudService.getAllTilbud();
      
      // Map cart items to products with cart data
      // Use fresh API data if available, otherwise fall back to stored snapshot
      const cartProducts = cart
        .map(cartItem => {
          const freshProduct = allTilbud.find(t => t.id === cartItem.productId);
          
          if (freshProduct) {
            // Use fresh product data from API
            return {
              ...freshProduct,
              cartItem
            };
          } else if (cartItem.productSnapshot) {
            // Fall back to stored snapshot if API doesn't have the product
            return {
              ...cartItem.productSnapshot,
              cartItem
            };
          }
          
          // Product not found in API or snapshot
          return null;
        })
        .filter(p => p !== null);

      setProducts(cartProducts);
      setError(null);
    } catch (err) {
      // API failed - use product snapshots from cart
      const snapshotProducts = cart
        .map(cartItem => {
          if (cartItem.productSnapshot) {
            return {
              ...cartItem.productSnapshot,
              cartItem
            };
          }
          return null;
        })
        .filter(p => p !== null);
      
      if (snapshotProducts.length > 0) {
        setProducts(snapshotProducts);
        setError('Kunne ikke opdatere priser. Viser gemte produkter.');
      } else {
        setError('Kunne ikke indlæse handlekurv.');
      }
    } finally {
      setLoading(false);
    }
  }, [cart]);

  useEffect(() => {
    loadCartProducts();
  }, [loadCartProducts]);

  const handleClearCart = useCallback(() => {
    clearCart();
    setShowClearDialog(false);
  }, [clearCart]);

  // Calculate totals
  const totalCost = products.reduce((sum, product) => {
    return sum + (product.tilbudspris * product.cartItem.quantity);
  }, 0);

  const totalSavings = products.reduce((sum, product) => {
    return sum + ((product.normalpris - product.tilbudspris) * product.cartItem.quantity);
  }, 0);

  if (loading) {
    return (
      <div className="handlekurv-page">
        <header className="handlekurv-header">
          <Link to="/" className="back-link">← Tilbage</Link>
          <h1>🛒 Handlekurv</h1>
        </header>
        <div className="loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true"></div>
          <p>Indlæser handlekurv...</p>
        </div>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="handlekurv-page">
        <header className="handlekurv-header">
          <Link to="/" className="back-link">← Tilbage</Link>
          <h1>🛒 Handlekurv</h1>
        </header>
        <div className="error" role="alert">
          <p>{error}</p>
          <button onClick={loadCartProducts} className="retry-button">
            Prøv igen
          </button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="handlekurv-page">
        <header className="handlekurv-header">
          <Link to="/" className="back-link">← Tilbage</Link>
          <h1>🛒 Handlekurv</h1>
        </header>
        <div className="empty-cart" role="status">
          <p className="empty-icon" aria-hidden="true">🛒</p>
          <h3 className="empty-title">Din handlekurv er tom</h3>
          <p className="empty-message">Find tilbud og tilføj til kurven!</p>
          <Link to="/" className="browse-link">Se tilbud</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="handlekurv-page">
      <header className="handlekurv-header">
        <Link to="/" className="back-link">← Tilbage</Link>
        <h1>🛒 Handlekurv</h1>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span aria-hidden="true">⚠️</span> {error}
        </div>
      )}

      <div className="handlekurv-content">
        <div className="cart-items-section">
          <div className="cart-header-actions">
            <h2>Varer ({totalItems})</h2>
            <button 
              className="clear-cart-btn"
              onClick={() => setShowClearDialog(true)}
              aria-label="Tøm handlekurv"
            >
              Tøm kurv
            </button>
          </div>

          <div className="cart-items-list">
            {products.map(product => (
              <CartItem key={product.id} product={product} />
            ))}
          </div>
        </div>

        <div className="cart-summary">
          <h2>Oversigt</h2>
          
          {budgetEnabled && <BudgetDisplay cartTotal={totalCost} />}
          
          <div className="summary-row">
            <span>Antal varer:</span>
            <span className="summary-value">{totalItems}</span>
          </div>
          <div className="summary-row">
            <span>Samlet pris:</span>
            <span className="summary-value">{totalCost.toFixed(2)} kr</span>
          </div>
          <div className="summary-row savings-row">
            <span>Samlet besparelse:</span>
            <span className="summary-value savings">{totalSavings.toFixed(2)} kr</span>
          </div>
        </div>
      </div>

      {showClearDialog && (
        <div 
          className="dialog-overlay" 
          onClick={() => setShowClearDialog(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3 id="dialog-title">Tøm handlekurv?</h3>
            <p>Er du sikker på, at du vil fjerne alle varer fra handlekurven?</p>
            <div className="dialog-actions">
              <button 
                className="dialog-btn cancel-btn"
                onClick={() => setShowClearDialog(false)}
              >
                Annuller
              </button>
              <button 
                className="dialog-btn confirm-btn"
                onClick={handleClearCart}
                autoFocus
              >
                Ja, tøm kurv
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Handlekurv;
