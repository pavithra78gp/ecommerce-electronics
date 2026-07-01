import React, { useState } from 'react';
import { Search, Loader, Mic, Camera, Paperclip } from 'lucide-react';
import { findProductByProblem } from '../services/aiService';
import { useShop } from '../context/ShopContext';
import { useNavigate } from 'react-router-dom';

const ProblemFinder = () => {
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const { products } = useShop();
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!problem.trim()) return;

    setLoading(true);
    const recommendedIds = await findProductByProblem(problem, products);
    setLoading(false);

    if (recommendedIds && recommendedIds.length > 0) {
      // Navigate to catalog with those specific IDs or display them somehow
      // For simplicity, let's navigate to the first recommended item
      navigate(`/product/${recommendedIds[0]}`);
    } else {
      alert("Couldn't find an exact match for that problem right now.");
    }
  };

  return (
    <form onSubmit={handleSearch} style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <input 
        type="text" 
        placeholder="E.g., My phone battery drains fast..." 
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        className="glass"
        style={{
          width: '100%',
          padding: '1.2rem 1.5rem',
          paddingRight: '160px',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          fontSize: '1.1rem',
          outline: 'none',
          boxShadow: 'var(--shadow-md)'
        }}
      />
      <div style={{ position: 'absolute', right: '65px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '0.8rem', color: 'var(--color-text-secondary)' }}>
        <Mic size={20} style={{cursor: 'pointer'}} title="Voice Search" />
        <Camera size={20} style={{cursor: 'pointer'}} title="Visual Search" />
        <Paperclip size={20} style={{cursor: 'pointer'}} title="Upload File" />
      </div>
      <button 
        type="submit" 
        disabled={loading}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--color-accent-forest)',
          borderRadius: '50%',
          width: '45px',
          height: '45px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? <Loader size={20} className="spin" /> : <Search size={20} color="#fff" />}
      </button>
    </form>
  );
};

export default ProblemFinder;
