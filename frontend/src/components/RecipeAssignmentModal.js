import React, { useState, useEffect } from 'react';
import { getWeeklyPlan } from '../services/mealPlanService';
import './RecipeAssignmentModal.css';

/**
 * RecipeAssignmentModal - Epic 5 Slice 2: Recipe Assignment Modal
 * 
 * Modal dialog for assigning a recipe to a day in the weekly calendar.
 * Shows 7 day cards (Mon-Sun) for the current week.
 * Handles duplicate assignment with confirmation dialog.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onDaySelect - Callback when day is selected (dayDate, hasExisting)
 * @param {Object} props.recipe - Recipe being assigned { id, title, imageUrl }
 */
function RecipeAssignmentModal({ isOpen, onClose, onDaySelect, recipe }) {
  const [weekDays, setWeekDays] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadWeekDays();
      
      // Close on Escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const loadWeekDays = () => {
    const plan = getWeeklyPlan();
    
    // Map days to include display info
    const days = plan.days.map((day, index) => {
      const date = new Date(day.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isToday = 
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      
      return {
        date: day.date,
        dayName: day.dayName,
        displayDate: formatDisplayDate(date),
        hasRecipe: day.recipe !== null,
        isToday,
        testId: getDayTestId(day.dayName)
      };
    });
    
    setWeekDays(days);
  };

  const formatDisplayDate = (date) => {
    const monthNames = [
      'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
      'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
    ];
    
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    
    return `${day}. ${month}`;
  };

  const getDayTestId = (dayName) => {
    const mapping = {
      'Mandag': 'monday',
      'Tirsdag': 'tuesday',
      'Onsdag': 'wednesday',
      'Torsdag': 'thursday',
      'Fredag': 'friday',
      'Lørdag': 'saturday',
      'Søndag': 'sunday'
    };
    
    return mapping[dayName] || dayName.toLowerCase();
  };

  const handleDayClick = (day) => {
    if (day.hasRecipe) {
      // Show confirmation dialog for replacement
      setSelectedDay(day);
      setShowConfirmDialog(true);
    } else {
      // Assign directly to empty day
      onDaySelect(day.date, false);
      handleClose();
    }
  };

  const handleConfirmReplace = () => {
    if (selectedDay) {
      onDaySelect(selectedDay.date, true);
      setShowConfirmDialog(false);
      setSelectedDay(null);
      handleClose();
    }
  };

  const handleCancelReplace = () => {
    setShowConfirmDialog(false);
    setSelectedDay(null);
  };

  const handleClose = () => {
    setShowConfirmDialog(false);
    setSelectedDay(null);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="assignment-modal-backdrop" 
      onClick={handleBackdropClick}
      data-testid="assignment-modal"
    >
      <div className="assignment-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="assignment-modal__header">
          <h2 id="modal-title" className="assignment-modal__title">
            Vælg dag for opskrift
          </h2>
          <button
            className="assignment-modal__close"
            onClick={handleClose}
            aria-label="Luk"
          >
            ✕
          </button>
        </div>

        {recipe && (
          <div className="assignment-modal__recipe-preview">
            {recipe.imageUrl && (
              <img 
                src={recipe.imageUrl} 
                alt={recipe.title}
                className="assignment-modal__recipe-image"
              />
            )}
            <p className="assignment-modal__recipe-title">{recipe.title}</p>
          </div>
        )}

        <div className="assignment-modal__days-grid">
          {weekDays.map((day) => (
            <button
              key={day.date}
              className={`assignment-day-card ${day.isToday ? 'assignment-day-card--today' : ''} ${day.hasRecipe ? 'assignment-day-card--occupied' : ''}`}
              onClick={() => handleDayClick(day)}
              data-testid={`assignment-day-${day.testId}`}
            >
              {day.isToday && (
                <span className="assignment-day-card__badge">I dag</span>
              )}
              
              <div className="assignment-day-card__name">{day.dayName}</div>
              <div className="assignment-day-card__date">{day.displayDate}</div>
              
              {day.hasRecipe && (
                <div className="assignment-day-card__status">
                  <span className="assignment-day-card__status-icon">✓</span>
                  <span className="assignment-day-card__status-text">Optaget</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Confirmation Dialog for Duplicate Assignment */}
        {showConfirmDialog && (
          <div 
            className="confirm-dialog-backdrop"
            onClick={handleCancelReplace}
            data-testid="duplicate-confirm-dialog"
          >
            <div 
              className="confirm-dialog" 
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="confirm-title" className="confirm-dialog__title">
                Erstat eksisterende opskrift?
              </h3>
              <p className="confirm-dialog__message">
                Der er allerede en opskrift planlagt for {selectedDay?.dayName}.
                Vil du erstatte den?
              </p>
              <div className="confirm-dialog__actions">
                <button
                  className="confirm-dialog__button confirm-dialog__button--cancel"
                  onClick={handleCancelReplace}
                >
                  Annuller
                </button>
                <button
                  className="confirm-dialog__button confirm-dialog__button--confirm"
                  onClick={handleConfirmReplace}
                >
                  Erstat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeAssignmentModal;
