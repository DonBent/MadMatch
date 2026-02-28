import React from 'react';
import { render, screen } from '@testing-library/react';
import NutritionCard from './NutritionCard';

describe('NutritionCard', () => {
  const mockNutritionData = {
    data_source: 'Open Food Facts',
    nutriments: {
      'energy-kcal_100g': 250,
      'energy_100g': 1046,
      'fat_100g': 10.5,
      'saturated-fat_100g': 3.2,
      'carbohydrates_100g': 35.4,
      'sugars_100g': 8.5,
      'fiber_100g': 2.5,
      'proteins_100g': 6.8,
      'salt_100g': 1.2,
    },
  };

  describe('Loading state', () => {
    it('should display loading message when loading is true', () => {
      render(<NutritionCard nutrition={null} loading={true} />);
      
      expect(screen.getByText('Næringsindhold')).toBeInTheDocument();
      expect(screen.getByText('Indlæser næringsdata...')).toBeInTheDocument();
    });
  });

  describe('Fallback state', () => {
    it('should display fallback message when nutrition is null', () => {
      render(<NutritionCard nutrition={null} loading={false} />);
      
      expect(screen.getByText('Næringsindhold')).toBeInTheDocument();
      expect(screen.getByText('Næringsdata ikke tilgængelig')).toBeInTheDocument();
    });

    it('should display fallback message when nutriments is missing', () => {
      render(<NutritionCard nutrition={{}} loading={false} />);
      
      expect(screen.getByText('Næringsdata ikke tilgængelig')).toBeInTheDocument();
    });
  });

  describe('Data display', () => {
    it('should display all nutrition values correctly', () => {
      render(<NutritionCard nutrition={mockNutritionData} loading={false} />);
      
      // Check title and serving info
      expect(screen.getByText('Næringsindhold')).toBeInTheDocument();
      expect(screen.getByText('Per 100 g')).toBeInTheDocument();

      // Check energy with both kcal and kJ
      expect(screen.getByText('250 kcal / 1046 kJ')).toBeInTheDocument();

      // Check macronutrients
      expect(screen.getByText('10.5 g')).toBeInTheDocument(); // fat
      expect(screen.getByText('3.2 g')).toBeInTheDocument(); // saturated fat
      expect(screen.getByText('35.4 g')).toBeInTheDocument(); // carbs
      expect(screen.getByText('8.5 g')).toBeInTheDocument(); // sugars
      expect(screen.getByText('2.5 g')).toBeInTheDocument(); // fiber
      expect(screen.getByText('6.8 g')).toBeInTheDocument(); // protein
      expect(screen.getByText('1.2 g')).toBeInTheDocument(); // salt
    });

    it('should display Danish labels correctly', () => {
      render(<NutritionCard nutrition={mockNutritionData} loading={false} />);
      
      expect(screen.getByText('Energi')).toBeInTheDocument();
      expect(screen.getByText('Fedt')).toBeInTheDocument();
      expect(screen.getByText('heraf mættede fedtsyrer')).toBeInTheDocument();
      expect(screen.getByText('Kulhydrater')).toBeInTheDocument();
      expect(screen.getByText('heraf sukkerarter')).toBeInTheDocument();
      expect(screen.getByText('Kostfibre')).toBeInTheDocument();
      expect(screen.getByText('Protein')).toBeInTheDocument();
      expect(screen.getByText('Salt')).toBeInTheDocument();
    });

    it('should handle missing individual values with em dash', () => {
      const partialData = {
        data_source: 'Open Food Facts',
        nutriments: {
          'energy-kcal_100g': 250,
          'fat_100g': 10.5,
          // Missing other values
        },
      };

      render(<NutritionCard nutrition={partialData} loading={false} />);
      
      // Energy and fat should be present
      expect(screen.getByText('250 kcal')).toBeInTheDocument();
      expect(screen.getByText('10.5 g')).toBeInTheDocument();
      
      // Missing values should show em dash
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });

    it('should format energy with only kcal when kJ is missing', () => {
      const onlyKcal = {
        data_source: 'Open Food Facts',
        nutriments: {
          'energy-kcal_100g': 250,
        },
      };

      render(<NutritionCard nutrition={onlyKcal} loading={false} />);
      expect(screen.getByText('250 kcal')).toBeInTheDocument();
    });

    it('should format energy with only kJ when kcal is missing', () => {
      const onlyKj = {
        data_source: 'Open Food Facts',
        nutriments: {
          'energy_100g': 1046,
        },
      };

      render(<NutritionCard nutrition={onlyKj} loading={false} />);
      expect(screen.getByText('1046 kJ')).toBeInTheDocument();
    });
  });

  describe('Attribution', () => {
    it('should display data source attribution', () => {
      render(<NutritionCard nutrition={mockNutritionData} loading={false} />);
      
      expect(screen.getByText('Data fra Open Food Facts')).toBeInTheDocument();
    });

    it('should not display attribution when data_source is missing', () => {
      const noSource = {
        nutriments: {
          'energy-kcal_100g': 250,
        },
      };

      render(<NutritionCard nutrition={noSource} loading={false} />);
      
      expect(screen.queryByText(/Data fra/)).not.toBeInTheDocument();
    });
  });

  describe('CSS classes', () => {
    it('should apply correct CSS classes to structure', () => {
      const { container } = render(<NutritionCard nutrition={mockNutritionData} loading={false} />);
      
      expect(container.querySelector('.nutrition-card')).toBeInTheDocument();
      expect(container.querySelector('.nutrition-card__title')).toBeInTheDocument();
      expect(container.querySelector('.nutrition-card__serving')).toBeInTheDocument();
      expect(container.querySelector('.nutrition-card__table')).toBeInTheDocument();
      expect(container.querySelector('.nutrition-card__attribution')).toBeInTheDocument();
    });

    it('should apply indent class to sub-items', () => {
      const { container } = render(<NutritionCard nutrition={mockNutritionData} loading={false} />);
      
      const indentedRows = container.querySelectorAll('.nutrition-card__row--indent');
      expect(indentedRows.length).toBe(2); // saturated fat and sugars
    });
  });

  describe('Number formatting', () => {
    it('should format decimal values to 1 decimal place', () => {
      const preciseData = {
        nutriments: {
          'fat_100g': 10.567,
          'proteins_100g': 6.123,
        },
      };

      render(<NutritionCard nutrition={preciseData} loading={false} />);
      
      expect(screen.getByText('10.6 g')).toBeInTheDocument();
      expect(screen.getByText('6.1 g')).toBeInTheDocument();
    });

    it('should round energy values to whole numbers', () => {
      const energyData = {
        nutriments: {
          'energy-kcal_100g': 249.7,
          'energy_100g': 1045.8,
        },
      };

      render(<NutritionCard nutrition={energyData} loading={false} />);
      
      expect(screen.getByText('250 kcal / 1046 kJ')).toBeInTheDocument();
    });
  });
});
