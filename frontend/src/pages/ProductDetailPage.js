import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProductDetailPage.css';
import { tilbudService } from '../services/tilbudService';
import NutritionCard from '../components/NutritionCard';
import RecipeSuggestions from '../components/RecipeSuggestions';
import SustainabilityCard from '../components/SustainabilityCard';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nutrition, setNutrition] = useState(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [sustainability, setSustainability] = useState(null);
  const [sustainabilityLoading, setSustainabilityLoading] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  useEffect(() => {
    if (product) {
      loadNutrition();
      loadRecipes();
      loadSustainability();
    }
  }, [product]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tilbudService.getTilbudById(parseInt(id));
      setProduct(data);
    } catch (err) {
      console.error('Failed to load product:', err);
      setError(err.response?.status === 404 ? 'Produkt ikke fundet' : 'Kunne ikke indlæse produkt');
    } finally {
      setLoading(false);
    }
  };

  const loadNutrition = async () => {
    try {
      setNutritionLoading(true);
      const response = await fetch(`/api/produkt/${id}/nutrition`);
      
      if (response.ok) {
        const data = await response.json();
        setNutrition(data);
      } else if (response.status !== 404) {
        console.warn('Failed to load nutrition data:', response.status);
      }
    } catch (err) {
      console.warn('Could not fetch nutrition data:', err);
      // Silently fail - nutrition data is optional
    } finally {
      setNutritionLoading(false);
    }
  };

  const loadRecipes = async () => {
    try {
      setRecipesLoading(true);
      const response = await fetch(`/api/produkt/${id}/recipes`);
      
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
      } else if (response.status !== 404) {
        console.warn('Failed to load recipe data:', response.status);
      }
    } catch (err) {
      console.warn('Could not fetch recipe data:', err);
      // Silently fail - recipe data is optional
    } finally {
      setRecipesLoading(false);
    }
  };

  const loadSustainability = async () => {
    try {
      setSustainabilityLoading(true);
      const response = await fetch(`/api/produkt/${id}/sustainability`);
      
      if (response.ok) {
        const data = await response.json();
        setSustainability(data);
      } else if (response.status !== 404) {
        console.warn('Failed to load sustainability data:', response.status);
      }
    } catch (err) {
      console.warn('Could not fetch sustainability data:', err);
      // Silently fail - sustainability data is optional
    } finally {
      setSustainabilityLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="loading-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-image"></div>
          <div className="skeleton-info"></div>
          <div className="skeleton-info"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail-page">
        <div className="error-container">
          <h2>⚠️ {error}</h2>
          <button onClick={handleBack} className="btn-back">
            ← Tilbage til oversigt
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="error-container">
          <h2>⚠️ Produkt ikke fundet</h2>
          <button onClick={handleBack} className="btn-back">
            ← Tilbage til oversigt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <header className="product-header">
        <button onClick={handleBack} className="btn-back">
          ← Tilbage til tilbud
        </button>
      </header>

      <div className="product-detail-container">
        <div className="product-image-section">
          {product.billedeUrl ? (
            <img 
              src={product.billedeUrl} 
              alt={product.navn}
              className="product-image"
            />
          ) : (
            <div className="product-image-placeholder">
              <span className="placeholder-icon">🛒</span>
              <span className="placeholder-text">Intet billede tilgængeligt</span>
            </div>
          )}
        </div>

        <div className="product-info-section">
          <div className="product-badges">
            <span className="badge-store">{product.butik}</span>
            <span className="badge-category">{product.kategori}</span>
            <span className="badge-discount">-{product.rabat}%</span>
          </div>

          <h1 className="product-name">{product.navn}</h1>

          <div className="product-pricing">
            <div className="price-row">
              <span className="price-label">Normalpris:</span>
              <span className="price-normal">{product.normalpris.toFixed(2)} kr</span>
            </div>
            <div className="price-row">
              <span className="price-label">Tilbudspris:</span>
              <span className="price-offer">{product.tilbudspris.toFixed(2)} kr</span>
            </div>
            <div className="price-savings">
              <strong>Du sparer {(product.normalpris - product.tilbudspris).toFixed(2)} kr</strong>
            </div>
          </div>

          {product.gyldigFra && product.gyldigTil && (
            <div className="product-validity">
              <span className="validity-icon">📅</span>
              <span>Gyldig {product.gyldigFra} - {product.gyldigTil}</span>
            </div>
          )}

          <NutritionCard nutrition={nutrition} loading={nutritionLoading} />

          <RecipeSuggestions recipes={recipes} loading={recipesLoading} />

          <SustainabilityCard data={sustainability} loading={sustainabilityLoading} />
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
