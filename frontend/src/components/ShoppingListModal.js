/**
 * ShoppingListModal - Epic 5 Slice 5: Shopping List Modal
 * 
 * Displays aggregated shopping list from weekly meal plan.
 * Groups ingredients by category, highlights tilbud items, shows total cost and savings.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Object} props.shoppingList - Shopping list data { items, totalCost, totalSavings }
 */

import React from 'react';
import './ShoppingListModal.css';

const CATEGORY_ICONS = {
  'Grøntsager': '🥬',
  'Kød & Fisk': '🥩',
  'Mejeri': '🧀',
  'Tørvarer': '🍝',
  'Krydderier': '🧂',
  'Øvrigt': '📦'
};

function ShoppingListModal({ isOpen, onClose, shoppingList }) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  /**
   * Export shopping list to clipboard
   */
  const handleExport = () => {
    if (!shoppingList || !shoppingList.items) return;
    
    let exportText = '📋 INDKØBSLISTE\n\n';
    
    // Add each category with items
    for (const [category, items] of Object.entries(shoppingList.items)) {
      if (items.length === 0) continue;
      
      const icon = CATEGORY_ICONS[category] || '📦';
      exportText += `${icon} ${category}\n`;
      exportText += '─────────────────\n';
      
      for (const item of items) {
        const quantityStr = item.quantity !== null 
          ? `${Math.round(item.quantity * 10) / 10} ${item.unit} `.trim() + ' '
          : '';
        
        const tilbudMark = item.onTilbud ? '✅ ' : '';
        
        exportText += `${tilbudMark}${quantityStr}${item.name}\n`;
      }
      
      exportText += '\n';
    }
    
    // Add totals
    if (shoppingList.totalCost > 0) {
      exportText += '💰 TOTAL\n';
      exportText += '─────────────────\n';
      exportText += `I alt: ${Math.round(shoppingList.totalCost)} kr\n`;
      
      if (shoppingList.totalSavings > 0) {
        exportText += `Du sparer: ${Math.round(shoppingList.totalSavings)} kr\n`;
      }
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(exportText)
      .then(() => {
        alert('Indkøbsliste kopieret til udklipsholder!');
      })
      .catch(err => {
        console.error('Failed to copy to clipboard:', err);
        alert('Kunne ikke kopiere til udklipsholder. Prøv igen.');
      });
  };

  /**
   * Format quantity for display
   */
  const formatQuantity = (quantity, unit) => {
    if (quantity === null) return '';
    
    // Round to 1 decimal place for cleaner display
    const rounded = Math.round(quantity * 10) / 10;
    
    return `${rounded} ${unit}`.trim();
  };

  /**
   * Format price for display
   */
  const formatPrice = (price) => {
    if (price === null || price === undefined) return '';
    return `${Math.round(price)} kr`;
  };

  if (!isOpen) {
    return null;
  }

  const hasItems = shoppingList && shoppingList.items && 
    Object.values(shoppingList.items).some(categoryItems => categoryItems.length > 0);

  return (
    <div
      className="shopping-list-modal-backdrop"
      onClick={handleBackdropClick}
      data-testid="shopping-list-modal"
    >
      <div 
        className="shopping-list-modal" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="shopping-list-title"
      >
        <div className="shopping-list-modal__header">
          <h2 id="shopping-list-title" className="shopping-list-modal__title">
            📋 Indkøbsliste
          </h2>
          <button
            className="shopping-list-modal__close"
            onClick={onClose}
            aria-label="Luk"
            data-testid="shopping-list-close-button"
          >
            ✕
          </button>
        </div>

        <div className="shopping-list-modal__content">
          {!hasItems ? (
            <div className="shopping-list-modal__empty">
              <p>Ingen ingredienser at vise.</p>
              <p className="shopping-list-modal__empty-hint">
                Tilføj opskrifter til din ugeplan for at generere indkøbsliste.
              </p>
            </div>
          ) : (
            <>
              {Object.entries(shoppingList.items).map(([category, items]) => {
                if (items.length === 0) return null;
                
                const icon = CATEGORY_ICONS[category] || '📦';
                const categoryTestId = `shopping-list-category-${category.toLowerCase().replace(/\s+/g, '-').replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/&/g, 'og')}`;
                
                return (
                  <div 
                    key={category} 
                    className="shopping-list-category"
                    data-testid={categoryTestId}
                  >
                    <h3 className="shopping-list-category__title">
                      <span className="shopping-list-category__icon" aria-hidden="true">
                        {icon}
                      </span>
                      {category}
                    </h3>
                    
                    <ul className="shopping-list-items">
                      {items.map((item, index) => (
                        <li 
                          key={`${category}-${index}`} 
                          className="shopping-list-item"
                          data-testid="shopping-list-item"
                        >
                          <div className="shopping-list-item__main">
                            <span className="shopping-list-item__quantity">
                              {formatQuantity(item.quantity, item.unit)}
                            </span>
                            <span className="shopping-list-item__name">
                              {item.name}
                            </span>
                            {item.onTilbud && (
                              <span 
                                className="shopping-list-item__tilbud-badge"
                                title="På tilbud"
                                aria-label="På tilbud"
                              >
                                ✅
                              </span>
                            )}
                          </div>
                          
                          {item.tilbudPrice !== null && (
                            <div className="shopping-list-item__price">
                              {item.onTilbud && item.normalPrice !== null && (
                                <span className="shopping-list-item__price-normal">
                                  {formatPrice(item.normalPrice)}
                                </span>
                              )}
                              <span className={item.onTilbud ? 'shopping-list-item__price-tilbud' : ''}>
                                {formatPrice(item.tilbudPrice)}
                              </span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {hasItems && (shoppingList.totalCost > 0 || shoppingList.totalSavings > 0) && (
          <div className="shopping-list-modal__footer">
            <div className="shopping-list-totals">
              {shoppingList.totalCost > 0 && (
                <div className="shopping-list-total">
                  <span className="shopping-list-total__label">I alt:</span>
                  <span 
                    className="shopping-list-total__value"
                    data-testid="shopping-list-total-cost"
                  >
                    {Math.round(shoppingList.totalCost)} kr
                  </span>
                </div>
              )}
              
              {shoppingList.totalSavings > 0 && (
                <div className="shopping-list-savings">
                  <span className="shopping-list-savings__label">Du sparer:</span>
                  <span 
                    className="shopping-list-savings__value"
                    data-testid="shopping-list-total-savings"
                  >
                    {Math.round(shoppingList.totalSavings)} kr
                  </span>
                </div>
              )}
            </div>
            
            <div className="shopping-list-modal__actions">
              <button
                className="shopping-list-modal__button shopping-list-modal__button--secondary"
                onClick={handleExport}
                data-testid="shopping-list-export-button"
              >
                📤 Eksporter
              </button>
              <button
                className="shopping-list-modal__button shopping-list-modal__button--primary"
                onClick={onClose}
              >
                Luk
              </button>
            </div>
          </div>
        )}
        
        {hasItems && shoppingList.totalCost === 0 && shoppingList.totalSavings === 0 && (
          <div className="shopping-list-modal__footer">
            <div className="shopping-list-modal__actions">
              <button
                className="shopping-list-modal__button shopping-list-modal__button--secondary"
                onClick={handleExport}
                data-testid="shopping-list-export-button"
              >
                📤 Eksporter
              </button>
              <button
                className="shopping-list-modal__button shopping-list-modal__button--primary"
                onClick={onClose}
              >
                Luk
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShoppingListModal;
