import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RecipeDetail from './RecipeDetail';
import { RecipeFavoriteProvider } from '../contexts/RecipeFavoriteContext';
import * as recipeService from '../services/recipeService';

// Mock dependencies
jest.mock('../services/recipeService');

const mockNavigate = jest.fn();
const mockParams = { id: 'recipe-123' };

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useParams: () => mockParams,
  useNavigate: () => mockNavigate
}));

const mockRecipe = {
  id: 'recipe-123',
  title: 'Lækker lasagne',
  imageUrl: 'https://example.com/lasagne.jpg',
  source: {
    id: 'source-arla-001',
    name: 'arla'
  },
  prepTimeMinutes: 20,
  cookTimeMinutes: 45,
  totalTimeMinutes: 65,
  servings: 4,
  difficulty: 'MEDIUM',
  ingredients: [
    { quantity: '500', unit: 'g', name: 'Hakket oksekød' },
    { quantity: '1', unit: 'stk', name: 'Løg' },
    { quantity: '2', unit: 'dl', name: 'Mælk' }
  ],
  instructions: [
    'Steg kødet og løget.',
    'Tilsæt tomatpuré og krydderier.',
    'Skift med lasagneplader og bechamelsauce.',
    'Bag i ovnen ved 200 grader i 45 minutter.'
  ]
};

describe('RecipeDetail Component', () => {
  beforeEach(() => {
    mockParams.id = 'recipe-123';
    mockNavigate.mockClear();
    
    jest.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <RecipeFavoriteProvider>
        <RecipeDetail />
      </RecipeFavoriteProvider>
    );
  };

  describe('Loading State', () => {
    test('shows loading skeleton while fetching recipe', () => {
      recipeService.getRecipe.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockRecipe), 100))
      );

      renderComponent();
      
      expect(screen.getByTestId('skeleton-recipe')).toBeInTheDocument();
      expect(screen.getByLabelText(/indlæser opskrift/i)).toBeInTheDocument();
    });
  });

  describe('Successful Recipe Load', () => {
    beforeEach(() => {
      recipeService.getRecipe.mockResolvedValue(mockRecipe);
    });

    test('loads and displays full recipe from API', async () => {
      renderComponent();

      const title = await screen.findByTestId('recipe-detail-title', {}, { timeout: 3000 });
      expect(title).toHaveTextContent('Lækker lasagne');
      expect(recipeService.getRecipe).toHaveBeenCalledWith('recipe-123');
    });

    test('displays all recipe fields correctly', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      // Meta information - check that time labels exist with values
      expect(screen.getByText('Forberedelse:')).toBeInTheDocument();
      expect(screen.getByText('Tilberedningstid:')).toBeInTheDocument();
      expect(screen.getByText('Total tid:')).toBeInTheDocument();
      expect(screen.getByText('Portioner:')).toBeInTheDocument();
      expect(screen.getByText('Sværhedsgrad:')).toBeInTheDocument();
      
      // Check difficulty value
      expect(screen.getByText('Middel')).toBeInTheDocument();
      
      // Check that meta info section exists
      const metaInfo = screen.getByRole('region', { name: /opskriftsinformation/i });
      expect(metaInfo).toBeInTheDocument();
      expect(metaInfo).toHaveTextContent('Portioner:');
      expect(metaInfo).toHaveTextContent('4');
    });

    test('formats ingredients as bullet list with quantities', async () => {
      renderComponent();

      await screen.findByText('Ingredienser');

      // Check ingredients section exists
      const ingredientsSection = screen.getByRole('region', { name: /ingredienser/i });
      expect(ingredientsSection).toBeInTheDocument();
      
      // Check ingredients are displayed
      expect(screen.getByText('Hakket oksekød')).toBeInTheDocument();
      expect(screen.getByText('Løg')).toBeInTheDocument();
      expect(screen.getByText('Mælk')).toBeInTheDocument();
    });

    test('formats instructions as numbered steps', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Fremgangsmåde')).toBeInTheDocument();
      });

      expect(screen.getByText('Steg kødet og løget.')).toBeInTheDocument();
      expect(screen.getByText('Tilsæt tomatpuré og krydderier.')).toBeInTheDocument();
      expect(screen.getByText('Skift med lasagneplader og bechamelsauce.')).toBeInTheDocument();
      expect(screen.getByText('Bag i ovnen ved 200 grader i 45 minutter.')).toBeInTheDocument();

      // Check step numbers are present
      const steps = screen.getAllByLabelText(/Trin \d+/);
      expect(steps).toHaveLength(4);
    });

    test('displays breadcrumb navigation', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
      expect(breadcrumb).toBeInTheDocument();
      
      const opskrifterLink = screen.getByRole('button', { name: /tilbage til opskrifter/i });
      expect(opskrifterLink).toBeInTheDocument();
    });

    test('breadcrumb navigates back to recipe browse', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const backButton = screen.getByRole('button', { name: /tilbage til opskrifter/i });
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/opskrifter');
    });

    test('displays source badge for Arla recipes', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Arla')).toBeInTheDocument();
      });

      const arlaBadge = screen.getByText('Arla');
      expect(arlaBadge).toBeInTheDocument();
    });
  });

  describe('Favorite Button', () => {
    beforeEach(() => {
      recipeService.getRecipe.mockResolvedValue(mockRecipe);
    });

    test('favorite button is functional and synced with context', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const favoriteButton = screen.getByRole('button', { name: /tilføj til favoritter/i });
      expect(favoriteButton).toBeInTheDocument();
      expect(favoriteButton).toHaveTextContent('🤍');
      expect(favoriteButton).toHaveTextContent('Tilføj til favoritter');

      // Click to add favorite
      fireEvent.click(favoriteButton);

      await waitFor(() => {
        expect(favoriteButton).toHaveTextContent('❤️');
        expect(favoriteButton).toHaveTextContent('Fjern favorit');
        expect(favoriteButton).toHaveClass('favorited');
      });

      // Click to remove favorite
      fireEvent.click(favoriteButton);

      await waitFor(() => {
        expect(favoriteButton).toHaveTextContent('🤍');
        expect(favoriteButton).toHaveTextContent('Tilføj til favoritter');
        expect(favoriteButton).not.toHaveClass('favorited');
      });
    });

    test('favorite state persists in localStorage', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const favoriteButton = screen.getByRole('button', { name: /tilføj til favoritter/i });
      fireEvent.click(favoriteButton);

      await waitFor(() => {
        const stored = localStorage.getItem('madmatch_favorite_recipes');
        expect(stored).toBeTruthy();
        const data = JSON.parse(stored);
        expect(data.favorites).toContain('recipe-123');
      });
    });
  });

  describe('Action Buttons', () => {
    beforeEach(() => {
      recipeService.getRecipe.mockResolvedValue(mockRecipe);
    });

    test('"Tilføj til ugeplan" button is DISABLED with tooltip', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const ugeplanButton = screen.getByRole('button', { name: /tilføj til ugeplan.*kommer snart/i });
      expect(ugeplanButton).toBeInTheDocument();
      expect(ugeplanButton).toBeDisabled();
      expect(ugeplanButton).toHaveAttribute('title', 'Kommer i næste version');
      expect(ugeplanButton).toHaveTextContent('📅');
      expect(ugeplanButton).toHaveTextContent('Tilføj til ugeplan');
    });

    test('"Find matchende tilbud" button is visible and clickable', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const tilbudButton = screen.getByRole('button', { name: /find matchende tilbud/i });
      expect(tilbudButton).toBeInTheDocument();
      expect(tilbudButton).not.toBeDisabled();
      expect(tilbudButton).toHaveTextContent('🛒');
      expect(tilbudButton).toHaveTextContent('Find matchende tilbud');
    });

    test('"Find matchende tilbud" button has data-testid', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const tilbudButton = screen.getByTestId('recipe-to-tilbud-button');
      expect(tilbudButton).toBeInTheDocument();
      expect(tilbudButton).toHaveTextContent('Find matchende tilbud');
    });

    test('clicking "Find matchende tilbud" navigates to /tilbud with ingredients', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const tilbudButton = screen.getByTestId('recipe-to-tilbud-button');
      fireEvent.click(tilbudButton);

      expect(mockNavigate).toHaveBeenCalled();
      const navigateCall = mockNavigate.mock.calls[0][0];
      
      // Should navigate to /tilbud with search params
      expect(navigateCall).toContain('/tilbud?search=');
      
      // Should include key ingredients (URL-encoded)
      expect(decodeURIComponent(navigateCall)).toContain('oksekød');
    });

    test('extracts and formats ingredients correctly', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const tilbudButton = screen.getByTestId('recipe-to-tilbud-button');
      fireEvent.click(tilbudButton);

      const navigateCall = mockNavigate.mock.calls[0][0];
      
      // Should format as comma-separated list
      expect(navigateCall).toMatch(/\/tilbud\?search=.+/);
      
      // Should URL-encode the search query
      expect(decodeURIComponent(navigateCall)).toContain('oksekød');
    });

    test('handles recipe without ingredients gracefully', async () => {
      const recipeNoIngredients = {
        ...mockRecipe,
        ingredients: []
      };
      recipeService.getRecipe.mockResolvedValue(recipeNoIngredients);

      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const tilbudButton = screen.getByTestId('recipe-to-tilbud-button');
      fireEvent.click(tilbudButton);

      // Should still navigate but without search params
      expect(mockNavigate).toHaveBeenCalledWith('/tilbud');
    });
  });

  describe('Error Handling', () => {
    test('displays 404 error page for invalid recipe ID', async () => {
      recipeService.getRecipe.mockRejectedValue({ 
        response: { status: 404 } 
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/opskrift ikke fundet/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      
      const backButton = screen.getByRole('button', { name: /tilbage til opskrifter/i });
      expect(backButton).toBeInTheDocument();
    });

    test('displays generic error for network failures', async () => {
      recipeService.getRecipe.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/kunne ikke indlæse opskrift/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('error back button navigates to recipe browse', async () => {
      recipeService.getRecipe.mockRejectedValue({ 
        response: { status: 404 } 
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/opskrift ikke fundet/i)).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /tilbage til opskrifter/i });
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/opskrifter');
    });
  });

  describe('Recipe Without Optional Fields', () => {
    test('handles recipe without image gracefully', async () => {
      const recipeWithoutImage = {
        ...mockRecipe,
        imageUrl: null
      };
      recipeService.getRecipe.mockResolvedValue(recipeWithoutImage);

      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      expect(screen.getByLabelText(/intet opskriftsbillede/i)).toBeInTheDocument();
      expect(screen.getByText(/intet billede tilgængeligt/i)).toBeInTheDocument();
    });

    test('handles recipe without prep time', async () => {
      const recipeNoPrepTime = {
        ...mockRecipe,
        prepTimeMinutes: null
      };
      recipeService.getRecipe.mockResolvedValue(recipeNoPrepTime);

      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      // Should not show prep time label
      expect(screen.queryByText('Forberedelse:')).not.toBeInTheDocument();
      
      // Should still show cook and total time labels
      expect(screen.getByText('Tilberedningstid:')).toBeInTheDocument();
      expect(screen.getByText('Total tid:')).toBeInTheDocument();
    });
  });

  describe('data-testid Requirements', () => {
    test('recipe title has data-testid="recipe-detail-title"', async () => {
      recipeService.getRecipe.mockResolvedValue(mockRecipe);

      renderComponent();

      await waitFor(() => {
        const title = screen.getByTestId('recipe-detail-title');
        expect(title).toBeInTheDocument();
        expect(title).toHaveTextContent('Lækker lasagne');
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      recipeService.getRecipe.mockResolvedValue(mockRecipe);
    });

    test('has proper ARIA labels', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      expect(screen.getByRole('region', { name: /opskriftsinformation/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /ingredienser/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /fremgangsmåde/i })).toBeInTheDocument();
    });

    test('buttons have descriptive aria-labels', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      expect(screen.getByRole('button', { name: /tilbage til opskrifter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tilføj til favoritter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /find matchende tilbud/i })).toBeInTheDocument();
    });
  });
});
