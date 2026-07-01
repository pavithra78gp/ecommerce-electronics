import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { useShop } from '../context/ShopContext';
import DecisionSimplifier from '../components/DecisionSimplifier';
import ProblemFinder from '../components/ProblemFinder';
import { useUserBehavior } from '../context/UserBehaviorContext';
import { useSearchParams } from 'react-router-dom';

const Catalog = () => {
  const { products } = useShop();
  const { recordFilterChange } = useUserBehavior();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  const [filter, setFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [priceSort, setPriceSort] = useState('None');

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const brands = ['All', ...new Set(products.map(p => p.brand))];
  
  const handleFilterChange = (setter, value) => {
    setter(value);
    recordFilterChange();
  };

  let filteredProducts = [...products];
  
  if (filter !== 'All') {
    filteredProducts = filteredProducts.filter(p => p.category === filter);
  }
  
  if (brandFilter !== 'All') {
    filteredProducts = filteredProducts.filter(p => p.brand === brandFilter);
  }
  
  if (priceSort === 'LowToHigh') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (priceSort === 'HighToLow') {
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  // Instant Decision Mode logic
  if (mode === 'instant' && filteredProducts.length > 0) {
    // Just pick the best one randomly or based on highest price/rating
    filteredProducts = [filteredProducts[0]]; 
  }

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Full Catalog</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Describe your problem or use the filters below.</p>
        <ProblemFinder />
      </div>
      
      <div className="glass" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
        <strong>Category:</strong>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => handleFilterChange(setFilter, cat)}
            style={{ 
              background: filter === cat ? 'var(--color-accent-forest)' : 'var(--color-bg-primary)',
              color: filter === cat ? '#fff' : 'var(--color-text-primary)',
              padding: '0.4rem 0.8rem',
              fontSize: '0.9rem',
              border: '1px solid var(--color-border)'
            }}
          >
            {cat}
          </button>
        ))}
        
        <div style={{ width: '100%', height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }}></div>
        
        <strong>Brand:</strong>
        <select value={brandFilter} onChange={(e) => handleFilterChange(setBrandFilter, e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        
        <strong style={{ marginLeft: '1rem' }}>Price Sort:</strong>
        <select value={priceSort} onChange={(e) => handleFilterChange(setPriceSort, e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
          <option value="None">None</option>
          <option value="LowToHigh">Low to High</option>
          <option value="HighToLow">High to Low</option>
        </select>
      </div>

      {mode === 'instant' ? (
        <div style={{ padding: '2rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 'var(--radius-xl)', marginBottom: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: '#10b981', marginBottom: '1rem' }}>Instant Decision Mode Activated</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>We've skipped the noise and found the #1 best option for your current filters.</p>
        </div>
      ) : (
        <DecisionSimplifier category={filter} products={products} />
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '2rem' 
      }}>
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default Catalog;
