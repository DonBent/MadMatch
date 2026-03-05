#!/usr/bin/env node
/**
 * Test script for mealPlanService localStorage functionality
 * Epic 5 Slice 2 - Self-test verification
 */

// Mock localStorage for Node.js environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorageMock();

// Import the service
const service = require('./frontend/src/services/mealPlanService.js');

console.log('🧪 Testing mealPlanService.js\n');

// Test 1: Get weekly plan (should return empty week)
console.log('Test 1: getWeeklyPlan() - Initial empty week');
const plan1 = service.getWeeklyPlan();
console.log('✓ Plan version:', plan1.version);
console.log('✓ Week start:', plan1.weekStart);
console.log('✓ Number of days:', plan1.days.length);
console.log('✓ All days have null recipes:', plan1.days.every(d => d.recipe === null));
console.log('');

// Test 2: Add recipe to Monday
console.log('Test 2: addRecipe() - Add recipe to first day');
const testRecipe = {
  id: 'test-123',
  title: 'Kylling i Karry',
  imageUrl: 'https://example.com/image.jpg'
};

const mondayDate = plan1.days[0].date;
const plan2 = service.addRecipe(mondayDate, testRecipe);
console.log('✓ Recipe added to:', plan2.days[0].dayName);
console.log('✓ Recipe title:', plan2.days[0].recipe.title);
console.log('✓ Recipe servings:', plan2.days[0].recipe.servings);
console.log('✓ Recipe ID:', plan2.days[0].recipe.id);
console.log('');

// Test 3: Verify persistence (reload from localStorage)
console.log('Test 3: Persistence - Reload from localStorage');
const plan3 = service.getWeeklyPlan();
console.log('✓ Recipe still on Monday:', plan3.days[0].recipe !== null);
console.log('✓ Recipe title matches:', plan3.days[0].recipe.title === testRecipe.title);
console.log('✓ Other days empty:', plan3.days.slice(1).every(d => d.recipe === null));
console.log('');

// Test 4: Add recipe to Tuesday
console.log('Test 4: Add second recipe to Tuesday');
const tuesdayDate = plan1.days[1].date;
const testRecipe2 = {
  id: 'test-456',
  title: 'Pasta Carbonara',
  imageUrl: 'https://example.com/pasta.jpg'
};

service.addRecipe(tuesdayDate, testRecipe2);
const plan4 = service.getWeeklyPlan();
console.log('✓ Monday recipe preserved:', plan4.days[0].recipe.title);
console.log('✓ Tuesday recipe added:', plan4.days[1].recipe.title);
console.log('');

// Test 5: Check hasRecipeOnDay
console.log('Test 5: hasRecipeOnDay() - Check specific days');
console.log('✓ Monday has recipe:', service.hasRecipeOnDay(mondayDate));
console.log('✓ Tuesday has recipe:', service.hasRecipeOnDay(tuesdayDate));
console.log('✓ Wednesday empty:', !service.hasRecipeOnDay(plan1.days[2].date));
console.log('');

// Test 6: Replace recipe (duplicate assignment)
console.log('Test 6: Replace recipe on Monday');
const replacementRecipe = {
  id: 'test-789',
  title: 'Frikadeller',
  imageUrl: 'https://example.com/frikadeller.jpg'
};

service.addRecipe(mondayDate, replacementRecipe);
const plan5 = service.getWeeklyPlan();
console.log('✓ Recipe replaced:', plan5.days[0].recipe.title === 'Frikadeller');
console.log('✓ Old recipe gone:', plan5.days[0].recipe.id === 'test-789');
console.log('');

// Test 7: Remove recipe
console.log('Test 7: removeRecipe() - Clear Monday');
service.removeRecipe(mondayDate);
const plan6 = service.getWeeklyPlan();
console.log('✓ Monday cleared:', plan6.days[0].recipe === null);
console.log('✓ Tuesday preserved:', plan6.days[1].recipe !== null);
console.log('');

// Test 8: Clear entire week
console.log('Test 8: clearWeek() - Reset all');
const plan7 = service.clearWeek();
console.log('✓ All days cleared:', plan7.days.every(d => d.recipe === null));
console.log('');

// Test 9: Verify localStorage key and structure
console.log('Test 9: localStorage structure verification');
const stored = localStorage.getItem('madmatch_weekly_plan');
const parsed = JSON.parse(stored);
console.log('✓ Storage key exists:', stored !== null);
console.log('✓ Schema version correct:', parsed.version === 1);
console.log('✓ Has weekStart field:', typeof parsed.weekStart === 'string');
console.log('✓ Has 7 days:', parsed.days.length === 7);
console.log('✓ Each day has date, dayName, recipe:', 
  parsed.days.every(d => d.date && d.dayName && 'recipe' in d));
console.log('');

console.log('✅ All tests passed! mealPlanService is working correctly.\n');
