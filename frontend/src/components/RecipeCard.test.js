import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipeCard from './RecipeCard';

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
      {component}
    </BrowserRouter>
  );
};

describe('RecipeCard', () => {
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
    
    const img = screen.getByAltText('Test Recipe');
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
        <RecipeCard recipe={{ ...mockRecipe, difficulty: 'MEDIUM' }} />
      </BrowserRouter>
    );
    expect(screen.getByText('Middel')).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <RecipeCard recipe={{ ...mockRecipe, difficulty: 'HARD' }} />
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
});
