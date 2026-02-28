import React from 'react';
import './LoadingSkeleton.css';

/**
 * LoadingSkeleton Component
 * Provides visual feedback during data loading
 */
const LoadingSkeleton = ({ type = 'product' }) => {
  if (type === 'nutrition') {
    return (
      <div className="skeleton-card" data-testid="skeleton-nutrition" aria-label="Indlæser næringsdata">
        <div className="skeleton-title"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
      </div>
    );
  }

  if (type === 'recipes') {
    return (
      <div className="skeleton-card" data-testid="skeleton-recipes" aria-label="Indlæser opskrifter">
        <div className="skeleton-title"></div>
        <div className="skeleton-recipe-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-recipe-card">
              <div className="skeleton-recipe-image"></div>
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'sustainability') {
    return (
      <div className="skeleton-card" data-testid="skeleton-sustainability" aria-label="Indlæser bæredygtighedsdata">
        <div className="skeleton-title"></div>
        <div className="skeleton-circle"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
      </div>
    );
  }

  // Default: full product page skeleton
  return (
    <div className="skeleton-product-page" data-testid="skeleton-product" aria-label="Indlæser produkt">
      <div className="skeleton-header">
        <div className="skeleton-back-button"></div>
      </div>
      
      <div className="skeleton-content">
        <div className="skeleton-image-section">
          <div className="skeleton-product-image"></div>
        </div>
        
        <div className="skeleton-info-section">
          <div className="skeleton-badges">
            <div className="skeleton-badge"></div>
            <div className="skeleton-badge"></div>
            <div className="skeleton-badge"></div>
          </div>
          
          <div className="skeleton-product-name"></div>
          
          <div className="skeleton-pricing">
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
          </div>
          
          <div className="skeleton-card">
            <div className="skeleton-title"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
