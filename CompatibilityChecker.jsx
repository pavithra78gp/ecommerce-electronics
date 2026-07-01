import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUESTIONS = [
  { id: 'budget', text: 'What is your budget?', options: ['Under $500', '$500 - $1000', 'Over $1000'] },
  { id: 'purpose', text: 'What will you use it for mostly?', options: ['Gaming', 'Study & Work', 'Content Creation'] },
  { id: 'priority', text: 'What is your biggest priority?', options: ['Performance', 'Battery Life', 'Design & Portability'] }
];

const BuyingQuiz = ({ onComplete, products }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleOptionSelect = (option) => {
    const newAnswers = { ...answers, [QUESTIONS[currentIdx].id]: option };
    setAnswers(newAnswers);

    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Logic to filter products based on answers
      let recommended = products;
      if (newAnswers.budget === 'Under $500') recommended = recommended.filter(p => p.price < 500);
      else if (newAnswers.budget === '$500 - $1000') recommended = recommended.filter(p => p.price >= 500 && p.price <= 1000);
      else recommended = recommended.filter(p => p.price > 1000);

      onComplete(recommended.slice(0, 3)); // Top 3 recommendations
    }
  };

  return (
    <div className="dark-glass" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h2 className="gradient-text" style={{ marginBottom: '1.5rem' }}>Interactive Buying Quiz</h2>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem' }}>{QUESTIONS[currentIdx].text}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {QUESTIONS[currentIdx].options.map(opt => (
              <button 
                key={opt} 
                onClick={() => handleOptionSelect(opt)}
                style={{
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  padding: '1rem',
                  fontSize: '1rem',
                  textAlign: 'left'
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === currentIdx ? 'var(--color-accent-forest)' : 'rgba(255,255,255,0.2)' }} />
        ))}
      </div>
    </div>
  );
};

export default BuyingQuiz;
