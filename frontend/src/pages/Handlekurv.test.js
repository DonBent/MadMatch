import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Handlekurv from './Handlekurv';
import { CartProvider } from '../contexts/CartContext';
import { BudgetProvider } from '../contexts/BudgetContext';
import { tilbudService } from '../services/tilbudService';

// Mock the tilbudService
jest.mock('../services/tilbudService');

const mockTilbud = [
  {
    id: 1,
    navn: 'Product 1',
    butik: 'Store A',
    tilbudspris: 10.0,
    normalpris: 20.0,
    rabat: 50
  },
  {
    id: 2,
    navn: 'Product 2',
    butik: 'Store B',
    tilbudspris: 15.0,
    normalpris: 30.0,
    rabat: 50
  },
  {
    id: 3,
    navn: 'Product 3',
    butik: 'Store C',
    tilbudspris: 25.0,
    normalpris: 50.0,
    rabat: 50
  }
];

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <CartProvider>
        <BudgetProvider>
          {component}
        </BudgetProvider>
      </CartProvider>
    </BrowserRouter>
  );
};

describe('Handlekurv', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    tilbudService.getAllTilbud.mockResolvedValue(mockTilbud);
  });

  test('renders page header', () => {
    renderWithRouter(<Handlekurv />);
    expect(screen.getByText('🛒 Handlekurv')).toBeInTheDocument();
    expect(screen.getByText('← Tilbage')).toBeInTheDocument();
  });

  test('shows empty cart message when cart is empty', async () => {
    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      expect(screen.getByText('Din handlekurv er tom')).toBeInTheDocument();
      expect(screen.getByText('Find tilbud og tilføj til kurven!')).toBeInTheDocument();
    });
  });

  test('shows "Se tilbud" link when cart is empty', async () => {
    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      expect(screen.getByText('Se tilbud')).toBeInTheDocument();
    });
  });

  test('displays cart items when cart has products', async () => {
    const mockCart = {
      version: 1,
      cart: [
        { productId: 1, quantity: 2, addedAt: '2026-02-28T15:00:00.000Z' },
        { productId: 2, quantity: 1, addedAt: '2026-02-28T15:01:00.000Z' }
      ]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });
  });

  test('displays correct total items count', async () => {
    const mockCart = {
      version: 1,
      cart: [
        { productId: 1, quantity: 2, addedAt: '2026-02-28T15:00:00.000Z' },
        { productId: 2, quantity: 3, addedAt: '2026-02-28T15:01:00.000Z' }
      ]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      expect(screen.getByText('Varer (5)')).toBeInTheDocument();
    });
  });

  test('calculates total cost correctly', async () => {
    const mockCart = {
      version: 1,
      cart: [
        { productId: 1, quantity: 2, addedAt: '2026-02-28T15:00:00.000Z' },
        { productId: 2, quantity: 1, addedAt: '2026-02-28T15:01:00.000Z' }
      ]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      // (2 * 10.00) + (1 * 15.00) = 35.00
      const priceCells = screen.getAllByText(/35\.00 kr/);
      expect(priceCells.length).toBeGreaterThan(0);
    });
  });

  test('calculates total savings correctly', async () => {
    const mockCart = {
      version: 1,
      cart: [
        { productId: 1, quantity: 2, addedAt: '2026-02-28T15:00:00.000Z' },
        { productId: 2, quantity: 1, addedAt: '2026-02-28T15:01:00.000Z' }
      ]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      // (2 * 10.00) + (1 * 15.00) = 35.00 total savings
      const savingsElements = screen.getAllByText(/35\.00 kr/);
      expect(savingsElements.length).toBeGreaterThan(0);
    });
  });

  test('shows "Tøm kurv" button when cart has items', async () => {
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      expect(screen.getByText('Tøm kurv')).toBeInTheDocument();
    });
  });

  test('shows confirmation dialog when "Tøm kurv" clicked', async () => {
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Tøm kurv'));
    });

    expect(screen.getByText('Tøm handlekurv?')).toBeInTheDocument();
    expect(screen.getByText('Er du sikker på, at du vil fjerne alle varer fra handlekurven?')).toBeInTheDocument();
  });

  test('clears cart when confirmation dialog confirmed', async () => {
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Tøm kurv'));
    });

    fireEvent.click(screen.getByText('Ja, tøm kurv'));

    await waitFor(() => {
      expect(screen.getByText('Din handlekurv er tom')).toBeInTheDocument();
    });

    const stored = localStorage.getItem('madmatch_cart');
    const data = JSON.parse(stored);
    expect(data.cart).toHaveLength(0);
  });

  test('closes dialog when "Annuller" clicked', async () => {
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Tøm kurv'));
    });

    fireEvent.click(screen.getByText('Annuller'));

    await waitFor(() => {
      expect(screen.queryByText('Tøm handlekurv?')).not.toBeInTheDocument();
    });

    // Cart should still have items
    const stored = localStorage.getItem('madmatch_cart');
    const data = JSON.parse(stored);
    expect(data.cart).toHaveLength(1);
  });

  test('closes dialog when overlay clicked', async () => {
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Tøm kurv'));
    });

    const overlay = screen.getByText('Tøm handlekurv?').closest('.dialog').parentElement;
    fireEvent.click(overlay);

    await waitFor(() => {
      expect(screen.queryByText('Tøm handlekurv?')).not.toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    expect(screen.getByText('Indlæser handlekurv...')).toBeInTheDocument();
  });

  test('shows error message when loading fails', async () => {
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    tilbudService.getAllTilbud.mockRejectedValue(new Error('Network error'));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      expect(screen.getByText('Kunne ikke indlæse handlekurv.')).toBeInTheDocument();
    });
  });

  test('retries loading when "Prøv igen" clicked', async () => {
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    tilbudService.getAllTilbud.mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      expect(screen.getByText('Kunne ikke indlæse handlekurv.')).toBeInTheDocument();
    });

    tilbudService.getAllTilbud.mockResolvedValue(mockTilbud);

    fireEvent.click(screen.getByText('Prøv igen'));

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });
  });

  test('filters out products not in tilbud list', async () => {
    const mockCart = {
      version: 1,
      cart: [
        { productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' },
        { productId: 999, quantity: 1, addedAt: '2026-02-28T15:01:00.000Z' }
      ]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.queryByText('Product 999')).not.toBeInTheDocument();
    });
  });

  test('renders cart summary section', async () => {
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    renderWithRouter(<Handlekurv />);

    await waitFor(() => {
      expect(screen.getByText('Oversigt')).toBeInTheDocument();
      expect(screen.getByText('Antal varer:')).toBeInTheDocument();
      expect(screen.getByText('Samlet pris:')).toBeInTheDocument();
      expect(screen.getByText('Samlet besparelse:')).toBeInTheDocument();
    });
  });

  test('back link navigates to home', () => {
    renderWithRouter(<Handlekurv />);
    
    const backLink = screen.getByText('← Tilbage');
    expect(backLink).toHaveAttribute('href', '/');
  });
});
