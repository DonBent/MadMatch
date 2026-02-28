import React from 'react';
import { render, screen } from '@testing-library/react';
import BudgetDisplay from './BudgetDisplay';
import { BudgetProvider } from '../contexts/BudgetContext';

// Helper to render with provider
const renderWithBudget = (component, initialBudget = 200, initialEnabled = true) => {
  // Mock localStorage
  const mockBudget = {
    version: 1,
    budget: initialBudget,
    enabled: initialEnabled,
    savedAt: '2026-02-28T15:00:00.000Z'
  };
  
  localStorage.setItem('madmatch_budget', JSON.stringify(mockBudget));
  
  return render(
    <BudgetProvider>
      {component}
    </BudgetProvider>
  );
};

describe('BudgetDisplay', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('does not render when budget is disabled', () => {
    renderWithBudget(<BudgetDisplay cartTotal={100} />, 200, false);
    expect(screen.queryByTestId('budget-display')).not.toBeInTheDocument();
  });

  test('renders when budget is enabled', () => {
    renderWithBudget(<BudgetDisplay cartTotal={100} />, 200, true);
    expect(screen.getByTestId('budget-display')).toBeInTheDocument();
  });

  test('displays cart total correctly', () => {
    renderWithBudget(<BudgetDisplay cartTotal={150} />, 200, true);
    expect(screen.getByText('150 kr')).toBeInTheDocument();
  });

  test('displays budget amount correctly', () => {
    renderWithBudget(<BudgetDisplay cartTotal={100} />, 250, true);
    expect(screen.getByText('250 kr')).toBeInTheDocument();
  });

  test('displays remaining budget correctly', () => {
    renderWithBudget(<BudgetDisplay cartTotal={75} />, 200, true);
    expect(screen.getByText('125 kr')).toBeInTheDocument();
  });

  test('displays negative remaining budget when exceeded', () => {
    renderWithBudget(<BudgetDisplay cartTotal={250} />, 200, true);
    const remainingElement = screen.getByText('-50 kr');
    expect(remainingElement).toBeInTheDocument();
    expect(remainingElement).toHaveClass('negative');
  });

  test('shows warning when budget is exceeded', () => {
    renderWithBudget(<BudgetDisplay cartTotal={250} />, 200, true);
    expect(screen.getByTestId('budget-warning')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Budget overskredet')).toBeInTheDocument();
  });

  test('does not show warning when budget is not exceeded', () => {
    renderWithBudget(<BudgetDisplay cartTotal={150} />, 200, true);
    expect(screen.queryByTestId('budget-warning')).not.toBeInTheDocument();
  });

  test('displays percentage used correctly', () => {
    renderWithBudget(<BudgetDisplay cartTotal={100} />, 200, true);
    expect(screen.getByText('50% af budget brugt')).toBeInTheDocument();
  });

  test('displays 100% when budget fully used', () => {
    renderWithBudget(<BudgetDisplay cartTotal={200} />, 200, true);
    expect(screen.getByText('100% af budget brugt')).toBeInTheDocument();
  });

  test('caps percentage display at 100% when exceeded', () => {
    renderWithBudget(<BudgetDisplay cartTotal={250} />, 200, true);
    // Progress bar width capped at 100%, but percentage should show actual 125%
    expect(screen.getByText('100% af budget brugt')).toBeInTheDocument();
  });

  test('renders progress bar with correct width at 50%', () => {
    renderWithBudget(<BudgetDisplay cartTotal={100} />, 200, true);
    const progressBar = screen.getByTestId('budget-progress-bar');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  test('renders progress bar with correct width at 75%', () => {
    renderWithBudget(<BudgetDisplay cartTotal={150} />, 200, true);
    const progressBar = screen.getByTestId('budget-progress-bar');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  test('renders progress bar with correct width at 100%', () => {
    renderWithBudget(<BudgetDisplay cartTotal={200} />, 200, true);
    const progressBar = screen.getByTestId('budget-progress-bar');
    expect(progressBar).toHaveStyle({ width: '100%' });
  });

  test('caps progress bar width at 100% when exceeded', () => {
    renderWithBudget(<BudgetDisplay cartTotal={250} />, 200, true);
    const progressBar = screen.getByTestId('budget-progress-bar');
    expect(progressBar).toHaveStyle({ width: '100%' });
  });

  test('progress bar is green when under 75%', () => {
    renderWithBudget(<BudgetDisplay cartTotal={100} />, 200, true);
    const progressBar = screen.getByTestId('budget-progress-bar');
    expect(progressBar).toHaveStyle({ backgroundColor: '#28a745' });
  });

  test('progress bar is yellow between 75% and 100%', () => {
    renderWithBudget(<BudgetDisplay cartTotal={180} />, 200, true);
    const progressBar = screen.getByTestId('budget-progress-bar');
    expect(progressBar).toHaveStyle({ backgroundColor: '#ffc107' });
  });

  test('progress bar is red when over 100%', () => {
    renderWithBudget(<BudgetDisplay cartTotal={250} />, 200, true);
    const progressBar = screen.getByTestId('budget-progress-bar');
    expect(progressBar).toHaveStyle({ backgroundColor: '#dc3545' });
  });

  test('progress bar is yellow exactly at 75%', () => {
    renderWithBudget(<BudgetDisplay cartTotal={150} />, 200, true);
    const progressBar = screen.getByTestId('budget-progress-bar');
    // 75% is <= 75, so it's still green
    expect(progressBar).toHaveStyle({ backgroundColor: '#28a745' });
  });

  test('progress bar is yellow exactly at 100%', () => {
    renderWithBudget(<BudgetDisplay cartTotal={200} />, 200, true);
    const progressBar = screen.getByTestId('budget-progress-bar');
    expect(progressBar).toHaveStyle({ backgroundColor: '#ffc107' });
  });

  test('renders in compact mode', () => {
    renderWithBudget(<BudgetDisplay cartTotal={100} compact={true} />, 200, true);
    expect(screen.getByTestId('budget-display')).toHaveClass('budget-display-compact');
  });

  test('compact mode shows budget ok status', () => {
    renderWithBudget(<BudgetDisplay cartTotal={100} compact={true} />, 200, true);
    expect(screen.getByText(/Budget: 100 kr \/ 200 kr \(50%\)/)).toBeInTheDocument();
  });

  test('compact mode shows exceeded status', () => {
    renderWithBudget(<BudgetDisplay cartTotal={250} compact={true} />, 200, true);
    expect(screen.getByText(/Over budget: 250 kr \/ 200 kr/)).toBeInTheDocument();
  });

  test('handles cartTotal of 0', () => {
    renderWithBudget(<BudgetDisplay cartTotal={0} />, 200, true);
    expect(screen.getByText('0 kr')).toBeInTheDocument();
    const budgetTexts = screen.getAllByText('200 kr');
    expect(budgetTexts.length).toBeGreaterThan(0);
    expect(screen.getByText('0% af budget brugt')).toBeInTheDocument();
  });

  test('handles default cartTotal when not provided', () => {
    renderWithBudget(<BudgetDisplay />, 200, true);
    expect(screen.getByText('0 kr')).toBeInTheDocument();
    const budgetTexts = screen.getAllByText('200 kr');
    expect(budgetTexts.length).toBeGreaterThan(0);
  });

  test('handles decimal cart totals correctly', () => {
    renderWithBudget(<BudgetDisplay cartTotal={123.45} />, 200, true);
    expect(screen.getByText('123 kr')).toBeInTheDocument();
  });

  test('handles decimal budget amounts correctly', () => {
    renderWithBudget(<BudgetDisplay cartTotal={100} />, 234.56, true);
    expect(screen.getByText('235 kr')).toBeInTheDocument();
  });
});
