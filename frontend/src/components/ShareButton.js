import React, { useState } from 'react';
import './ShareButton.css';

/**
 * ShareButton Component
 * Allows users to share tilbud or products via native share API or clipboard fallback
 * Includes loading state and enhanced success feedback
 * 
 * @param {Object} item - The tilbud or product object to share
 * @param {string} type - 'tilbud' or 'product'
 */
const ShareButton = ({ item, type = 'product' }) => {
  const [showToast, setShowToast] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState(false);

  const getShareContent = () => {
    const baseUrl = window.location.origin;
    const productUrl = `${baseUrl}/produkt/${item.id}`;

    if (type === 'tilbud') {
      return {
        title: 'MadMatch Tilbud',
        text: `Tjek dette tilbud på ${item.navn} - ${item.tilbudspris} kr hos ${item.butik} via MadMatch!`,
        url: productUrl
      };
    } else {
      return {
        title: `${item.navn} - MadMatch`,
        text: `Se ${item.navn} på MadMatch - nutrition, recipes & sustainability info!`,
        url: productUrl
      };
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    setShareError(false);
    
    const shareData = getShareContent();

    // Try native share API first (mobile-first approach)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setIsSharing(false);
        return; // Success - no need to show toast for native share
      } catch (err) {
        // User cancelled or share failed
        setIsSharing(false);
        if (err.name !== 'AbortError') {
          // Fall through to clipboard if error wasn't cancellation
        } else {
          return; // User cancelled - don't show toast
        }
      }
    }

    // Fallback to clipboard
    try {
      const textToShare = `${shareData.text}\n${shareData.url}`;
      await navigator.clipboard.writeText(textToShare);
      setShowToast(true);
      setIsSharing(false);
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (err) {
      setIsSharing(false);
      setShareError(true);
      
      // Hide error after 3 seconds
      setTimeout(() => {
        setShareError(false);
      }, 3000);
      
      // Final fallback for browsers that don't support clipboard API
      alert(`${shareData.text}\n${shareData.url}`);
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className={`share-button ${isSharing ? 'sharing' : ''}`}
        aria-label={`Del ${item.navn}`}
        title="Del dette tilbud"
        disabled={isSharing}
      >
        <span className="share-icon" aria-hidden="true">
          {isSharing ? '⏳' : '↗️'}
        </span>
        <span className="share-text">{isSharing ? 'Deler...' : 'Del'}</span>
      </button>
      
      {showToast && (
        <div className="share-toast success" role="alert" aria-live="polite">
          <span className="toast-icon" aria-hidden="true">✓</span>
          <span className="toast-text">Link kopieret til udklipsholder!</span>
        </div>
      )}
      
      {shareError && (
        <div className="share-toast error" role="alert" aria-live="assertive">
          <span className="toast-icon" aria-hidden="true">✗</span>
          <span className="toast-text">Kunne ikke dele. Prøv igen.</span>
        </div>
      )}
    </>
  );
};

export default ShareButton;
