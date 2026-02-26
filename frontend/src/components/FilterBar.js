import React from 'react';
import './FilterBar.css';

const FilterBar = ({ 
  butikker, 
  kategorier, 
  selectedButik, 
  selectedKategori, 
  onButikChange, 
  onKategoriChange,
  onReset 
}) => {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label htmlFor="butik-filter">Butik:</label>
        <select 
          id="butik-filter"
          value={selectedButik} 
          onChange={(e) => onButikChange(e.target.value)}
        >
          <option value="">Alle butikker</option>
          {butikker.map(butik => (
            <option key={butik} value={butik}>{butik}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="kategori-filter">Kategori:</label>
        <select 
          id="kategori-filter"
          value={selectedKategori} 
          onChange={(e) => onKategoriChange(e.target.value)}
        >
          <option value="">Alle kategorier</option>
          {kategorier.map(kategori => (
            <option key={kategori} value={kategori}>{kategori}</option>
          ))}
        </select>
      </div>

      {(selectedButik || selectedKategori) && (
        <button className="reset-btn" onClick={onReset}>
          Nulstil filtre
        </button>
      )}
    </div>
  );
};

export default FilterBar;
