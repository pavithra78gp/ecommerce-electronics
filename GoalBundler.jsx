import React from 'react';

const CompatibilityChecker = ({ product }) => {
  let compatibilityNote = '';

  if (product.category === 'Monitor') {
    compatibilityNote = "Compatible with all laptops supporting HDMI or DisplayPort via USB-C dongles.";
  } else if (product.category === 'GPU') {
    const required = product.specs.requiredPsu || '500W+';
    compatibilityNote = `Requires a Power Supply Unit of at least ${required} for stable performance. Ensure your PC case supports 3-slot expansion.`;
  } else if (product.category === 'Smartphone') {
    compatibilityNote = `Ecosystem sync: Works best with ${product.brand === 'Apple' ? 'AirPods & MacBooks' : 'Galaxy Buds & Windows PCs'}.`;
  } else if (product.category === 'Laptop') {
    compatibilityNote = `External displays supported via ${product.specs.ports ? product.specs.ports.join(', ') : 'HDMI/USB-C'}.`;
  } else {
    compatibilityNote = "Universally compatible with standard standard I/O (Bluetooth/USB).";
  }

  return (
    <div className="glass" style={{
      padding: '1.5rem',
      borderRadius: 'var(--radius-md)',
      borderLeft: '4px solid var(--color-accent-sunrise)',
      marginTop: '1.5rem',
      background: 'rgba(255,139,167,0.05)'
    }}>
      <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-accent-sunrise)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🔄 Ecosystem Synergist
      </h3>
      <p style={{ color: 'var(--color-text-primary)' }}>{compatibilityNote}</p>
    </div>
  );
};

export default CompatibilityChecker;
