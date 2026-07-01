import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      login(email, password);
      navigate('/');
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '400px', margin: '0 auto' }}>
      <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Login to NexTech AI</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email ID</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--color-bg-primary)', color: '#fff' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--color-bg-primary)', color: '#fff' }}
            />
          </div>
          <button type="submit" style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-accent-forest)', color: '#fff', fontWeight: 'bold' }}>
            Login
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--color-accent-sunrise)' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
