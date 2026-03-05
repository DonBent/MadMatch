import React from 'react';
import { useNavigate } from 'react-router-dom';
import './EmptyState.css';

/**
 * EmptyState - Epic 5 Slice 6: Enhanced empty state for weekly calendar
 * 
 * @param {Object} props
 * @param {Function} props.onAddRecipe - Callback when CTA is clicked (optional)
 */
function EmptyState({ onAddRecipe }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onAddRecipe) {
      onAddRecipe();
    } else {
      navigate('/recipes');
    }
  };

  return (
    <div className="empty-state" data-testid="empty-state">
      <div className="empty-state__illustration" aria-hidden="true">
        🍽️
      </div>
      <h3 className="empty-state__title">
        Planlæg din uge
      </h3>
      <p className="empty-state__description">
        Tilføj opskrifter fra vores samling og spar penge på tilbud
      </p>
      <button
        className="empty-state__cta"
        onClick={handleClick}
        data-testid="empty-state-cta"
        aria-label="Find opskrifter"
      >
        Find opskrifter
      </button>
    </div>
  );
}

export default EmptyState;
