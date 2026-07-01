import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, DollarSign, Award } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Link } from 'react-router-dom';

const DecisionSimplifier = ({ category, products }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateRecommendations = async () => {
      setLoading(true);
      const categoryProducts = products.filter(p => category === 'All' || p.category === category);
      
      if (categoryProducts.length < 3) {
        setRecommendations(null);
        setLoading(false);
        return;
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
        setTimeout(() => {
          // Mock picking top 3
          // Best Perf: Highest price
          // Best Budget: Lowest price
          // Best Value: Middle price
          const sorted = [...categoryProducts].sort((a,b) => a.price - b.price);
          
          setRecommendations([
            { id: sorted[sorted.length-1].id, label: "Best Performance", desc: "Top tier specs for demanding tasks.", icon: "performance" },
            { id: sorted[0].id, label: "Best Budget", desc: "Affordable entry point.", icon: "budget" },
            { id: sorted[Math.floor(sorted.length/2)].id, label: "Best Value", desc: "Perfect balance of price and features.", icon: "value" }
          ]);
          setLoading(false);
        }, 1000);
        return;
      }

      try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const productMetadata = categoryProducts.map(p => ({ id: p.id, name: p.name, price: p.price }));
        
        const prompt = `You are the Decision Simplifier for NexTech AI.
        Category: ${category}
        Products: ${JSON.stringify(productMetadata)}
        
        Task: Pick exactly 3 distinct product IDs from this list. One for "Best Performance" (usually most expensive/best specs), one for "Best Budget" (lowest price), and one for "Best Value" (middle/sweet spot).
        Return ONLY a JSON array of objects with structure:
        [{"id": "product_id", "label": "Best Performance", "desc": "1 short sentence explanation why"}, ...]`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const text = response.text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
        const data = JSON.parse(text);
        
        // Map icons manually
        data.forEach(item => {
           if(item.label.includes("Performance")) item.icon = "performance";
           if(item.label.includes("Budget")) item.icon = "budget";
           if(item.label.includes("Value")) item.icon = "value";
        });

        setRecommendations(data);
      } catch (err) {
        console.error(err);
        setRecommendations(null);
      } finally {
        setLoading(false);
      }
    };

    generateRecommendations();
  }, [category, products]);

  if (loading || !recommendations) return null;

  return (
    <div style={{ marginBottom: '3rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--color-accent-sunrise)' }}>
        <Sparkles size={24} /> AI Top Picks: {category === 'All' ? 'Overall' : category}
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        {recommendations.map((rec) => {
          const product = products.find(p => p.id === rec.id);
          if (!product) return null;

          return (
            <Link key={rec.id} to={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
              <div className="glass hover-lift" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: rec.icon === 'performance' ? '#f43f5e' : rec.icon === 'budget' ? '#10b981' : '#8b5cf6' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {rec.icon === 'performance' && <TrendingUp size={18} color="#f43f5e" />}
                  {rec.icon === 'budget' && <DollarSign size={18} color="#10b981" />}
                  {rec.icon === 'value' && <Award size={18} color="#8b5cf6" />}
                  <span style={{ fontWeight: 'bold', color: rec.icon === 'performance' ? '#f43f5e' : rec.icon === 'budget' ? '#10b981' : '#8b5cf6' }}>{rec.label}</span>
                </div>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--color-text-primary)' }}>{product.name}</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', flex: 1 }}>{rec.desc}</p>
                <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>₹{product.price.toLocaleString('en-IN')}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DecisionSimplifier;
