import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetProvider, useBudget } from './BudgetContext';

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

// Test component that uses the budget context
const TestComponent = () => {
  const {
    budget,
    budgetEnabled,
    setBudget,
    toggleBudget,
    resetBudget,
    calculateBudgetMetrics
  } = useBudget();

  const [cartTotal, setCartTotal] = React.useState(0);
  const metrics = calculateBudgetMetrics(cartTotal);

  return (
    <div>
      <div data-testid="budget">{budget}</div>
      <div data-testid="enabled">{budgetEnabled ? 'true' : 'false'}</div>
      <div data-testid="remaining">{metrics.remainingBudget}</div>
      <div data-testid="exceeded">{metrics.budgetExceeded ? 'true' : 'false'}</div>
      <div data-testid="percent">{metrics.budgetPercentUsed.toFixed(2)}</div>
      <input
        data-testid="budget-input"
        type="number"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
      />
      <input
        data-testid="cart-total-input"
        type="number"
        value={cartTotal}
        onChange={(e) => setCartTotal(Number(e.target.value))}
      />
      <button onClick={toggleBudget}>Toggle Budget</button>
      <button onClick={resetBudget}>Reset Budget</button>
    </div>
  );
};

describe('BudgetContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('throws error when useBudget is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useBudget must be used within a BudgetProvider');
    
    consoleError.mockRestore();
  });

  test('provides default budget state initially', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    expect(screen.getByTestId('budget')).toHaveTextContent('0');
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });

  test('sets budget amount', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    const input = screen.getByTestId('budget-input');
    fireEvent.change(input, { target: { value: '200' } });

    expect(screen.getByTestId('budget')).toHaveTextContent('200');
  });

  test('enforces minimum budget of 0', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    const input = screen.getByTestId('budget-input');
    fireEvent.change(input, { target: { value: '-100' } });

    expect(screen.getByTestId('budget')).toHaveTextContent('0');
  });

  test('handles non-numeric budget input', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    const input = screen.getByTestId('budget-input');
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(screen.getByTestId('budget')).toHaveTextContent('0');
  });

  test('toggles budget enabled state', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    expect(screen.getByTestId('enabled')).toHaveTextContent('true');

    fireEvent.click(screen.getByText('Toggle Budget'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');

    fireEvent.click(screen.getByText('Toggle Budget'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });

  test('resets budget to defaults', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Set budget and disable it
    const input = screen.getByTestId('budget-input');
    fireEvent.change(input, { target: { value: '300' } });
    fireEvent.click(screen.getByText('Toggle Budget')); // Disable (starts as true)

    expect(screen.getByTestId('budget')).toHaveTextContent('300');
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');

    // Reset
    fireEvent.click(screen.getByText('Reset Budget'));

    expect(screen.getByTestId('budget')).toHaveTextContent('0');
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
  });

  test('calculates remaining budget correctly', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Set budget to 200
    const budgetInput = screen.getByTestId('budget-input');
    fireEvent.change(budgetInput, { target: { value: '200' } });

    // Set cart total to 75
    const cartInput = screen.getByTestId('cart-total-input');
    fireEvent.change(cartInput, { target: { value: '75' } });

    expect(screen.getByTestId('remaining')).toHaveTextContent('125');
  });

  test('calculates budget exceeded correctly', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Set budget to 100
    const budgetInput = screen.getByTestId('budget-input');
    fireEvent.change(budgetInput, { target: { value: '100' } });

    // Cart below budget
    const cartInput = screen.getByTestId('cart-total-input');
    fireEvent.change(cartInput, { target: { value: '75' } });
    expect(screen.getByTestId('exceeded')).toHaveTextContent('false');

    // Cart at budget
    fireEvent.change(cartInput, { target: { value: '100' } });
    expect(screen.getByTestId('exceeded')).toHaveTextContent('false');

    // Cart exceeds budget
    fireEvent.change(cartInput, { target: { value: '150' } });
    expect(screen.getByTestId('exceeded')).toHaveTextContent('true');
  });

  test('does not mark as exceeded when budget is 0', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Cart has items but budget is 0 (disabled state)
    const cartInput = screen.getByTestId('cart-total-input');
    fireEvent.change(cartInput, { target: { value: '100' } });

    expect(screen.getByTestId('exceeded')).toHaveTextContent('false');
  });

  test('calculates budget percent used correctly', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Set budget to 200
    const budgetInput = screen.getByTestId('budget-input');
    fireEvent.change(budgetInput, { target: { value: '200' } });

    // Test various percentages
    const cartInput = screen.getByTestId('cart-total-input');

    // 50%
    fireEvent.change(cartInput, { target: { value: '100' } });
    expect(screen.getByTestId('percent')).toHaveTextContent('50.00');

    // 75%
    fireEvent.change(cartInput, { target: { value: '150' } });
    expect(screen.getByTestId('percent')).toHaveTextContent('75.00');

    // 100%
    fireEvent.change(cartInput, { target: { value: '200' } });
    expect(screen.getByTestId('percent')).toHaveTextContent('100.00');

    // 125% (capped at 100)
    fireEvent.change(cartInput, { target: { value: '250' } });
    expect(screen.getByTestId('percent')).toHaveTextContent('100.00');
  });

  test('returns 0% when budget is 0', () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    const cartInput = screen.getByTestId('cart-total-input');
    fireEvent.change(cartInput, { target: { value: '100' } });

    expect(screen.getByTestId('percent')).toHaveTextContent('0.00');
  });

  test('persists budget to localStorage', async () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    const input = screen.getByTestId('budget-input');
    fireEvent.change(input, { target: { value: '250' } });
    // Budget enabled defaults to true, so it should already be enabled

    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      expect(stored).toBeTruthy();
      const data = JSON.parse(stored);
      expect(data.version).toBe(1);
      expect(data.budget).toBe(250);
      expect(data.enabled).toBe(true);
      expect(data.savedAt).toBeTruthy();
    });
  });

  test('loads budget from localStorage on mount', () => {
    const mockBudget = {
      version: 1,
      budget: 300,
      enabled: true,
      savedAt: '2026-02-28T15:00:00.000Z'
    };

    localStorage.setItem('madmatch_budget', JSON.stringify(mockBudget));

    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    expect(screen.getByTestId('budget')).toHaveTextContent('300');
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });

  test('ignores invalid localStorage data', () => {
    localStorage.setItem('madmatch_budget', 'invalid json');

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    expect(screen.getByTestId('budget')).toHaveTextContent('0');
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test('ignores wrong version in localStorage', () => {
    const wrongVersion = {
      version: 99,
      budget: 500,
      enabled: true
    };

    localStorage.setItem('madmatch_budget', JSON.stringify(wrongVersion));

    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    expect(screen.getByTestId('budget')).toHaveTextContent('0');
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });

  test('handles missing fields in localStorage gracefully', () => {
    const incompleteBudget = {
      version: 1
      // Missing budget and enabled fields
    };

    localStorage.setItem('madmatch_budget', JSON.stringify(incompleteBudget));

    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    expect(screen.getByTestId('budget')).toHaveTextContent('0');
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });

  test('updates localStorage when budget amount changes', async () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    const input = screen.getByTestId('budget-input');
    fireEvent.change(input, { target: { value: '150' } });

    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      const data = JSON.parse(stored);
      expect(data.budget).toBe(150);
    });

    fireEvent.change(input, { target: { value: '350' } });

    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      const data = JSON.parse(stored);
      expect(data.budget).toBe(350);
    });
  });

  test('updates localStorage when enabled state changes', async () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    // Default is true, toggle to false
    fireEvent.click(screen.getByText('Toggle Budget'));

    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      const data = JSON.parse(stored);
      expect(data.enabled).toBe(false);
    });

    // Toggle back to true
    fireEvent.click(screen.getByText('Toggle Budget'));

    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      const data = JSON.parse(stored);
      expect(data.enabled).toBe(true);
    });
  });

  test('includes savedAt timestamp in localStorage', async () => {
    render(
      <BudgetProvider>
        <TestComponent />
      </BudgetProvider>
    );

    const beforeSet = new Date().toISOString();
    const input = screen.getByTestId('budget-input');
    fireEvent.change(input, { target: { value: '100' } });
    const afterSet = new Date().toISOString();

    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      const data = JSON.parse(stored);
      const savedAt = data.savedAt;

      expect(savedAt).toBeTruthy();
      expect(savedAt >= beforeSet).toBe(true);
      expect(savedAt <= afterSet).toBe(true);
    });
  });

  test('calculates metrics with default cartTotal of 0', () => {
    const TestMetrics = () => {
      const { setBudget, calculateBudgetMetrics } = useBudget();
      
      React.useEffect(() => {
        setBudget(200);
      }, [setBudget]);

      const metrics = calculateBudgetMetrics(); // No cart total provided

      return (
        <div>
          <div data-testid="remaining">{metrics.remainingBudget}</div>
          <div data-testid="exceeded">{metrics.budgetExceeded ? 'true' : 'false'}</div>
          <div data-testid="percent">{metrics.budgetPercentUsed.toFixed(2)}</div>
        </div>
      );
    };

    render(
      <BudgetProvider>
        <TestMetrics />
      </BudgetProvider>
    );

    expect(screen.getByTestId('remaining')).toHaveTextContent('200');
    expect(screen.getByTestId('exceeded')).toHaveTextContent('false');
    expect(screen.getByTestId('percent')).toHaveTextContent('0.00');
  });

  describe('Schema Validation', () => {
    test('handles corrupted budget data gracefully', () => {
      localStorage.setItem('madmatch_budget', 'corrupted json {{{');

      render(
        <BudgetProvider>
          <TestComponent />
        </BudgetProvider>
      );

      expect(screen.getByTestId('budget')).toHaveTextContent('0');
      expect(screen.getByTestId('enabled')).toHaveTextContent('true');
    });

    test('validates and corrects invalid budget amount', () => {
      localStorage.setItem('madmatch_budget', JSON.stringify({
        budget: 'invalid',
        enabled: true,
        version: 2
      }));

      render(
        <BudgetProvider>
          <TestComponent />
        </BudgetProvider>
      );

      expect(screen.getByTestId('budget')).toHaveTextContent('0');
    });

    test('validates and corrects negative budget', () => {
      localStorage.setItem('madmatch_budget', JSON.stringify({
        budget: -100,
        enabled: true,
        version: 2
      }));

      render(
        <BudgetProvider>
          <TestComponent />
        </BudgetProvider>
      );

      expect(screen.getByTestId('budget')).toHaveTextContent('0');
    });

    test('validates and corrects NaN budget', () => {
      localStorage.setItem('madmatch_budget', JSON.stringify({
        budget: NaN,
        enabled: true,
        version: 2
      }));

      render(
        <BudgetProvider>
          <TestComponent />
        </BudgetProvider>
      );

      expect(screen.getByTestId('budget')).toHaveTextContent('0');
    });

    test('validates and corrects Infinity budget', () => {
      localStorage.setItem('madmatch_budget', JSON.stringify({
        budget: Infinity,
        enabled: true,
        version: 2
      }));

      render(
        <BudgetProvider>
          <TestComponent />
        </BudgetProvider>
      );

      expect(screen.getByTestId('budget')).toHaveTextContent('0');
    });

    test('validates and corrects invalid enabled flag', () => {
      localStorage.setItem('madmatch_budget', JSON.stringify({
        budget: 1000,
        enabled: 'invalid',
        version: 2
      }));

      render(
        <BudgetProvider>
          <TestComponent />
        </BudgetProvider>
      );

      expect(screen.getByTestId('enabled')).toHaveTextContent('true');
    });

    test('accepts false enabled flag', () => {
      localStorage.setItem('madmatch_budget', JSON.stringify({
        budget: 1000,
        enabled: false,
        version: 2
      }));

      render(
        <BudgetProvider>
          <TestComponent />
        </BudgetProvider>
      );

      expect(screen.getByTestId('enabled')).toHaveTextContent('false');
    });

    test('clears budget on schema version mismatch', () => {
      localStorage.setItem('madmatch_budget', JSON.stringify({
        budget: 1000,
        enabled: true,
        version: 999
      }));

      render(
        <BudgetProvider>
          <TestComponent />
        </BudgetProvider>
      );

      expect(screen.getByTestId('budget')).toHaveTextContent('0');
      expect(screen.getByTestId('enabled')).toHaveTextContent('true');
    });
  });
});
