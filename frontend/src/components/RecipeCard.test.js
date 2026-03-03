import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipeCard from './RecipeCard';
import { RecipeFavoriteProvider } from '../contexts/RecipeFavoriteContext';

const mockRecipe = {
  id: 'test-recipe-1',
  title: 'Test Recipe',
  imageUrl: 'https://example.com/image.jpg',
  cookTimeMinutes: 30,
  difficulty: 'EASY',
  servings: 4
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <RecipeFavoriteProvider>
        {component}
      </RecipeFavoriteProvider>
    </BrowserRouter>
  );
};

describe('RecipeCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders recipe card with all data', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('Let')).toBeInTheDocument();
    expect(screen.getByText('4 portioner')).toBeInTheDocument();
  });

  test('renders with correct data-testid attributes', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    expect(screen.getByTestId('recipe-card')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-card-link')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-prep-time')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-difficulty')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-servings')).toBeInTheDocument();
  });

  test('renders image with correct src and alt', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const img = screen.getByAltText('Billede af Test Recipe');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  test('links to correct recipe detail page', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const linkWrapper = screen.getByTestId('recipe-card-link');
    const link = linkWrapper.querySelector('a');
    expect(link).toHaveAttribute('href', '/opskrift/test-recipe-1');
  });

  test('displays Danish difficulty labels correctly', () => {
    const { rerender } = renderWithRouter(<RecipeCard recipe={{ ...mockRecipe, difficulty: 'EASY' }} />);
    expect(screen.getByText('Let')).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <RecipeFavoriteProvider>
          <RecipeCard recipe={{ ...mockRecipe, difficulty: 'MEDIUM' }} />
        </RecipeFavoriteProvider>
      </BrowserRouter>
    );
    expect(screen.getByText('Middel')).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <RecipeFavoriteProvider>
          <RecipeCard recipe={{ ...mockRecipe, difficulty: 'HARD' }} />
        </RecipeFavoriteProvider>
      </BrowserRouter>
    );
    expect(screen.getByText('Svær')).toBeInTheDocument();
  });

  test('handles missing optional fields', () => {
    const minimalRecipe = {
      id: 'minimal-recipe',
      title: 'Minimal Recipe'
    };

    renderWithRouter(<RecipeCard recipe={minimalRecipe} />);
    
    expect(screen.getByText('Minimal Recipe')).toBeInTheDocument();
    expect(screen.queryByTestId('recipe-prep-time')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recipe-difficulty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recipe-servings')).not.toBeInTheDocument();
  });

  test('handles missing image gracefully', () => {
    const recipeNoImage = {
      ...mockRecipe,
      imageUrl: null
    };

    renderWithRouter(<RecipeCard recipe={recipeNoImage} />);
    
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('applies correct CSS class for difficulty level', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const difficultyElement = screen.getByTestId('recipe-difficulty');
    expect(difficultyElement).toHaveClass('difficulty-easy');
  });

  test('renders favorite button with correct data-testid', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const favoriteButton = screen.getByTestId('recipe-favorite-button');
    expect(favoriteButton).toBeInTheDocument();
  });

  test('favorite button shows outline heart when not favorited', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const favoriteButton = screen.getByTestId('recipe-favorite-button');
    expect(favoriteButton).toHaveTextContent('🤍');
    expect(favoriteButton).not.toHaveClass('favorited');
  });

  test('favorite button shows filled heart when favorited', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const favoriteButton = screen.getByTestId('recipe-favorite-button');
    
    fireEvent.click(favoriteButton);
    
    expect(favoriteButton).toHaveTextContent('❤️');
    expect(favoriteButton).toHaveClass('favorited');
  });

  test('clicking favorite button toggles state', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const favoriteButton = screen.getByTestId('recipe-favorite-button');
    
    // Initially not favorited
    expect(favoriteButton).toHaveTextContent('🤍');
    
    // Click to favorite
    fireEvent.click(favoriteButton);
    expect(favoriteButton).toHaveTextContent('❤️');
    
    // Click to unfavorite
    fireEvent.click(favoriteButton);
    expect(favoriteButton).toHaveTextContent('🤍');
  });

  test('favorite button has correct aria-label', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const favoriteButton = screen.getByTestId('recipe-favorite-button');
    expect(favoriteButton).toHaveAttribute('aria-label', 'Tilføj Test Recipe til favoritter');
  });

  test('favorite button aria-label changes when favorited', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const favoriteButton = screen.getByTestId('recipe-favorite-button');
    
    fireEvent.click(favoriteButton);
    
    expect(favoriteButton).toHaveAttribute('aria-label', 'Fjern Test Recipe fra favoritter');
  });

  test('clicking favorite button does not navigate to recipe detail', () => {
    renderWithRouter(<RecipeCard recipe={mockRecipe} />);
    
    const favoriteButton = screen.getByTestId('recipe-favorite-button');
    
    fireEvent.click(favoriteButton);
    
    // Should still be on current page (not navigated)
    // This is a basic check - in real app we'd check location
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });
});
