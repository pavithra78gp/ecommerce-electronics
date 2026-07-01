import React from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

const ProductCard = ({ product }) => {
  const { addToCart, getStock } = useShop();
  const stock = getStock(product.id);
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 3;

  const handleAddToCart = () => {
    const result = addToCart(product);
    if (!result.success) {
      alert(result.message);
    }
  };

  return (
    <div className="glass product-card" style={{
      borderRadius: 'var(--radius-xl)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      boxShadow: 'var(--shadow-sm)',
      opacity: isOutOfStock ? 0.75 : 1,
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        height: '200px',
        background: '#fff',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <img 
          src={product.image} 
          alt={product.name} 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            filter: isOutOfStock ? 'grayscale(60%)' : 'none',
            transition: 'filter 0.3s'
          }} 
        />
        
        {/* SOLD OUT Badge */}
        {isOutOfStock && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              padding: '0.6rem 1.8rem',
              borderRadius: 'var(--radius-lg)',
              fontSize: '1rem',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.5)',
              transform: 'rotate(-8deg)',
              border: '2px solid rgba(255,255,255,0.3)'
            }}>
              SOLD OUT
            </div>
          </div>
        )}

        {/* Low Stock Badge */}
        {isLowStock && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.7rem',
            fontWeight: 700,
            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)',
            animation: 'pulse 2s infinite'
          }}>
            🔥 Only {stock} left!
          </div>
        )}

        {/* Stock count badge (when in stock) */}
        {!isOutOfStock && !isLowStock && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(16, 185, 129, 0.9)',
            color: '#fff',
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.65rem',
            fontWeight: 600,
            backdropFilter: 'blur(4px)'
          }}>
            In Stock: {stock}
          </div>
        )}
      </div>

      <div>
        <p style={{ color: 'var(--color-accent-forest)', fontSize: '0.875rem', fontWeight: 600 }}>{product.brand}</p>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{product.name}</h3>
        <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{product.price.toLocaleString('en-IN')}</p>
      </div>
      
      <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
        <Link 
          to={`/product/${product.id}`}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.6em',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-accent-forest)',
            color: 'var(--color-accent-forest)',
            fontWeight: 500
          }}
        >
          View Details
        </Link>
        <button 
          onClick={handleAddToCart} 
          disabled={isOutOfStock}
          style={{ 
            flex: 1,
            opacity: isOutOfStock ? 0.5 : 1,
            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
            background: isOutOfStock ? '#6b7280' : undefined
          }}
        >
          {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
