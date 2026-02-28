import React, { createContext, useContext, useState, useEffect } from 'react';
import * as storage from '../utils/storage';

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
  const [storageWarning, setStorageWarning] = useState(null);

  // Log storage status on mount
  useEffect(() => {
    const status = storage.getStorageStatus();
    console.log('[CartContext] Storage status:', status);
    
    if (!status.localStorageAvailable) {
      console.warn('[CartContext] localStorage not available, using fallback');
      setStorageWarning('Cart data may not persist across browser restarts');
    }
  }, []);

  // Load cart from storage on mount
  useEffect(() => {
    try {
      const stored = storage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.version === STORAGE_VERSION && Array.isArray(data.cart)) {
          console.log('[CartContext] Loaded cart from storage:', data.cart.length, 'items');
          setCart(data.cart);
        } else {
          console.warn('[CartContext] Invalid cart data structure in storage');
        }
      } else {
        console.log('[CartContext] No cart data in storage');
      }
    } catch (error) {
      console.error('[CartContext] Failed to load cart from storage:', error);
    }
  }, []);

  // Save cart to storage whenever it changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        const data = {
          cart,
          version: STORAGE_VERSION,
          savedAt: new Date().toISOString()
        };
        
        const result = await storage.setItem(STORAGE_KEY, data);
        
        if (result.success) {
          console.log('[CartContext] Saved cart to storage:', cart.length, 'items via', result.backend);
          
          // Show warning if using fallback storage
          if (result.warning && result.backend !== 'localStorage') {
            setStorageWarning(result.warning);
          } else {
            setStorageWarning(null);
          }
        } else {
          console.error('[CartContext] Failed to save cart:', result.error);
          setStorageWarning('Failed to save cart - data may be lost');
        }
      } catch (error) {
        console.error('[CartContext] Failed to save cart to storage:', error);
        setStorageWarning('Failed to save cart - data may be lost');
      }
    };
    
    saveCart();
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
    totalItems,
    storageWarning, // Expose storage warning to UI
    storageStatus: storage.getStorageStatus() // Expose storage status
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
