import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../contexts/FavoritesContext';
import { tilbudService } from '../services/tilbudService';
import TilbudCard from '../components/TilbudCard';
import './Favoritter.css';

/**
 * Favoritter Page
 * Displays user's favorite tilbud with loading and empty states
 */
const Favoritter = () => {
  const { favorites } = useFavorites();
  const [tilbud, setTilbud] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFavoriteTilbud = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (favorites.length === 0) {
        setTilbud([]);
        setLoading(false);
        return;
      }

      // Fetch all tilbud and filter by favorites
      const allTilbud = await tilbudService.getAllTilbud();
      const favoriteTilbud = allTilbud.filter(item => favorites.includes(item.id));
      setTilbud(favoriteTilbud);
    } catch (err) {
      setError('Kunne ikke indlæse favoritter.');
    } finally {
      setLoading(false);
    }
  }, [favorites]);

  useEffect(() => {
    loadFavoriteTilbud();
  }, [loadFavoriteTilbud]);

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🛒 MadMatch</h1>
          <p className="tagline">Find de bedste tilbud</p>
        </header>
        <main className="app-main">
          <div className="loading" role="status" aria-live="polite">
            <div className="loading-spinner" aria-hidden="true"></div>
            <p>Indlæser favoritter...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🛒 MadMatch</h1>
          <p className="tagline">Find de bedste tilbud</p>
        </header>
        <main className="app-main">
          <div className="error" role="alert">
            <h2>⚠️ Fejl</h2>
            <p>{error}</p>
            <button onClick={loadFavoriteTilbud} className="retry-button">
              Prøv igen
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🛒 MadMatch</h1>
        <p className="tagline">Find de bedste tilbud</p>
      </header>

      <main className="app-main">
        <div className="favoritter-header">
          <h2>♥ Dine favoritter ({favorites.length})</h2>
          <Link to="/" className="back-link">← Tilbage til alle tilbud</Link>
        </div>

        {favorites.length === 0 ? (
          <div className="empty-state" role="status">
            <p className="empty-icon" aria-hidden="true">♡</p>
            <h3 className="empty-title">Du har ingen favoritter endnu</h3>
            <p className="empty-message">Klik på ❤️ for at gemme tilbud!</p>
            <Link to="/" className="browse-button">Se alle tilbud</Link>
          </div>
        ) : (
          <div className="tilbud-grid">
            {tilbud.map(item => (
              <TilbudCard key={item.id} tilbud={item} />
            ))}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>MadMatch MVP v1.6 | Epic 3 - Favoritter</p>
      </footer>
    </div>
  );
};

export default Favoritter;
