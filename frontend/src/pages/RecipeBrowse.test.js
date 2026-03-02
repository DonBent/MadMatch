import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipeBrowse from './RecipeBrowse';
import { recipeService } from '../services/recipeService';

// Mock the recipe service
jest.mock('../services/recipeService');

const mockRecipes = [
  {
    id: '1',
    title: 'Recipe 1',
    imageUrl: 'https://example.com/1.jpg',
    cookTimeMinutes: 30,
    difficulty: 'EASY',
    servings: 4
  },
  {
    id: '2',
    title: 'Recipe 2',
    imageUrl: 'https://example.com/2.jpg',
    cookTimeMinutes: 45,
    difficulty: 'MEDIUM',
    servings: 2
  },
  {
    id: '3',
    title: 'Recipe 3',
    imageUrl: 'https://example.com/3.jpg',
    cookTimeMinutes: 60,
    difficulty: 'HARD',
    servings: 6
  }
];

const mockSearchResponse = {
  recipes: mockRecipes,
  total: 50,
  limit: 20,
  offset: 0,
  hasMore: true
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('RecipeBrowse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays loading state initially', () => {
    recipeService.searchRecipes.mockImplementation(() => new Promise(() => {}));
    
    renderWithRouter(<RecipeBrowse />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Indlæser opskrifter...')).toBeInTheDocument();
  });

  test('renders recipes after successful fetch', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
      expect(screen.getByText('Recipe 2')).toBeInTheDocument();
      expect(screen.getByText('Recipe 3')).toBeInTheDocument();
    });
  });

  test('displays recipe grid with correct data-testid', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByTestId('recipe-browse-grid')).toBeInTheDocument();
    });
  });

  test('displays total recipe count', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByText(/Viser 3 af 50 opskrifter/)).toBeInTheDocument();
    });
  });

  test('displays error message on fetch failure', async () => {
    recipeService.searchRecipes.mockRejectedValue(new Error('API Error'));
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Kunne ikke indlæse opskrifter. Prøv igen senere.')).toBeInTheDocument();
    });
  });

  test('retry button works after error', async () => {
    recipeService.searchRecipes
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    const retryButton = screen.getByTestId('retry-button');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
  });

  test('displays no results message when recipes array is empty', async () => {
    recipeService.searchRecipes.mockResolvedValue({
      recipes: [],
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false
    });
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByTestId('no-results')).toBeInTheDocument();
      expect(screen.getByText('Ingen opskrifter fundet.')).toBeInTheDocument();
    });
  });

  test('pagination controls are displayed when there are multiple pages', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-previous')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-next')).toBeInTheDocument();
    });
  });

  test('previous button is disabled on first page', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      const prevButton = screen.getByTestId('pagination-previous');
      expect(prevButton).toBeDisabled();
    });
  });

  test('next button is enabled when hasMore is true', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      const nextButton = screen.getByTestId('pagination-next');
      expect(nextButton).not.toBeDisabled();
    });
  });

  test('next button is disabled when hasMore is false', async () => {
    recipeService.searchRecipes.mockResolvedValue({
      ...mockSearchResponse,
      hasMore: false
    });
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      const nextButton = screen.getByTestId('pagination-next');
      expect(nextButton).toBeDisabled();
    });
  });

  test('clicking next button loads next page', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });

    const nextButton = screen.getByTestId('pagination-next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(recipeService.searchRecipes).toHaveBeenCalledWith({
        query: '',
        language: 'da',
        limit: 20,
        offset: 20
      });
    });
  });

  test('clicking page number loads that page', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });

    const page2Button = screen.getByTestId('pagination-page-2');
    fireEvent.click(page2Button);

    await waitFor(() => {
      expect(recipeService.searchRecipes).toHaveBeenCalledWith({
        query: '',
        language: 'da',
        limit: 20,
        offset: 20
      });
    });
  });

  test('calls searchRecipes with correct parameters', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(recipeService.searchRecipes).toHaveBeenCalledWith({
        query: '',
        language: 'da',
        limit: 20,
        offset: 0
      });
    });
  });

  test('scrolls to top when changing pages', async () => {
    const scrollToMock = jest.fn();
    window.scrollTo = scrollToMock;

    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });

    const nextButton = screen.getByTestId('pagination-next');
    fireEvent.click(nextButton);

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  // Search functionality tests
  test('displays search input with correct data-testid', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByTestId('recipe-search-input')).toBeInTheDocument();
    });
  });

  test('search input has correct placeholder', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    const searchInput = await screen.findByTestId('recipe-search-input');
    expect(searchInput).toHaveAttribute('placeholder', 'Søg efter opskrifter...');
  });

  test('typing in search input updates the value', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    const searchInput = await screen.findByTestId('recipe-search-input');
    fireEvent.change(searchInput, { target: { value: 'kylling' } });
    
    expect(searchInput.value).toBe('kylling');
  });

  test('search is debounced with 500ms delay', async () => {
    jest.useFakeTimers();
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByTestId('recipe-search-input')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('recipe-search-input');
    
    // Type in search
    fireEvent.change(searchInput, { target: { value: 'k' } });
    fireEvent.change(searchInput, { target: { value: 'ky' } });
    fireEvent.change(searchInput, { target: { value: 'kyl' } });
    fireEvent.change(searchInput, { target: { value: 'kylling' } });
    
    // Should not have called searchRecipes yet (except initial load)
    expect(recipeService.searchRecipes).toHaveBeenCalledTimes(1);
    
    // Fast-forward 500ms
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(recipeService.searchRecipes).toHaveBeenCalledWith({
        query: 'kylling',
        language: 'da',
        limit: 20,
        offset: 0
      });
    });

    jest.useRealTimers();
  });

  test('search calls API with query parameter', async () => {
    jest.useFakeTimers();
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    const searchInput = await screen.findByTestId('recipe-search-input');
    fireEvent.change(searchInput, { target: { value: 'pasta' } });
    
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(recipeService.searchRecipes).toHaveBeenCalledWith({
        query: 'pasta',
        language: 'da',
        limit: 20,
        offset: 0
      });
    });

    jest.useRealTimers();
  });

  test('clear button appears when search query is entered', async () => {
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    const searchInput = await screen.findByTestId('recipe-search-input');
    
    // Clear button should not be visible initially
    expect(screen.queryByTestId('clear-search-button')).not.toBeInTheDocument();
    
    // Type in search
    fireEvent.change(searchInput, { target: { value: 'kylling' } });
    
    // Clear button should now be visible
    expect(screen.getByTestId('clear-search-button')).toBeInTheDocument();
  });

  test('clicking clear button resets search', async () => {
    jest.useFakeTimers();
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    const searchInput = await screen.findByTestId('recipe-search-input');
    
    // Enter search query
    fireEvent.change(searchInput, { target: { value: 'kylling' } });
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(searchInput.value).toBe('kylling');
    });
    
    // Click clear button
    const clearButton = screen.getByTestId('clear-search-button');
    fireEvent.click(clearButton);
    
    // Search input should be cleared
    expect(searchInput.value).toBe('');
    
    // Should trigger search with empty query
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(recipeService.searchRecipes).toHaveBeenCalledWith({
        query: '',
        language: 'da',
        limit: 20,
        offset: 0
      });
    });

    jest.useRealTimers();
  });

  test('displays empty state with search-specific message when no results found', async () => {
    jest.useFakeTimers();
    recipeService.searchRecipes
      .mockResolvedValueOnce(mockSearchResponse)
      .mockResolvedValueOnce({
        recipes: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false
      });
    
    renderWithRouter(<RecipeBrowse />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByTestId('recipe-search-input');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(screen.getByText('Ingen opskrifter fundet. Prøv et andet søgeord.')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('search resets to page 1 when query changes', async () => {
    jest.useFakeTimers();
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByTestId('recipe-search-input');
    
    // Type search query first
    fireEvent.change(searchInput, { target: { value: 'kylling' } });
    
    // Advance timers to trigger debounce
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Wait for search to trigger with offset 0
    await waitFor(() => {
      expect(recipeService.searchRecipes).toHaveBeenCalledWith({
        query: 'kylling',
        language: 'da',
        limit: 20,
        offset: 0
      });
    });

    jest.useRealTimers();
  });

  test('pagination works with search query', async () => {
    jest.useFakeTimers();
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    const searchInput = await screen.findByTestId('recipe-search-input');
    fireEvent.change(searchInput, { target: { value: 'pasta' } });
    
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(recipeService.searchRecipes).toHaveBeenCalledWith({
        query: 'pasta',
        language: 'da',
        limit: 20,
        offset: 0
      });
    });
    
    // Click next page
    const nextButton = screen.getByTestId('pagination-next');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(recipeService.searchRecipes).toHaveBeenCalledWith({
        query: 'pasta',
        language: 'da',
        limit: 20,
        offset: 20
      });
    });

    jest.useRealTimers();
  });

  test('recipe count shows search query when searching', async () => {
    jest.useFakeTimers();
    recipeService.searchRecipes.mockResolvedValue(mockSearchResponse);
    
    renderWithRouter(<RecipeBrowse />);
    
    const searchInput = await screen.findByTestId('recipe-search-input');
    fireEvent.change(searchInput, { target: { value: 'kylling' } });
    
    jest.advanceTimersByTime(500);
    
    await waitFor(() => {
      expect(screen.getByText(/Viser 3 af 50 opskrifter for "kylling"/)).toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
