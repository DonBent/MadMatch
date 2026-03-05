import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSwipeable } from 'react-swipeable';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import DayCard from '../components/DayCard';
import RecipeContextMenu from '../components/RecipeContextMenu';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import WeeklySavingsSummary from '../components/WeeklySavingsSummary';
import ErrorBoundary from '../components/ErrorBoundary';
import { getWeeklyPlan, updateRecipe, removeRecipe, addRecipe } from '../services/mealPlanService';
import { calculateRecipeSavings } from '../services/savingsService';
import { generateShoppingList } from '../services/shoppingListService';
import { getRecipe } from '../services/recipeService';
import './WeeklyCalendar.css';

// Lazy load modals for better performance (Epic 5 Slice 6)
const PortionAdjustmentModal = lazy(() => import('../components/PortionAdjustmentModal'));
const RecipeMoveModal = lazy(() => import('../components/RecipeMoveModal'));
const ShoppingListModal = lazy(() => import('../components/ShoppingListModal'));

/**
 * WeeklyCalendar - Epic 5 Weekly Calendar with Recipe Management
 * 
 * Slice 2: Displays weekly calendar, loads assigned recipes
 * Slice 3: Context menu (right-click/long-press), adjust portions, move recipes, remove recipes
 * Slice 4: Tilbud savings calculator - shows savings badges and weekly total
 * Slice 5: Shopping list generation - aggregate ingredients from planned recipes
 * Slice 6: Polish - Drag-and-drop, swipe gestures, accessibility, performance
 */
function WeeklyCalendar() {
  const [weekDays, setWeekDays] = useState([]);
  const [weeklySavings, setWeeklySavings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => {
    // Initialize to current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  
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

  // Shopping list modal state (Epic 5 Slice 5)
  const [shoppingListModal, setShoppingListModal] = useState({
    isOpen: false,
    shoppingList: null,
    isLoading: false
  });

  // Drag-and-drop state (Epic 5 Slice 6)
  const [activeDragRecipe, setActiveDragRecipe] = useState(null);

  // Screen reader announcements (Epic 5 Slice 6)
  const [announcement, setAnnouncement] = useState('');

  // Configure drag sensors (desktop only)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance to activate
      },
    })
  );

  /**
   * Memoized day names (Epic 5 Slice 6: Performance)
   */
  const dayNames = useMemo(() => [
    { full: 'Mandag', short: 'Man' },
    { full: 'Tirsdag', short: 'Tir' },
    { full: 'Onsdag', short: 'Ons' },
    { full: 'Torsdag', short: 'Tor' },
    { full: 'Fredag', short: 'Fre' },
    { full: 'Lørdag', short: 'Lør' },
    { full: 'Søndag', short: 'Søn' }
  ], []);

  useEffect(() => {
    loadWeeklyPlan();
  }, [weekStart]);

  /**
   * Keyboard shortcuts (Epic 5 Slice 6: Accessibility)
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          handleNextWeek();
          break;
        case 'p':
          handlePreviousWeek();
          break;
        case 's':
          if (!shoppingListModal.isOpen && hasRecipesInPlan) {
            handleGenerateShoppingList();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shoppingListModal.isOpen, weekDays]);

  /**
   * Load weekly plan from localStorage and format for display
   * Epic 5 Slice 4: Also fetches full recipe data to calculate savings
   * Epic 5 Slice 6: Added loading state
   */
  const loadWeeklyPlan = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const plan = getWeeklyPlan(weekStart);
      
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
      await calculateAndSetSavings(plan, days);
    } catch (error) {
      console.error('Failed to load weekly plan:', error);
    } finally {
      setIsLoading(false);
    }
  }, [weekStart, dayNames]);

  /**
   * Format date as "5. mar" (Danish format)
   * @param {Date} date 
   * @returns {string}
   */
  const formatDate = useCallback((date) => {
    const monthNames = [
      'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
      'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
    ];
    
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    
    return `${day}. ${month}`;
  }, []);

  /**
   * Calculate savings for all recipes in the weekly plan
   * Epic 5 Slice 4: Fetches full recipe data and calculates tilbud matches
   * @param {Object} plan - Weekly plan object
   * @param {Array} days - Formatted days array
   */
  const calculateAndSetSavings = async (plan, days) => {
    try {
      // Fetch full recipe data for all days with recipes
      const daysWithRecipes = days.filter(day => day.recipe !== null);
      
      if (daysWithRecipes.length === 0) {
        setWeeklySavings(0);
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
    }
  };

  /**
   * Navigate to previous week (Epic 5 Slice 6)
   */
  const handlePreviousWeek = useCallback(() => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newWeekStart);
    announce('Forrige uge');
  }, [weekStart]);

  /**
   * Navigate to next week (Epic 5 Slice 6)
   */
  const handleNextWeek = useCallback(() => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newWeekStart);
    announce('Næste uge');
  }, [weekStart]);

  /**
   * Announce to screen readers (Epic 5 Slice 6: Accessibility)
   */
  const announce = useCallback((message) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  /**
   * Swipe handlers for mobile (Epic 5 Slice 6)
   */
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      handleNextWeek();
    },
    onSwipedRight: () => {
      handlePreviousWeek();
    },
    preventScrollOnSwipe: false,
    trackMouse: false, // Only touch, not mouse
    delta: 50, // Minimum swipe distance
  });

  /**
   * Handle drag start (Epic 5 Slice 6: Drag-and-drop)
   */
  const handleDragStart = (event) => {
    const { active } = event;
    const draggedDay = weekDays.find(day => day.dayDate === active.id);
    
    if (draggedDay && draggedDay.recipe) {
      setActiveDragRecipe(draggedDay.recipe);
    }
  };

  /**
   * Handle drag end (Epic 5 Slice 6: Drag-and-drop)
   */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    setActiveDragRecipe(null);
    
    if (!over || active.id === over.id) {
      return;
    }

    const sourceDate = active.id;
    const targetDate = over.id;
    
    const sourceDay = weekDays.find(day => day.dayDate === sourceDate);
    
    if (!sourceDay || !sourceDay.recipe) {
      return;
    }

    try {
      const recipeToMove = sourceDay.recipe;

      // Remove from source day
      removeRecipe(sourceDate);

      // Add to target day (with same servings)
      addRecipe(targetDate, {
        id: recipeToMove.id,
        title: recipeToMove.title,
        imageUrl: recipeToMove.imageUrl,
        servings: recipeToMove.servings
      });

      loadWeeklyPlan();
      
      const targetDay = weekDays.find(day => day.dayDate === targetDate);
      announce(`Opskrift flyttet til ${targetDay?.dayName || 'ny dag'}`);
    } catch (error) {
      console.error('Failed to move recipe via drag-and-drop:', error);
      announce('Fejl ved flytning af opskrift');
    }
  };

  /**
   * Handle context menu open (right-click or long-press)
   */
  const handleContextMenu = useCallback((position, recipe, dayDate) => {
    setContextMenu({
      isOpen: true,
      position,
      recipe,
      dayDate
    });
  }, []);

  /**
   * Close context menu
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
      recipe: null,
      dayDate: null
    });
  }, []);

  /**
   * Handle "Edit Portions" action
   */
  const handleEditPortions = useCallback(() => {
    setPortionModal({
      isOpen: true,
      recipe: contextMenu.recipe,
      currentServings: contextMenu.recipe.servings,
      dayDate: contextMenu.dayDate
    });
  }, [contextMenu]);

  /**
   * Save portion adjustment
   */
  const handleSavePortions = useCallback((newServings) => {
    try {
      updateRecipe(portionModal.dayDate, { servings: newServings });
      loadWeeklyPlan();
      setPortionModal({ isOpen: false, recipe: null, currentServings: 4, dayDate: null });
      announce('Portioner opdateret');
    } catch (error) {
      console.error('Failed to update portions:', error);
      alert('Der opstod en fejl ved opdatering af portioner. Prøv igen.');
    }
  }, [portionModal.dayDate, loadWeeklyPlan]);

  /**
   * Handle "Move to Another Day" action
   */
  const handleMove = useCallback(() => {
    setMoveModal({
      isOpen: true,
      recipe: contextMenu.recipe,
      currentDate: contextMenu.dayDate
    });
  }, [contextMenu]);

  /**
   * Execute recipe move
   */
  const handleExecuteMove = useCallback((targetDate) => {
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

      loadWeeklyPlan();
      setMoveModal({ isOpen: false, recipe: null, currentDate: null });
      
      const targetDay = weekDays.find(day => day.dayDate === targetDate);
      announce(`Opskrift flyttet til ${targetDay?.dayName || 'ny dag'}`);
    } catch (error) {
      console.error('Failed to move recipe:', error);
      alert('Der opstod en fejl ved flytning af opskrift. Prøv igen.');
    }
  }, [moveModal, weekDays, loadWeeklyPlan]);

  /**
   * Handle "Remove from Plan" action
   */
  const handleRemoveClick = useCallback(() => {
    // Find day name for confirmation dialog
    const day = weekDays.find(d => d.dayDate === contextMenu.dayDate);
    
    setRemoveDialog({
      isOpen: true,
      dayDate: contextMenu.dayDate,
      dayName: day ? day.dayName : 'denne dag'
    });
  }, [contextMenu.dayDate, weekDays]);

  /**
   * Confirm recipe removal
   */
  const handleConfirmRemove = useCallback(() => {
    try {
      removeRecipe(removeDialog.dayDate);
      loadWeeklyPlan();
      setRemoveDialog({ isOpen: false, dayDate: null, dayName: null });
      announce('Opskrift fjernet fra plan');
    } catch (error) {
      console.error('Failed to remove recipe:', error);
      alert('Der opstod en fejl ved fjernelse af opskrift. Prøv igen.');
    }
  }, [removeDialog.dayDate, loadWeeklyPlan]);

  /**
   * Cancel recipe removal
   */
  const handleCancelRemove = useCallback(() => {
    setRemoveDialog({ isOpen: false, dayDate: null, dayName: null });
  }, []);

  /**
   * Handle "Generate Shopping List" button click (Epic 5 Slice 5)
   */
  const handleGenerateShoppingList = useCallback(async () => {
    try {
      setShoppingListModal({
        isOpen: true,
        shoppingList: null,
        isLoading: true
      });

      const plan = getWeeklyPlan(weekStart);
      const shoppingList = await generateShoppingList(plan);

      setShoppingListModal({
        isOpen: true,
        shoppingList,
        isLoading: false
      });
      
      announce('Indkøbsliste genereret');
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
      alert('Der opstod en fejl ved generering af indkøbsliste. Prøv igen.');
      setShoppingListModal({
        isOpen: false,
        shoppingList: null,
        isLoading: false
      });
    }
  }, [weekStart]);

  /**
   * Close shopping list modal (Epic 5 Slice 5)
   */
  const handleCloseShoppingList = useCallback(() => {
    setShoppingListModal({
      isOpen: false,
      shoppingList: null,
      isLoading: false
    });
  }, []);

  /**
   * Check if weekly plan has any recipes assigned (Epic 5 Slice 5)
   */
  const hasRecipesInPlan = useMemo(
    () => weekDays.some(day => day.recipe !== null),
    [weekDays]
  );

  /**
   * Format week range for display (Epic 5 Slice 6)
   */
  const weekRange = useMemo(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  }, [weekStart, formatDate]);

  // Detect if on desktop (for drag-and-drop)
  const isDesktop = window.innerWidth >= 768;

  return (
    <ErrorBoundary>
      <main className="weekly-calendar" data-testid="weekly-calendar" {...swipeHandlers}>
        {/* Screen reader announcements */}
        <div 
          className="sr-only" 
          role="status" 
          aria-live="polite" 
          aria-atomic="true"
        >
          {announcement}
        </div>

        <div className="weekly-calendar__header">
          <h2 className="weekly-calendar__title">Ugeplan</h2>
          <p className="weekly-calendar__subtitle">
            {weekRange}
          </p>
        </div>

        {/* Week Navigation (Epic 5 Slice 6) */}
        <div className="weekly-calendar__nav">
          <button
            className="weekly-calendar__nav-button"
            onClick={handlePreviousWeek}
            data-testid="week-nav-previous"
            aria-label="Forrige uge (tast P)"
          >
            <span aria-hidden="true">←</span> Forrige uge
          </button>
          <button
            className="weekly-calendar__nav-button"
            onClick={handleNextWeek}
            data-testid="week-nav-next"
            aria-label="Næste uge (tast N)"
          >
            Næste uge <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* Epic 5 Slice 4: Weekly Savings Summary */}
        <WeeklySavingsSummary totalSavings={weeklySavings} />

        {/* Epic 5 Slice 5: Generate Shopping List Button */}
        <div className="weekly-calendar__shopping-list-section">
          <button
            className="weekly-calendar__shopping-list-button"
            onClick={handleGenerateShoppingList}
            disabled={!hasRecipesInPlan || shoppingListModal.isLoading}
            data-testid="generate-shopping-list-button"
            aria-label="Generer indkøbsliste (tast S)"
          >
            {shoppingListModal.isLoading ? (
              <>
                <span className="shopping-list-button__spinner">⏳</span>
                Genererer indkøbsliste...
              </>
            ) : (
              <>
                <span className="shopping-list-button__icon">📋</span>
                Generer indkøbsliste
              </>
            )}
          </button>
        </div>

        {/* Loading State (Epic 5 Slice 6) */}
        {isLoading ? (
          <div className="weekly-calendar__grid">
            {Array.from({ length: 7 }).map((_, index) => (
              <LoadingSkeleton key={index} type="day-card" />
            ))}
          </div>
        ) : !hasRecipesInPlan ? (
          /* Empty State (Epic 5 Slice 6) */
          <EmptyState />
        ) : (
          /* Weekly Calendar Grid with Drag-and-Drop (Epic 5 Slice 6) */
          <DndContext
            sensors={isDesktop ? sensors : []}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
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
                  isDraggable={isDesktop && day.recipe !== null}
                  isDroppable={isDesktop}
                />
              ))}
            </div>

            {/* Drag Overlay (Epic 5 Slice 6) */}
            <DragOverlay>
              {activeDragRecipe ? (
                <div className="drag-preview">
                  {activeDragRecipe.imageUrl && (
                    <img 
                      src={activeDragRecipe.imageUrl} 
                      alt={activeDragRecipe.title}
                      className="drag-preview__image"
                    />
                  )}
                  <span className="drag-preview__title">
                    {activeDragRecipe.title}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Context Menu */}
        <RecipeContextMenu
          isOpen={contextMenu.isOpen}
          onClose={closeContextMenu}
          position={contextMenu.position}
          onEditPortions={handleEditPortions}
          onMove={handleMove}
          onRemove={handleRemoveClick}
        />

        {/* Lazy-loaded Modals with Suspense (Epic 5 Slice 6) */}
        <Suspense fallback={null}>
          {/* Portion Adjustment Modal */}
          {portionModal.isOpen && (
            <PortionAdjustmentModal
              isOpen={portionModal.isOpen}
              onClose={() => setPortionModal({ isOpen: false, recipe: null, currentServings: 4, dayDate: null })}
              onSave={handleSavePortions}
              recipe={portionModal.recipe}
              currentServings={portionModal.currentServings}
            />
          )}

          {/* Recipe Move Modal */}
          {moveModal.isOpen && (
            <RecipeMoveModal
              isOpen={moveModal.isOpen}
              onClose={() => setMoveModal({ isOpen: false, recipe: null, currentDate: null })}
              onMove={handleExecuteMove}
              recipe={moveModal.recipe}
              currentDate={moveModal.currentDate}
            />
          )}

          {/* Shopping List Modal */}
          {shoppingListModal.isOpen && (
            <ShoppingListModal
              isOpen={shoppingListModal.isOpen}
              onClose={handleCloseShoppingList}
              shoppingList={shoppingListModal.shoppingList}
            />
          )}
        </Suspense>

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
                  aria-label="Annuller"
                >
                  Annuller
                </button>
                <button
                  className="remove-dialog__button remove-dialog__button--confirm"
                  onClick={handleConfirmRemove}
                  aria-label="Fjern opskrift"
                >
                  Fjern
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
}

export default WeeklyCalendar;
