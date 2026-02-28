import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductDetailPage from './ProductDetailPage';
import { tilbudService } from '../services/tilbudService';

// Mock react-router-dom
jest.mock('react-router-dom');

// Mock the service
jest.mock('../services/tilbudService');

// Mock child components to isolate ProductDetailPage tests
jest.mock('../components/NutritionCard', () => ({
  __esModule: true,
  default: ({ nutrition, loading }) => (
    <div data-testid="nutrition-card">
      {loading ? 'Loading nutrition...' : nutrition ? 'Nutrition data' : 'No nutrition'}
    </div>
  ),
}));

jest.mock('../components/RecipeSuggestions', () => ({
  __esModule: true,
  default: ({ recipes, loading }) => (
    <div data-testid="recipe-suggestions">
      {loading ? 'Loading recipes...' : recipes?.length > 0 ? 'Recipes' : 'No recipes'}
    </div>
  ),
}));

jest.mock('../components/SustainabilityCard', () => ({
  __esModule: true,
  default: ({ data, loading }) => (
    <div data-testid="sustainability-card">
      {loading ? 'Loading sustainability...' : data ? 'Sustainability data' : 'No sustainability'}
    </div>
  ),
}));

jest.mock('../components/ShareButton', () => ({
  __esModule: true,
  default: ({ productId, productName }) => (
    <button data-testid="share-button">Del {productName}</button>
  ),
}));

jest.mock('../components/LoadingSkeleton', () => ({
  __esModule: true,
  default: ({ type }) => <div data-testid={`skeleton-${type || 'product'}`}>Loading...</div>,
}));

jest.mock('../components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="error-boundary">{children}</div>,
}));

describe('ProductDetailPage', () => {
  const mockProduct = {
    id: 1,
    navn: 'Test Product',
    butik: 'Test Store',
    kategori: 'Test Category',
    normalpris: 100,
    tilbudspris: 75,
    rabat: 25,
    billedeUrl: '/test-image.jpg',
    gyldigFra: '01/03',
    gyldigTil: '07/03'
  };

  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useParams.mockReturnValue({ id: '1' });
    useNavigate.mockReturnValue(mockNavigate);
    
    // Mock fetch for nutrition, recipes, and sustainability
    global.fetch = jest.fn();
  });

  test('renders loading skeleton initially', () => {
    tilbudService.getTilbudById.mockImplementation(() => new Promise(() => {}));
    
    render(<ProductDetailPage />);
    
    expect(screen.getByTestId('skeleton-product')).toBeInTheDocument();
  });

  test('renders product details when data is loaded', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Store')).toBeInTheDocument();
    expect(screen.getByText('Test Category')).toBeInTheDocument();
    expect(screen.getByText('100.00 kr')).toBeInTheDocument();
    expect(screen.getByText('75.00 kr')).toBeInTheDocument();
    expect(screen.getByText('-25%')).toBeInTheDocument();
  });

  test('displays image with lazy loading', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      const image = screen.getByAltText('Test Product');
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('src', '/test-image.jpg');
    });
  });

  test('displays placeholder when no image available', async () => {
    const productWithoutImage = { ...mockProduct, billedeUrl: null };
    tilbudService.getTilbudById.mockResolvedValue(productWithoutImage);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Intet billede tilgængeligt')).toBeInTheDocument();
      expect(screen.getByLabelText('Intet produktbillede')).toBeInTheDocument();
    });
  });

  test('calculates and displays savings correctly', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Du sparer 25.00 kr/)).toBeInTheDocument();
    });
  });

  test('renders ShareButton component', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('share-button')).toBeInTheDocument();
      expect(screen.getByText('Del Test Product')).toBeInTheDocument();
    });
  });

  test('wraps content in ErrorBoundary', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  test('has proper ARIA labels for accessibility', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Tilbage til tilbudsoversigt')).toBeInTheDocument();
      expect(screen.getByLabelText('Prisoplysninger')).toBeInTheDocument();
      expect(screen.getByLabelText('Gyldighed')).toBeInTheDocument();
    });
  });

  test('badges have proper ARIA labels', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Butik: Test Store')).toBeInTheDocument();
      expect(screen.getByLabelText('Kategori: Test Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Rabat: 25 procent')).toBeInTheDocument();
    });
  });

  test('handles error state with proper ARIA role', async () => {
    tilbudService.getTilbudById.mockRejectedValue(new Error('Network error'));
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      const errorContainer = screen.getByRole('alert');
      expect(within(errorContainer).getByText(/Kunne ikke indlæse produkt/)).toBeInTheDocument();
    });
  });

  test('handles 404 error', async () => {
    useParams.mockReturnValue({ id: '999' });
    const error = new Error('Not found');
    error.response = { status: 404 };
    tilbudService.getTilbudById.mockRejectedValue(error);
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Produkt ikke fundet/)).toBeInTheDocument();
    });
  });

  test('back button navigates to home', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('← Tilbage til tilbud')).toBeInTheDocument();
    });
    
    const backButton = screen.getByLabelText('Tilbage til tilbudsoversigt');
    fireEvent.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('displays validity period when available', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Gyldig 01\/03 - 07\/03/)).toBeInTheDocument();
    });
  });

  test('shows loading skeletons for child components', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    // Child components should show loading skeletons initially
    expect(screen.getByTestId('skeleton-nutrition')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-recipes')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-sustainability')).toBeInTheDocument();
  });

  test('loads nutrition data from API', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockImplementation((url) => {
      if (url.includes('nutrition')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ nutriments: { energy: 100 } }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('nutrition-card')).toHaveTextContent('Nutrition data');
    });
  });

  test('loads recipe data from API', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockImplementation((url) => {
      if (url.includes('recipes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ recipes: [{ id: 1, title: 'Test Recipe' }] }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('recipe-suggestions')).toHaveTextContent('Recipes');
    });
  });

  test('loads sustainability data from API', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    global.fetch.mockImplementation((url) => {
      if (url.includes('sustainability')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { ecoScore: 'A' } }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('sustainability-card')).toHaveTextContent('Sustainability data');
    });
  });
});
