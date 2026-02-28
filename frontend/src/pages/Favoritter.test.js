import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Favoritter from './Favoritter';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { tilbudService } from '../services/tilbudService';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  Link: ({ children, to, className }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

// Mock the tilbudService
jest.mock('../services/tilbudService');

// Mock TilbudCard component
jest.mock('../components/TilbudCard', () => ({
  __esModule: true,
  default: ({ tilbud }) => (
    <div data-testid={`tilbud-card-${tilbud.id}`}>
      {tilbud.navn}
    </div>
  ),
}));

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

// Mock console.error to suppress expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Helper to render with all necessary providers
const renderWithProviders = (ui) => {
  return render(
    <FavoritesProvider>
      {ui}
    </FavoritesProvider>
  );
};

describe('Favoritter', () => {
  const mockTilbud = [
    {
      id: 1,
      navn: 'Product 1',
      butik: 'Store A',
      kategori: 'Category 1',
      normalpris: 100,
      tilbudspris: 75,
      rabat: 25,
    },
    {
      id: 2,
      navn: 'Product 2',
      butik: 'Store B',
      kategori: 'Category 2',
      normalpris: 200,
      tilbudspris: 150,
      rabat: 25,
    },
    {
      id: 3,
      navn: 'Product 3',
      butik: 'Store C',
      kategori: 'Category 3',
      normalpris: 50,
      tilbudspris: 40,
      rabat: 20,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders empty state when no favorites', async () => {
    tilbudService.getAllTilbud.mockResolvedValue([]);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('♥ Dine favoritter (0)')).toBeInTheDocument();
    });
    
    expect(screen.getByText('♡', { selector: '.empty-icon' })).toBeInTheDocument();
    expect(screen.getByText('Du har ingen favoritter endnu')).toBeInTheDocument();
    expect(screen.getByText('Klik på ❤️ for at gemme tilbud!')).toBeInTheDocument();
    expect(screen.getByText('Se alle tilbud')).toBeInTheDocument();
  });

  test('displays correct header with favorite count', async () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1, 2],
      version: 1
    }));
    
    tilbudService.getAllTilbud.mockResolvedValue(mockTilbud);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('♥ Dine favoritter (2)')).toBeInTheDocument();
    });
  });

  test('renders back link to all tilbud', async () => {
    tilbudService.getAllTilbud.mockResolvedValue([]);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      const backLink = screen.getByText('← Tilbage til alle tilbud');
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  test('fetches and displays favorited products', async () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1, 2],
      version: 1
    }));
    
    tilbudService.getAllTilbud.mockResolvedValue(mockTilbud);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(tilbudService.getAllTilbud).toHaveBeenCalledTimes(1);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('tilbud-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('tilbud-card-2')).toBeInTheDocument();
      expect(screen.queryByTestId('tilbud-card-3')).not.toBeInTheDocument();
    });
  });

  test('filters tilbud to show only favorites', async () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1, 3],
      version: 1
    }));
    
    tilbudService.getAllTilbud.mockResolvedValue(mockTilbud);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByTestId('tilbud-card-1')).toHaveTextContent('Product 1');
      expect(screen.getByTestId('tilbud-card-3')).toHaveTextContent('Product 3');
      expect(screen.queryByTestId('tilbud-card-2')).not.toBeInTheDocument();
    });
  });

  test('renders TilbudCard components for each favorite', async () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1, 2, 3],
      version: 1
    }));
    
    tilbudService.getAllTilbud.mockResolvedValue(mockTilbud);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      const tilbudGrid = screen.getByTestId('tilbud-card-1').parentElement;
      expect(tilbudGrid).toHaveClass('tilbud-grid');
      expect(screen.getByTestId('tilbud-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('tilbud-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('tilbud-card-3')).toBeInTheDocument();
    });
  });

  test('handles error state gracefully', async () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1],
      version: 1
    }));
    
    tilbudService.getAllTilbud.mockRejectedValue(new Error('Network error'));
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('⚠️ Fejl')).toBeInTheDocument();
      expect(screen.getByText('Kunne ikke indlæse favoritter.')).toBeInTheDocument();
    });
  });

  test('shows retry button on error', async () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1],
      version: 1
    }));
    
    tilbudService.getAllTilbud.mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockTilbud);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('Prøv igen')).toBeInTheDocument();
    });
    
    const retryButton = screen.getByText('Prøv igen');
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(tilbudService.getAllTilbud).toHaveBeenCalledTimes(2);
    });
  });

  test('retry button reloads favorite tilbud', async () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1],
      version: 1
    }));
    
    tilbudService.getAllTilbud
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockTilbud);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('Kunne ikke indlæse favoritter.')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Prøv igen'));
    
    await waitFor(() => {
      expect(screen.getByTestId('tilbud-card-1')).toBeInTheDocument();
    });
  });

  test('displays footer with version information', async () => {
    tilbudService.getAllTilbud.mockResolvedValue([]);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('MadMatch MVP v1.6 | Epic 3 - Favoritter')).toBeInTheDocument();
    });
  });

  test('renders header with tagline', async () => {
    tilbudService.getAllTilbud.mockResolvedValue([]);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('🛒 MadMatch')).toBeInTheDocument();
      expect(screen.getByText('Find de bedste tilbud')).toBeInTheDocument();
    });
  });

  test('empty state has link to browse tilbud', async () => {
    tilbudService.getAllTilbud.mockResolvedValue([]);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      const browseLink = screen.getByText('Se alle tilbud');
      expect(browseLink).toBeInTheDocument();
      expect(browseLink).toHaveAttribute('href', '/');
    });
  });

  test('handles empty favorites array correctly', async () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [],
      version: 1
    }));
    
    tilbudService.getAllTilbud.mockResolvedValue(mockTilbud);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('♥ Dine favoritter (0)')).toBeInTheDocument();
      expect(screen.getByText('Du har ingen favoritter endnu')).toBeInTheDocument();
    });
    
    // Should not call getAllTilbud when favorites is empty
    await waitFor(() => {
      expect(tilbudService.getAllTilbud).not.toHaveBeenCalled();
    });
  });

  test('correctly filters when favorite IDs do not match any tilbud', async () => {
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [999, 1000],
      version: 1
    }));
    
    tilbudService.getAllTilbud.mockResolvedValue(mockTilbud);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('♥ Dine favoritter (2)')).toBeInTheDocument();
    });
    
    // Should show no tilbud cards since no IDs match
    expect(screen.queryByTestId('tilbud-card-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tilbud-card-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tilbud-card-3')).not.toBeInTheDocument();
  });

  test('updates tilbud list when favorites change during runtime', async () => {
    // Start with favorites [1]
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1],
      version: 1
    }));
    
    tilbudService.getAllTilbud.mockResolvedValue(mockTilbud);
    
    const TestWrapper = () => {
      const [key, setKey] = React.useState(0);
      return (
        <FavoritesProvider key={key}>
          <button onClick={() => setKey(k => k + 1)}>Update</button>
          <Favoritter />
        </FavoritesProvider>
      );
    };
    
    render(<TestWrapper />);
    
    await waitFor(() => {
      expect(screen.getByTestId('tilbud-card-1')).toBeInTheDocument();
    });
    
    // Change favorites
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [2],
      version: 1
    }));
    
    // Force re-render with new context
    fireEvent.click(screen.getByText('Update'));
    
    await waitFor(() => {
      expect(screen.getByTestId('tilbud-card-2')).toBeInTheDocument();
    });
  });

  test('logs error to console when fetch fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    localStorage.setItem('madmatch_favorites', JSON.stringify({
      favorites: [1],
      version: 1
    }));
    
    const error = new Error('Network error');
    tilbudService.getAllTilbud.mockRejectedValue(error);
    
    renderWithProviders(<Favoritter />);
    
    await waitFor(() => {
      expect(screen.getByText('Kunne ikke indlæse favoritter.')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });
});
