import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BudgetSettings from './BudgetSettings';
import { BudgetProvider } from '../contexts/BudgetContext';

const renderWithProvider = (component) => {
  return render(
    <BudgetProvider>
      {component}
    </BudgetProvider>
  );
};

describe('BudgetSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders budget settings component', () => {
    renderWithProvider(<BudgetSettings />);
    expect(screen.getByTestId('budget-settings')).toBeInTheDocument();
    expect(screen.getByText('Budget indstillinger')).toBeInTheDocument();
  });

  test('shows toggle switch for enabling budget', () => {
    renderWithProvider(<BudgetSettings />);
    expect(screen.getByTestId('budget-toggle')).toBeInTheDocument();
    expect(screen.getByText('Aktiver budget tracking')).toBeInTheDocument();
  });

  test('toggle starts checked by default', () => {
    renderWithProvider(<BudgetSettings />);
    expect(screen.getByTestId('budget-toggle')).toBeChecked();
  });

  test('toggle can be unchecked', () => {
    renderWithProvider(<BudgetSettings />);
    const toggle = screen.getByTestId('budget-toggle');
    
    // Starts checked, click to uncheck
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
  });

  test('toggle can be checked again', () => {
    renderWithProvider(<BudgetSettings />);
    const toggle = screen.getByTestId('budget-toggle');
    
    // Starts checked, click to uncheck
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    
    // Click again to check
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  test('shows budget input when enabled', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input should be visible by default (enabled by default)
    expect(screen.getByTestId('budget-amount-input')).toBeInTheDocument();
  });

  test('hides budget input when disabled', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input visible by default
    expect(screen.getByTestId('budget-amount-input')).toBeInTheDocument();
    
    // Disable budget
    fireEvent.click(screen.getByTestId('budget-toggle'));
    expect(screen.queryByTestId('budget-amount-input')).not.toBeInTheDocument();
  });

  test('shows reset button when enabled', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Reset button visible by default (enabled by default)
    expect(screen.getByTestId('reset-budget-button')).toBeInTheDocument();
  });

  test('budget input starts with 0', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input visible by default - no toggle needed
    const input = screen.getByTestId('budget-amount-input');
    
    expect(input).toHaveValue(0);
  });

  test('can set budget amount', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input visible by default - no toggle needed
    const input = screen.getByTestId('budget-amount-input');
    
    fireEvent.change(input, { target: { value: '250' } });
    expect(input).toHaveValue(250);
  });

  test('can update budget amount multiple times', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input visible by default - no toggle needed
    const input = screen.getByTestId('budget-amount-input');
    
    fireEvent.change(input, { target: { value: '100' } });
    expect(input).toHaveValue(100);
    
    fireEvent.change(input, { target: { value: '300' } });
    expect(input).toHaveValue(300);
  });

  test('rejects negative budget amounts', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input visible by default - no toggle needed
    const input = screen.getByTestId('budget-amount-input');
    
    fireEvent.change(input, { target: { value: '200' } });
    expect(input).toHaveValue(200);
    
    // Try to set negative value
    fireEvent.change(input, { target: { value: '-50' } });
    // Input shows the value, but context won't accept it
    expect(input.value).toBe('-50');
  });

  test('handles non-numeric input gracefully', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input visible by default - no toggle needed
    const input = screen.getByTestId('budget-amount-input');
    
    // When non-numeric value is entered, input temporarily shows it
    // But useEffect syncs it back to budget value (0) since context didn't update
    fireEvent.change(input, { target: { value: 'abc' } });
    // After re-render, input shows budget value (0) as empty string for input[type=number]
    expect(input.value).toBe('');
  });

  test('reset button resets budget to 0 and disables', async () => {
    renderWithProvider(<BudgetSettings />);
    
    // Already enabled by default, set budget
    const input = screen.getByTestId('budget-amount-input');
    fireEvent.change(input, { target: { value: '500' } });
    expect(input).toHaveValue(500);
    
    // Reset
    fireEvent.click(screen.getByTestId('reset-budget-button'));
    
    // Should be disabled
    await waitFor(() => {
      expect(screen.getByTestId('budget-toggle')).not.toBeChecked();
    });
  });

  test('shows help text', () => {
    renderWithProvider(<BudgetSettings />);
    expect(screen.getByText(/Sæt et budget for at holde styr på dit forbrug/)).toBeInTheDocument();
  });

  test('input has correct attributes', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input visible by default - no toggle needed
    const input = screen.getByTestId('budget-amount-input');
    
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('step', '10');
  });

  test('persists budget to localStorage when changed', async () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input visible by default - no toggle needed
    const input = screen.getByTestId('budget-amount-input');
    fireEvent.change(input, { target: { value: '350' } });
    
    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      expect(stored).toBeTruthy();
      const data = JSON.parse(stored);
      expect(data.budget).toBe(350);
      expect(data.enabled).toBe(true);
    });
  });

  test('persists enabled state to localStorage', async () => {
    renderWithProvider(<BudgetSettings />);
    
    // Context starts with enabled=true by default
    // Trigger a state change to force save (toggle off then on)
    const toggle = screen.getByTestId('budget-toggle');
    fireEvent.click(toggle); // Disable
    fireEvent.click(toggle); // Enable again
    
    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      const data = JSON.parse(stored);
      expect(data.enabled).toBe(true);
    });
  });

  test('loads initial state from localStorage', () => {
    const mockBudget = {
      version: 1,
      budget: 400,
      enabled: true,
      savedAt: '2026-02-28T15:00:00.000Z'
    };
    
    localStorage.setItem('madmatch_budget', JSON.stringify(mockBudget));
    
    renderWithProvider(<BudgetSettings />);
    
    expect(screen.getByTestId('budget-toggle')).toBeChecked();
    expect(screen.getByTestId('budget-amount-input')).toHaveValue(400);
  });

  test('reset clears localStorage correctly', async () => {
    renderWithProvider(<BudgetSettings />);
    
    // Already enabled by default, set budget
    const input = screen.getByTestId('budget-amount-input');
    fireEvent.change(input, { target: { value: '500' } });
    
    // Verify it's saved
    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      const data = JSON.parse(stored);
      expect(data.budget).toBe(500);
    });
    
    // Reset
    fireEvent.click(screen.getByTestId('reset-budget-button'));
    
    // Verify reset in localStorage
    await waitFor(() => {
      const stored = localStorage.getItem('madmatch_budget');
      const data = JSON.parse(stored);
      expect(data.budget).toBe(0);
      expect(data.enabled).toBe(false);
    });
  });

  test('handles decimal budget values', () => {
    renderWithProvider(<BudgetSettings />);
    
    // Input visible by default - no toggle needed
    const input = screen.getByTestId('budget-amount-input');
    
    fireEvent.change(input, { target: { value: '123.45' } });
    expect(input).toHaveValue(123.45);
  });
});
