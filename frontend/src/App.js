import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FavoritesProvider, useFavorites } from './contexts/FavoritesContext';
import './App.css';
import TilbudCard from './components/TilbudCard';
import FilterBar from './components/FilterBar';
import ProductDetailPage from './pages/ProductDetailPage';
import Favoritter from './pages/Favoritter';
import { tilbudService } from './services/tilbudService';

function Navigation() {
  const { favorites } = useFavorites();
  
  return (
    <nav className="app-nav">
      <Link to="/" className="nav-link">Alle tilbud</Link>
      <Link to="/favoritter" className="nav-link">
        ♥ Favoritter {favorites.length > 0 && <span className="nav-badge">({favorites.length})</span>}
      </Link>
    </nav>
  );
}

function TilbudOversigt() {
  const [tilbud, setTilbud] = useState([]);
  const [butikker, setButikker] = useState([]);
  const [selectedButik, setSelectedButik] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load tilbud when filters change
  useEffect(() => {
    loadTilbud();
  }, [selectedButik]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [tilbudData, butikkerData] = await Promise.all([
        tilbudService.getAllTilbud(),
        tilbudService.getButikker()
      ]);
      
      setTilbud(tilbudData);
      setButikker(butikkerData);
      setError(null);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Kunne ikke indlæse data. Sørg for at backend kører på port 4001.');
    } finally {
      setLoading(false);
    }
  };

  const loadTilbud = async () => {
    try {
      const filters = {};
      if (selectedButik) filters.butik = selectedButik;
      
      const data = await tilbudService.getAllTilbud(filters);
      setTilbud(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load tilbud:', err);
      setError('Kunne ikke indlæse tilbud.');
    }
  };

  const handleReset = () => {
    setSelectedButik('');
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Indlæser tilbud...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>⚠️ Fejl</h2>
          <p>{error}</p>
          <button onClick={loadInitialData}>Prøv igen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🛒 MadMatch</h1>
        <p className="tagline">Find de bedste tilbud</p>
        <Navigation />
      </header>

      <main className="app-main">
        <FilterBar
          butikker={butikker}
          selectedButik={selectedButik}
          onButikChange={setSelectedButik}
          onReset={handleReset}
        />

        <div className="tilbud-count">
          Viser {tilbud?.length || 0} tilbud
        </div>

        {(tilbud?.length || 0) === 0 ? (
          <div className="no-results">
            <p>Ingen tilbud matcher dine filtre.</p>
            <button onClick={handleReset}>Nulstil filtre</button>
          </div>
        ) : (
          <div className="tilbud-grid">
            {tilbud?.map(item => (
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
}

function App() {
  return (
    <FavoritesProvider>
      <Router>
        <Routes>
          <Route path="/" element={<TilbudOversigt />} />
          <Route path="/produkt/:id" element={<ProductDetailPage />} />
          <Route path="/favoritter" element={<Favoritter />} />
        </Routes>
      </Router>
    </FavoritesProvider>
  );
}

export default App;
