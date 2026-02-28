import React from 'react';
import { useBudget } from '../contexts/BudgetContext';
import './BudgetDisplay.css';

const BudgetDisplay = ({ cartTotal = 0, compact = false }) => {
  const { budget, budgetEnabled, calculateBudgetMetrics } = useBudget();

  // Don't render if budget is not enabled
  if (!budgetEnabled) {
    return null;
  }

  const { remainingBudget, budgetExceeded, budgetPercentUsed } = calculateBudgetMetrics(cartTotal);

  // Determine color based on percentage (use uncapped value for color logic)
  const getProgressColor = () => {
    const actualPercent = budget > 0 ? (cartTotal / budget) * 100 : 0;
    if (actualPercent <= 75) return '#28a745'; // Green
    if (actualPercent <= 100) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const progressColor = getProgressColor();
  const progressWidth = Math.min(100, budgetPercentUsed);

  if (compact) {
    return (
      <div className="budget-display-compact" data-testid="budget-display">
        <div className="budget-text">
          {budgetExceeded ? (
            <span className="budget-exceeded">
              Over budget: {cartTotal.toFixed(0)} kr / {budget.toFixed(0)} kr
            </span>
          ) : (
            <span className="budget-ok">
              Budget: {cartTotal.toFixed(0)} kr / {budget.toFixed(0)} kr ({budgetPercentUsed.toFixed(0)}%)
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="budget-display" data-testid="budget-display">
      <div className="budget-header">
        <h3>Budget</h3>
        {budgetExceeded && (
          <span className="budget-warning" data-testid="budget-warning">
            ⚠️ Budget overskredet
          </span>
        )}
      </div>

      <div className="budget-info">
        <div className="budget-row">
          <span className="budget-label">Forbrug:</span>
          <span className="budget-value">{cartTotal.toFixed(0)} kr</span>
        </div>
        <div className="budget-row">
          <span className="budget-label">Budget:</span>
          <span className="budget-value">{budget.toFixed(0)} kr</span>
        </div>
        <div className="budget-row">
          <span className="budget-label">Tilbage:</span>
          <span className={`budget-value${remainingBudget < 0 ? ' negative' : ''}`}>
            {remainingBudget.toFixed(0)} kr
          </span>
        </div>
      </div>

      <div className="budget-progress-container">
        <div
          className="budget-progress-bar"
          style={{ width: `${progressWidth}%`, backgroundColor: progressColor }}
          data-testid="budget-progress-bar"
        ></div>
      </div>

      <div className="budget-percentage">
        {budgetPercentUsed.toFixed(0)}% af budget brugt
      </div>
    </div>
  );
};

export default BudgetDisplay;
