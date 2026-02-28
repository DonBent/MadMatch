import React from 'react';
import { render, screen } from '@testing-library/react';
import RecipeSuggestions from './RecipeSuggestions';

// Mock recipe data
const mockRecipes = [
  {
    id: 1,
    title: 'Pasta Carbonara',
    image: 'https://example.com/carbonara.jpg',
    readyInMinutes: 30,
    servings: 4,
    complexity: 25,
    sourceUrl: 'https://example.com/carbonara'
  },
  {
    id: 2,
    title: 'Caesar Salad',
    image: 'https://example.com/caesar.jpg',
    readyInMinutes: 15,
    servings: 2,
    complexity: 45,
    sourceUrl: 'https://example.com/caesar'
  },
  {
    id: 3,
    title: 'Beef Wellington',
    image: 'https://example.com/wellington.jpg',
    readyInMinutes: 120,
    servings: 6,
    complexity: 75,
    sourceUrl: 'https://example.com/wellington'
  },
  {
    id: 4,
    title: 'Extra Recipe (should not display)',
    image: 'https://example.com/extra.jpg',
    readyInMinutes: 45,
    servings: 3,
    complexity: 50,
    sourceUrl: 'https://example.com/extra'
  }
];

describe('RecipeSuggestions', () => {
  describe('Loading state', () => {
    it('should display loading spinner when loading is true', () => {
      render(<RecipeSuggestions recipes={[]} loading={true} />);
      
      expect(screen.getByText('Henter opskrifter...')).toBeInTheDocument();
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('should display title when loading', () => {
      render(<RecipeSuggestions recipes={[]} loading={true} />);
      
      expect(screen.getByText('Opskriftsforslag')).toBeInTheDocument();
    });
  });

  describe('Fallback state', () => {
    it('should display fallback message when recipes is empty', () => {
      render(<RecipeSuggestions recipes={[]} loading={false} />);
      
      expect(screen.getByText('Ingen opskriftsforslag fundet for dette produkt')).toBeInTheDocument();
    });

    it('should display fallback message when recipes is null', () => {
      render(<RecipeSuggestions recipes={null} loading={false} />);
      
      expect(screen.getByText('Ingen opskriftsforslag fundet for dette produkt')).toBeInTheDocument();
    });

    it('should display fallback message when recipes is undefined', () => {
      render(<RecipeSuggestions loading={false} />);
      
      expect(screen.getByText('Ingen opskriftsforslag fundet for dette produkt')).toBeInTheDocument();
    });

    it('should display fallback icon', () => {
      render(<RecipeSuggestions recipes={[]} loading={false} />);
      
      expect(screen.getByText('🍽️')).toBeInTheDocument();
    });
  });

  describe('Recipe display', () => {
    it('should display recipe cards when recipes are available', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
      expect(screen.getByText('Beef Wellington')).toBeInTheDocument();
    });

    it('should display a maximum of 3 recipes', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      // Should display first 3
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
      expect(screen.getByText('Beef Wellington')).toBeInTheDocument();
      
      // Should NOT display the 4th recipe
      expect(screen.queryByText('Extra Recipe (should not display)')).not.toBeInTheDocument();
    });

    it('should display recipe images with correct alt text', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      const carbonaraImage = screen.getByAltText('Pasta Carbonara');
      expect(carbonaraImage).toBeInTheDocument();
      expect(carbonaraImage).toHaveAttribute('src', 'https://example.com/carbonara.jpg');
      expect(carbonaraImage).toHaveAttribute('loading', 'lazy');
    });

    it('should display recipe metadata correctly', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      // Check time, servings for first recipe
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('4 portioner')).toBeInTheDocument();
    });

    it('should display difficulty levels correctly', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      // complexity 25 -> Let
      expect(screen.getByText('Let')).toBeInTheDocument();
      // complexity 45 -> Middel
      expect(screen.getByText('Middel')).toBeInTheDocument();
      // complexity 75 -> Svær
      expect(screen.getByText('Svær')).toBeInTheDocument();
    });

    it('should create external links with correct attributes', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      const links = screen.getAllByRole('link');
      
      // Should have 3 links (max 3 recipes)
      expect(links).toHaveLength(3);
      
      // Check first link
      expect(links[0]).toHaveAttribute('href', 'https://example.com/carbonara');
      expect(links[0]).toHaveAttribute('target', '_blank');
      expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should display "Se opskrift" link indicator', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      const linkIndicators = screen.getAllByText('Se opskrift →');
      expect(linkIndicators).toHaveLength(3); // One for each of max 3 recipes
    });
  });

  describe('Attribution', () => {
    it('should display Spoonacular attribution when recipes are shown', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      expect(screen.getByText('Opskrifter fra Spoonacular')).toBeInTheDocument();
    });

    it('should not display attribution in fallback state', () => {
      render(<RecipeSuggestions recipes={[]} loading={false} />);
      
      expect(screen.queryByText('Opskrifter fra Spoonacular')).not.toBeInTheDocument();
    });

    it('should not display attribution in loading state', () => {
      render(<RecipeSuggestions recipes={[]} loading={true} />);
      
      expect(screen.queryByText('Opskrifter fra Spoonacular')).not.toBeInTheDocument();
    });
  });

  describe('Responsive layout', () => {
    it('should apply recipe-grid class for responsive layout', () => {
      const { container } = render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      const grid = container.querySelector('.recipe-grid');
      expect(grid).toBeInTheDocument();
    });

    it('should have recipe-card class on each card', () => {
      const { container } = render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      const cards = container.querySelectorAll('.recipe-card');
      expect(cards).toHaveLength(3); // Max 3 recipes
    });
  });

  describe('Edge cases', () => {
    it('should handle single recipe', () => {
      const singleRecipe = [mockRecipes[0]];
      render(<RecipeSuggestions recipes={singleRecipe} loading={false} />);
      
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
      expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
    });

    it('should handle recipe without image gracefully', () => {
      const recipeNoImage = [{
        ...mockRecipes[0],
        image: null
      }];
      
      render(<RecipeSuggestions recipes={recipeNoImage} loading={false} />);
      
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
      expect(screen.queryByAltText('Pasta Carbonara')).not.toBeInTheDocument();
    });

    it('should handle boundary difficulty levels', () => {
      const boundaryRecipes = [
        { ...mockRecipes[0], id: 101, complexity: 30, title: 'Recipe 30' },
        { ...mockRecipes[0], id: 102, complexity: 60, title: 'Recipe 60' },
        { ...mockRecipes[0], id: 103, complexity: 61, title: 'Recipe 61' }
      ];
      
      render(<RecipeSuggestions recipes={boundaryRecipes} loading={false} />);
      
      // complexity 30 -> Let (<=30)
      // complexity 60 -> Middel (<=60)
      // complexity 61 -> Svær (>60)
      const difficulties = screen.getAllByText(/Let|Middel|Svær/);
      expect(difficulties).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic heading', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      const heading = screen.getByRole('heading', { name: 'Opskriftsforslag' });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible links', () => {
      render(<RecipeSuggestions recipes={mockRecipes} loading={false} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });
});
