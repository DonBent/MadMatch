import React, { useState, useEffect } from 'react';
import './App.css';
import TilbudCard from './components/TilbudCard';
import FilterBar from './components/FilterBar';
import { tilbudService } from './services/tilbudService';

function App() {
  const [tilbud, setTilbud] = useState([]);
  const [butikker, setButikker] = useState([]);
  const [kategorier, setKategorier] = useState([]);
  const [selectedButik, setSelectedButik] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load tilbud when filters change
  useEffect(() => {
    loadTilbud();
  }, [selectedButik, selectedKategori]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [tilbudData, butikkerData, kategorierData] = await Promise.all([
        tilbudService.getAllTilbud(),
        tilbudService.getButikker(),
        tilbudService.getKategorier()
      ]);
      
      setTilbud(tilbudData);
      setButikker(butikkerData);
      setKategorier(kategorierData);
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
      if (selectedKategori) filters.kategori = selectedKategori;
      
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
    setSelectedKategori('');
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
      </header>

      <main className="app-main">
        <FilterBar
          butikker={butikker}
          kategorier={kategorier}
          selectedButik={selectedButik}
          selectedKategori={selectedKategori}
          onButikChange={setSelectedButik}
          onKategoriChange={setSelectedKategori}
          onReset={handleReset}
        />

        <div className="tilbud-count">
          Viser {tilbud.length} tilbud
        </div>

        {tilbud.length === 0 ? (
          <div className="no-results">
            <p>Ingen tilbud matcher dine filtre.</p>
            <button onClick={handleReset}>Nulstil filtre</button>
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
        <p>MadMatch MVP v1.0 | Epic 1 - Tilbudsoversigt</p>
      </footer>
    </div>
  );
}

export default App;
