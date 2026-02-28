import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddToCartButton from './AddToCartButton';
import { CartProvider } from '../contexts/CartContext';

const mockProduct = {
  id: 1,
  navn: 'Test Product',
  butik: 'Test Store',
  tilbudspris: 10.0,
  normalpris: 20.0,
  rabat: 50
};

describe('AddToCartButton', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders button with correct text', () => {
    render(
      <CartProvider>
        <AddToCartButton product={mockProduct} />
      </CartProvider>
    );

    expect(screen.getByText(/Tilføj til kurv/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Tilføj til kurv');
  });

  test('adds product to cart when clicked', () => {
    render(
      <CartProvider>
        <AddToCartButton product={mockProduct} />
      </CartProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    const stored = localStorage.getItem('madmatch_cart');
    const data = JSON.parse(stored);
    expect(data.cart).toHaveLength(1);
    expect(data.cart[0].productId).toBe(1);
    expect(data.cart[0].quantity).toBe(1);
  });

  test('shows success feedback when clicked', async () => {
    render(
      <CartProvider>
        <AddToCartButton product={mockProduct} />
      </CartProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('✓ Tilføjet!')).toBeInTheDocument();
  });

  test('hides success feedback after delay', async () => {
    jest.useFakeTimers();
    
    render(
      <CartProvider>
        <AddToCartButton product={mockProduct} />
      </CartProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('✓ Tilføjet!')).toBeInTheDocument();

    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(screen.queryByText('✓ Tilføjet!')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('prevents event propagation when clicked', () => {
    const handleParentClick = jest.fn();

    render(
      <CartProvider>
        <div onClick={handleParentClick}>
          <AddToCartButton product={mockProduct} />
        </div>
      </CartProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(handleParentClick).not.toHaveBeenCalled();
  });

  test('prevents default action when clicked', () => {
    render(
      <CartProvider>
        <AddToCartButton product={mockProduct} />
      </CartProvider>
    );

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    
    const button = screen.getByRole('button');
    button.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  test('increments quantity when same product added multiple times', () => {
    render(
      <CartProvider>
        <AddToCartButton product={mockProduct} />
      </CartProvider>
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));

    const stored = localStorage.getItem('madmatch_cart');
    const data = JSON.parse(stored);
    expect(data.cart).toHaveLength(1);
    expect(data.cart[0].quantity).toBe(2);
  });

  test('can add multiple different products', () => {
    const product2 = { ...mockProduct, id: 2, navn: 'Product 2' };

    render(
      <CartProvider>
        <div>
          <AddToCartButton product={mockProduct} />
          <AddToCartButton product={product2} />
        </div>
      </CartProvider>
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    const stored = localStorage.getItem('madmatch_cart');
    const data = JSON.parse(stored);
    expect(data.cart).toHaveLength(2);
    expect(data.cart[0].productId).toBe(1);
    expect(data.cart[1].productId).toBe(2);
  });

  test('applies correct CSS classes', () => {
    render(
      <CartProvider>
        <AddToCartButton product={mockProduct} />
      </CartProvider>
    );

    expect(screen.getByRole('button')).toHaveClass('add-to-cart-button');
    expect(screen.getByRole('button').parentElement).toHaveClass('add-to-cart-container');
  });

  test('feedback has correct CSS class', () => {
    render(
      <CartProvider>
        <AddToCartButton product={mockProduct} />
      </CartProvider>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('✓ Tilføjet!')).toHaveClass('cart-feedback');
  });
});
