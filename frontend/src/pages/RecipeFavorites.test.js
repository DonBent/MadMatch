import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipeFavorites from './RecipeFavorites';
import { RecipeFavoriteProvider } from '../contexts/RecipeFavoriteContext';
import { recipeService } from '../services/recipeService';

jest.mock('../services/recipeService');

const mockRecipes = [
  {
    id: 'recipe-1',
    title: 'Pasta Carbonara',
    imageUrl: 'https://example.com/pasta.jpg',
    cookTimeMinutes: 25,
    difficulty: 'EASY',
    servings: 4
  },
  {
    id: 'recipe-2',
    title: 'Thai Green Curry',
    imageUrl: 'https://example.com/curry.jpg',
    cookTimeMinutes: 40,
    difficulty: 'MEDIUM',
    servings: 6
  },
  {
    id: 'recipe-3',
    title: 'Beef Wellington',
    imageUrl: 'https://example.com/beef.jpg',
    cookTimeMinutes: 120,
    difficulty: 'HARD',
    servings: 8
  }
];

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <RecipeFavoriteProvider>
        {component}
      </RecipeFavoriteProvider>
    </BrowserRouter>
  );
};

describe('RecipeFavorites', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    recipeService.getAllRecipes = jest.fn().mockResolvedValue(mockRecipes);
  });

  test('renders page header', async () => {
    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      expect(screen.getByText('Mine favoritter')).toBeInTheDocument();
    });
  });

  test('shows empty state when no favorites', async () => {
    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      expect(screen.getByTestId('favorites-empty-state')).toBeInTheDocument();
      expect(screen.getByText('Ingen favoritter endnu')).toBeInTheDocument();
      expect(screen.getByText('Klik på ♥ for at tilføje opskrifter til dine favoritter.')).toBeInTheDocument();
    });
  });

  test('displays favorite count in header when favorites exist', async () => {
    const mockData = {
      version: 1,
      favorites: ['recipe-1', 'recipe-2'],
      updatedAt: '2026-03-02T22:30:00Z'
    };
    localStorage.setItem('madmatch_favorite_recipes', JSON.stringify(mockData));

    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      expect(screen.getByText(/Mine favoritter \(2\)/)).toBeInTheDocument();
    });
  });

  test('displays favorited recipes', async () => {
    const mockData = {
      version: 1,
      favorites: ['recipe-1', 'recipe-2'],
      updatedAt: '2026-03-02T22:30:00Z'
    };
    localStorage.setItem('madmatch_favorite_recipes', JSON.stringify(mockData));

    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
      expect(screen.getByText('Thai Green Curry')).toBeInTheDocument();
      expect(screen.queryByText('Beef Wellington')).not.toBeInTheDocument();
    });
  });

  test('renders recipe cards in grid layout', async () => {
    const mockData = {
      version: 1,
      favorites: ['recipe-1', 'recipe-2'],
      updatedAt: '2026-03-02T22:30:00Z'
    };
    localStorage.setItem('madmatch_favorite_recipes', JSON.stringify(mockData));

    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      const grid = document.querySelector('.recipe-grid');
      expect(grid).toBeInTheDocument();
      
      const recipeCards = screen.getAllByTestId('recipe-card');
      expect(recipeCards).toHaveLength(2);
    });
  });

  test('shows loading state initially', () => {
    renderWithProviders(<RecipeFavorites />);
    
    // Loading skeleton should be present initially
    expect(screen.getByText('Mine favoritter')).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    recipeService.getAllRecipes = jest.fn().mockRejectedValueOnce(new Error('API Error'));
    
    const mockData = {
      version: 1,
      favorites: ['recipe-1'],
      updatedAt: '2026-03-02T22:30:00Z'
    };
    localStorage.setItem('madmatch_favorite_recipes', JSON.stringify(mockData));

    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      expect(screen.getByText(/Kunne ikke indlæse favoritter/)).toBeInTheDocument();
      expect(screen.getByText('Prøv igen')).toBeInTheDocument();
    });
  });

  test('calls API to fetch recipes when favorites exist', async () => {
    const mockData = {
      version: 1,
      favorites: ['recipe-1'],
      updatedAt: '2026-03-02T22:30:00Z'
    };
    localStorage.setItem('madmatch_favorite_recipes', JSON.stringify(mockData));

    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      expect(recipeService.getAllRecipes).toHaveBeenCalledTimes(1);
    });
  });

  test('does not show empty state when favorites exist', async () => {
    const mockData = {
      version: 1,
      favorites: ['recipe-1'],
      updatedAt: '2026-03-02T22:30:00Z'
    };
    localStorage.setItem('madmatch_favorite_recipes', JSON.stringify(mockData));

    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      expect(screen.queryByTestId('favorites-empty-state')).not.toBeInTheDocument();
    });
  });

  test('displays page description', async () => {
    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      expect(screen.getByText('Dine gemte opskrifter samlet ét sted')).toBeInTheDocument();
    });
  });

  test('filters only favorited recipes from all recipes', async () => {
    const mockData = {
      version: 1,
      favorites: ['recipe-2'],
      updatedAt: '2026-03-02T22:30:00Z'
    };
    localStorage.setItem('madmatch_favorite_recipes', JSON.stringify(mockData));

    renderWithProviders(<RecipeFavorites />);
    
    await waitFor(() => {
      expect(screen.getByText('Thai Green Curry')).toBeInTheDocument();
      expect(screen.queryByText('Pasta Carbonara')).not.toBeInTheDocument();
      expect(screen.queryByText('Beef Wellington')).not.toBeInTheDocument();
    });
  });
});
