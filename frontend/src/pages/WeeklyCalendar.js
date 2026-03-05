import React, { useState, useEffect } from 'react';
import DayCard from '../components/DayCard';
import { getWeeklyPlan } from '../services/mealPlanService';
import './WeeklyCalendar.css';

/**
 * WeeklyCalendar - Epic 5 Slice 2: Weekly Calendar with Recipe Assignment
 * 
 * Displays a weekly calendar (Monday-Sunday) for the current week.
 * Loads and displays assigned recipes from localStorage.
 */
function WeeklyCalendar() {
  const [weekDays, setWeekDays] = useState([]);

  useEffect(() => {
    loadWeeklyPlan();
  }, []);

  /**
   * Load weekly plan from localStorage and format for display
   */
  const loadWeeklyPlan = () => {
    const plan = getWeeklyPlan();
    
    const dayNames = [
      { full: 'Mandag', short: 'Man' },
      { full: 'Tirsdag', short: 'Tir' },
      { full: 'Onsdag', short: 'Ons' },
      { full: 'Torsdag', short: 'Tor' },
      { full: 'Fredag', short: 'Fre' },
      { full: 'Lørdag', short: 'Lør' },
      { full: 'Søndag', short: 'Søn' }
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Map plan days to display format
    const days = plan.days.map((day, index) => {
      const date = new Date(day.date);
      
      const isToday = 
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      return {
        dayName: dayNames[index].full,
        dayNameShort: dayNames[index].short,
        date: formatDate(date),
        isToday,
        recipe: day.recipe, // Can be null or { id, title, imageUrl, servings }
        key: `day-${index}`,
        testId: `day-card-${dayNames[index].short.toLowerCase()}`
      };
    });

    setWeekDays(days);
  };

  /**
   * Format date as "5. mar" (Danish format)
   * @param {Date} date 
   * @returns {string}
   */
  const formatDate = (date) => {
    const monthNames = [
      'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
      'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
    ];
    
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    
    return `${day}. ${month}`;
  };

  return (
    <main className="weekly-calendar" data-testid="weekly-calendar">
      <div className="weekly-calendar__header">
        <h2 className="weekly-calendar__title">Ugeplan</h2>
        <p className="weekly-calendar__subtitle">
          Plan dine måltider for ugen
        </p>
      </div>

      <div className="weekly-calendar__grid">
        {weekDays.map((day) => (
          <DayCard
            key={day.key}
            dayName={day.dayName}
            dayNameShort={day.dayNameShort}
            date={day.date}
            isToday={day.isToday}
            recipe={day.recipe}
            dataTestId={day.testId}
          />
        ))}
      </div>
    </main>
  );
}

export default WeeklyCalendar;
