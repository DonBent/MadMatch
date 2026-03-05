import React, { useState } from 'react';
import './PortionAdjustmentModal.css';

/**
 * PortionAdjustmentModal - Epic 5 Slice 3: Portion Adjustment Modal
 * 
 * Modal for adjusting recipe servings (2-8 portions).
 * Shows ingredient multiplier calculation.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onSave - Callback when save is clicked (newServings)
 * @param {Object} props.recipe - Recipe object { title, servings }
 * @param {number} props.currentServings - Current serving count
 */
function PortionAdjustmentModal({ isOpen, onClose, onSave, recipe, currentServings = 4 }) {
  const [servings, setServings] = useState(currentServings);

  // Reset servings when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setServings(currentServings);
    }
  }, [isOpen, currentServings]);

  const handleSave = () => {
    onSave(servings);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  // Calculate multiplier
  const multiplier = (servings / 4).toFixed(1);
  const showMultiplier = servings !== 4;

  return (
    <div
      className="portion-modal-backdrop"
      onClick={handleBackdropClick}
      data-testid="portion-adjustment-modal"
    >
      <div className="portion-modal" role="dialog" aria-modal="true" aria-labelledby="portion-modal-title">
        <div className="portion-modal__header">
          <h2 id="portion-modal-title" className="portion-modal__title">
            Rediger portioner
          </h2>
          <button
            className="portion-modal__close"
            onClick={onClose}
            aria-label="Luk"
          >
            ✕
          </button>
        </div>

        <div className="portion-modal__content">
          {recipe && (
            <p className="portion-modal__recipe-name">{recipe.title}</p>
          )}

          <div className="portion-modal__slider-container">
            <label className="portion-modal__label" htmlFor="servings-slider">
              Antal portioner
            </label>
            
            <div className="portion-modal__value-display">
              <span className="portion-modal__value">{servings}</span>
              <span className="portion-modal__value-label">portioner</span>
            </div>

            <input
              id="servings-slider"
              type="range"
              min="2"
              max="8"
              step="1"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value, 10))}
              className="portion-modal__slider"
              data-testid="portion-slider"
            />

            <div className="portion-modal__range-labels">
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
              <span>7</span>
              <span>8</span>
            </div>
          </div>

          {showMultiplier && (
            <div className="portion-modal__multiplier">
              <span className="portion-modal__multiplier-icon">📊</span>
              <span className="portion-modal__multiplier-text">
                Ingredienser ganges med {multiplier}x
              </span>
            </div>
          )}
        </div>

        <div className="portion-modal__actions">
          <button
            className="portion-modal__button portion-modal__button--cancel"
            onClick={onClose}
          >
            Annuller
          </button>
          <button
            className="portion-modal__button portion-modal__button--save"
            onClick={handleSave}
          >
            Gem
          </button>
        </div>
      </div>
    </div>
  );
}

export default PortionAdjustmentModal;
