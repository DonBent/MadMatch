import React from 'react';
import './NutritionCard.css';

/**
 * NutritionCard Component
 * Displays nutrition facts per 100g with fallback for missing data
 */
const NutritionCard = ({ nutrition, loading }) => {
  if (loading) {
    return (
      <div className="nutrition-card">
        <h3 className="nutrition-card__title">Næringsindhold</h3>
        <div className="nutrition-card__loading">Indlæser næringsdata...</div>
      </div>
    );
  }

  if (!nutrition || !nutrition.nutriments) {
    return (
      <div className="nutrition-card">
        <h3 className="nutrition-card__title">Næringsindhold</h3>
        <div className="nutrition-card__fallback">
          Næringsdata ikke tilgængelig
        </div>
      </div>
    );
  }

  const { nutriments } = nutrition;

  /**
   * Format number with proper decimals and fallback
   */
  const formatValue = (value, unit = 'g', decimals = 1) => {
    if (value === undefined || value === null) {
      return '—';
    }
    return `${Number(value).toFixed(decimals)} ${unit}`;
  };

  /**
   * Format energy value with both kcal and kJ
   */
  const formatEnergy = () => {
    const kcal = nutriments['energy-kcal_100g'];
    const kj = nutriments['energy_100g'];
    
    if (!kcal && !kj) {
      return '—';
    }
    
    const kcalText = kcal ? `${Math.round(kcal)} kcal` : '';
    const kjText = kj ? `${Math.round(kj)} kJ` : '';
    
    if (kcalText && kjText) {
      return `${kcalText} / ${kjText}`;
    }
    return kcalText || kjText;
  };

  const nutritionRows = [
    { label: 'Energi', value: formatEnergy(), isEnergy: true },
    { label: 'Fedt', value: formatValue(nutriments.fat_100g) },
    { label: 'heraf mættede fedtsyrer', value: formatValue(nutriments['saturated-fat_100g']), indent: true },
    { label: 'Kulhydrater', value: formatValue(nutriments.carbohydrates_100g) },
    { label: 'heraf sukkerarter', value: formatValue(nutriments.sugars_100g), indent: true },
    { label: 'Kostfibre', value: formatValue(nutriments.fiber_100g) },
    { label: 'Protein', value: formatValue(nutriments.proteins_100g) },
    { label: 'Salt', value: formatValue(nutriments.salt_100g) },
  ];

  return (
    <div className="nutrition-card">
      <h3 className="nutrition-card__title">Næringsindhold</h3>
      <p className="nutrition-card__serving">Per 100 g</p>
      
      <table className="nutrition-card__table">
        <tbody>
          {nutritionRows.map((row, index) => (
            <tr 
              key={index} 
              className={`nutrition-card__row ${row.indent ? 'nutrition-card__row--indent' : ''}`}
            >
              <td className="nutrition-card__label">{row.label}</td>
              <td className="nutrition-card__value">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {nutrition.data_source && (
        <div className="nutrition-card__attribution">
          Data fra {nutrition.data_source}
        </div>
      )}
    </div>
  );
};

export default NutritionCard;
