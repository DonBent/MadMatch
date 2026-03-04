import React, { useState, useEffect } from 'react';
import DayCard from '../components/DayCard';
import './WeeklyCalendar.css';

/**
 * WeeklyCalendar - Epic 5 Slice 1: Basic Weekly Calendar View
 * 
 * Displays a static weekly calendar (Monday-Sunday) for the current week.
 * No recipe assignment or persistence in this slice - foundation only.
 */
function WeeklyCalendar() {
  const [weekDays, setWeekDays] = useState([]);

  useEffect(() => {
    /**
     * Generate current week dates (Monday to Sunday)
     * @returns {Array} Array of day objects with name, date, and isToday flag
     */
    const generateCurrentWeek = () => {
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
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Calculate Monday of current week
      // If today is Sunday (0), we need to go back 6 days; otherwise (currentDay - 1)
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      monday.setHours(0, 0, 0, 0);

      // Build array of 7 days starting from Monday
      const week = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        
        // Check if this date is today
        const isToday = 
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear();

        week.push({
          dayName: dayNames[i].full,
          dayNameShort: dayNames[i].short,
          date: formatDate(date),
          isToday,
          key: `day-${i}`,
          testId: `day-card-${dayNames[i].short.toLowerCase()}`
        });
      }

      return week;
    };

    const days = generateCurrentWeek();
    setWeekDays(days);
  }, []);

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
            dataTestId={day.testId}
          />
        ))}
      </div>
    </main>
  );
}

export default WeeklyCalendar;
