/**
 * mealPlanService.js - Epic 5 Slice 2: Meal Plan Service
 * 
 * Manages weekly meal plan persistence in localStorage.
 * Schema: { version: 1, weekStart: "YYYY-MM-DD", days: [...] }
 */

const STORAGE_KEY = 'madmatch_weekly_plan';
const SCHEMA_VERSION = 1;

/**
 * Get Monday of the current week (ISO week, Monday = start)
 * @param {Date} referenceDate - Optional reference date (defaults to today)
 * @returns {Date} Monday at 00:00:00
 */
const getCurrentWeekMonday = (referenceDate = new Date()) => {
  const today = new Date(referenceDate);
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days from Monday
  // If today is Sunday (0), we need to go back 6 days; otherwise (currentDay - 1)
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  
  return monday;
};

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
const formatDateISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get Danish day name from date
 * @param {Date} date 
 * @returns {string}
 */
const getDayName = (date) => {
  const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  return dayNames[date.getDay()];
};

/**
 * Generate empty week structure starting from Monday
 * @param {Date} monday 
 * @returns {Object} Empty week plan
 */
const generateEmptyWeek = (monday) => {
  const days = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    
    days.push({
      date: formatDateISO(date),
      dayName: getDayName(date),
      recipe: null
    });
  }
  
  return {
    version: SCHEMA_VERSION,
    weekStart: formatDateISO(monday),
    days
  };
};

/**
 * Load weekly plan from localStorage or create empty week
 * Epic 5 Slice 6: Support for custom week start date
 * @param {Date} weekStart - Optional Monday date for the week (defaults to current week)
 * @returns {Object} Weekly plan object
 */
export const getWeeklyPlan = (weekStart) => {
  try {
    const monday = weekStart ? getCurrentWeekMonday(weekStart) : getCurrentWeekMonday();
    const targetWeekStart = formatDateISO(monday);
    
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (!stored) {
      // No plan exists, return empty week
      return generateEmptyWeek(monday);
    }
    
    const plan = JSON.parse(stored);
    
    // Validate schema version
    if (plan.version !== SCHEMA_VERSION) {
      console.warn(`Meal plan schema mismatch. Expected ${SCHEMA_VERSION}, got ${plan.version}. Resetting.`);
      return generateEmptyWeek(monday);
    }
    
    // Check if stored plan is for target week
    if (plan.weekStart !== targetWeekStart) {
      // Stored plan is for a different week, return empty for this week
      return generateEmptyWeek(monday);
    }
    
    return plan;
  } catch (error) {
    console.error('Failed to load meal plan from localStorage:', error);
    const monday = weekStart ? getCurrentWeekMonday(weekStart) : getCurrentWeekMonday();
    return generateEmptyWeek(monday);
  }
};

/**
 * Save weekly plan to localStorage
 * @param {Object} plan - Weekly plan object
 */
const saveWeeklyPlan = (plan) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch (error) {
    console.error('Failed to save meal plan to localStorage:', error);
    throw error;
  }
};

/**
 * Add recipe to specific day
 * @param {string} dayDate - Date in YYYY-MM-DD format
 * @param {Object} recipe - Recipe object { id, title, imageUrl, servings }
 * @returns {Object} Updated weekly plan
 */
export const addRecipe = (dayDate, recipe) => {
  try {
    const plan = getWeeklyPlan();
    
    // Find the day in the plan
    const dayIndex = plan.days.findIndex(d => d.date === dayDate);
    
    if (dayIndex === -1) {
      throw new Error(`Day ${dayDate} not found in current week plan`);
    }
    
    // Update the day with the recipe
    plan.days[dayIndex].recipe = {
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.imageUrl || null,
      servings: 4 // Fixed to 4 servings for Slice 2 MVP
    };
    
    saveWeeklyPlan(plan);
    return plan;
  } catch (error) {
    console.error('Failed to add recipe to meal plan:', error);
    throw error;
  }
};

/**
 * Remove recipe from specific day
 * @param {string} dayDate - Date in YYYY-MM-DD format
 * @returns {Object} Updated weekly plan
 */
export const removeRecipe = (dayDate) => {
  try {
    const plan = getWeeklyPlan();
    
    // Find the day in the plan
    const dayIndex = plan.days.findIndex(d => d.date === dayDate);
    
    if (dayIndex === -1) {
      throw new Error(`Day ${dayDate} not found in current week plan`);
    }
    
    // Clear the recipe
    plan.days[dayIndex].recipe = null;
    
    saveWeeklyPlan(plan);
    return plan;
  } catch (error) {
    console.error('Failed to remove recipe from meal plan:', error);
    throw error;
  }
};

/**
 * Clear entire week (reset to empty state)
 * @returns {Object} Empty weekly plan
 */
export const clearWeek = () => {
  try {
    const monday = getCurrentWeekMonday();
    const emptyPlan = generateEmptyWeek(monday);
    saveWeeklyPlan(emptyPlan);
    return emptyPlan;
  } catch (error) {
    console.error('Failed to clear weekly meal plan:', error);
    throw error;
  }
};

/**
 * Check if a specific day has a recipe assigned
 * @param {string} dayDate - Date in YYYY-MM-DD format
 * @returns {boolean}
 */
export const hasRecipeOnDay = (dayDate) => {
  try {
    const plan = getWeeklyPlan();
    const day = plan.days.find(d => d.date === dayDate);
    return day ? day.recipe !== null : false;
  } catch (error) {
    console.error('Failed to check recipe on day:', error);
    return false;
  }
};

/**
 * Update recipe properties for a specific day (Epic 5 Slice 3)
 * @param {string} dayDate - Date in YYYY-MM-DD format
 * @param {Object} updates - Properties to update (e.g., { servings: 6 })
 * @returns {Object} Updated weekly plan
 */
export const updateRecipe = (dayDate, updates) => {
  try {
    const plan = getWeeklyPlan();
    
    // Find the day in the plan
    const dayIndex = plan.days.findIndex(d => d.date === dayDate);
    
    if (dayIndex === -1) {
      throw new Error(`Day ${dayDate} not found in current week plan`);
    }
    
    // Check if day has a recipe
    if (!plan.days[dayIndex].recipe) {
      throw new Error(`No recipe found on ${dayDate} to update`);
    }
    
    // Merge updates into existing recipe
    plan.days[dayIndex].recipe = {
      ...plan.days[dayIndex].recipe,
      ...updates
    };
    
    saveWeeklyPlan(plan);
    return plan;
  } catch (error) {
    console.error('Failed to update recipe in meal plan:', error);
    throw error;
  }
};
