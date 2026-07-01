import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import CompatibilityChecker from '../components/CompatibilityChecker';
import LongevityScore from '../components/LongevityScore';
import ProductExplainer from '../components/ProductExplainer';
import ReviewAnalyzer from '../components/ReviewAnalyzer';
import ProductCard from '../components/ProductCard';
import ProductWarnings from '../components/ProductWarnings';
import { motion } from 'framer-motion';
import { Focus } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, addToCart, products } = useShop();
  
  const product = getProductById(id);
  const [mainImage, setMainImage] = useState(product?.image || '');
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    if (product) {
      setMainImage(product.image);
    }
    setFocusMode(false);
  }, [product?.id]);

  const relatedProducts = products ? products.filter(p => p.category === product?.category && p.id !== product?.id).slice(0, 3) : [];

  if (!product) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Product not found</h2>
        <button onClick={() => navigate('/catalog')} style={{ marginTop: '1rem' }}>Return to Catalog</button>
      </div>
    );
  }

  const content = (
    <motion.div 
      initial={focusMode ? { opacity: 0 } : false} 
      animate={focusMode ? { opacity: 1 } : false}
      style={{
        padding: focusMode ? '10vh 2rem' : '2rem 1.5rem',
        maxWidth: focusMode ? '800px' : '1280px',
        margin: '0 auto',
        background: focusMode ? '#000' : 'transparent',
        minHeight: focusMode ? '100vh' : 'auto',
        color: focusMode ? '#fff' : 'var(--color-text-primary)',
        zIndex: focusMode ? 9999 : 1,
        position: focusMode ? 'fixed' : 'relative',
        top: 0, left: 0, right: 0,
        overflowY: focusMode ? 'auto' : 'visible'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={() => focusMode ? setFocusMode(false) : navigate(-1)} style={{ background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-text-secondary)' }}>
          {focusMode ? 'Exit Focus Mode' : '← Back'}
        </button>
        {!focusMode && (
          <button onClick={() => setFocusMode(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-secondary)' }}>
            <Focus size={18} /> Focus Mode
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4rem', flexWrap: 'wrap', flexDirection: focusMode ? 'column' : 'row' }}>
        {/* Main Image Gallery */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', alignItems: focusMode ? 'center' : 'flex-start' }}>
          <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1rem', width: focusMode ? '300px' : '100%', marginBottom: '1rem' }}>
            <img 
              src={mainImage || product.image} 
              alt={product.name} 
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1550009158-9ebf6d250400?w=800&q=80'; }}
              style={{ width: '100%', height: focusMode ? '300px' : '400px', objectFit: 'cover', borderRadius: 'var(--radius-md)', transition: 'all 0.3s' }} 
            />
          </div>
          
          {product.images && product.images.length > 1 && !focusMode && (
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
               {product.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setMainImage(img)}
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: 'var(--radius-md)', 
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: mainImage === img ? '2px solid var(--color-accent-sunrise)' : '2px solid transparent',
                      flexShrink: 0,
                      opacity: mainImage === img ? 1 : 0.6,
                      transition: 'all 0.2s'
                    }}
                  >
                    <img src={img} alt={`${product.name} angle ${idx}`} onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1550009158-9ebf6d250400?w=800&q=80'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
               ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: focusMode ? 'center' : 'left' }}>
          <div>
            <p style={{ color: 'var(--color-accent-sunrise)', fontWeight: 'bold' }}>{product.brand}</p>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{product.name}</h1>
            <p style={{ fontSize: '2rem', fontWeight: 300 }}>₹{product.price.toLocaleString('en-IN')} <span style={{fontSize: '1rem', color: 'var(--color-accent-forest)'}}>| 85% Match</span></p>
          </div>
          
          {/* Smart Warnings */}
          <ProductWarnings specs={product.specs} />

          <button 
            onClick={() => addToCart(product)}
            style={{ padding: '1rem', fontSize: '1.1rem', background: 'var(--color-accent-forest)', color: '#fff', width: focusMode ? '100%' : 'auto' }}
          >
            Add to Cart
          </button>

          {!focusMode && (
            <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Specifications</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(product.specs).map(([key, value]) => (
                  <li key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>
                    <span style={{ textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>{key}:</span>
                    <span style={{ fontWeight: 500 }}>{Array.isArray(value) ? value.join(', ') : value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <ProductExplainer product={product} />

          {!focusMode && <CompatibilityChecker product={product} />}
          {!focusMode && <LongevityScore product={product} />}
        </div>
      </div>

      {!focusMode && (
        <>
          <div style={{ marginTop: '4rem' }}>
            <h2>AI Verified Reviews</h2>
            <ReviewAnalyzer product={product} />
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              {product.reviews.map((review, i) => (
                <div key={i} className="glass" style={{ flex: '1 1 300px', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{review.user} <span style={{ color: '#FFB800' }}>{'★'.repeat(review.rating)}</span></p>
                  <p style={{ color: 'var(--color-text-secondary)' }}>"{review.comment}"</p>
                </div>
              ))}
            </div>
          </div>

          {relatedProducts.length > 0 && (
             <div style={{ marginTop: '4rem' }}>
               <h2>Related Products</h2>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem', marginTop: '1.5rem' }}>
                 {relatedProducts.map(rp => (
                   <ProductCard key={rp.id} product={rp} />
                 ))}
               </div>
             </div>
          )}
        </>
      )}
    </motion.div>
  );

  return focusMode ? <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background:'#000', zIndex: 9998}}>{content}</div> : content;
};

export default ProductDetail;
