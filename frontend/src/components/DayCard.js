import React, { useRef, useState } from 'react';
import './DayCard.css';

/**
 * DayCard - Reusable component for displaying a single day in the weekly calendar
 * Epic 5 Slice 3: Added context menu support for recipe management
 * 
 * @param {Object} props
 * @param {string} props.dayName - Name of the day (e.g., "Mandag")
 * @param {string} props.dayNameShort - Short name for mobile (e.g., "Man")
 * @param {string} props.date - Formatted date string (e.g., "5. mar")
 * @param {boolean} props.isToday - Whether this is the current day
 * @param {string} props.dataTestId - Test ID for the card
 * @param {Object|null} props.recipe - Assigned recipe { id, title, imageUrl, servings }
 * @param {Function} props.onContextMenu - Callback for context menu (position, recipe, dayDate)
 * @param {string} props.dayDate - ISO date string (YYYY-MM-DD) for the day
 */
function DayCard({ dayName, dayNameShort, date, isToday, dataTestId, recipe, onContextMenu, dayDate }) {
  const cardRef = useRef(null);
  const longPressTimer = useRef(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  /**
   * Handle right-click (desktop)
   */
  const handleContextMenu = (e) => {
    if (!recipe) return;
    
    e.preventDefault();
    
    const position = {
      x: e.clientX,
      y: e.clientY
    };
    
    onContextMenu && onContextMenu(position, recipe, dayDate);
  };

  /**
   * Handle touch start (mobile long-press)
   */
  const handleTouchStart = (e) => {
    if (!recipe) return;
    
    setIsLongPressing(true);
    
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      const position = {
        x: touch.clientX,
        y: touch.clientY
      };
      
      onContextMenu && onContextMenu(position, recipe, dayDate);
      setIsLongPressing(false);
    }, 500); // 500ms long-press
  };

  /**
   * Handle touch end/cancel
   */
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  return (
    <div 
      ref={cardRef}
      className={`day-card ${isToday ? 'day-card--today' : ''} ${recipe ? 'day-card--has-recipe' : ''} ${isLongPressing ? 'day-card--pressing' : ''}`}
      data-testid={dataTestId}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {isToday && (
        <div 
          className="day-card__today-badge" 
          data-testid="current-day-indicator"
        >
          I dag
        </div>
      )}
      
      <div className="day-card__header">
        <h3 className="day-card__day-name">
          <span className="day-card__day-name--full">{dayName}</span>
          <span className="day-card__day-name--short">{dayNameShort}</span>
        </h3>
        <p className="day-card__date">{date}</p>
      </div>

      <div className="day-card__content">
        {recipe ? (
          <div className="day-card__recipe">
            {recipe.imageUrl && (
              <img 
                src={recipe.imageUrl} 
                alt={recipe.title}
                className="day-card__recipe-image"
              />
            )}
            <h4 
              className="day-card__recipe-title"
              data-testid="day-card-recipe-title"
            >
              {recipe.title}
            </h4>
            <p className="day-card__recipe-servings">
              {recipe.servings} portioner
            </p>
          </div>
        ) : (
          <p className="day-card__empty-state">Ingen måltid planlagt</p>
        )}
      </div>
    </div>
  );
}

export default DayCard;
