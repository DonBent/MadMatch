import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SustainabilityCard from './SustainabilityCard';

describe('SustainabilityCard', () => {
  describe('Fallback State', () => {
    it('should display fallback message when no data provided', () => {
      render(<SustainabilityCard data={null} />);
      
      expect(screen.getByText('🌱 Bæredygtighed')).toBeInTheDocument();
      expect(screen.getByText('Ingen bæredygtighedsdata tilgængelig')).toBeInTheDocument();
    });

    it('should display fallback message when data has error', () => {
      const errorData = { error: 'Not found' };
      render(<SustainabilityCard data={errorData} />);
      
      expect(screen.getByText('Ingen bæredygtighedsdata tilgængelig')).toBeInTheDocument();
    });
  });

  describe('Eco-Score Display', () => {
    it('should display eco-score badge with A rating', () => {
      const data = {
        ecoScore: 'A',
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('Eco-Score')).toBeInTheDocument();
    });

    it('should apply correct CSS class for eco-score A', () => {
      const data = {
        ecoScore: 'A',
        dataSource: 'manual'
      };
      const { container } = render(<SustainabilityCard data={data} />);
      
      const badge = container.querySelector('.eco-score-a');
      expect(badge).toBeInTheDocument();
    });

    it('should display eco-score badge with B rating', () => {
      const data = {
        ecoScore: 'B',
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should apply correct CSS class for eco-score E', () => {
      const data = {
        ecoScore: 'E',
        dataSource: 'manual'
      };
      const { container } = render(<SustainabilityCard data={data} />);
      
      const badge = container.querySelector('.eco-score-e');
      expect(badge).toBeInTheDocument();
    });

    it('should not display eco-score when not provided', () => {
      const data = {
        carbonFootprint: 2.5,
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.queryByText('Eco-Score')).not.toBeInTheDocument();
    });
  });

  describe('Carbon Footprint Display', () => {
    it('should display carbon footprint with correct format', () => {
      const data = {
        carbonFootprint: 2.5,
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('2.5 kg CO₂e')).toBeInTheDocument();
      expect(screen.getByText('🌍')).toBeInTheDocument();
    });

    it('should format carbon footprint to one decimal place', () => {
      const data = {
        carbonFootprint: 3.567,
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('3.6 kg CO₂e')).toBeInTheDocument();
    });

    it('should not display carbon footprint when not provided', () => {
      const data = {
        ecoScore: 'A',
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.queryByText(/kg CO₂e/)).not.toBeInTheDocument();
    });
  });

  describe('Certification Icons', () => {
    it('should display organic certification', () => {
      const data = {
        certifications: {
          organic: true
        },
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('Økologisk')).toBeInTheDocument();
    });

    it('should display fair trade certification', () => {
      const data = {
        certifications: {
          fairTrade: true
        },
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('Fair Trade')).toBeInTheDocument();
    });

    it('should display local certification', () => {
      const data = {
        certifications: {
          local: true
        },
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('Lokalt')).toBeInTheDocument();
    });

    it('should display recyclable packaging certification', () => {
      const data = {
        certifications: {
          recyclablePackaging: true
        },
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('Genanvendelig emballage')).toBeInTheDocument();
    });

    it('should display multiple certifications', () => {
      const data = {
        certifications: {
          organic: true,
          fairTrade: true,
          local: true,
          recyclablePackaging: true
        },
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('Økologisk')).toBeInTheDocument();
      expect(screen.getByText('Fair Trade')).toBeInTheDocument();
      expect(screen.getByText('Lokalt')).toBeInTheDocument();
      expect(screen.getByText('Genanvendelig emballage')).toBeInTheDocument();
    });

    it('should only display true certifications', () => {
      const data = {
        certifications: {
          organic: true,
          fairTrade: false,
          local: false,
          recyclablePackaging: true
        },
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('Økologisk')).toBeInTheDocument();
      expect(screen.queryByText('Fair Trade')).not.toBeInTheDocument();
      expect(screen.queryByText('Lokalt')).not.toBeInTheDocument();
      expect(screen.getByText('Genanvendelig emballage')).toBeInTheDocument();
    });

    it('should not display certifications section when no certifications provided', () => {
      const data = {
        ecoScore: 'A',
        dataSource: 'manual'
      };
      const { container } = render(<SustainabilityCard data={data} />);
      
      const certSection = container.querySelector('.certifications');
      expect(certSection).not.toBeInTheDocument();
    });
  });

  describe('Data Source Attribution', () => {
    it('should display manual data source attribution', () => {
      const data = {
        ecoScore: 'A',
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('Data fra manual')).toBeInTheDocument();
    });

    it('should display Open Food Facts data source attribution', () => {
      const data = {
        ecoScore: 'B',
        dataSource: 'open_food_facts'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('Data fra Open Food Facts')).toBeInTheDocument();
    });

    it('should not display attribution when no data source provided', () => {
      const data = {
        ecoScore: 'A'
      };
      const { container } = render(<SustainabilityCard data={data} />);
      
      const attribution = container.querySelector('.data-attribution');
      expect(attribution).not.toBeInTheDocument();
    });
  });

  describe('Complete Data Display', () => {
    it('should display all data fields when provided', () => {
      const data = {
        ecoScore: 'A',
        carbonFootprint: 1.2,
        certifications: {
          organic: true,
          fairTrade: true,
          local: true,
          recyclablePackaging: true
        },
        dataSource: 'manual'
      };
      render(<SustainabilityCard data={data} />);
      
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('1.2 kg CO₂e')).toBeInTheDocument();
      expect(screen.getByText('Økologisk')).toBeInTheDocument();
      expect(screen.getByText('Fair Trade')).toBeInTheDocument();
      expect(screen.getByText('Lokalt')).toBeInTheDocument();
      expect(screen.getByText('Genanvendelig emballage')).toBeInTheDocument();
      expect(screen.getByText('Data fra manual')).toBeInTheDocument();
    });
  });
});
