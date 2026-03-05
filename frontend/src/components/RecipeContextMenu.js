import React, { useEffect, useRef } from 'react';
import './RecipeContextMenu.css';

/**
 * RecipeContextMenu - Epic 5 Slice 3: Context Menu for Recipe Cards
 * 
 * Shows action menu for recipe cards:
 * - Edit portions (adjust servings)
 * - Move to another day
 * - Remove from plan
 * 
 * Triggered by:
 * - Mobile: Long-press (500ms)
 * - Desktop: Right-click
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether menu is visible
 * @param {Function} props.onClose - Callback when menu closes
 * @param {Object} props.position - Menu position { x, y }
 * @param {Function} props.onEditPortions - Callback for edit portions action
 * @param {Function} props.onMove - Callback for move action
 * @param {Function} props.onRemove - Callback for remove action
 */
function RecipeContextMenu({ isOpen, onClose, position, onEditPortions, onMove, onRemove }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Close menu on outside click
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    // Close menu on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleEditPortions = () => {
    onEditPortions();
    onClose();
  };

  const handleMove = () => {
    onMove();
    onClose();
  };

  const handleRemove = () => {
    onRemove();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="recipe-context-menu"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      role="menu"
      aria-label="Opskrift handlinger"
      data-testid="recipe-context-menu"
    >
      <button
        className="recipe-context-menu__item"
        onClick={handleEditPortions}
        data-testid="context-menu-edit-portions"
        role="menuitem"
        aria-label="Rediger portioner"
      >
        <span className="recipe-context-menu__icon" aria-hidden="true">✏️</span>
        <span className="recipe-context-menu__text">Rediger portioner</span>
      </button>

      <button
        className="recipe-context-menu__item"
        onClick={handleMove}
        data-testid="context-menu-move"
        role="menuitem"
        aria-label="Flyt til anden dag"
      >
        <span className="recipe-context-menu__icon" aria-hidden="true">➡️</span>
        <span className="recipe-context-menu__text">Flyt til anden dag</span>
      </button>

      <button
        className="recipe-context-menu__item recipe-context-menu__item--danger"
        onClick={handleRemove}
        data-testid="context-menu-remove"
        role="menuitem"
        aria-label="Fjern fra plan"
      >
        <span className="recipe-context-menu__icon" aria-hidden="true">🗑️</span>
        <span className="recipe-context-menu__text">Fjern fra plan</span>
      </button>
    </div>
  );
}

export default RecipeContextMenu;
