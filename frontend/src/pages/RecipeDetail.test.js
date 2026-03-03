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
  description: 'En dejlig klassisk lasagne med oksekød og bechamelsauce.',
  source: {
    id: 'source-arla-001',
    name: 'arla'
  },
  sourceUrl: 'https://www.arla.dk/opskrifter/laekker-lasagne',
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
    
    // Mock window.open
    global.open = jest.fn();
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

    test('loads and displays recipe from API', async () => {
      renderComponent();

      const title = await screen.findByTestId('recipe-detail-title', {}, { timeout: 3000 });
      expect(title).toHaveTextContent('Lækker lasagne');
      expect(recipeService.getRecipe).toHaveBeenCalledWith('recipe-123');
    });

    test('displays recipe metadata correctly', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      // Meta information
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

    test('displays description when available', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      expect(screen.getByText('En dejlig klassisk lasagne med oksekød og bechamelsauce.')).toBeInTheDocument();
    });

    test('does NOT display ingredients list', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      // Should not show ingredients section
      expect(screen.queryByText('Ingredienser')).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: /ingredienser/i })).not.toBeInTheDocument();
      
      // Should not show specific ingredients
      expect(screen.queryByText('Hakket oksekød')).not.toBeInTheDocument();
      expect(screen.queryByText('Løg')).not.toBeInTheDocument();
      expect(screen.queryByText('Mælk')).not.toBeInTheDocument();
    });

    test('does NOT display instructions', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      // Should not show instructions section
      expect(screen.queryByText('Fremgangsmåde')).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: /fremgangsmåde/i })).not.toBeInTheDocument();
      
      // Should not show specific instructions
      expect(screen.queryByText('Steg kødet og løget.')).not.toBeInTheDocument();
      expect(screen.queryByText('Tilsæt tomatpuré og krydderier.')).not.toBeInTheDocument();
    });

    test('displays copyright-friendly source CTA section', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      // Check CTA heading
      expect(screen.getByText('Se den fulde opskrift')).toBeInTheDocument();
      
      // Check copyright message
      expect(screen.getByText(/for den fulde opskrift med ingredienser og fremgangsmåde/i)).toBeInTheDocument();
      
      // Check that source name appears in the message
      const ctaSection = screen.getByRole('region', { name: /se den fulde opskrift/i });
      expect(ctaSection).toHaveTextContent('Arla');
    });

    test('displays "Se fuld opskrift" button with correct link', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const viewRecipeButton = screen.getByTestId('view-full-recipe-button');
      expect(viewRecipeButton).toBeInTheDocument();
      expect(viewRecipeButton).toHaveTextContent('Se fuld opskrift');
      expect(viewRecipeButton).toHaveTextContent('📖');
    });

    test('clicking "Se fuld opskrift" opens source URL in new tab', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const viewRecipeButton = screen.getByTestId('view-full-recipe-button');
      fireEvent.click(viewRecipeButton);

      expect(global.open).toHaveBeenCalledWith(
        'https://www.arla.dk/opskrifter/laekker-lasagne',
        '_blank',
        'noopener,noreferrer'
      );
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

      await screen.findByTestId('recipe-detail-title');

      // Find the source badge specifically (not in the CTA section)
      const sourceBadges = screen.getAllByText('Arla');
      expect(sourceBadges.length).toBeGreaterThan(0);
      
      // Verify at least one is in the source badge area
      const sourceBadge = sourceBadges.find(el => 
        el.closest('.recipe-source-badge')
      );
      expect(sourceBadge).toBeTruthy();
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

  describe('Source URL Handling', () => {
    test('handles recipe without sourceUrl gracefully', async () => {
      const recipeNoUrl = {
        ...mockRecipe,
        sourceUrl: null
      };
      recipeService.getRecipe.mockResolvedValue(recipeNoUrl);

      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      // Should show message that link is unavailable
      expect(screen.getByText(/link til opskrift er ikke tilgængelig/i)).toBeInTheDocument();
      
      // Should not show the button
      expect(screen.queryByTestId('view-full-recipe-button')).not.toBeInTheDocument();
    });

    test('displays correct source name for different sources', async () => {
      const recipeOtherSource = {
        ...mockRecipe,
        source: {
          id: 'source-valdemarsro-001',
          name: 'valdemarsro'
        }
      };
      recipeService.getRecipe.mockResolvedValue(recipeOtherSource);

      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      // Check that Valdemarsro appears in the CTA section
      const ctaSection = screen.getByRole('region', { name: /se den fulde opskrift/i });
      expect(ctaSection).toHaveTextContent('Valdemarsro');
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

    test('handles recipe without description gracefully', async () => {
      const recipeNoDescription = {
        ...mockRecipe,
        description: null
      };
      recipeService.getRecipe.mockResolvedValue(recipeNoDescription);

      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      // Description section should not be rendered
      expect(screen.queryByText('En dejlig klassisk lasagne')).not.toBeInTheDocument();
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

    test('view full recipe button has data-testid', async () => {
      recipeService.getRecipe.mockResolvedValue(mockRecipe);

      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      const button = screen.getByTestId('view-full-recipe-button');
      expect(button).toBeInTheDocument();
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
      expect(screen.getByRole('region', { name: /se den fulde opskrift/i })).toBeInTheDocument();
    });

    test('buttons have descriptive aria-labels', async () => {
      renderComponent();

      await screen.findByTestId('recipe-detail-title');

      expect(screen.getByRole('button', { name: /tilbage til opskrifter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tilføj til favoritter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /find matchende tilbud/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /se fuld opskrift hos arla/i })).toBeInTheDocument();
    });
  });
});
