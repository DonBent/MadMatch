import React from 'react';
import './SustainabilityCard.css';

/**
 * SustainabilityCard Component
 * Displays sustainability information with improved accessibility
 */
const SustainabilityCard = ({ data, loading }) => {
  // Loading state
  if (loading) {
    return (
      <section className="sustainability-card" aria-busy="true" aria-label="Indlæser bæredygtighedsdata">
        <h3 id="sustainability-title">
          <span aria-hidden="true">🌱</span> Bæredygtighed
        </h3>
        <div className="loading" role="status">
          Indlæser bæredygtighedsdata...
        </div>
      </section>
    );
  }

  // Fallback UI when no data available
  if (!data || data.error) {
    return (
      <section className="sustainability-card" aria-labelledby="sustainability-title">
        <h3 id="sustainability-title">
          <span aria-hidden="true">🌱</span> Bæredygtighed
        </h3>
        <p className="no-data" role="status">
          Ingen bæredygtighedsdata tilgængelig
        </p>
      </section>
    );
  }

  const { ecoScore, carbonFootprint, certifications, dataSource } = data;

  // Get eco-score class for color coding
  const getEcoScoreClass = (score) => {
    if (!score) return '';
    return `eco-score-${score.toLowerCase()}`;
  };

  // Get eco-score description for screen readers
  const getEcoScoreDescription = (score) => {
    const descriptions = {
      'a': 'Meget lav miljøpåvirkning',
      'b': 'Lav miljøpåvirkning',
      'c': 'Mellem miljøpåvirkning',
      'd': 'Høj miljøpåvirkning',
      'e': 'Meget høj miljøpåvirkning'
    };
    return descriptions[score?.toLowerCase()] || 'Ukendt miljøpåvirkning';
  };

  return (
    <section className="sustainability-card" aria-labelledby="sustainability-title">
      <h3 id="sustainability-title">
        <span aria-hidden="true">🌱</span> Bæredygtighed
      </h3>
      
      {/* Eco-score badge */}
      {ecoScore && (
        <div className="eco-score-section" role="group" aria-label={`Eco-Score ${ecoScore}: ${getEcoScoreDescription(ecoScore)}`}>
          <div className={`eco-score-badge ${getEcoScoreClass(ecoScore)}`} aria-hidden="true">
            <span className="eco-score-letter">{ecoScore}</span>
          </div>
          <span className="eco-score-label">Eco-Score</span>
        </div>
      )}

      {/* Carbon footprint */}
      {carbonFootprint && (
        <div className="carbon-footprint" role="group" aria-label={`CO2-aftryk: ${carbonFootprint.toFixed(1)} kilogram CO2-ækvivalenter`}>
          <span className="carbon-icon" aria-hidden="true">🌍</span>
          <span className="carbon-value">{carbonFootprint.toFixed(1)} kg CO₂e</span>
        </div>
      )}

      {/* Certification icons */}
      {certifications && (
        <div className="certifications" role="list" aria-label="Certificeringer">
          {certifications.organic && (
            <div className="cert-item" role="listitem">
              <span className="cert-icon" aria-hidden="true">✓</span>
              <span className="cert-label">Økologisk</span>
            </div>
          )}
          {certifications.fairTrade && (
            <div className="cert-item" role="listitem">
              <span className="cert-icon" aria-hidden="true">✓</span>
              <span className="cert-label">Fair Trade</span>
            </div>
          )}
          {certifications.local && (
            <div className="cert-item" role="listitem">
              <span className="cert-icon" aria-hidden="true">✓</span>
              <span className="cert-label">Lokalt</span>
            </div>
          )}
          {certifications.recyclablePackaging && (
            <div className="cert-item" role="listitem">
              <span className="cert-icon" aria-hidden="true">✓</span>
              <span className="cert-label">Genanvendelig emballage</span>
            </div>
          )}
        </div>
      )}

      {/* Data source attribution */}
      {dataSource && (
        <div className="data-attribution" role="contentinfo">
          <small>Data fra {dataSource === 'manual' ? 'manuel kilde' : 'Open Food Facts'}</small>
        </div>
      )}
    </section>
  );
};

export default SustainabilityCard;
