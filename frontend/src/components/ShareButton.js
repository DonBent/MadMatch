import React, { useState } from 'react';
import './ShareButton.css';

/**
 * ShareButton Component
 * Allows users to share tilbud or products via native share API or clipboard fallback
 * 
 * @param {Object} item - The tilbud or product object to share
 * @param {string} type - 'tilbud' or 'product'
 */
const ShareButton = ({ item, type = 'product' }) => {
  const [showToast, setShowToast] = useState(false);

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
    const shareData = getShareContent();

    // Try native share API first (mobile-first approach)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return; // Success - no need to show toast for native share
      } catch (err) {
        // User cancelled or share failed - fall through to clipboard
        if (err.name !== 'AbortError') {
          console.warn('Native share failed:', err);
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
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Final fallback for browsers that don't support clipboard API
      alert(`${shareData.text}\n${shareData.url}`);
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className="share-button"
        aria-label={`Del ${item.navn}`}
        title="Del dette tilbud"
      >
        <span className="share-icon" aria-hidden="true">↗️</span>
        <span className="share-text">Del</span>
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
