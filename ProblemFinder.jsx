import React from 'react';

const LongevityScore = ({ product }) => {
  // Estimate support lifespan
  let yearsSupport = 3;
  if(product.category === 'Smartphone') {
    yearsSupport = product.brand === 'Apple' ? 7 : 4;
  } else if (product.category === 'Laptop') {
    yearsSupport = 6;
  } else if (product.category === 'Monitor' || product.category === 'Audio') {
    yearsSupport = 8;
  } else if (product.category === 'GPU') {
    yearsSupport = 5;
  } else {
    yearsSupport = 5;
  }

  const costPerMonth = (product.price / (yearsSupport * 12)).toFixed(2);

  return (
    <div className="glass" style={{
      padding: '1.5rem',
      borderRadius: 'var(--radius-md)',
      borderLeft: '4px solid var(--color-accent-moss)',
      marginTop: '1.5rem',
      background: 'rgba(136,194,115,0.05)'
    }}>
      <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-accent-moss)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📈 True-Cost Transparency
      </h3>
      <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Estimated Lifespan</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{yearsSupport} Years</p>
        </div>
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Cost Breakdown</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${costPerMonth} / mo</p>
        </div>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
        Based on estimated software, driver, and security support lifecycle.
      </p>
    </div>
  );
};

export default LongevityScore;
