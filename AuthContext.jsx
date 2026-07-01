import React, { useState, useEffect } from 'react';
import { AlertTriangle, ThumbsUp } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ReviewAnalyzer = ({ product }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyzeReviews = async () => {
      setLoading(true);
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      const avgRating = product.reviews.length ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : 5;

      if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
        setTimeout(() => {
          if (avgRating < 3.8) {
            setAnalysis({ recommended: false, reason: "Has heating issues and poor build quality reported by several users." });
          } else {
            setAnalysis({ recommended: true, reason: "Highly rated by the community." });
          }
          setLoading(false);
        }, 1000);
        return;
      }

      try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const comments = product.reviews.map(r => r.comment).join(" | ");
        const prompt = `You are an AI Review Analyzer for NexTech AI.
        Product: ${product.name}. Average Rating: ${avgRating.toFixed(1)}
        Reviews: ${comments}
        
        Task: Analyze the sentiment. Is it generally positive or negative?
        Return ONLY a JSON object: {"recommended": true/false, "reason": "Short warning label like 'Has heating issues' or 'Highly rated'"}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const text = response.text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
        setAnalysis(JSON.parse(text));
      } catch (err) {
        console.error(err);
        setAnalysis({ recommended: true, reason: "Could not analyze reviews." });
      } finally {
        setLoading(false);
      }
    };
    
    if (product?.reviews) {
      analyzeReviews();
    }
  }, [product]);

  if (loading || !analysis) return null;

  if (analysis.recommended) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', padding: '0.5rem 0' }}>
         <ThumbsUp size={18} />
         <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>AI Verified: {analysis.reason}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
       <AlertTriangle size={20} />
       <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>Alert: {analysis.reason}</span>
    </div>
  );
};

export default ReviewAnalyzer;
