import React, { useState } from 'react';
import './ShareButton.css';

/**
 * ShareButton Component
 * Allows users to copy product link to clipboard
 */
const ShareButton = ({ productId, productName }) => {
  const [showToast, setShowToast] = useState(false);

  const handleShare = async () => {
    const productUrl = `${window.location.origin}/produkt/${productId}`;
    
    try {
      await navigator.clipboard.writeText(productUrl);
      setShowToast(true);
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for browsers that don't support clipboard API
      alert('Link kopieret: ' + productUrl);
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className="share-button"
        aria-label={`Del ${productName}`}
        title="Kopier link til produkt"
      >
        <span className="share-icon" aria-hidden="true">🔗</span>
        <span className="share-text">Del produkt</span>
      </button>
      
      {showToast && (
        <div className="share-toast" role="alert" aria-live="polite">
          <span className="toast-icon">✓</span>
          <span className="toast-text">Link kopieret til udklipsholder!</span>
        </div>
      )}
    </>
  );
};

export default ShareButton;
