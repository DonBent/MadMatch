import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../contexts/FavoritesContext';
import { tilbudService } from '../services/tilbudService';
import TilbudCard from '../components/TilbudCard';
import './Favoritter.css';

const Favoritter = () => {
  const { favorites } = useFavorites();
  const [tilbud, setTilbud] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFavoriteTilbud();
  }, [favorites]);

  const loadFavoriteTilbud = async () => {
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
      console.error('Failed to load favorite tilbud:', err);
      setError('Kunne ikke indlæse favoritter.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🛒 MadMatch</h1>
          <p className="tagline">Find de bedste tilbud</p>
        </header>
        <main className="app-main">
          <div className="loading">Indlæser favoritter...</div>
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
          <div className="error">
            <h2>⚠️ Fejl</h2>
            <p>{error}</p>
            <button onClick={loadFavoriteTilbud}>Prøv igen</button>
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
          <div className="empty-state">
            <p className="empty-icon">♡</p>
            <p className="empty-message">Ingen favoritter endnu. Tryk på ♥ for at tilføje.</p>
            <Link to="/" className="browse-button">Browse tilbud</Link>
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
