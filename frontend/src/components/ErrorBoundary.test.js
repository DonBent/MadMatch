import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from './ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Noget gik galt')).toBeInTheDocument();
    expect(screen.getByText(/Vi beklager, men der opstod en uventet fejl/)).toBeInTheDocument();
  });

  test('displays error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/Fejldetaljer/)).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('does not display error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.queryByText(/Fejldetaljer/)).not.toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('has "Prøv igen" button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Prøv igen')).toBeInTheDocument();
  });

  test('has "Tilbage til forsiden" button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Tilbage til forsiden')).toBeInTheDocument();
  });

  test('resets error state when "Prøv igen" is clicked', () => {
    let shouldThrow = true;
    
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };
    
    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Noget gik galt')).toBeInTheDocument();
    
    const resetButton = screen.getByText('Prøv igen');
    
    // Reset the error state before clicking
    shouldThrow = false;
    
    fireEvent.click(resetButton);
    
    // After reset, component should render without error
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  test('calls onReset callback when provided', () => {
    const onReset = jest.fn();
    
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    const resetButton = screen.getByText('Prøv igen');
    fireEvent.click(resetButton);
    
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('has proper ARIA role for error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('navigates to home when "Tilbage til forsiden" is clicked', () => {
    delete window.location;
    window.location = { href: '' };
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    const homeButton = screen.getByText('Tilbage til forsiden');
    fireEvent.click(homeButton);
    
    expect(window.location.href).toBe('/');
  });

  test('catches errors from nested components', () => {
    const NestedComponent = () => {
      return (
        <div>
          <ThrowError shouldThrow={true} />
        </div>
      );
    };
    
    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Noget gik galt')).toBeInTheDocument();
  });
});
