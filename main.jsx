import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const UserBehaviorContext = createContext();

export const useUserBehavior = () => useContext(UserBehaviorContext);

export const UserBehaviorProvider = ({ children }) => {
  const [isConfused, setIsConfused] = useState(false);
  const [filterChanges, setFilterChanges] = useState(0);
  const { pathname } = useLocation();
  const idleTimer = useRef(null);

  const resetTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    // Trigger confusion if idle for 45 seconds explicitly on matching/catalog pages
    idleTimer.current = setTimeout(() => {
      if (pathname.includes('/catalog')) {
        setIsConfused(true);
      }
    }, 45000);
  };

  useEffect(() => {
    resetTimer();
    const handlers = ['click', 'scroll', 'keypress'];
    handlers.forEach(ev => window.addEventListener(ev, resetTimer));
    
    return () => {
      handlers.forEach(ev => window.removeEventListener(ev, resetTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [pathname]);

  const recordFilterChange = () => {
    setFilterChanges(prev => {
      const newCount = prev + 1;
      if (newCount > 4) {
        setIsConfused(true);
        return 0; // reset
      }
      return newCount;
    });
  };

  return (
    <UserBehaviorContext.Provider value={{ isConfused, setIsConfused, recordFilterChange }}>
      {children}
      <AnimatePresence>
        {isConfused && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              padding: '1.5rem',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-bg-secondary)',
              border: '2px solid var(--color-accent-forest)',
              boxShadow: 'var(--shadow-lg)',
              maxWidth: '400px',
              textAlign: 'center'
            }}
          >
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>You seem confused.</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Want me to simplify your choices and show you the best 2 options?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setIsConfused(false)} style={{ background: 'transparent', border: '1px solid var(--color-text-secondary)', color: 'var(--color-text-secondary)' }}>
                No thanks
              </button>
              <button onClick={() => {
                setIsConfused(false);
                window.location.href = '/catalog?mode=instant';
              }} style={{ background: 'var(--color-accent-forest)', color: '#fff' }}>
                Simplify My Choice
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </UserBehaviorContext.Provider>
  );
};
