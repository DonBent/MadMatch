import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as storage from '../utils/storage';

const BudgetContext = createContext();

const STORAGE_KEY = 'madmatch_budget';
const { STORAGE_VERSION } = storage;

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

/**
 * Load initial budget state from storage synchronously
 * This prevents the race condition where the save useEffect runs before load completes
 */
const getInitialBudgetState = () => {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      
      // Validate version and data structure
      if (data.version === STORAGE_VERSION) {
        // Validate budget amount (must be number >= 0)
        const budgetNum = Number(data.budget);
        const validBudget = Number.isFinite(budgetNum) && budgetNum >= 0 ? budgetNum : 0;
        
        if (validBudget !== budgetNum) {
          console.warn('[BudgetContext] Invalid budget amount, defaulting to 0:', data.budget);
        }
        
        // Validate enabled flag (must be boolean)
        const validEnabled = typeof data.enabled === 'boolean' ? data.enabled : true;
        
        if (validEnabled !== data.enabled) {
          console.warn('[BudgetContext] Invalid enabled flag, defaulting to true:', data.enabled);
        }
        
        console.log('[BudgetContext] Loaded initial budget from storage:', { budget: validBudget, enabled: validEnabled });
        return {
          budget: validBudget,
          enabled: validEnabled
        };
      } else {
        console.warn('[BudgetContext] Schema version mismatch, using defaults');
        storage.removeItem(STORAGE_KEY);
      }
    } else {
      console.log('[BudgetContext] No budget data in storage, starting with defaults');
    }
  } catch (error) {
    console.error('[BudgetContext] Failed to load budget from storage:', error);
  }
  return { budget: 0, enabled: true };
};

export const BudgetProvider = ({ children }) => {
  // Initialize budget state from storage synchronously to prevent race condition
  const initialState = getInitialBudgetState();
  const [budget, setBudgetState] = useState(initialState.budget);
  const [enabled, setEnabled] = useState(initialState.enabled);
  const [storageWarning, setStorageWarning] = useState(null);
  
  // Track first mount to prevent saving initial state
  const isFirstMount = useRef(true);

  // Log storage status on mount
  useEffect(() => {
    const status = storage.getStorageStatus();
    console.log('[BudgetContext] Storage status:', status);
    
    if (!status.localStorageAvailable) {
      console.warn('[BudgetContext] localStorage not available, using fallback');
      setStorageWarning('Budget data may not persist across browser restarts');
    }
  }, []);

  // Save budget to storage whenever it changes (skip first mount to prevent overwriting loaded data)
  useEffect(() => {
    // Skip save on first mount - budget is already initialized from storage
    if (isFirstMount.current) {
      isFirstMount.current = false;
      console.log('[BudgetContext] Skipping save on first mount to prevent race condition');
      return;
    }
    
    const saveBudget = async () => {
      try {
        const data = {
          budget,
          enabled,
          version: STORAGE_VERSION,
          savedAt: new Date().toISOString()
        };
        
        const result = await storage.setItem(STORAGE_KEY, data);
        
        if (result.success) {
          console.log('[BudgetContext] Saved budget to storage:', data, 'via', result.backend);
          
          // Show warning if using fallback storage
          if (result.warning && result.backend !== 'localStorage') {
            setStorageWarning(result.warning);
          } else {
            setStorageWarning(null);
          }
        } else {
          console.error('[BudgetContext] Failed to save budget:', result.error);
          setStorageWarning('Failed to save budget - data may be lost');
        }
      } catch (error) {
        console.error('[BudgetContext] Failed to save budget to storage:', error);
        setStorageWarning('Failed to save budget - data may be lost');
      }
    };
    
    saveBudget();
  }, [budget, enabled]);

  const setBudget = (amount) => {
    const validAmount = Math.max(0, Number(amount) || 0);
    console.log('[BudgetContext] Setting budget:', validAmount);
    setBudgetState(validAmount);
  };

  const toggleBudget = () => {
    console.log('[BudgetContext] Toggling budget:', !enabled);
    setEnabled(prev => !prev);
  };

  const resetBudget = () => {
    console.log('[BudgetContext] Resetting budget');
    setBudgetState(0);
    setEnabled(false);
  };

  /**
   * Calculate budget metrics based on cart total
   * @param {number} cartTotal - Total cost of items in cart
   * @returns {object} Budget metrics
   */
  const calculateBudgetMetrics = (cartTotal = 0) => {
    const remaining = budget - cartTotal;
    const exceeded = cartTotal > budget && budget > 0;
    const percentUsed = budget > 0 ? Math.min(100, (cartTotal / budget) * 100) : 0;
    
    return {
      remainingBudget: remaining,
      budgetExceeded: exceeded,
      budgetPercentUsed: percentUsed
    };
  };

  const value = {
    budget,
    budgetEnabled: enabled,
    setBudget,
    toggleBudget,
    resetBudget,
    calculateBudgetMetrics,
    storageWarning,
    storageStatus: storage.getStorageStatus()
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
};
