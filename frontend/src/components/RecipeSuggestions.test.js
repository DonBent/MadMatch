import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RecipeSuggestions from './RecipeSuggestions';
import * as recipeService from '../services/recipeService';

// Mock the recipeService
jest.mock('../services/recipeService');

// Mock recipe data with Epic 3.5 structure
const mockDatabaseRecipes = {
  recipes: [
    {
      id: 'recipe-db-1',
      title: 'Grillet Kylling',
      imageUrl: 'https://arla.dk/kylling.jpg',
      totalTimeMinutes: 45,
      servings: 4,
      difficulty: 'medium',
      sourceUrl: 'https://arla.dk/recipes/kylling',
      source: { name: 'Arla' },
      language: 'da'
    },
    {
      id: 'recipe-db-2',
      title: 'Pasta Carbonara',
      imageUrl: 'https://arla.dk/carbonara.jpg',
      totalTimeMinutes: 30,
      servings: 2,
      difficulty: 'easy',
      sourceUrl: 'https://arla.dk/recipes/carbonara',
      source: { name: 'Arla' },
      language: 'da'
    }
  ],
  total: 2,
  limit: 3,
  offset: 0,
  hasMore: false
};

const mockLegacyRecipes = [
  {
    id: 'recipe-legacy-1',
    title: 'Spoonacular Recipe',
    image: 'https://spoonacular.com/recipe.jpg',
    readyInMinutes: 60,
    servings: 6,
    complexity: 55,
    sourceUrl: 'https://spoonacular.com/recipe',
    source: { name: 'Spoonacular' },
    language: 'en'
  }
];

describe('RecipeSuggestions - Epic 3.5 Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should display loading spinner while fetching', async () => {
      recipeService.searchRecipes.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockDatabaseRecipes), 100))
      );

      render(<RecipeSuggestions productName="kylling" />);
      
      expect(screen.getByText('Henter opskrifter...')).toBeInTheDocument();
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    });
  });

  describe('New Recipe API (Epic 3.5)', () => {
    it('should fetch recipes using searchRecipes with productName', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);

      render(<RecipeSuggestions productName="kylling" />);

      await waitFor(() => {
        expect(recipeService.searchRecipes).toHaveBeenCalledWith('kylling', {
          language: 'da',
          limit: 3
        });
        expect(screen.getByText('Grillet Kylling')).toBeInTheDocument();
      });

      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    });

    it('should display source badges for database recipes', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);

      render(<RecipeSuggestions productName="kylling" />);

      await waitFor(() => {
        const badges = screen.getAllByText('Arla');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should display language indicators', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);

      render(<RecipeSuggestions productName="kylling" />);

      await waitFor(() => {
        // Danish flag emoji
        const flags = screen.getAllByTitle('Dansk');
        expect(flags.length).toBeGreaterThan(0);
      });
    });

    it('should display Arla badge with correct styling class', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);
      const { container } = render(<RecipeSuggestions productName="kylling" />);

      await waitFor(() => {
        const arlaBadges = container.querySelectorAll('.source-badge-arla');
        expect(arlaBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Backward Compatibility (Epic 2)', () => {
    it('should fallback to legacy endpoint if new API fails', async () => {
      recipeService.searchRecipes.mockRejectedValue(new Error('API error'));
      recipeService.getRecipesForProduct.mockResolvedValue(mockLegacyRecipes);

      render(<RecipeSuggestions productId="123" productName="test" />);

      await waitFor(() => {
        expect(recipeService.getRecipesForProduct).toHaveBeenCalledWith('123');
      });

      expect(screen.getByText('Spoonacular Recipe')).toBeInTheDocument();
    });

    it('should not call legacy endpoint if new API succeeds', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);

      render(<RecipeSuggestions productName="kylling" />);

      await waitFor(() => {
        expect(recipeService.searchRecipes).toHaveBeenCalled();
      });

      expect(recipeService.getRecipesForProduct).not.toHaveBeenCalled();
    });

    it('should display Spoonacular badge for legacy recipes', async () => {
      recipeService.searchRecipes.mockRejectedValue(new Error('API error'));
      recipeService.getRecipesForProduct.mockResolvedValue(mockLegacyRecipes);

      const { container } = render(<RecipeSuggestions productId="123" />);

      await waitFor(() => {
        const spoonBadges = container.querySelectorAll('.source-badge-spoonacular');
        expect(spoonBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error handling', () => {
    it('should display error state when all APIs fail', async () => {
      recipeService.searchRecipes.mockRejectedValue(new Error('Search failed'));
      recipeService.getRecipesForProduct.mockRejectedValue(new Error('Legacy failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<RecipeSuggestions productId="123" productName="test" />);

      await waitFor(() => {
        expect(screen.getByText('Der opstod en fejl ved indlæsning af opskrifter')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should display fallback when no recipes found', async () => {
      recipeService.searchRecipes.mockResolvedValue({
        recipes: [],
        total: 0
      });

      render(<RecipeSuggestions productName="unknown" />);

      await waitFor(() => {
        expect(screen.getByText('Ingen opskriftsforslag fundet for dette produkt')).toBeInTheDocument();
      });
    });
  });

  describe('Recipe display', () => {
    it('should display maximum 3 recipes from database', async () => {
      const manyRecipes = {
        recipes: [
          ...mockDatabaseRecipes.recipes,
          {
            id: 'recipe-db-3',
            title: 'Third Recipe',
            imageUrl: 'https://arla.dk/third.jpg',
            totalTimeMinutes: 20,
            servings: 2,
            difficulty: 'easy',
            sourceUrl: 'https://arla.dk/third',
            source: { name: 'Arla' },
            language: 'da'
          },
          {
            id: 'recipe-db-4',
            title: 'Fourth Recipe (should not display)',
            imageUrl: 'https://arla.dk/fourth.jpg',
            totalTimeMinutes: 40,
            servings: 4,
            difficulty: 'medium',
            sourceUrl: 'https://arla.dk/fourth',
            source: { name: 'Arla' },
            language: 'da'
          }
        ],
        total: 4
      };

      recipeService.searchRecipes.mockResolvedValue(manyRecipes);

      render(<RecipeSuggestions productName="test" />);

      await waitFor(() => {
        expect(screen.getByText('Grillet Kylling')).toBeInTheDocument();
        expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
        expect(screen.getByText('Third Recipe')).toBeInTheDocument();
        expect(screen.queryByText('Fourth Recipe (should not display)')).not.toBeInTheDocument();
      });
    });

    it('should map difficulty to complexity correctly', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);

      render(<RecipeSuggestions productName="test" />);

      await waitFor(() => {
        // medium difficulty -> complexity 50 -> "Middel"
        expect(screen.getByText('Middel')).toBeInTheDocument();
        // easy difficulty -> complexity 20 -> "Let"
        expect(screen.getByText('Let')).toBeInTheDocument();
      });
    });

    it('should display totalTimeMinutes as readyInMinutes', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);

      render(<RecipeSuggestions productName="test" />);

      await waitFor(() => {
        expect(screen.getByText('45 min')).toBeInTheDocument();
        expect(screen.getByText('30 min')).toBeInTheDocument();
      });
    });
  });

  describe('Attribution', () => {
    it('should show "Arla og Spoonacular" when Arla recipes present', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);

      render(<RecipeSuggestions productName="test" />);

      await waitFor(() => {
        expect(screen.getByText('Opskrifter fra Arla og Spoonacular')).toBeInTheDocument();
      });
    });

    it('should show "Spoonacular" only when no Arla recipes', async () => {
      recipeService.searchRecipes.mockRejectedValue(new Error('No database'));
      recipeService.getRecipesForProduct.mockResolvedValue(mockLegacyRecipes);

      render(<RecipeSuggestions productId="123" />);

      await waitFor(() => {
        expect(screen.getByText('Opskrifter fra Spoonacular')).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle missing productId and productName gracefully', async () => {
      render(<RecipeSuggestions />);

      await waitFor(() => {
        expect(screen.getByText('Ingen opskriftsforslag fundet for dette produkt')).toBeInTheDocument();
      });

      expect(recipeService.searchRecipes).not.toHaveBeenCalled();
    });

    it('should handle recipes without source gracefully', async () => {
      const recipesNoSource = {
        recipes: [{
          id: 'recipe-1',
          title: 'Recipe Without Source',
          imageUrl: 'https://example.com/image.jpg',
          totalTimeMinutes: 30,
          servings: 2,
          difficulty: 'easy',
          sourceUrl: 'https://example.com/recipe',
          language: 'da'
          // source is missing
        }]
      };

      recipeService.searchRecipes.mockResolvedValue(recipesNoSource);

      render(<RecipeSuggestions productName="test" />);

      await waitFor(() => {
        expect(screen.getByText('Recipe Without Source')).toBeInTheDocument();
        // Should default to Spoonacular
        expect(screen.getByText('Spoonacular')).toBeInTheDocument();
      });
    });

    it('should handle English language recipes', async () => {
      const englishRecipes = {
        recipes: [{
          id: 'recipe-en-1',
          title: 'English Recipe',
          imageUrl: 'https://example.com/en.jpg',
          totalTimeMinutes: 40,
          servings: 4,
          difficulty: 'medium',
          sourceUrl: 'https://example.com/en',
          source: { name: 'Spoonacular' },
          language: 'en'
        }]
      };

      recipeService.searchRecipes.mockResolvedValue(englishRecipes);

      render(<RecipeSuggestions productName="test" />);

      await waitFor(() => {
        // English flag emoji
        const flags = screen.getAllByTitle('English');
        expect(flags.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-labels for source badges', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);

      render(<RecipeSuggestions productName="test" />);

      await waitFor(() => {
        const badges = screen.getAllByLabelText(/Kilde:/);
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should have aria-labels for language indicators', async () => {
      recipeService.searchRecipes.mockResolvedValue(mockDatabaseRecipes);

      render(<RecipeSuggestions productName="test" />);

      await waitFor(() => {
        const indicators = screen.getAllByLabelText('Dansk');
        expect(indicators.length).toBeGreaterThan(0);
      });
    });
  });
});
