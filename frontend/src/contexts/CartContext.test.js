import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component that uses the cart context
const TestComponent = () => {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems } = useCart();

  return (
    <div>
      <div data-testid="total-items">{totalItems}</div>
      <div data-testid="cart-length">{cart.length}</div>
      <button onClick={() => addToCart({ id: 1, name: 'Test Product 1' })}>
        Add Product 1
      </button>
      <button onClick={() => addToCart({ id: 2, name: 'Test Product 2' })}>
        Add Product 2
      </button>
      <button onClick={() => removeFromCart(1)}>Remove Product 1</button>
      <button onClick={() => updateQuantity(1, 5)}>Update Product 1 Quantity</button>
      <button onClick={() => clearCart()}>Clear Cart</button>
      {cart.map(item => (
        <div key={item.productId} data-testid={`cart-item-${item.productId}`}>
          Product {item.productId}: Quantity {item.quantity}
        </div>
      ))}
    </div>
  );
};

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('throws error when useCart is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useCart must be used within a CartProvider');
    
    consoleError.mockRestore();
  });

  test('provides empty cart initially', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-length')).toHaveTextContent('0');
    expect(screen.getByTestId('total-items')).toHaveTextContent('0');
  });

  test('adds product to cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product 1'));

    expect(screen.getByTestId('cart-length')).toHaveTextContent('1');
    expect(screen.getByTestId('total-items')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-item-1')).toHaveTextContent('Product 1: Quantity 1');
  });

  test('increments quantity when adding same product', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product 1'));
    fireEvent.click(screen.getByText('Add Product 1'));

    expect(screen.getByTestId('cart-length')).toHaveTextContent('1');
    expect(screen.getByTestId('total-items')).toHaveTextContent('2');
    expect(screen.getByTestId('cart-item-1')).toHaveTextContent('Product 1: Quantity 2');
  });

  test('adds multiple different products', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product 1'));
    fireEvent.click(screen.getByText('Add Product 2'));

    expect(screen.getByTestId('cart-length')).toHaveTextContent('2');
    expect(screen.getByTestId('total-items')).toHaveTextContent('2');
    expect(screen.getByTestId('cart-item-1')).toHaveTextContent('Product 1: Quantity 1');
    expect(screen.getByTestId('cart-item-2')).toHaveTextContent('Product 2: Quantity 1');
  });

  test('removes product from cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product 1'));
    fireEvent.click(screen.getByText('Add Product 2'));
    fireEvent.click(screen.getByText('Remove Product 1'));

    expect(screen.getByTestId('cart-length')).toHaveTextContent('1');
    expect(screen.getByTestId('total-items')).toHaveTextContent('1');
    expect(screen.queryByTestId('cart-item-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('cart-item-2')).toBeInTheDocument();
  });

  test('updates product quantity', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product 1'));
    fireEvent.click(screen.getByText('Update Product 1 Quantity'));

    expect(screen.getByTestId('cart-item-1')).toHaveTextContent('Product 1: Quantity 5');
    expect(screen.getByTestId('total-items')).toHaveTextContent('5');
  });

  test('enforces minimum quantity of 1', () => {
    const TestMinQuantity = () => {
      const { cart, addToCart, updateQuantity, totalItems } = useCart();
      return (
        <div>
          <div data-testid="total-items">{totalItems}</div>
          <button onClick={() => addToCart({ id: 1 })}>Add Product</button>
          <button onClick={() => updateQuantity(1, 0)}>Set to 0</button>
          <button onClick={() => updateQuantity(1, -5)}>Set to -5</button>
          {cart.map(item => (
            <div key={item.productId} data-testid={`quantity-${item.productId}`}>
              {item.quantity}
            </div>
          ))}
        </div>
      );
    };

    render(
      <CartProvider>
        <TestMinQuantity />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product'));
    fireEvent.click(screen.getByText('Set to 0'));
    expect(screen.getByTestId('quantity-1')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('Set to -5'));
    expect(screen.getByTestId('quantity-1')).toHaveTextContent('1');
  });

  test('enforces maximum quantity of 99', () => {
    const TestMaxQuantity = () => {
      const { cart, addToCart, updateQuantity } = useCart();
      return (
        <div>
          <button onClick={() => addToCart({ id: 1 })}>Add Product</button>
          <button onClick={() => updateQuantity(1, 100)}>Set to 100</button>
          <button onClick={() => updateQuantity(1, 150)}>Set to 150</button>
          {cart.map(item => (
            <div key={item.productId} data-testid={`quantity-${item.productId}`}>
              {item.quantity}
            </div>
          ))}
        </div>
      );
    };

    render(
      <CartProvider>
        <TestMaxQuantity />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product'));
    fireEvent.click(screen.getByText('Set to 100'));
    expect(screen.getByTestId('quantity-1')).toHaveTextContent('99');

    fireEvent.click(screen.getByText('Set to 150'));
    expect(screen.getByTestId('quantity-1')).toHaveTextContent('99');
  });

  test('clears entire cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product 1'));
    fireEvent.click(screen.getByText('Add Product 2'));
    fireEvent.click(screen.getByText('Clear Cart'));

    expect(screen.getByTestId('cart-length')).toHaveTextContent('0');
    expect(screen.getByTestId('total-items')).toHaveTextContent('0');
  });

  test('calculates total items correctly', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product 1'));
    fireEvent.click(screen.getByText('Add Product 1'));
    fireEvent.click(screen.getByText('Add Product 2'));

    expect(screen.getByTestId('total-items')).toHaveTextContent('3');
  });

  test('persists cart to localStorage', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Add Product 1'));

    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_cart');
      expect(stored).toBeTruthy();
      const data = JSON.parse(stored);
      expect(data.version).toBe(1);
      expect(data.cart).toHaveLength(1);
      expect(data.cart[0].productId).toBe(1);
      expect(data.cart[0].quantity).toBe(1);
      expect(data.cart[0].addedAt).toBeTruthy();
    });
  });

  test('loads cart from localStorage on mount', () => {
    const mockCart = {
      version: 1,
      cart: [
        { productId: 1, quantity: 2, addedAt: '2026-02-28T15:00:00.000Z' },
        { productId: 3, quantity: 1, addedAt: '2026-02-28T15:01:00.000Z' }
      ]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(mockCart));

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-length')).toHaveTextContent('2');
    expect(screen.getByTestId('total-items')).toHaveTextContent('3');
    expect(screen.getByTestId('cart-item-1')).toHaveTextContent('Product 1: Quantity 2');
    expect(screen.getByTestId('cart-item-3')).toHaveTextContent('Product 3: Quantity 1');
  });

  test('ignores invalid localStorage data', () => {
    localStorage.setItem('madmatch_cart', 'invalid json');

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-length')).toHaveTextContent('0');
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test('ignores wrong version in localStorage', () => {
    const wrongVersion = {
      version: 99,
      cart: [{ productId: 1, quantity: 1, addedAt: '2026-02-28T15:00:00.000Z' }]
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(wrongVersion));

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-length')).toHaveTextContent('0');
  });

  test('ignores non-array cart in localStorage', () => {
    const invalidCart = {
      version: 1,
      cart: 'not an array'
    };

    localStorage.setItem('madmatch_cart', JSON.stringify(invalidCart));

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-length')).toHaveTextContent('0');
  });

  test('includes addedAt timestamp when adding product', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    const beforeAdd = new Date().toISOString();
    fireEvent.click(screen.getByText('Add Product 1'));
    const afterAdd = new Date().toISOString();

    const stored = localStorage.getItem('madmatch_cart');
    const data = JSON.parse(stored);
    const addedAt = data.cart[0].addedAt;

    expect(addedAt).toBeTruthy();
    expect(addedAt >= beforeAdd).toBe(true);
    expect(addedAt <= afterAdd).toBe(true);
  });
});
