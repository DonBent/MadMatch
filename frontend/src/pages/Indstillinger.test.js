import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BudgetProvider } from '../contexts/BudgetContext';
import Indstillinger from './Indstillinger';
import * as storage from '../utils/storage';

// Mock storage module
jest.mock('../utils/storage');

const renderIndstillinger = () => {
  return render(
    <BrowserRouter>
      <BudgetProvider>
        <Indstillinger />
      </BudgetProvider>
    </BrowserRouter>
  );
};

describe('Indstillinger Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default storage mocks
    storage.getItem.mockReturnValue(null);
    storage.setItem.mockResolvedValue({ success: true, backend: 'localStorage' });
    storage.getStorageStatus.mockReturnValue({
      backend: 'localStorage',
      version: 2,
      isSafari: false,
      isPrivateBrowsing: false,
      localStorageAvailable: true,
      sessionStorageAvailable: true
    });
    storage.STORAGE_VERSION = 2;
  });

  describe('Page Rendering', () => {
    it('renders settings page with header', () => {
      renderIndstillinger();
      
      expect(screen.getByText('⚙️ Indstillinger')).toBeInTheDocument();
      expect(screen.getByText('← Tilbage')).toBeInTheDocument();
    });

    it('renders budget section', () => {
      renderIndstillinger();
      
      expect(screen.getByText('Budget')).toBeInTheDocument();
      expect(screen.getByText(/Sæt dit månedlige madbudget/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Budget beløb/)).toBeInTheDocument();
    });

    it('renders postnummer section', () => {
      renderIndstillinger();
      
      expect(screen.getByText('Postnummer')).toBeInTheDocument();
      expect(screen.getByText(/Angiv dit postnummer/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Postnummer \(4 cifre\)/)).toBeInTheDocument();
    });

    it('renders save buttons', () => {
      renderIndstillinger();
      
      const saveButtons = screen.getAllByText(/Gem/);
      expect(saveButtons).toHaveLength(2); // Budget and Postnummer save buttons
    });
  });

  describe('Budget Settings', () => {
    it('displays budget toggle switch', () => {
      renderIndstillinger();
      
      const toggle = screen.getByRole('checkbox', { name: /Budget-tracking/ });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toBeChecked(); // Default is enabled
    });

    it('toggles budget enabled state', async () => {
      renderIndstillinger();
      
      const toggle = screen.getByRole('checkbox', { name: /Budget-tracking/ });
      expect(toggle).toBeChecked();
      
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(toggle).not.toBeChecked();
      });
    });

    it('disables budget input when budget is disabled', async () => {
      renderIndstillinger();
      
      const toggle = screen.getByRole('checkbox', { name: /Budget-tracking/ });
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      
      expect(budgetInput).not.toBeDisabled();
      
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(budgetInput).toBeDisabled();
      });
    });

    it('allows budget input change', () => {
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      
      fireEvent.change(budgetInput, { target: { value: '5000' } });
      
      expect(budgetInput).toHaveValue(5000);
    });

    it('validates budget input - negative number', () => {
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      
      fireEvent.change(budgetInput, { target: { value: '-100' } });
      
      expect(screen.getByText('Budget skal være 0 eller større')).toBeInTheDocument();
    });

    it('validates budget input - non-number', () => {
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      
      // Number input will convert invalid input to empty string
      // which triggers the "must be filled" validation
      fireEvent.change(budgetInput, { target: { value: 'abc' } });
      
      // The browser converts 'abc' to empty string for number inputs
      expect(budgetInput.value).toBe('');
      expect(screen.getByText('Budget skal udfyldes')).toBeInTheDocument();
    });

    it('validates budget input - empty', () => {
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      
      fireEvent.change(budgetInput, { target: { value: '' } });
      
      expect(screen.getByText('Budget skal udfyldes')).toBeInTheDocument();
    });

    it('disables save button when budget is invalid', () => {
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      const saveButtons = screen.getAllByText(/Gem/);
      const budgetSaveButton = saveButtons[0]; // First save button is for budget
      
      fireEvent.change(budgetInput, { target: { value: '-100' } });
      
      expect(budgetSaveButton).toBeDisabled();
    });

    it('enables save button when budget is valid', () => {
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      const saveButtons = screen.getAllByText(/Gem/);
      const budgetSaveButton = saveButtons[0];
      
      fireEvent.change(budgetInput, { target: { value: '3000' } });
      
      expect(budgetSaveButton).not.toBeDisabled();
    });

    it('saves budget and shows success message', async () => {
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      const saveButtons = screen.getAllByText(/Gem/);
      const budgetSaveButton = saveButtons[0];
      
      fireEvent.change(budgetInput, { target: { value: '4000' } });
      fireEvent.click(budgetSaveButton);
      
      await waitFor(() => {
        expect(screen.getByText('✓ Budget gemt')).toBeInTheDocument();
      });
    });

    it('success message disappears after 3 seconds', async () => {
      jest.useFakeTimers();
      
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      const saveButtons = screen.getAllByText(/Gem/);
      const budgetSaveButton = saveButtons[0];
      
      fireEvent.change(budgetInput, { target: { value: '4000' } });
      fireEvent.click(budgetSaveButton);
      
      await waitFor(() => {
        expect(screen.getByText('✓ Budget gemt')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(screen.queryByText('✓ Budget gemt')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });
  });

  describe('Postnummer Settings', () => {
    it('allows postnummer input change', () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      
      fireEvent.change(postnummerInput, { target: { value: '2100' } });
      
      expect(postnummerInput).toHaveValue('2100');
    });

    it('validates postnummer - exactly 4 digits required', () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      
      fireEvent.change(postnummerInput, { target: { value: '210' } });
      
      expect(screen.getByText('Postnummer skal være nøjagtig 4 cifre')).toBeInTheDocument();
    });

    it('validates postnummer - only digits allowed', () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      
      // Try to input letters - should not change value
      fireEvent.change(postnummerInput, { target: { value: 'abcd' } });
      
      expect(postnummerInput).toHaveValue('');
    });

    it('limits postnummer input to 4 characters', () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      
      fireEvent.change(postnummerInput, { target: { value: '21000' } });
      
      // Should not accept 5 digits
      expect(postnummerInput).toHaveValue('');
    });

    it('allows empty postnummer (optional field)', () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      const saveButtons = screen.getAllByText(/Gem/);
      const postnummerSaveButton = saveButtons[1]; // Second save button
      
      fireEvent.change(postnummerInput, { target: { value: '' } });
      
      expect(postnummerSaveButton).not.toBeDisabled();
    });

    it('disables save button when postnummer is invalid', () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      const saveButtons = screen.getAllByText(/Gem/);
      const postnummerSaveButton = saveButtons[1];
      
      fireEvent.change(postnummerInput, { target: { value: '210' } });
      
      expect(postnummerSaveButton).toBeDisabled();
    });

    it('saves postnummer to localStorage', async () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      const saveButtons = screen.getAllByText(/Gem/);
      const postnummerSaveButton = saveButtons[1];
      
      fireEvent.change(postnummerInput, { target: { value: '2100' } });
      fireEvent.click(postnummerSaveButton);
      
      await waitFor(() => {
        expect(storage.setItem).toHaveBeenCalledWith(
          'madmatch_postnummer',
          expect.objectContaining({
            postnummer: '2100',
            version: 2
          })
        );
      });
    });

    it('shows success message after saving postnummer', async () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      const saveButtons = screen.getAllByText(/Gem/);
      const postnummerSaveButton = saveButtons[1];
      
      fireEvent.change(postnummerInput, { target: { value: '2100' } });
      fireEvent.click(postnummerSaveButton);
      
      await waitFor(() => {
        expect(screen.getByText('✓ Postnummer gemt')).toBeInTheDocument();
      });
    });

    it('shows different success message when removing postnummer', async () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      const saveButtons = screen.getAllByText(/Gem/);
      const postnummerSaveButton = saveButtons[1];
      
      // First set a value
      fireEvent.change(postnummerInput, { target: { value: '2100' } });
      
      // Then clear it
      fireEvent.change(postnummerInput, { target: { value: '' } });
      fireEvent.click(postnummerSaveButton);
      
      await waitFor(() => {
        expect(screen.getByText('✓ Postnummer fjernet')).toBeInTheDocument();
      });
    });

    it('loads postnummer from storage on mount', () => {
      storage.getItem.mockReturnValue(JSON.stringify({
        postnummer: '8000',
        version: 2
      }));
      
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      expect(postnummerInput).toHaveValue('8000');
    });

    it('handles storage errors gracefully', async () => {
      storage.setItem.mockResolvedValue({ success: false, error: 'Storage failed' });
      
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      const saveButtons = screen.getAllByText(/Gem/);
      const postnummerSaveButton = saveButtons[1];
      
      fireEvent.change(postnummerInput, { target: { value: '2100' } });
      fireEvent.click(postnummerSaveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Kunne ikke gemme postnummer')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('has back link to home', () => {
      renderIndstillinger();
      
      const backLink = screen.getByText('← Tilbage');
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  describe('localStorage Integration', () => {
    it('uses schema version 2 for postnummer storage', async () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      const saveButtons = screen.getAllByText(/Gem/);
      const postnummerSaveButton = saveButtons[1];
      
      fireEvent.change(postnummerInput, { target: { value: '2100' } });
      fireEvent.click(postnummerSaveButton);
      
      await waitFor(() => {
        expect(storage.setItem).toHaveBeenCalledWith(
          'madmatch_postnummer',
          expect.objectContaining({
            version: 2
          })
        );
      });
    });

    it('includes timestamp when saving postnummer', async () => {
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      const saveButtons = screen.getAllByText(/Gem/);
      const postnummerSaveButton = saveButtons[1];
      
      fireEvent.change(postnummerInput, { target: { value: '2100' } });
      fireEvent.click(postnummerSaveButton);
      
      await waitFor(() => {
        expect(storage.setItem).toHaveBeenCalledWith(
          'madmatch_postnummer',
          expect.objectContaining({
            savedAt: expect.any(String)
          })
        );
      });
    });

    it('validates postnummer format when loading from storage', () => {
      storage.getItem.mockReturnValue(JSON.stringify({
        postnummer: 'invalid',
        version: 2
      }));
      
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      
      // Should not load invalid postnummer
      expect(postnummerInput).toHaveValue('');
    });

    it('ignores old schema version data', () => {
      storage.getItem.mockReturnValue(JSON.stringify({
        postnummer: '2100',
        version: 1 // Old version
      }));
      
      renderIndstillinger();
      
      const postnummerInput = screen.getByLabelText(/Postnummer \(4 cifre\)/);
      
      // Should not load old version data
      expect(postnummerInput).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('success message has role status and aria-live', async () => {
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      const saveButtons = screen.getAllByText(/Gem/);
      
      fireEvent.change(budgetInput, { target: { value: '3000' } });
      fireEvent.click(saveButtons[0]);
      
      await waitFor(() => {
        const successMessage = screen.getByText('✓ Budget gemt');
        expect(successMessage).toHaveAttribute('role', 'status');
        expect(successMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('error messages have role alert', () => {
      renderIndstillinger();
      
      const budgetInput = screen.getByLabelText(/Budget beløb/);
      
      fireEvent.change(budgetInput, { target: { value: '-100' } });
      
      const errorMessage = screen.getByText('Budget skal være 0 eller større');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('inputs have proper labels', () => {
      renderIndstillinger();
      
      expect(screen.getByLabelText(/Budget beløb/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Postnummer \(4 cifre\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Budget-tracking/)).toBeInTheDocument();
    });
  });
});
