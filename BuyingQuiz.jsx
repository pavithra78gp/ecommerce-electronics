import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ShopProvider, useShop } from './context/ShopContext';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Chatbot from './components/Chatbot';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import SplashScreen from './components/SplashScreen';


import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import NexTechLogo from './components/NexTechLogo';

const Navbar = () => {
  const { cart } = useShop();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header className="glass" style={{ sticky: 'top', zIndex: 100, borderBottom: '1px solid var(--color-border)' }}>
      <div className="container" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <NexTechLogo size="sm" />
        </Link>
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <button 
            onClick={toggleTheme} 
            style={{ background: 'transparent', color: 'var(--color-text-primary)', border: 'none', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/">Home</Link>
          <Link to="/catalog">Catalog</Link>
          <Link to="/stores">Store Map</Link>
          {user ? (
            <Link to="/profile">Profile</Link>
          ) : (
            <Link to="/login">Login</Link>
          )}

          <Link to="/checkout" style={{ 
            background: 'var(--color-accent-sunrise)', 
            color: '#fff', 
            padding: '0.4rem 1rem', 
            borderRadius: 'var(--radius-2xl)', 
            fontWeight: 'bold',
            textDecoration: 'none'
          }}>
            Cart ({cart.length})
          </Link>
        </nav>
      </div>
    </header>
  );
};

function AppContent() {
  const [showSplash, setShowSplash] = React.useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <BrowserRouter>
        <UserBehaviorProvider>
          <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', opacity: showSplash ? 0 : 1, transition: 'opacity 0.5s ease-in' }}>
          <Navbar />
        
          <main style={{ flex: 1, padding: '2rem 0' }}>
            <Routes>
              <Route path="/" element={<div className="container"><Home /></div>} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/stores" element={<StoreMap />} />

            </Routes>
          </main>
        
          <footer style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-bg-secondary)', marginTop: 'auto' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>&copy; 2026 NexTech AI.</p>
          </footer>
          <Chatbot />
          </div>
        </UserBehaviorProvider>
      </BrowserRouter>
    </>
  );
}

import { UserBehaviorProvider } from './context/UserBehaviorContext';
import StoreMap from './pages/StoreMap';

const App = () => (
  <AuthProvider>
    <ThemeProvider>
      <ShopProvider>
        <AppContent />
      </ShopProvider>
    </ThemeProvider>
  </AuthProvider>
);

export default App;
