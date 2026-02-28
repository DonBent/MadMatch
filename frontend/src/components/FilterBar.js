import React from 'react';
import './FilterBar.css';

const FilterBar = ({ 
  butikker, 
  selectedButik, 
  onButikChange,
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
          {butikker?.map(butik => (
            <option key={butik} value={butik}>{butik}</option>
          ))}
        </select>
      </div>

      {selectedButik && (
        <button className="reset-btn" onClick={onReset}>
          Nulstil filtre
        </button>
      )}
    </div>
  );
};

export default FilterBar;
