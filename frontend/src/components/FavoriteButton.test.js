import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FavoriteButton from './FavoriteButton';
import { FavoritesProvider } from '../contexts/FavoritesContext';

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

const renderWithProvider = (ui) => {
  return render(
    <FavoritesProvider>
      {ui}
    </FavoritesProvider>
  );
};

describe('FavoriteButton', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders with outline heart when not favorited', () => {
    renderWithProvider(<FavoriteButton productId={1} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('♡');
    expect(button).not.toHaveClass('favorited');
  });

  test('renders with filled heart when favorited', () => {
    // Pre-populate favorites
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1],
      version: 1
    }));

    renderWithProvider(<FavoriteButton productId={1} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('♥');
    expect(button).toHaveClass('favorited');
  });

  test('toggles favorite on click', () => {
    renderWithProvider(<FavoriteButton productId={1} />);
    
    const button = screen.getByRole('button');
    
    // Initially not favorited
    expect(button).toHaveTextContent('♡');
    expect(button).not.toHaveClass('favorited');
    
    // Click to add favorite
    fireEvent.click(button);
    expect(button).toHaveTextContent('♥');
    expect(button).toHaveClass('favorited');
    
    // Click to remove favorite
    fireEvent.click(button);
    expect(button).toHaveTextContent('♡');
    expect(button).not.toHaveClass('favorited');
  });

  test('stops event propagation when clicked', () => {
    const handleParentClick = jest.fn();
    
    renderWithProvider(
      <div onClick={handleParentClick}>
        <FavoriteButton productId={1} />
      </div>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Parent click handler should not be called
    expect(handleParentClick).not.toHaveBeenCalled();
  });

  test('has correct aria-label when not favorited', () => {
    renderWithProvider(<FavoriteButton productId={1} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Tilføj til favoritter');
  });

  test('has correct aria-label when favorited', () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1],
      version: 1
    }));

    renderWithProvider(<FavoriteButton productId={1} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Fjern fra favoritter');
  });

  test('handles different product IDs independently', () => {
    renderWithProvider(
      <>
        <FavoriteButton productId={1} />
        <FavoriteButton productId={2} />
      </>
    );
    
    const buttons = screen.getAllByRole('button');
    
    // Click first button
    fireEvent.click(buttons[0]);
    
    // First button should be favorited
    expect(buttons[0]).toHaveTextContent('♥');
    expect(buttons[0]).toHaveClass('favorited');
    
    // Second button should not be favorited
    expect(buttons[1]).toHaveTextContent('♡');
    expect(buttons[1]).not.toHaveClass('favorited');
  });
});
