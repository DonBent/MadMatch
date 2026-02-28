import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShareButton from './ShareButton';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('ShareButton', () => {
  const mockTilbud = {
    id: 123,
    navn: 'Test Tilbud',
    tilbudspris: 19.95,
    butik: 'Netto'
  };

  const mockProduct = {
    id: 456,
    navn: 'Test Product'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete navigator.share;
    delete navigator.canShare;
  });

  describe('Rendering', () => {
    test('renders share button with correct text', () => {
      render(<ShareButton item={mockProduct} type="product" />);
      
      expect(screen.getByText('Del')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Del Test Product');
    });

    test('has proper accessibility attributes', () => {
      render(<ShareButton item={mockProduct} type="product" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Del Test Product');
      expect(button).toHaveAttribute('title', 'Del dette tilbud');
    });
  });

  describe('Native Share API', () => {
    beforeEach(() => {
      navigator.share = jest.fn().mockResolvedValue();
      navigator.canShare = jest.fn().mockReturnValue(true);
    });

    test('uses native share API when available for tilbud', async () => {
      render(<ShareButton item={mockTilbud} type="tilbud" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(navigator.canShare).toHaveBeenCalled();
        expect(navigator.share).toHaveBeenCalledWith({
          title: 'MadMatch Tilbud',
          text: 'Tjek dette tilbud på Test Tilbud - 19.95 kr hos Netto via MadMatch!',
          url: expect.stringContaining('/produkt/123')
        });
      });
    });

    test('uses native share API when available for product', async () => {
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(navigator.canShare).toHaveBeenCalled();
        expect(navigator.share).toHaveBeenCalledWith({
          title: 'Test Product - MadMatch',
          text: 'Se Test Product på MadMatch - nutrition, recipes & sustainability info!',
          url: expect.stringContaining('/produkt/456')
        });
      });
    });

    test('does not show toast when native share succeeds', async () => {
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(navigator.share).toHaveBeenCalled();
      });

      // Wait a bit to ensure toast doesn't appear
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.queryByText('Link kopieret til udklipsholder!')).not.toBeInTheDocument();
    });

    test('falls back to clipboard when native share is cancelled', async () => {
      navigator.share.mockRejectedValue({ name: 'AbortError' });
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(navigator.share).toHaveBeenCalled();
      });

      // Should not show toast or copy to clipboard when user cancels
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
      expect(screen.queryByText('Link kopieret til udklipsholder!')).not.toBeInTheDocument();
    });

    test('falls back to clipboard when native share fails', async () => {
      navigator.share.mockRejectedValue(new Error('Share failed'));
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('Test Product')
        );
      });
    });
  });

  describe('Clipboard Fallback', () => {
    test('copies tilbud content to clipboard when native share unavailable', async () => {
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockTilbud} type="tilbud" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringMatching(/Tjek dette tilbud på Test Tilbud - 19.95 kr hos Netto via MadMatch!/)
        );
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('/produkt/123')
        );
      });
    });

    test('copies product content to clipboard when native share unavailable', async () => {
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringMatching(/Se Test Product på MadMatch - nutrition, recipes & sustainability info!/)
        );
      });
    });

    test('shows toast notification after successful clipboard copy', async () => {
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByText('Link kopieret til udklipsholder!')).toBeInTheDocument();
      });
    });

    test('toast disappears after 3 seconds', async () => {
      jest.useFakeTimers();
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByText('Link kopieret til udklipsholder!')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(screen.queryByText('Link kopieret til udklipsholder!')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    test('toast has proper ARIA attributes', async () => {
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        const toast = screen.getByRole('alert');
        expect(toast).toHaveAttribute('aria-live', 'polite');
      });
    });

    test('handles clipboard error gracefully with alert fallback', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
      
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith(
          expect.stringContaining('Test Product')
        );
      });
      
      alertMock.mockRestore();
    });
  });

  describe('Share Content', () => {
    test('generates correct share content for tilbud', async () => {
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockTilbud} type="tilbud" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        const callArg = navigator.clipboard.writeText.mock.calls[0][0];
        expect(callArg).toContain('Tjek dette tilbud på Test Tilbud');
        expect(callArg).toContain('19.95 kr');
        expect(callArg).toContain('Netto');
        expect(callArg).toContain('via MadMatch!');
      });
    });

    test('generates correct share content for product', async () => {
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockProduct} type="product" />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        const callArg = navigator.clipboard.writeText.mock.calls[0][0];
        expect(callArg).toContain('Se Test Product på MadMatch');
        expect(callArg).toContain('nutrition, recipes & sustainability info!');
      });
    });

    test('defaults to product type when type not specified', async () => {
      navigator.clipboard.writeText.mockResolvedValue();
      
      render(<ShareButton item={mockProduct} />);
      
      const shareButton = screen.getByRole('button');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        const callArg = navigator.clipboard.writeText.mock.calls[0][0];
        expect(callArg).toContain('nutrition, recipes & sustainability info!');
      });
    });
  });
});
