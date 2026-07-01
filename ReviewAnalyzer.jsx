import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ProductExplainer = ({ product }) => {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const explainProduct = async () => {
    setLoading(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
      setTimeout(() => {
        setExplanation({
          features: "High quality build, excellent performance, long lifespan.",
          prosCons: "Pros: Fast, Durable. Cons: Expensive.",
          audience: "Professionals and enthusiasts who need the best."
        });
        setLoading(false);
      }, 1500);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const prompt = `You are a friendly sidekick for the user on NexTech AI.
      Product: ${product.name}
      Brand: ${product.brand}
      Category: ${product.category}
      Specs: ${JSON.stringify(product.specs)}
      
      Task: Explain this product like a friend explaining it to a beginner over a cup of coffee. Don't be too technical.
      Return ONLY a JSON object with this exact structure:
      {"features": "Casual explanation of what it is", "prosCons": "Pros:... Cons:...", "audience": "Who it is best for"}
      Nothing else.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const text = response.text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
      const data = JSON.parse(text);
      setExplanation(data);
    } catch (err) {
      console.error(err);
      setExplanation({
        features: "High quality build, excellent performance, long lifespan. (Simulated AI Fallback)",
        prosCons: "Pros: Fast, Durable. Cons: Expensive.",
        audience: "Professionals and enthusiasts who need the best."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {!explanation && !loading && (
        <button 
          onClick={explainProduct}
          style={{ width: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
        >
          ✨ Explain This Product (AI)
        </button>
      )}
      
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
          <Loader className="spinner" size={24} color="var(--color-accent-sunrise)" />
        </div>
      )}

      {explanation && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✨ AI Breakdown
          </h3>
          <div>
            <p style={{ fontWeight: 'bold', color: 'var(--color-accent-sunrise)' }}>Features</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>{explanation.features}</p>
          </div>
          <div>
            <p style={{ fontWeight: 'bold', color: 'var(--color-accent-forest)' }}>Pros & Cons</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>{explanation.prosCons}</p>
          </div>
          <div>
            <p style={{ fontWeight: 'bold', color: '#a855f7' }}>Who should buy this?</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>{explanation.audience}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductExplainer;
