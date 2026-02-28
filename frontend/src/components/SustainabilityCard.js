import React from 'react';
import './SustainabilityCard.css';

const SustainabilityCard = ({ data }) => {
  // Fallback UI when no data available
  if (!data || data.error) {
    return (
      <div className="sustainability-card">
        <h3>🌱 Bæredygtighed</h3>
        <p className="no-data">Ingen bæredygtighedsdata tilgængelig</p>
      </div>
    );
  }

  const { ecoScore, carbonFootprint, certifications, dataSource } = data;

  // Get eco-score class for color coding
  const getEcoScoreClass = (score) => {
    if (!score) return '';
    return `eco-score-${score.toLowerCase()}`;
  };

  return (
    <div className="sustainability-card">
      <h3>🌱 Bæredygtighed</h3>
      
      {/* Eco-score badge */}
      {ecoScore && (
        <div className="eco-score-section">
          <div className={`eco-score-badge ${getEcoScoreClass(ecoScore)}`}>
            <span className="eco-score-letter">{ecoScore}</span>
          </div>
          <span className="eco-score-label">Eco-Score</span>
        </div>
      )}

      {/* Carbon footprint */}
      {carbonFootprint && (
        <div className="carbon-footprint">
          <span className="carbon-icon">🌍</span>
          <span className="carbon-value">{carbonFootprint.toFixed(1)} kg CO₂e</span>
        </div>
      )}

      {/* Certification icons */}
      {certifications && (
        <div className="certifications">
          {certifications.organic && (
            <div className="cert-item">
              <span className="cert-icon">✓</span>
              <span className="cert-label">Økologisk</span>
            </div>
          )}
          {certifications.fairTrade && (
            <div className="cert-item">
              <span className="cert-icon">✓</span>
              <span className="cert-label">Fair Trade</span>
            </div>
          )}
          {certifications.local && (
            <div className="cert-item">
              <span className="cert-icon">✓</span>
              <span className="cert-label">Lokalt</span>
            </div>
          )}
          {certifications.recyclablePackaging && (
            <div className="cert-item">
              <span className="cert-icon">✓</span>
              <span className="cert-label">Genanvendelig emballage</span>
            </div>
          )}
        </div>
      )}

      {/* Data source attribution */}
      {dataSource && (
        <div className="data-attribution">
          <small>Data fra {dataSource === 'manual' ? 'manual' : 'Open Food Facts'}</small>
        </div>
      )}
    </div>
  );
};

export default SustainabilityCard;
