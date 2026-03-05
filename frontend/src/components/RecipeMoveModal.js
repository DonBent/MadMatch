import React, { useState, useEffect } from 'react';
import { getWeeklyPlan } from '../services/mealPlanService';
import './RecipeMoveModal.css';

/**
 * RecipeMoveModal - Epic 5 Slice 3: Recipe Move Modal
 * 
 * Modal for moving a recipe to another day.
 * Shows 7 day cards (Mon-Sun) for the current week.
 * Grays out current day and shows "Erstat?" for occupied days.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onMove - Callback when day is selected (targetDate)
 * @param {Object} props.recipe - Recipe being moved { title, imageUrl }
 * @param {string} props.currentDate - Current date (YYYY-MM-DD) - will be grayed out
 */
function RecipeMoveModal({ isOpen, onClose, onMove, recipe, currentDate }) {
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
      
      const isCurrent = day.date === currentDate;
      const isOccupied = day.recipe !== null && !isCurrent;
      
      return {
        date: day.date,
        dayName: day.dayName,
        displayDate: formatDisplayDate(date),
        hasRecipe: day.recipe !== null,
        isToday,
        isCurrent,
        isOccupied,
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
    // Can't move to current day
    if (day.isCurrent) {
      return;
    }

    if (day.isOccupied) {
      // Show confirmation dialog for replacement
      setSelectedDay(day);
      setShowConfirmDialog(true);
    } else {
      // Move directly to empty day
      onMove(day.date);
      handleClose();
    }
  };

  const handleConfirmReplace = () => {
    if (selectedDay) {
      onMove(selectedDay.date);
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
      className="move-modal-backdrop" 
      onClick={handleBackdropClick}
      data-testid="recipe-move-modal"
    >
      <div className="move-modal" role="dialog" aria-modal="true" aria-labelledby="move-modal-title">
        <div className="move-modal__header">
          <h2 id="move-modal-title" className="move-modal__title">
            Flyt til anden dag
          </h2>
          <button
            className="move-modal__close"
            onClick={handleClose}
            aria-label="Luk"
          >
            ✕
          </button>
        </div>

        {recipe && (
          <div className="move-modal__recipe-preview">
            {recipe.imageUrl && (
              <img 
                src={recipe.imageUrl} 
                alt={recipe.title}
                className="move-modal__recipe-image"
              />
            )}
            <p className="move-modal__recipe-title">{recipe.title}</p>
          </div>
        )}

        <div className="move-modal__days-grid">
          {weekDays.map((day) => (
            <button
              key={day.date}
              className={`move-day-card ${day.isToday ? 'move-day-card--today' : ''} ${day.isCurrent ? 'move-day-card--current' : ''} ${day.isOccupied ? 'move-day-card--occupied' : ''}`}
              onClick={() => handleDayClick(day)}
              disabled={day.isCurrent}
              data-testid={`move-day-${day.testId}`}
            >
              {day.isToday && (
                <span className="move-day-card__badge">I dag</span>
              )}
              
              <div className="move-day-card__name">{day.dayName}</div>
              <div className="move-day-card__date">{day.displayDate}</div>
              
              {day.isCurrent && (
                <div className="move-day-card__status move-day-card__status--current">
                  <span className="move-day-card__status-text">Nuværende</span>
                </div>
              )}
              
              {day.isOccupied && (
                <div className="move-day-card__status">
                  <span className="move-day-card__status-text">Erstat?</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Confirmation Dialog for Replacement */}
        {showConfirmDialog && (
          <div 
            className="confirm-dialog-backdrop"
            onClick={handleCancelReplace}
            data-testid="move-confirm-dialog"
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

export default RecipeMoveModal;
