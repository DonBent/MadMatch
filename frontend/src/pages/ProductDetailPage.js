import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProductDetailPage.css';
import { tilbudService } from '../services/tilbudService';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

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
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
