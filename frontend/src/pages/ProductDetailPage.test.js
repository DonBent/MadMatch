import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductDetailPage from './ProductDetailPage';
import { tilbudService } from '../services/tilbudService';

// Mock react-router-dom
jest.mock('react-router-dom');

// Mock the service
jest.mock('../services/tilbudService');

describe('ProductDetailPage', () => {
  const mockProduct = {
    id: 1,
    navn: 'Test Product',
    butik: 'Test Store',
    kategori: 'Test Category',
    normalpris: 100,
    tilbudspris: 75,
    rabat: 25,
    billedeUrl: '/test-image.jpg',
    gyldigFra: '01/03',
    gyldigTil: '07/03'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useParams.mockReturnValue({ id: '1' });
    useNavigate.mockReturnValue(jest.fn());
  });

  test('renders loading state initially', () => {
    tilbudService.getTilbudById.mockImplementation(() => new Promise(() => {}));
    
    render(<ProductDetailPage />);
    
    expect(document.querySelector('.loading-skeleton')).toBeTruthy();
  });

  test('renders product details when data is loaded', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Store')).toBeInTheDocument();
    expect(screen.getByText('Test Category')).toBeInTheDocument();
    expect(screen.getByText('100.00 kr')).toBeInTheDocument();
    expect(screen.getByText('75.00 kr')).toBeInTheDocument();
    expect(screen.getByText('-25%')).toBeInTheDocument();
  });

  test('displays placeholder when no image available', async () => {
    const productWithoutImage = { ...mockProduct, billedeUrl: null };
    tilbudService.getTilbudById.mockResolvedValue(productWithoutImage);
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Intet billede tilgængeligt')).toBeInTheDocument();
    });
  });

  test('calculates and displays savings correctly', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Du sparer 25.00 kr/)).toBeInTheDocument();
    });
  });

  test('handles error state', async () => {
    tilbudService.getTilbudById.mockRejectedValue(new Error('Network error'));
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Kunne ikke indlæse produkt/)).toBeInTheDocument();
    });
  });

  test('handles 404 error', async () => {
    useParams.mockReturnValue({ id: '999' });
    const error = new Error('Not found');
    error.response = { status: 404 };
    tilbudService.getTilbudById.mockRejectedValue(error);
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Produkt ikke fundet/)).toBeInTheDocument();
    });
  });

  test('back button is rendered', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('← Tilbage til tilbud')).toBeInTheDocument();
    });
  });

  test('displays validity period when available', async () => {
    tilbudService.getTilbudById.mockResolvedValue(mockProduct);
    
    render(<ProductDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Gyldig 01\/03 - 07\/03/)).toBeInTheDocument();
    });
  });
});
