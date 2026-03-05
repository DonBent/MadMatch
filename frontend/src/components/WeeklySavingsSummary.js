/**
 * WeeklySavingsSummary - Epic 5 Slice 4: Display total weekly savings
 * 
 * Shows total savings across all 7 days (e.g., "Spar 94 kr denne uge")
 * Positioned above the weekly calendar grid
 */

import React from 'react';
import './WeeklySavingsSummary.css';

/**
 * @param {Object} props
 * @param {number} props.totalSavings - Total weekly savings in kr
 */
function WeeklySavingsSummary({ totalSavings }) {
  // Don't render if no savings
  if (!totalSavings || totalSavings <= 0) {
    return null;
  }
  
  const formattedSavings = Math.round(totalSavings);
  
  return (
    <div 
      className="weekly-savings-summary"
      data-testid="weekly-savings-summary"
      role="status"
      aria-live="polite"
    >
      <div className="weekly-savings-summary__content">
        <span className="weekly-savings-summary__icon" aria-hidden="true">
          💰
        </span>
        <h3 className="weekly-savings-summary__text">
          Spar{' '}
          <span 
            className="weekly-savings-summary__amount"
            data-testid="weekly-savings-total"
          >
            {formattedSavings} kr
          </span>
          {' '}denne uge
        </h3>
      </div>
      <p className="weekly-savings-summary__description">
        Ved at vælge opskrifter med ingredienser på tilbud
      </p>
    </div>
  );
}

export default WeeklySavingsSummary;
