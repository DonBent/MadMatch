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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders share button with correct text', () => {
    render(<ShareButton productId="123" productName="Test Product" />);
    
    expect(screen.getByText('Del produkt')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Del Test Product');
  });

  test('copies product URL to clipboard when clicked', async () => {
    navigator.clipboard.writeText.mockResolvedValue();
    
    render(<ShareButton productId="123" productName="Test Product" />);
    
    const shareButton = screen.getByRole('button');
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/produkt/123')
      );
    });
  });

  test('shows toast notification after successful copy', async () => {
    navigator.clipboard.writeText.mockResolvedValue();
    
    render(<ShareButton productId="123" productName="Test Product" />);
    
    const shareButton = screen.getByRole('button');
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(screen.getByText('Link kopieret til udklipsholder!')).toBeInTheDocument();
    });
  });

  test('toast disappears after 3 seconds', async () => {
    jest.useFakeTimers();
    navigator.clipboard.writeText.mockResolvedValue();
    
    render(<ShareButton productId="123" productName="Test Product" />);
    
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

  test('handles clipboard error gracefully', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
    
    render(<ShareButton productId="123" productName="Test Product" />);
    
    const shareButton = screen.getByRole('button');
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalled();
    });
    
    alertMock.mockRestore();
  });

  test('has proper accessibility attributes', () => {
    render(<ShareButton productId="123" productName="Test Product" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Del Test Product');
    expect(button).toHaveAttribute('title', 'Kopier link til produkt');
  });

  test('toast has proper ARIA attributes', async () => {
    navigator.clipboard.writeText.mockResolvedValue();
    
    render(<ShareButton productId="123" productName="Test Product" />);
    
    const shareButton = screen.getByRole('button');
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });
  });
});
