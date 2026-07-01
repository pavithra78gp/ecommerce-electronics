import React, { useEffect, useState } from 'react';
import NexTechLogo from './NexTechLogo';

const SplashScreen = ({ onFinish }) => {
  const [stage, setStage] = useState('entering');

  useEffect(() => {
    const timer1 = setTimeout(() => setStage('exiting'), 2500);
    const timer2 = setTimeout(() => onFinish(), 3100);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [onFinish]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse at center, #0d0d1a 0%, #050508 100%)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: stage === 'exiting' ? 0 : 1,
      transition: 'opacity 0.6s ease-in-out',
    }}>
      {/* Animated glow behind logo */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '200px',
        background: 'radial-gradient(ellipse, rgba(124,58,237,0.35) 0%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'glowPulse 3s ease-in-out infinite'
      }} />

      {/* Logo */}
      <div style={{
        animation: 'splashScale 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        opacity: 0,
        position: 'relative',
        zIndex: 1,
        // Invert logo colors for dark background
        filter: 'drop-shadow(0 0 35px rgba(124,58,237,0.5)) brightness(1.15)'
      }}>
        {/* White/light version: override text fill for dark background */}
        <div style={{ filter: 'hue-rotate(0deg)' }}>
          <NexTechLogo size="lg" />
        </div>
      </div>

      {/* Loading indicator */}
      <div style={{
        marginTop: '3rem',
        animation: 'fadeInUp 0.7s ease-out 1.3s forwards',
        opacity: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: 1
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '9px', height: '9px', borderRadius: '50%',
            background: `linear-gradient(135deg, #7c3aed, #f43f5e)`,
            animation: `dotPulse 1.2s ease-in-out ${i * 0.22}s infinite`
          }} />
        ))}
        <span style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.78rem',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginLeft: '8px'
        }}>
          Loading
        </span>
      </div>

      <style>{`
        @keyframes splashScale {
          0%   { transform: scale(0.7) translateY(28px); opacity: 0; filter: blur(14px) drop-shadow(0 0 35px rgba(124,58,237,0.5)) brightness(1.15); }
          70%  { opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; filter: drop-shadow(0 0 35px rgba(124,58,237,0.5)) brightness(1.15); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.25; }
          40%           { transform: scale(1.15); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
