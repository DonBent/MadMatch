import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import TilbudCard from './components/TilbudCard';
import FilterBar from './components/FilterBar';
import ProductDetailPage from './pages/ProductDetailPage';
import RecipeBrowse from './pages/RecipeBrowse';
import RecipeFavorites from './pages/RecipeFavorites';
import RecipeDetail from './pages/RecipeDetail';
import WeeklyCalendar from './pages/WeeklyCalendar';
import ErrorBoundary from './components/ErrorBoundary';
import { RecipeFavoriteProvider, useRecipeFavorites } from './contexts/RecipeFavoriteContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { CartProvider } from './contexts/CartContext';
import { tilbudService } from './services/tilbudService';

function Navigation() {
  const location = useLocation();
  const pathname = location?.pathname || '/';
  const { getFavoriteCount } = useRecipeFavorites();
  const favoriteCount = getFavoriteCount();
  
  return (
    <nav className="main-nav" data-testid="main-navigation">
      <Link 
        to="/" 
        className={`nav-tab ${pathname === '/' ? 'active' : ''}`}
        data-testid="nav-tilbud"
      >
        Tilbud
      </Link>
      <Link 
        to="/opskrifter" 
        className={`nav-tab ${pathname === '/opskrifter' ? 'active' : ''}`}
        data-testid="nav-opskrifter"
      >
        Opskrifter
      </Link>
      <Link 
        to="/ugeplan" 
        className={`nav-tab ${pathname === '/ugeplan' ? 'active' : ''}`}
        data-testid="nav-ugeplan"
      >
        Ugeplan
      </Link>
      <Link 
        to="/opskrifter/favoritter" 
        className={`nav-tab ${pathname === '/opskrifter/favoritter' ? 'active' : ''}`}
        data-testid="nav-favoritter"
      >
        Mine favoritter {favoriteCount > 0 && `(${favoriteCount})`}
      </Link>
    </nav>
  );
}

function TilbudOversigt() {
  const location = useLocation();
  const [tilbud, setTilbud] = useState([]);
  const [filteredTilbud, setFilteredTilbud] = useState([]);
  const [butikker, setButikker] = useState([]);
  const [kategorier, setKategorier] = useState([]);
  const [selectedButik, setSelectedButik] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract search query from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search');
    if (search) {
      setSearchQuery(search);
    } else {
      setSearchQuery('');
    }
  }, [location.search]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter tilbud when filters or search change
  useEffect(() => {
    filterTilbud();
  }, [tilbud, selectedButik, selectedKategori, searchQuery]);

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

  const filterTilbud = () => {
    let filtered = [...tilbud];

    // Apply butik filter
    if (selectedButik) {
      filtered = filtered.filter(item => item.butik === selectedButik);
    }

    // Apply kategori filter
    if (selectedKategori) {
      filtered = filtered.filter(item => item.kategori === selectedKategori);
    }

    // Apply search filter
    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(',').map(term => term.trim());
      filtered = filtered.filter(item => {
        const productName = (item.produktnavn || '').toLowerCase();
        return searchTerms.some(term => productName.includes(term));
      });
    }

    setFilteredTilbud(filtered);
  };

  const handleReset = () => {
    setSelectedButik('');
    setSelectedKategori('');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <main className="app-main">
        <div className="loading">Indlæser tilbud...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-main">
        <div className="error">
          <h2>⚠️ Fejl</h2>
          <p>{error}</p>
          <button onClick={loadInitialData}>Prøv igen</button>
        </div>
      </main>
    );
  }

  const displayedTilbud = filteredTilbud;
  const hasSearchQuery = searchQuery && searchQuery.length > 0;

  return (
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

      {hasSearchQuery && (
        <div className="search-info">
          Søger efter: <strong>{searchQuery.split(',').join(', ')}</strong>
        </div>
      )}

      <div className="tilbud-count">
        Viser {displayedTilbud?.length || 0} tilbud
      </div>

      {(displayedTilbud?.length || 0) === 0 ? (
        <div className="no-results">
          {hasSearchQuery ? (
            <>
              <p>Ingen tilbud matcher disse ingredienser</p>
              <button onClick={handleReset}>Nulstil søgning</button>
            </>
          ) : (
            <>
              <p>Ingen tilbud matcher dine filtre.</p>
              <button onClick={handleReset}>Nulstil filtre</button>
            </>
          )}
        </div>
      ) : (
        <div className="tilbud-grid">
          {displayedTilbud?.map(item => (
            <TilbudCard 
              key={item.id} 
              tilbud={item}
              highlighted={hasSearchQuery}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function AppLayout({ children }) {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🛒 MadMatch</h1>
        <p className="tagline">Find de bedste tilbud og opskrifter</p>
        <Navigation />
      </header>

      {children}

      <footer className="app-footer">
        <p>MadMatch MVP v1.4 | Epic 4 - Recipe Browse</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <FavoritesProvider>
      <CartProvider>
        <Router>
          <RecipeFavoriteProvider>
            <AppLayout>
              <Routes>
                <Route path="/" element={<TilbudOversigt />} />
                <Route path="/tilbud" element={<TilbudOversigt />} />
                <Route 
                  path="/opskrifter" 
                  element={
                    <ErrorBoundary>
                      <RecipeBrowse />
                    </ErrorBoundary>
                  } 
                />
                <Route 
                  path="/ugeplan" 
                  element={
                    <ErrorBoundary>
                      <WeeklyCalendar />
                    </ErrorBoundary>
                  } 
                />
                <Route 
                  path="/opskrifter/favoritter" 
                  element={
                    <ErrorBoundary>
                      <RecipeFavorites />
                    </ErrorBoundary>
                  } 
                />
                <Route path="/produkt/:id" element={<ProductDetailPage />} />
                <Route 
                  path="/opskrift/:id" 
                  element={
                    <ErrorBoundary>
                      <RecipeDetail />
                    </ErrorBoundary>
                  } 
                />
              </Routes>
            </AppLayout>
          </RecipeFavoriteProvider>
        </Router>
      </CartProvider>
    </FavoritesProvider>
  );
}

export default App;
