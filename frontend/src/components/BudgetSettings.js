import React, { useState, useEffect } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import './BudgetSettings.css';

const BudgetSettings = () => {
  const { budget, budgetEnabled, setBudget, toggleBudget, resetBudget } = useBudget();
  const [inputValue, setInputValue] = useState(budget.toString());

  // Sync inputValue when budget changes from context (e.g., after reset)
  useEffect(() => {
    setInputValue(budget.toString());
  }, [budget]);

  const handleBudgetChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Only update context if valid number >= 0
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setBudget(numValue);
    }
  };

  const handleToggle = () => {
    toggleBudget();
  };

  const handleReset = () => {
    resetBudget();
    // Don't manually set inputValue - useEffect will sync it
  };

  return (
    <div className="budget-settings" data-testid="budget-settings">
      <h3>Budget indstillinger</h3>
      
      <div className="setting-row">
        <label htmlFor="budget-toggle" className="setting-label">
          Aktiver budget tracking
        </label>
        <label className="toggle-switch">
          <input
            id="budget-toggle"
            type="checkbox"
            checked={budgetEnabled}
            onChange={handleToggle}
            data-testid="budget-toggle"
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {budgetEnabled && (
        <>
          <div className="setting-row">
            <label htmlFor="budget-amount" className="setting-label">
              Budget beløb (kr)
            </label>
            <input
              id="budget-amount"
              type="number"
              min="0"
              step="10"
              value={inputValue}
              onChange={handleBudgetChange}
              placeholder="Indtast budget"
              className="budget-input"
              data-testid="budget-amount-input"
            />
          </div>

          <div className="setting-row">
            <button
              onClick={handleReset}
              className="reset-button"
              data-testid="reset-budget-button"
            >
              Nulstil budget
            </button>
          </div>
        </>
      )}

      <div className="budget-help">
        <p>
          <strong>💡 Tips:</strong> Sæt et budget for at holde styr på dit forbrug.
          Du får en advarsel når du overskrider budgettet.
        </p>
      </div>
    </div>
  );
};

export default BudgetSettings;
