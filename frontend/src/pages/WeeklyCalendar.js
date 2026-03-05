import React, { useState, useEffect } from 'react';
import DayCard from '../components/DayCard';
import RecipeContextMenu from '../components/RecipeContextMenu';
import PortionAdjustmentModal from '../components/PortionAdjustmentModal';
import RecipeMoveModal from '../components/RecipeMoveModal';
import WeeklySavingsSummary from '../components/WeeklySavingsSummary';
import { getWeeklyPlan, updateRecipe, removeRecipe, addRecipe } from '../services/mealPlanService';
import { calculateRecipeSavings, calculateWeeklySavings } from '../services/savingsService';
import { getRecipe } from '../services/recipeService';
import './WeeklyCalendar.css';

/**
 * WeeklyCalendar - Epic 5 Weekly Calendar with Recipe Management
 * 
 * Slice 2: Displays weekly calendar, loads assigned recipes
 * Slice 3: Context menu (right-click/long-press), adjust portions, move recipes, remove recipes
 * Slice 4: Tilbud savings calculator - shows savings badges and weekly total
 */
function WeeklyCalendar() {
  const [weekDays, setWeekDays] = useState([]);
  const [weeklySavings, setWeeklySavings] = useState(0);
  const [isCalculatingSavings, setIsCalculatingSavings] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    recipe: null,
    dayDate: null
  });

  // Portion adjustment modal state
  const [portionModal, setPortionModal] = useState({
    isOpen: false,
    recipe: null,
    currentServings: 4,
    dayDate: null
  });

  // Move modal state
  const [moveModal, setMoveModal] = useState({
    isOpen: false,
    recipe: null,
    currentDate: null
  });

  // Remove confirmation dialog state
  const [removeDialog, setRemoveDialog] = useState({
    isOpen: false,
    dayDate: null,
    dayName: null
  });

  useEffect(() => {
    loadWeeklyPlan();
  }, []);

  /**
   * Load weekly plan from localStorage and format for display
   * Epic 5 Slice 4: Also fetches full recipe data to calculate savings
   */
  const loadWeeklyPlan = async () => {
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

    // Map plan days to display format (synchronous part)
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
        dayDate: day.date, // ISO date string
        key: `day-${index}`,
        testId: `day-card-${dayNames[index].short.toLowerCase()}`
      };
    });

    setWeekDays(days);
    
    // Epic 5 Slice 4: Calculate savings asynchronously
    calculateAndSetSavings(plan, days);
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

  /**
   * Calculate savings for all recipes in the weekly plan
   * Epic 5 Slice 4: Fetches full recipe data and calculates tilbud matches
   * @param {Object} plan - Weekly plan object
   * @param {Array} days - Formatted days array
   */
  const calculateAndSetSavings = async (plan, days) => {
    setIsCalculatingSavings(true);
    
    try {
      // Fetch full recipe data for all days with recipes
      const daysWithRecipes = days.filter(day => day.recipe !== null);
      
      if (daysWithRecipes.length === 0) {
        setWeeklySavings(0);
        setIsCalculatingSavings(false);
        return;
      }
      
      // Fetch recipe details in parallel
      const recipePromises = daysWithRecipes.map(async (day) => {
        try {
          const fullRecipe = await getRecipe(day.recipe.id);
          const savings = await calculateRecipeSavings(fullRecipe);
          
          // Scale by servings
          const servings = day.recipe.servings || 4;
          const scaledSavings = savings.totalSavings * (servings / 4);
          
          return {
            dayDate: day.dayDate,
            savings: scaledSavings,
            matchedCount: savings.matchedProducts.length
          };
        } catch (error) {
          console.error(`Failed to calculate savings for recipe ${day.recipe.id}:`, error);
          return {
            dayDate: day.dayDate,
            savings: 0,
            matchedCount: 0
          };
        }
      });
      
      const allSavings = await Promise.all(recipePromises);
      
      // Update days with savings data
      const updatedDays = days.map(day => {
        const daySavings = allSavings.find(s => s.dayDate === day.dayDate);
        
        if (daySavings && day.recipe) {
          return {
            ...day,
            recipe: {
              ...day.recipe,
              savings: daySavings.savings,
              matchedCount: daySavings.matchedCount
            }
          };
        }
        
        return day;
      });
      
      setWeekDays(updatedDays);
      
      // Calculate total weekly savings
      const totalSavings = allSavings.reduce((sum, s) => sum + s.savings, 0);
      setWeeklySavings(totalSavings);
      
    } catch (error) {
      console.error('Failed to calculate weekly savings:', error);
      setWeeklySavings(0);
    } finally {
      setIsCalculatingSavings(false);
    }
  };

  /**
   * Handle context menu open (right-click or long-press)
   */
  const handleContextMenu = (position, recipe, dayDate) => {
    setContextMenu({
      isOpen: true,
      position,
      recipe,
      dayDate
    });
  };

  /**
   * Close context menu
   */
  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
      recipe: null,
      dayDate: null
    });
  };

  /**
   * Handle "Edit Portions" action
   */
  const handleEditPortions = () => {
    setPortionModal({
      isOpen: true,
      recipe: contextMenu.recipe,
      currentServings: contextMenu.recipe.servings,
      dayDate: contextMenu.dayDate
    });
  };

  /**
   * Save portion adjustment
   */
  const handleSavePortions = (newServings) => {
    try {
      updateRecipe(portionModal.dayDate, { servings: newServings });
      loadWeeklyPlan(); // Reload to reflect changes
      setPortionModal({ isOpen: false, recipe: null, currentServings: 4, dayDate: null });
    } catch (error) {
      console.error('Failed to update portions:', error);
      alert('Der opstod en fejl ved opdatering af portioner. Prøv igen.');
    }
  };

  /**
   * Handle "Move to Another Day" action
   */
  const handleMove = () => {
    setMoveModal({
      isOpen: true,
      recipe: contextMenu.recipe,
      currentDate: contextMenu.dayDate
    });
  };

  /**
   * Execute recipe move
   */
  const handleExecuteMove = (targetDate) => {
    try {
      const recipeToMove = moveModal.recipe;
      const sourceDate = moveModal.currentDate;

      // Remove from source day
      removeRecipe(sourceDate);

      // Add to target day (with same servings)
      addRecipe(targetDate, {
        id: recipeToMove.id,
        title: recipeToMove.title,
        imageUrl: recipeToMove.imageUrl,
        servings: recipeToMove.servings
      });

      loadWeeklyPlan(); // Reload to reflect changes
      setMoveModal({ isOpen: false, recipe: null, currentDate: null });
    } catch (error) {
      console.error('Failed to move recipe:', error);
      alert('Der opstod en fejl ved flytning af opskrift. Prøv igen.');
    }
  };

  /**
   * Handle "Remove from Plan" action
   */
  const handleRemoveClick = () => {
    // Find day name for confirmation dialog
    const day = weekDays.find(d => d.dayDate === contextMenu.dayDate);
    
    setRemoveDialog({
      isOpen: true,
      dayDate: contextMenu.dayDate,
      dayName: day ? day.dayName : 'denne dag'
    });
  };

  /**
   * Confirm recipe removal
   */
  const handleConfirmRemove = () => {
    try {
      removeRecipe(removeDialog.dayDate);
      loadWeeklyPlan(); // Reload to reflect changes
      setRemoveDialog({ isOpen: false, dayDate: null, dayName: null });
    } catch (error) {
      console.error('Failed to remove recipe:', error);
      alert('Der opstod en fejl ved fjernelse af opskrift. Prøv igen.');
    }
  };

  /**
   * Cancel recipe removal
   */
  const handleCancelRemove = () => {
    setRemoveDialog({ isOpen: false, dayDate: null, dayName: null });
  };

  return (
    <main className="weekly-calendar" data-testid="weekly-calendar">
      <div className="weekly-calendar__header">
        <h2 className="weekly-calendar__title">Ugeplan</h2>
        <p className="weekly-calendar__subtitle">
          Plan dine måltider for ugen
        </p>
      </div>

      {/* Epic 5 Slice 4: Weekly Savings Summary */}
      <WeeklySavingsSummary totalSavings={weeklySavings} />

      <div className="weekly-calendar__grid">
        {weekDays.map((day) => (
          <DayCard
            key={day.key}
            dayName={day.dayName}
            dayNameShort={day.dayNameShort}
            date={day.date}
            isToday={day.isToday}
            recipe={day.recipe}
            dayDate={day.dayDate}
            dataTestId={day.testId}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>

      {/* Context Menu */}
      <RecipeContextMenu
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        position={contextMenu.position}
        onEditPortions={handleEditPortions}
        onMove={handleMove}
        onRemove={handleRemoveClick}
      />

      {/* Portion Adjustment Modal */}
      <PortionAdjustmentModal
        isOpen={portionModal.isOpen}
        onClose={() => setPortionModal({ isOpen: false, recipe: null, currentServings: 4, dayDate: null })}
        onSave={handleSavePortions}
        recipe={portionModal.recipe}
        currentServings={portionModal.currentServings}
      />

      {/* Recipe Move Modal */}
      <RecipeMoveModal
        isOpen={moveModal.isOpen}
        onClose={() => setMoveModal({ isOpen: false, recipe: null, currentDate: null })}
        onMove={handleExecuteMove}
        recipe={moveModal.recipe}
        currentDate={moveModal.currentDate}
      />

      {/* Remove Confirmation Dialog */}
      {removeDialog.isOpen && (
        <div 
          className="remove-dialog-backdrop"
          onClick={handleCancelRemove}
          data-testid="remove-confirm-dialog"
        >
          <div 
            className="remove-dialog" 
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="remove-title" className="remove-dialog__title">
              Fjern opskrift fra plan?
            </h3>
            <p className="remove-dialog__message">
              Er du sikker på, at du vil fjerne opskriften fra {removeDialog.dayName}?
            </p>
            <div className="remove-dialog__actions">
              <button
                className="remove-dialog__button remove-dialog__button--cancel"
                onClick={handleCancelRemove}
              >
                Annuller
              </button>
              <button
                className="remove-dialog__button remove-dialog__button--confirm"
                onClick={handleConfirmRemove}
              >
                Fjern
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default WeeklyCalendar;
