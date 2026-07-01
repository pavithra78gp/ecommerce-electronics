import React from 'react';
import { AlertCircle, Thermometer, BatteryWarning, ShieldAlert } from 'lucide-react';

const ProductWarnings = ({ specs }) => {
  if (!specs) return null;

  const warnings = [];

  // Rudimentary Mock logic. In a real app we'd parse spec/reviews via AI.
  const specsStr = Object.values(specs).join(' ').toLowerCase();

  if (specsStr.includes('small battery') || specsStr.includes('3000mah')) {
    warnings.push({ id: 'battery', icon: <BatteryWarning size={16} />, text: 'Poor battery life reported by users.' });
  }
  if (specsStr.includes('intel core i9') || specsStr.includes('high performance chip')) {
    warnings.push({ id: 'heat', icon: <Thermometer size={16} />, text: 'Known heating issues under heavy load.' });
  }
  if (specsStr.includes('plastic') || specsStr.includes('glass back')) {
    warnings.push({ id: 'durability', icon: <ShieldAlert size={16} />, text: 'Low durability without a case.' });
  }

  if (warnings.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', borderRadius: 'var(--radius-md)' }}>
      <h4 style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <AlertCircle size={18} /> Smart Warnings
      </h4>
      {warnings.map(w => (
        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5', fontSize: '0.9rem' }}>
          {w.icon} {w.text}
        </div>
      ))}
    </div>
  );
};

export default ProductWarnings;
