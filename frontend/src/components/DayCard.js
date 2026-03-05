import React from 'react';
import './DayCard.css';

/**
 * DayCard - Reusable component for displaying a single day in the weekly calendar
 * 
 * @param {Object} props
 * @param {string} props.dayName - Name of the day (e.g., "Mandag")
 * @param {string} props.dayNameShort - Short name for mobile (e.g., "Man")
 * @param {string} props.date - Formatted date string (e.g., "5. mar")
 * @param {boolean} props.isToday - Whether this is the current day
 * @param {string} props.dataTestId - Test ID for the card
 * @param {Object|null} props.recipe - Assigned recipe { id, title, imageUrl, servings }
 */
function DayCard({ dayName, dayNameShort, date, isToday, dataTestId, recipe }) {
  return (
    <div 
      className={`day-card ${isToday ? 'day-card--today' : ''} ${recipe ? 'day-card--has-recipe' : ''}`}
      data-testid={dataTestId}
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
