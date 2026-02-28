import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

const STORAGE_KEY = 'madmatch_cart';
const STORAGE_VERSION = 1;

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.version === STORAGE_VERSION && Array.isArray(data.cart)) {
          console.log('[CartContext] Loaded cart from localStorage:', data.cart.length, 'items');
          setCart(data.cart);
        } else {
          console.warn('[CartContext] Invalid cart data structure in localStorage');
        }
      } else {
        console.log('[CartContext] No cart data in localStorage');
      }
    } catch (error) {
      console.error('[CartContext] Failed to load cart from localStorage:', error);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      const data = {
        cart,
        version: STORAGE_VERSION,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('[CartContext] Saved cart to localStorage:', cart.length, 'items');
    } catch (error) {
      console.error('[CartContext] Failed to save cart to localStorage:', error);
    }
  }, [cart]);

  const addToCart = (product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.productId === product.id);
      
      if (existingItem) {
        // Increment quantity if already in cart
        console.log('[CartContext] Incrementing quantity for product:', product.id);
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Add new item to cart with full product snapshot
        console.log('[CartContext] Adding new product to cart:', product.id);
        return [
          ...prev,
          {
            productId: product.id,
            quantity: 1,
            addedAt: new Date().toISOString(),
            // Store product snapshot for offline resilience
            productSnapshot: {
              id: product.id,
              titel: product.titel,
              beskrivelse: product.beskrivelse,
              normalpris: product.normalpris,
              tilbudspris: product.tilbudspris,
              besparelse: product.besparelse,
              besparelseProcentvis: product.besparelseProcentvis,
              gyldigFra: product.gyldigFra,
              gyldigTil: product.gyldigTil,
              butik: product.butik,
              kategori: product.kategori,
              billedUrl: product.billedUrl
            }
          }
        ];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    // Ensure quantity is between 1 and 99
    const validQuantity = Math.max(1, Math.min(99, quantity));
    
    setCart(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: validQuantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Computed values
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
