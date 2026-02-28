import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CartItem from './CartItem';
import { CartProvider } from '../contexts/CartContext';

const mockProduct = {
  id: 1,
  navn: 'Test Product',
  butik: 'Test Store',
  tilbudspris: 10.0,
  normalpris: 20.0,
  rabat: 50,
  cartItem: {
    productId: 1,
    quantity: 2,
    addedAt: '2026-02-28T15:00:00.000Z'
  }
};

describe('CartItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders product information', () => {
    render(
      <CartProvider>
        <CartItem product={mockProduct} />
      </CartProvider>
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Store')).toBeInTheDocument();
    expect(screen.getByText('10.00 kr')).toBeInTheDocument();
  });

  test('displays correct quantity', () => {
    render(
      <CartProvider>
        <CartItem product={mockProduct} />
      </CartProvider>
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('calculates and displays subtotal correctly', () => {
    render(
      <CartProvider>
        <CartItem product={mockProduct} />
      </CartProvider>
    );

    // 2 * 10.00 = 20.00
    expect(screen.getByText('20.00 kr')).toBeInTheDocument();
  });

  test('calculates and displays savings correctly', () => {
    render(
      <CartProvider>
        <CartItem product={mockProduct} />
      </CartProvider>
    );

    // (20 - 10) * 2 = 20.00
    expect(screen.getByText('Spar 20.00 kr')).toBeInTheDocument();
  });

  test('increments quantity when plus button clicked', async () => {
    // Pre-populate cart
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 2, addedAt: '2026-02-28T15:00:00.000Z' }]
    };
    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    render(
      <CartProvider>
        <CartItem product={mockProduct} />
      </CartProvider>
    );

    const plusButton = screen.getByLabelText('Forøg antal');
    fireEvent.click(plusButton);

    // Check that localStorage was updated
    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_cart');
      const data = JSON.parse(stored);
      expect(data.cart.find(item => item.productId === 1).quantity).toBe(3);
    });
  });

  test('decrements quantity when minus button clicked', async () => {
    // Pre-populate cart
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 2, addedAt: '2026-02-28T15:00:00.000Z' }]
    };
    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    render(
      <CartProvider>
        <CartItem product={mockProduct} />
      </CartProvider>
    );

    const minusButton = screen.getByLabelText('Reducer antal');
    fireEvent.click(minusButton);

    // Check that localStorage was updated
    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_cart');
      const data = JSON.parse(stored);
      expect(data.cart.find(item => item.productId === 1).quantity).toBe(1);
    });
  });

  test('disables minus button when quantity is 1', () => {
    const singleItemProduct = {
      ...mockProduct,
      cartItem: { ...mockProduct.cartItem, quantity: 1 }
    };

    render(
      <CartProvider>
        <CartItem product={singleItemProduct} />
      </CartProvider>
    );

    const minusButton = screen.getByLabelText('Reducer antal');
    expect(minusButton).toBeDisabled();
  });

  test('disables plus button when quantity is 99', () => {
    const maxItemProduct = {
      ...mockProduct,
      cartItem: { ...mockProduct.cartItem, quantity: 99 }
    };

    render(
      <CartProvider>
        <CartItem product={maxItemProduct} />
      </CartProvider>
    );

    const plusButton = screen.getByLabelText('Forøg antal');
    expect(plusButton).toBeDisabled();
  });

  test('removes item when remove button clicked', () => {
    // Pre-populate cart
    const mockCart = {
      version: 1,
      cart: [{ productId: 1, quantity: 2, addedAt: '2026-02-28T15:00:00.000Z' }]
    };
    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    render(
      <CartProvider>
        <CartItem product={mockProduct} />
      </CartProvider>
    );

    const removeButton = screen.getByLabelText('Fjern vare');
    fireEvent.click(removeButton);

    // Check that item was removed from localStorage
    const stored = localStorage.getItem('madmatch_cart');
    const data = JSON.parse(stored);
    expect(data.cart).toHaveLength(0);
  });

  test('returns null when product is null', () => {
    const { container } = render(
      <CartProvider>
        <CartItem product={null} />
      </CartProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  test('returns null when product is undefined', () => {
    const { container } = render(
      <CartProvider>
        <CartItem product={undefined} />
      </CartProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  test('handles missing cartItem gracefully', () => {
    const productWithoutCartItem = {
      id: 1,
      navn: 'Test Product',
      butik: 'Test Store',
      tilbudspris: 10.0,
      normalpris: 20.0
    };

    render(
      <CartProvider>
        <CartItem product={productWithoutCartItem} />
      </CartProvider>
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.00 kr')).toBeInTheDocument();
  });

  test('displays correct subtotal with single item', () => {
    const singleItemProduct = {
      ...mockProduct,
      cartItem: { ...mockProduct.cartItem, quantity: 1 }
    };

    render(
      <CartProvider>
        <CartItem product={singleItemProduct} />
      </CartProvider>
    );

    expect(screen.getAllByText(/10\.00 kr/)).toHaveLength(2); // Price and subtotal
    expect(screen.getByText('Spar 10.00 kr')).toBeInTheDocument();
  });

  test('displays correct subtotal with multiple items', () => {
    const multiItemProduct = {
      ...mockProduct,
      cartItem: { ...mockProduct.cartItem, quantity: 5 }
    };

    render(
      <CartProvider>
        <CartItem product={multiItemProduct} />
      </CartProvider>
    );

    expect(screen.getByText('50.00 kr')).toBeInTheDocument();
    expect(screen.getByText('Spar 50.00 kr')).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    const { container } = render(
      <CartProvider>
        <CartItem product={mockProduct} />
      </CartProvider>
    );

    expect(container.querySelector('.cart-item')).toBeInTheDocument();
    expect(container.querySelector('.cart-item-info')).toBeInTheDocument();
    expect(container.querySelector('.cart-item-controls')).toBeInTheDocument();
    expect(container.querySelector('.quantity-controls')).toBeInTheDocument();
  });
});
