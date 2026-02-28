import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProductDetailPage.css';
import { tilbudService } from '../services/tilbudService';
import NutritionCard from '../components/NutritionCard';
import RecipeSuggestions from '../components/RecipeSuggestions';
import SustainabilityCard from '../components/SustainabilityCard';
import ShareButton from '../components/ShareButton';
import FavoriteButton from '../components/FavoriteButton';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';

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
        const responseData = await response.json();
        setSustainability(responseData.data);
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
    return <LoadingSkeleton type="product" />;
  }

  if (error) {
    return (
      <div className="product-detail-page">
        <div className="error-container" role="alert">
          <h2>⚠️ {error}</h2>
          <button 
            onClick={handleBack} 
            className="btn-back"
            aria-label="Tilbage til tilbudsoversigt"
          >
            ← Tilbage til oversigt
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="error-container" role="alert">
          <h2>⚠️ Produkt ikke fundet</h2>
          <button 
            onClick={handleBack} 
            className="btn-back"
            aria-label="Tilbage til tilbudsoversigt"
          >
            ← Tilbage til oversigt
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onReset={loadProduct}>
      <div className="product-detail-page">
        <header className="product-header">
          <button 
            onClick={handleBack} 
            className="btn-back"
            aria-label="Tilbage til tilbudsoversigt"
          >
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
                loading="lazy"
              />
            ) : (
              <div className="product-image-placeholder" role="img" aria-label="Intet produktbillede">
                <span className="placeholder-icon" aria-hidden="true">🛒</span>
                <span className="placeholder-text">Intet billede tilgængeligt</span>
              </div>
            )}
          </div>

          <div className="product-info-section">
            <div className="product-badges" role="list">
              <span className="badge-store" role="listitem" aria-label={`Butik: ${product.butik}`}>
                {product.butik}
              </span>
              <span className="badge-discount" role="listitem" aria-label={`Rabat: ${product.rabat} procent`}>
                -{product.rabat}%
              </span>
            </div>

            <h1 className="product-name">{product.navn}</h1>

            <div className="product-pricing" role="region" aria-label="Prisoplysninger">
              <div className="price-row">
                <span className="price-label">Normalpris:</span>
                <span className="price-normal" aria-label={`Normalpris ${product.normalpris} kroner`}>
                  {product.normalpris.toFixed(2)} kr
                </span>
              </div>
              <div className="price-row">
                <span className="price-label">Tilbudspris:</span>
                <span className="price-offer" aria-label={`Tilbudspris ${product.tilbudspris} kroner`}>
                  {product.tilbudspris.toFixed(2)} kr
                </span>
              </div>
              <div className="price-savings">
                <strong aria-label={`Du sparer ${(product.normalpris - product.tilbudspris).toFixed(2)} kroner`}>
                  Du sparer {(product.normalpris - product.tilbudspris).toFixed(2)} kr
                </strong>
              </div>
            </div>

            {product.gyldigFra && product.gyldigTil && (
              <div className="product-validity" role="region" aria-label="Gyldighed">
                <span className="validity-icon" aria-hidden="true">📅</span>
                <span>Gyldig {product.gyldigFra} - {product.gyldigTil}</span>
              </div>
            )}

            <div className="product-actions">
              <ShareButton productId={id} productName={product.navn} />
              <FavoriteButton productId={parseInt(id)} />
            </div>

            {nutritionLoading ? (
              <LoadingSkeleton type="nutrition" />
            ) : (
              <NutritionCard nutrition={nutrition} loading={nutritionLoading} />
            )}

            {recipesLoading ? (
              <LoadingSkeleton type="recipes" />
            ) : (
              <RecipeSuggestions recipes={recipes} loading={recipesLoading} />
            )}

            {sustainabilityLoading ? (
              <LoadingSkeleton type="sustainability" />
            ) : (
              <SustainabilityCard data={sustainability} loading={sustainabilityLoading} />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ProductDetailPage;
