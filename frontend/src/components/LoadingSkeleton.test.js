import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSkeleton from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  test('renders product skeleton by default', () => {
    render(<LoadingSkeleton />);
    
    const skeleton = screen.getByLabelText('Indlæser produkt');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('skeleton-product-page');
  });

  test('renders nutrition skeleton when type is nutrition', () => {
    render(<LoadingSkeleton type="nutrition" />);
    
    const skeleton = screen.getByLabelText('Indlæser næringsdata');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('skeleton-card');
  });

  test('renders recipes skeleton when type is recipes', () => {
    render(<LoadingSkeleton type="recipes" />);
    
    const skeleton = screen.getByLabelText('Indlæser opskrifter');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('skeleton-card');
  });

  test('renders sustainability skeleton when type is sustainability', () => {
    render(<LoadingSkeleton type="sustainability" />);
    
    const skeleton = screen.getByLabelText('Indlæser bæredygtighedsdata');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('skeleton-card');
  });

  test('product skeleton has correct structure', () => {
    const { container } = render(<LoadingSkeleton type="product" />);
    
    expect(container.querySelector('.skeleton-header')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-content')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-image-section')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-info-section')).toBeInTheDocument();
  });

  test('nutrition skeleton has correct structure', () => {
    const { container } = render(<LoadingSkeleton type="nutrition" />);
    
    expect(container.querySelector('.skeleton-title')).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton-line').length).toBeGreaterThan(0);
  });

  test('recipes skeleton renders 3 recipe cards', () => {
    const { container } = render(<LoadingSkeleton type="recipes" />);
    
    const recipeCards = container.querySelectorAll('.skeleton-recipe-card');
    expect(recipeCards.length).toBe(3);
  });

  test('sustainability skeleton has correct structure', () => {
    const { container } = render(<LoadingSkeleton type="sustainability" />);
    
    expect(container.querySelector('.skeleton-title')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-circle')).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton-line').length).toBeGreaterThan(0);
  });

  test('has proper accessibility label', () => {
    render(<LoadingSkeleton type="nutrition" />);
    
    expect(screen.getByLabelText('Indlæser næringsdata')).toBeInTheDocument();
  });
});
