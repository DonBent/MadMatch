/**
 * SavingsBadge - Epic 5 Slice 4: Display savings for a recipe with tilbud matches
 * 
 * Shows a green badge with the savings amount (e.g., "↓ 23 kr")
 * Only displays if savings > 0
 */

import React from 'react';
import './SavingsBadge.css';

/**
 * @param {Object} props
 * @param {number} props.savings - Total savings amount in kr
 * @param {number} props.matchCount - Number of matched ingredients (optional, for tooltip)
 */
function SavingsBadge({ savings, matchCount }) {
  // Don't render if no savings
  if (!savings || savings <= 0) {
    return null;
  }
  
  const formattedSavings = Math.round(savings);
  const tooltipText = matchCount 
    ? `${matchCount} ingrediens${matchCount > 1 ? 'er' : ''} på tilbud`
    : 'Tilbud fundet';
  
  return (
    <div 
      className="savings-badge"
      data-testid="savings-badge"
      title={tooltipText}
      role="status"
      aria-label={`Spar ${formattedSavings} kroner`}
    >
      <span className="savings-badge__icon" aria-hidden="true">↓</span>
      <span 
        className="savings-badge__amount"
        data-testid="savings-amount"
      >
        {formattedSavings} kr
      </span>
    </div>
  );
}

export default SavingsBadge;
