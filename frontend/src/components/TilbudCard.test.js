import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import TilbudCard from './TilbudCard';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { CartProvider } from '../contexts/CartContext';

// Mock child components
jest.mock('./FavoriteButton', () => {
  return function MockFavoriteButton({ productId }) {
    return <button data-testid="favorite-button">Favorite {productId}</button>;
  };
});

jest.mock('./ShareButton', () => {
  return function MockShareButton({ item, type }) {
    return <button data-testid="share-button">Share {type} {item.id}</button>;
  };
});

jest.mock('./AddToCartButton', () => {
  return function MockAddToCartButton({ product }) {
    return <button data-testid="add-to-cart-button">Add {product.id}</button>;
  };
});

const mockTilbud = {
  id: 123,
  navn: 'Test Tilbud',
  butik: 'Netto',
  rabat: 25,
  normalpris: 39.95,
  tilbudspris: 29.95
};

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <FavoritesProvider>
        <CartProvider>
          {component}
        </CartProvider>
      </FavoritesProvider>
    </BrowserRouter>
  );
};

describe('TilbudCard', () => {
  test('renders tilbud information correctly', () => {
    renderWithProviders(<TilbudCard tilbud={mockTilbud} />);
    
    expect(screen.getByText('Test Tilbud')).toBeInTheDocument();
    expect(screen.getByText('Netto')).toBeInTheDocument();
    expect(screen.getByText('-25%')).toBeInTheDocument();
    expect(screen.getByText('39.95 kr')).toBeInTheDocument();
    expect(screen.getByText('29.95 kr')).toBeInTheDocument();
    expect(screen.getByText('Spar 10.00 kr')).toBeInTheDocument();
  });

  test('renders ShareButton with correct props', () => {
    renderWithProviders(<TilbudCard tilbud={mockTilbud} />);
    
    const shareButton = screen.getByTestId('share-button');
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toHaveTextContent('Share tilbud 123');
  });

  test('renders FavoriteButton', () => {
    renderWithProviders(<TilbudCard tilbud={mockTilbud} />);
    
    const favoriteButton = screen.getByTestId('favorite-button');
    expect(favoriteButton).toBeInTheDocument();
    expect(favoriteButton).toHaveTextContent('Favorite 123');
  });

  test('renders AddToCartButton', () => {
    renderWithProviders(<TilbudCard tilbud={mockTilbud} />);
    
    const addToCartButton = screen.getByTestId('add-to-cart-button');
    expect(addToCartButton).toBeInTheDocument();
    expect(addToCartButton).toHaveTextContent('Add 123');
  });

  test('ShareButton is positioned in header next to FavoriteButton', () => {
    renderWithProviders(<TilbudCard tilbud={mockTilbud} />);
    
    const header = screen.getByText('Netto').closest('.tilbud-card-header');
    const shareButton = screen.getByTestId('share-button');
    const favoriteButton = screen.getByTestId('favorite-button');
    
    expect(header).toContainElement(shareButton);
    expect(header).toContainElement(favoriteButton);
  });

  test('links to product detail page', () => {
    renderWithProviders(<TilbudCard tilbud={mockTilbud} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/produkt/123');
  });

  test('calculates savings correctly', () => {
    const tilbudWithDifferentPrices = {
      ...mockTilbud,
      normalpris: 50.00,
      tilbudspris: 35.50
    };
    
    renderWithProviders(<TilbudCard tilbud={tilbudWithDifferentPrices} />);
    
    expect(screen.getByText('Spar 14.50 kr')).toBeInTheDocument();
  });
});
