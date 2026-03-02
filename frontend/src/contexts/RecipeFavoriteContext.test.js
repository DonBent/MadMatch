import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { RecipeFavoriteProvider, useRecipeFavorites } from '../contexts/RecipeFavoriteContext';

// Test component to access context
const TestComponent = () => {
  const { 
    favorites, 
    toggleFavorite, 
    isFavorite, 
    getFavoriteCount, 
    clearAllFavorites,
    isLoaded 
  } = useRecipeFavorites();

  return (
    <div>
      <div data-testid="is-loaded">{isLoaded ? 'loaded' : 'loading'}</div>
      <div data-testid="favorite-count">{getFavoriteCount()}</div>
      <div data-testid="favorites">{favorites.join(',')}</div>
      <button onClick={() => toggleFavorite('recipe-1')} data-testid="toggle-1">
        Toggle 1
      </button>
      <button onClick={() => toggleFavorite('recipe-2')} data-testid="toggle-2">
        Toggle 2
      </button>
      <div data-testid="is-favorite-1">{isFavorite('recipe-1') ? 'yes' : 'no'}</div>
      <div data-testid="is-favorite-2">{isFavorite('recipe-2') ? 'yes' : 'no'}</div>
      <button onClick={clearAllFavorites} data-testid="clear-all">
        Clear All
      </button>
    </div>
  );
};

describe('RecipeFavoriteContext', () => {
  const STORAGE_KEY = 'madmatch_favorite_recipes';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should load empty favorites initially', () => {
    render(
      <RecipeFavoriteProvider>
        <TestComponent />
      </RecipeFavoriteProvider>
    );

    expect(screen.getByTestId('favorite-count')).toHaveTextContent('0');
    expect(screen.getByTestId('favorites')).toHaveTextContent('');
  });

  it('should toggle favorite state', () => {
    render(
      <RecipeFavoriteProvider>
        <TestComponent />
      </RecipeFavoriteProvider>
    );

    const toggle1 = screen.getByTestId('toggle-1');
    
    // Initially not favorite
    expect(screen.getByTestId('is-favorite-1')).toHaveTextContent('no');
    
    // Add to favorites
    act(() => {
      toggle1.click();
    });
    
    expect(screen.getByTestId('is-favorite-1')).toHaveTextContent('yes');
    expect(screen.getByTestId('favorite-count')).toHaveTextContent('1');
    
    // Remove from favorites
    act(() => {
      toggle1.click();
    });
    
    expect(screen.getByTestId('is-favorite-1')).toHaveTextContent('no');
    expect(screen.getByTestId('favorite-count')).toHaveTextContent('0');
  });

  it('should handle multiple favorites', () => {
    render(
      <RecipeFavoriteProvider>
        <TestComponent />
      </RecipeFavoriteProvider>
    );

    const toggle1 = screen.getByTestId('toggle-1');
    const toggle2 = screen.getByTestId('toggle-2');
    
    act(() => {
      toggle1.click();
      toggle2.click();
    });
    
    expect(screen.getByTestId('favorite-count')).toHaveTextContent('2');
    expect(screen.getByTestId('is-favorite-1')).toHaveTextContent('yes');
    expect(screen.getByTestId('is-favorite-2')).toHaveTextContent('yes');
  });

  it('should persist favorites to localStorage', async () => {
    render(
      <RecipeFavoriteProvider>
        <TestComponent />
      </RecipeFavoriteProvider>
    );

    const toggle1 = screen.getByTestId('toggle-1');
    
    act(() => {
      toggle1.click();
    });

    await waitFor(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      
      const data = JSON.parse(stored);
      expect(data.version).toBe(1);
      expect(data.favorites).toEqual(['recipe-1']);
      expect(data.updatedAt).toBeTruthy();
    });
  });

  it('should load favorites from localStorage', () => {
    const mockData = {
      version: 1,
      favorites: ['recipe-1', 'recipe-2'],
      updatedAt: '2026-03-02T22:30:00Z'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockData));

    render(
      <RecipeFavoriteProvider>
        <TestComponent />
      </RecipeFavoriteProvider>
    );

    expect(screen.getByTestId('favorite-count')).toHaveTextContent('2');
    expect(screen.getByTestId('is-favorite-1')).toHaveTextContent('yes');
    expect(screen.getByTestId('is-favorite-2')).toHaveTextContent('yes');
  });

  it('should clear all favorites', () => {
    render(
      <RecipeFavoriteProvider>
        <TestComponent />
      </RecipeFavoriteProvider>
    );

    const toggle1 = screen.getByTestId('toggle-1');
    const toggle2 = screen.getByTestId('toggle-2');
    const clearAll = screen.getByTestId('clear-all');
    
    act(() => {
      toggle1.click();
      toggle2.click();
    });
    
    expect(screen.getByTestId('favorite-count')).toHaveTextContent('2');
    
    act(() => {
      clearAll.click();
    });
    
    expect(screen.getByTestId('favorite-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-favorite-1')).toHaveTextContent('no');
    expect(screen.getByTestId('is-favorite-2')).toHaveTextContent('no');
  });

  it('should handle invalid localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-json');

    render(
      <RecipeFavoriteProvider>
        <TestComponent />
      </RecipeFavoriteProvider>
    );

    expect(screen.getByTestId('favorite-count')).toHaveTextContent('0');
  });

  it('should handle version mismatch', () => {
    const mockData = {
      version: 999,
      favorites: ['recipe-1'],
      updatedAt: '2026-03-02T22:30:00Z'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockData));

    render(
      <RecipeFavoriteProvider>
        <TestComponent />
      </RecipeFavoriteProvider>
    );

    // Should reset to empty when version mismatch
    expect(screen.getByTestId('favorite-count')).toHaveTextContent('0');
  });

  it('should throw error when useRecipeFavorites used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useRecipeFavorites must be used within RecipeFavoriteProvider');
    
    consoleSpy.mockRestore();
  });

  it('should set isLoaded to true after loading', () => {
    render(
      <RecipeFavoriteProvider>
        <TestComponent />
      </RecipeFavoriteProvider>
    );

    expect(screen.getByTestId('is-loaded')).toHaveTextContent('loaded');
  });
});
