import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FavoritesProvider, useFavorites } from './FavoritesContext';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component that uses the context
const TestComponent = () => {
  const { favorites, addFavorite, removeFavorite, isFavorite, clearFavorites } = useFavorites();
  
  return (
    <div>
      <div data-testid="favorites-count">{favorites.length}</div>
      <div data-testid="favorites-list">{favorites.join(',')}</div>
      <button onClick={() => addFavorite(1)}>Add 1</button>
      <button onClick={() => addFavorite(2)}>Add 2</button>
      <button onClick={() => removeFavorite(1)}>Remove 1</button>
      <button onClick={() => clearFavorites()}>Clear</button>
      <div data-testid="is-favorite-1">{isFavorite(1) ? 'yes' : 'no'}</div>
      <div data-testid="is-favorite-2">{isFavorite(2) ? 'yes' : 'no'}</div>
    </div>
  );
};

describe('FavoritesContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('provides initial empty favorites', () => {
    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    );

    expect(screen.getByTestId('favorites-count')).toHaveTextContent('0');
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('');
  });

  test('adds favorite', () => {
    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    );

    fireEvent.click(screen.getByText('Add 1'));
    
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('1');
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('1');
    expect(screen.getByTestId('is-favorite-1')).toHaveTextContent('yes');
  });

  test('removes favorite', () => {
    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    );

    fireEvent.click(screen.getByText('Add 1'));
    fireEvent.click(screen.getByText('Add 2'));
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('2');

    fireEvent.click(screen.getByText('Remove 1'));
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('1');
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('2');
    expect(screen.getByTestId('is-favorite-1')).toHaveTextContent('no');
    expect(screen.getByTestId('is-favorite-2')).toHaveTextContent('yes');
  });

  test('clears all favorites', () => {
    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    );

    fireEvent.click(screen.getByText('Add 1'));
    fireEvent.click(screen.getByText('Add 2'));
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('2');

    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('0');
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('');
  });

  test('does not add duplicate favorites', () => {
    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    );

    fireEvent.click(screen.getByText('Add 1'));
    fireEvent.click(screen.getByText('Add 1'));
    
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('1');
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('1');
  });

  test('persists favorites to localStorage', async () => {
    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    );

    fireEvent.click(screen.getByText('Add 1'));
    fireEvent.click(screen.getByText('Add 2'));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('madmatch_favorites'));
      expect(stored).toEqual({
        favorites: [1, 2],
        version: 2  // Updated to v2
      });
    });
  });

  test('loads favorites from localStorage on mount', () => {
    // Set v1 data - should be migrated to v2 automatically
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [5, 10],
      version: 1
    }));

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    );

    // Should load the migrated data
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('2');
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('5,10');
  });

  test('handles invalid localStorage data gracefully', () => {
    localStorage.setItem('madmatch_favorites', 'invalid json');

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    );

    expect(screen.getByTestId('favorites-count')).toHaveTextContent('0');
  });

  test('throws error when useFavorites is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useFavorites must be used within a FavoritesProvider');

    consoleSpy.mockRestore();
  });

  describe('Schema Validation', () => {
    test('handles corrupted favorites data gracefully', () => {
      localStorage.setItem('madmatch_favorites', 'corrupted json {{{');

      render(
        <FavoritesProvider>
          <TestComponent />
        </FavoritesProvider>
      );

      expect(screen.getByTestId('favorites-count')).toHaveTextContent('0');
    });

    test('validates and filters invalid favorite IDs', () => {
      localStorage.setItem('madmatch_favorites', JSON.stringify({
        favorites: [1, null, 'valid', {}, [], 2],
        version: 2
      }));

      render(
        <FavoritesProvider>
          <TestComponent />
        </FavoritesProvider>
      );

      expect(screen.getByTestId('favorites-count')).toHaveTextContent('3');
      expect(screen.getByTestId('favorites-list')).toHaveTextContent('1,valid,2');
    });

    test('handles non-array favorites', () => {
      localStorage.setItem('madmatch_favorites', JSON.stringify({
        favorites: 'not an array',
        version: 2
      }));

      render(
        <FavoritesProvider>
          <TestComponent />
        </FavoritesProvider>
      );

      expect(screen.getByTestId('favorites-count')).toHaveTextContent('0');
    });

    test('clears favorites on schema version mismatch', () => {
      localStorage.setItem('madmatch_favorites', JSON.stringify({
        favorites: [1, 2, 3],
        version: 999
      }));

      render(
        <FavoritesProvider>
          <TestComponent />
        </FavoritesProvider>
      );

      // Unknown version should clear data
      expect(screen.getByTestId('favorites-count')).toHaveTextContent('0');
    });
  });
});
