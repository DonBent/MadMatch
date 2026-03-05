import React from 'react';
import './LoadingSkeleton.css';

/**
 * LoadingSkeleton - Epic 5 Slice 6: Reusable loading skeleton component
 * 
 * @param {Object} props
 * @param {string} props.type - Type of skeleton (card, list, text, circle)
 * @param {number} props.count - Number of skeleton items to render
 * @param {number} props.height - Custom height in pixels
 * @param {number} props.width - Custom width in pixels (or percentage string)
 */
function LoadingSkeleton({ type = 'card', count = 1, height, width, className = '' }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'day-card':
        return (
          <div className="skeleton skeleton--day-card" data-testid="loading-skeleton">
            <div className="skeleton__header">
              <div className="skeleton__text skeleton__text--title"></div>
              <div className="skeleton__text skeleton__text--subtitle"></div>
            </div>
            <div className="skeleton__image"></div>
            <div className="skeleton__content">
              <div className="skeleton__text skeleton__text--line"></div>
              <div className="skeleton__text skeleton__text--line-short"></div>
            </div>
          </div>
        );
      
      case 'list-item':
        return (
          <div className="skeleton skeleton--list-item" data-testid="loading-skeleton">
            <div className="skeleton__text skeleton__text--line"></div>
          </div>
        );
      
      case 'text':
        return (
          <div 
            className="skeleton skeleton--text" 
            data-testid="loading-skeleton"
            style={{ 
              height: height ? `${height}px` : undefined,
              width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined
            }}
          ></div>
        );
      
      case 'circle':
        return (
          <div 
            className="skeleton skeleton--circle" 
            data-testid="loading-skeleton"
            style={{ 
              width: width ? `${width}px` : '40px',
              height: height ? `${height}px` : '40px'
            }}
          ></div>
        );
      
      case 'card':
      default:
        return (
          <div className="skeleton skeleton--card" data-testid="loading-skeleton">
            <div className="skeleton__image"></div>
            <div className="skeleton__content">
              <div className="skeleton__text skeleton__text--title"></div>
              <div className="skeleton__text skeleton__text--line"></div>
              <div className="skeleton__text skeleton__text--line-short"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={className}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
}

export default LoadingSkeleton;
