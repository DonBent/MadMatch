import React from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import './TilbudCard.css';

const TilbudCard = ({ tilbud }) => {
  return (
    <Link to={`/produkt/${tilbud.id}`} className="tilbud-card-link">
      <div className="tilbud-card">
      <div className="tilbud-card-header">
        <span className="butik-badge">{tilbud.butik}</span>
        <div className="tilbud-card-header-right">
          <span className="rabat-badge">-{tilbud.rabat}%</span>
          <FavoriteButton productId={tilbud.id} />
        </div>
      </div>
      
      <div className="tilbud-card-body">
        <h3 className="tilbud-navn">{tilbud.navn}</h3>
        <p className="tilbud-kategori">{tilbud.kategori}</p>
        
        <div className="tilbud-priser">
          <span className="normalpris">{tilbud.normalpris.toFixed(2)} kr</span>
          <span className="tilbudspris">{tilbud.tilbudspris.toFixed(2)} kr</span>
        </div>
        
        <div className="tilbud-besparelse">
          Spar {(tilbud.normalpris - tilbud.tilbudspris).toFixed(2)} kr
        </div>
      </div>
    </div>
    </Link>
  );
};

export default TilbudCard;
