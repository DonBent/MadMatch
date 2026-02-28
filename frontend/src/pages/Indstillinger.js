import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBudget } from '../contexts/BudgetContext';
import * as storage from '../utils/storage';
import './Indstillinger.css';

const POSTNUMMER_STORAGE_KEY = 'madmatch_postnummer';
const { STORAGE_VERSION } = storage;

const Indstillinger = () => {
  // Budget state from context
  const { budget, budgetEnabled, setBudget, toggleBudget } = useBudget();
  
  // Local budget state for form
  const [budgetInput, setBudgetInput] = useState(budget.toString());
  const [budgetError, setBudgetError] = useState('');
  
  // Postnummer state
  const [postnummer, setPostnummer] = useState('');
  const [postnummerError, setPostnummerError] = useState('');
  
  // Success feedback
  const [successMessage, setSuccessMessage] = useState('');

  // Load postnummer from storage on mount
  useEffect(() => {
    const loadPostnummer = () => {
      try {
        const stored = storage.getItem(POSTNUMMER_STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          
          // Validate version and data structure
          if (data.version === STORAGE_VERSION && data.postnummer) {
            // Validate postnummer format
            if (/^\d{4}$/.test(data.postnummer)) {
              setPostnummer(data.postnummer);
              console.log('[Indstillinger] Loaded postnummer from storage:', data.postnummer);
            } else {
              console.warn('[Indstillinger] Invalid postnummer format in storage:', data.postnummer);
            }
          }
        }
      } catch (error) {
        console.error('[Indstillinger] Failed to load postnummer from storage:', error);
      }
    };
    
    loadPostnummer();
  }, []);

  // Sync budget input when context budget changes
  useEffect(() => {
    setBudgetInput(budget.toString());
  }, [budget]);

  // Validate budget input
  const validateBudget = (value) => {
    const num = Number(value);
    
    if (value === '' || value === null || value === undefined) {
      return 'Budget skal udfyldes';
    }
    
    if (isNaN(num)) {
      return 'Budget skal være et tal';
    }
    
    if (num < 0) {
      return 'Budget skal være 0 eller større';
    }
    
    if (!Number.isFinite(num)) {
      return 'Ugyldigt budget';
    }
    
    return '';
  };

  // Validate postnummer input
  const validatePostnummer = (value) => {
    if (value === '') {
      return ''; // Empty is valid - postnummer is optional
    }
    
    if (!/^\d{4}$/.test(value)) {
      return 'Postnummer skal være nøjagtig 4 cifre';
    }
    
    return '';
  };

  // Handle budget input change
  const handleBudgetChange = (e) => {
    const value = e.target.value;
    setBudgetInput(value);
    
    const error = validateBudget(value);
    setBudgetError(error);
  };

  // Handle postnummer input change
  const handlePostnummerChange = (e) => {
    const value = e.target.value;
    
    // Only allow digits and max 4 characters
    if (value !== '' && (!/^\d*$/.test(value) || value.length > 4)) {
      return;
    }
    
    setPostnummer(value);
    
    const error = validatePostnummer(value);
    setPostnummerError(error);
  };

  // Handle budget toggle
  const handleBudgetToggle = () => {
    toggleBudget();
    showSuccess('Budget-indstilling opdateret');
  };

  // Show success message
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Save budget settings
  const handleSaveBudget = async () => {
    const error = validateBudget(budgetInput);
    
    if (error) {
      setBudgetError(error);
      return;
    }
    
    const budgetNum = Number(budgetInput);
    setBudget(budgetNum);
    setBudgetError('');
    showSuccess('Budget gemt');
  };

  // Save postnummer settings
  const handleSavePostnummer = async () => {
    const error = validatePostnummer(postnummer);
    
    if (error) {
      setPostnummerError(error);
      return;
    }
    
    try {
      const data = {
        postnummer: postnummer || null,
        version: STORAGE_VERSION,
        savedAt: new Date().toISOString()
      };
      
      const result = await storage.setItem(POSTNUMMER_STORAGE_KEY, data);
      
      if (result.success) {
        console.log('[Indstillinger] Saved postnummer to storage:', data);
        setPostnummerError('');
        showSuccess(postnummer ? 'Postnummer gemt' : 'Postnummer fjernet');
      } else {
        setPostnummerError('Kunne ikke gemme postnummer');
        console.error('[Indstillinger] Failed to save postnummer:', result.error);
      }
    } catch (error) {
      console.error('[Indstillinger] Failed to save postnummer:', error);
      setPostnummerError('Kunne ikke gemme postnummer');
    }
  };

  // Check if budget form is valid
  const isBudgetValid = budgetInput !== '' && !budgetError;
  
  // Check if postnummer form is valid
  const isPostnummerValid = postnummer === '' || !postnummerError;

  return (
    <div className="indstillinger-page">
      <header className="page-header">
        <Link to="/" className="back-link">← Tilbage</Link>
        <h1>⚙️ Indstillinger</h1>
      </header>

      <main className="settings-main">
        {successMessage && (
          <div className="success-message" role="status" aria-live="polite">
            ✓ {successMessage}
          </div>
        )}

        {/* Budget Settings Section */}
        <section className="settings-section">
          <h2>Budget</h2>
          <p className="section-description">
            Sæt dit månedlige madbudget og aktiver budget-tracking
          </p>

          <div className="form-group">
            <label htmlFor="budget-enabled" className="toggle-label">
              <input
                type="checkbox"
                id="budget-enabled"
                checked={budgetEnabled}
                onChange={handleBudgetToggle}
                className="toggle-checkbox"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">
                Budget-tracking {budgetEnabled ? 'aktiveret' : 'deaktiveret'}
              </span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="budget-amount">Budget beløb (kr)</label>
            <div className="input-wrapper">
              <input
                type="number"
                id="budget-amount"
                value={budgetInput}
                onChange={handleBudgetChange}
                placeholder="f.eks. 3000"
                min="0"
                step="1"
                className={budgetError ? 'input-error' : ''}
                disabled={!budgetEnabled}
              />
              {budgetError && (
                <span className="error-message" role="alert">
                  {budgetError}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSaveBudget}
            disabled={!budgetEnabled || !isBudgetValid}
            className="save-button"
          >
            Gem budget
          </button>
        </section>

        {/* Postnummer Settings Section */}
        <section className="settings-section">
          <h2>Postnummer</h2>
          <p className="section-description">
            Angiv dit postnummer for lokale tilbud (kommende funktion)
          </p>

          <div className="form-group">
            <label htmlFor="postnummer">Postnummer (4 cifre)</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="postnummer"
                value={postnummer}
                onChange={handlePostnummerChange}
                placeholder="f.eks. 2100"
                maxLength="4"
                pattern="\d{4}"
                className={postnummerError ? 'input-error' : ''}
                inputMode="numeric"
              />
              {postnummerError && (
                <span className="error-message" role="alert">
                  {postnummerError}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSavePostnummer}
            disabled={!isPostnummerValid}
            className="save-button"
          >
            Gem postnummer
          </button>
        </section>
      </main>
    </div>
  );
};

export default Indstillinger;
