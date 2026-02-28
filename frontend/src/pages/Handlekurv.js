import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { tilbudService } from '../services/tilbudService';
import CartItem from '../components/CartItem';
import './Handlekurv.css';

const Handlekurv = () => {
  const { cart, clearCart, totalItems } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    loadCartProducts();
  }, [cart]);

  const loadCartProducts = async () => {
    if (cart.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[Handlekurv] Loading cart products for', cart.length, 'items');
      
      // Try to fetch fresh product data from API
      const allTilbud = await tilbudService.getAllTilbud();
      console.log('[Handlekurv] Fetched', allTilbud.length, 'products from API');
      
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
            console.warn('[Handlekurv] Using snapshot for product:', cartItem.productId);
            return {
              ...cartItem.productSnapshot,
              cartItem
            };
          }
          
          // Product not found in API or snapshot
          console.error('[Handlekurv] Product not found:', cartItem.productId);
          return null;
        })
        .filter(p => p !== null);

      setProducts(cartProducts);
      setError(null);
    } catch (err) {
      console.error('[Handlekurv] Failed to load from API, using snapshots:', err);
      
      // API failed - use product snapshots from cart
      const snapshotProducts = cart
        .map(cartItem => {
          if (cartItem.productSnapshot) {
            return {
              ...cartItem.productSnapshot,
              cartItem
            };
          }
          console.error('[Handlekurv] No snapshot available for product:', cartItem.productId);
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
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearDialog(false);
  };

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
        <div className="loading">Indlæser handlekurv...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="handlekurv-page">
        <header className="handlekurv-header">
          <Link to="/" className="back-link">← Tilbage</Link>
          <h1>🛒 Handlekurv</h1>
        </header>
        <div className="error">
          <p>{error}</p>
          <button onClick={loadCartProducts}>Prøv igen</button>
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
        <div className="empty-cart">
          <p>Din handlekurv er tom. Tilføj varer fra tilbuddene.</p>
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

      <div className="handlekurv-content">
        <div className="cart-items-section">
          <div className="cart-header-actions">
            <h2>Varer ({totalItems})</h2>
            <button 
              className="clear-cart-btn"
              onClick={() => setShowClearDialog(true)}
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
        <div className="dialog-overlay" onClick={() => setShowClearDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Tøm handlekurv?</h3>
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
