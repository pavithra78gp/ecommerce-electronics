import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { generateRegretPrediction } from '../services/aiService';
import { sendOrderEmail } from '../services/emailService';
import { AlertCircle, CheckCircle, Server, ServerOff, Package, FileSpreadsheet, ShoppingBag, Mail, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Checkout = () => {
  const { cart, removeFromCart, products, clearCart, processCheckout, refreshInventory, backendOnline } = useShop();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [traffic, setTraffic] = useState('low');
  const [deliveryMethod, setDeliveryMethod] = useState('van');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [regretInfo, setRegretInfo] = useState(null);
  const [loadingRegret, setLoadingRegret] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  // Read confirmation from sessionStorage on mount (survives HMR reloads)
  const [confirmation, setConfirmation] = useState(() => {
    try {
      const saved = sessionStorage.getItem('nextech_order_confirmation');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const saveConfirmation = (data) => {
    try { sessionStorage.setItem('nextech_order_confirmation', JSON.stringify(data)); } catch {}
    setConfirmation(data);
  };

  const clearConfirmation = () => {
    try { sessionStorage.removeItem('nextech_order_confirmation'); } catch {}
    setConfirmation(null);
  };

  useEffect(() => {
    if (cart.length > 0 && !confirmation) {
      setLoadingRegret(true);
      generateRegretPrediction(cart, products).then(res => {
        setRegretInfo(res);
        setLoadingRegret(false);
      });
    }
  }, [cart, products]);

  const deliveryCosts = { van: 10, bike: 5, drone: 15 };
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const deliveryCost = deliveryCosts[deliveryMethod] || 10;
  const total = (subtotal + deliveryCost).toFixed(2);

  const handleTrafficChange = (e) => {
    const val = e.target.value;
    setTraffic(val);
    if (val === 'high') setDeliveryMethod('drone');
    else if (val === 'medium') setDeliveryMethod('bike');
    else setDeliveryMethod('van');
  };

  const handleCheckout = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!user) {
      alert('Please login to complete your purchase.');
      navigate('/login');
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    // Snapshot everything BEFORE any async/state changes
    const snap = {
      items: cart.map(i => ({ ...i })),
      subtotal: cart.reduce((s, i) => s + i.price, 0),
      deliveryCost: deliveryCosts[deliveryMethod] || 10,
      total: (cart.reduce((s, i) => s + i.price, 0) + (deliveryCosts[deliveryMethod] || 10)).toFixed(2),
      deliveryMethod,
      email: user.email,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };

    try {
      const checkoutResult = await processCheckout({ email: user.email, deliveryMethod });

      if (!checkoutResult.success) {
        if (checkoutResult.offline) {
          // Backend offline — still confirm
          let emailStatus = 'failed';
          try {
            const r = await sendOrderEmail({ userEmail: snap.email, cart: snap.items, total: snap.total, deliveryMethod: snap.deliveryMethod });
            emailStatus = r.method === 'server' ? 'sent' : 'local';
          } catch {}
          // Save THEN clear cart
          saveConfirmation({ ...snap, orderId: `NT-${Date.now().toString(36).toUpperCase()}`, emailStatus, excelLogged: false });
          clearCart();
        } else {
          // Real stock error
          const msg = checkoutResult.details ? checkoutResult.details.join('\n') : checkoutResult.error;
          setCheckoutError(`${checkoutResult.error}: ${msg}`);
          await refreshInventory();
        }
      } else {
        // Full success
        let emailStatus = 'failed';
        try {
          const r = await sendOrderEmail({ userEmail: snap.email, cart: snap.items, total: checkoutResult.totalPrice || snap.total, deliveryMethod: snap.deliveryMethod });
          emailStatus = r.method === 'server' ? 'sent' : 'local';
        } catch {}
        // Save THEN clear cart
        saveConfirmation({
          ...snap,
          total: checkoutResult.totalPrice || snap.total,
          orderId: checkoutResult.orderId,
          emailStatus,
          excelLogged: true,
          stockUpdates: checkoutResult.stockUpdates || [],
        });
        clearCart();
      }
    } catch {
      // Unexpected error — still show confirmation
      saveConfirmation({
        ...snap,
        orderId: `NT-${Date.now().toString(36).toUpperCase()}`,
        emailStatus: 'failed',
        excelLogged: false,
      });
      clearCart();
    } finally {
      setIsCheckingOut(false);
    }
  };

  const renderDeliveryOption = (type, title, cost, recTraffic, desc) => {
    const isSelected = deliveryMethod === type;
    const isRecommended = traffic === recTraffic;
    return (
      <div onClick={() => setDeliveryMethod(type)} style={{
        flex: 1, padding: '1rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
        background: isSelected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
        border: isSelected ? '1px solid var(--color-accent-forest)' : '1px solid rgba(255,255,255,0.1)',
        transition: 'all 0.3s', position: 'relative'
      }}>
        {isRecommended && (
          <div style={{
            position: 'absolute', top: '-10px', right: '-10px',
            background: 'var(--color-accent-sunrise)', color: '#000',
            fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-md)', boxShadow: '0 2px 10px rgba(192,132,252,0.4)'
          }}>AI Recommended ⚡</div>
        )}
        <h4 style={{ color: 'var(--color-text-primary)' }}>{title}</h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0' }}>{desc}</p>
        <span style={{ fontWeight: 600, color: 'var(--color-accent-sunrise)' }}>₹{cost}</span>
      </div>
    );
  };

  // ═══════════════════ CONFIRMATION SCREEN ═══════════════════
  if (confirmation) {
    const c = confirmation;
    return (
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '700px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          {/* Success icon + heading */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
              style={{
                width: 88, height: 88, borderRadius: '50%', margin: '0 auto 1.5rem',
                background: 'linear-gradient(135deg,#10b981,#34d399)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 40px rgba(16,185,129,0.35)'
              }}
            >
              <CheckCircle size={44} color="#fff" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem' }}
            >
              Order Placed Successfully!
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              style={{ color: 'var(--color-text-secondary)' }}>
              Thank you for shopping at NexTech AI
            </motion.p>
          </div>

          {/* Order ID */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="dark-glass" style={{
              padding: '1.25rem', borderRadius: 'var(--radius-lg)', textAlign: 'center',
              marginBottom: '1.25rem', border: '1px solid rgba(124,58,237,0.3)',
              background: 'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(192,132,252,0.05))'
            }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>Order ID</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent-sunrise)', letterSpacing: '1px' }}>{c.orderId}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem' }}>{c.timestamp}</p>
          </motion.div>

          {/* Status pills */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {[
              {
                icon: <Mail size={18} />,
                label: 'Email Confirmation',
                value: c.emailStatus === 'sent' ? `Sent to ${c.email}` : c.emailStatus === 'local' ? 'Receipt generated' : 'Email unavailable',
                color: c.emailStatus === 'sent' ? '#10b981' : c.emailStatus === 'local' ? '#eab308' : '#ef4444',
                bg: c.emailStatus === 'sent' ? 'rgba(16,185,129,0.1)' : c.emailStatus === 'local' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                border: c.emailStatus === 'sent' ? 'rgba(16,185,129,0.3)' : c.emailStatus === 'local' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)',
              },
              {
                icon: <FileSpreadsheet size={18} />,
                label: 'Admin Dashboard',
                value: c.excelLogged ? 'Logged & Updated' : 'Offline — not logged',
                color: c.excelLogged ? '#10b981' : '#eab308',
                bg: c.excelLogged ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)',
                border: c.excelLogged ? 'rgba(16,185,129,0.3)' : 'rgba(234,179,8,0.3)',
              },
            ].map((pill, i) => (
              <div key={i} style={{
                flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.8rem 1rem', borderRadius: 'var(--radius-lg)',
                background: pill.bg, border: `1px solid ${pill.border}`, color: pill.color
              }}>
                {pill.icon}
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{pill.label}</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{pill.value}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Order items + totals */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}
            className="dark-glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag size={18} /> Order Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {c.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: i < c.items.length - 1 ? '1px solid var(--color-border)' : 'none',
                  paddingBottom: '0.6rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src={item.image} alt={item.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)' }} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{item.brand}</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 600 }}>₹{Number(item.price).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '2px solid var(--color-border)' }}>
              {[
                { label: 'Subtotal', value: `₹${Number(c.subtotal).toLocaleString('en-IN')}` },
                { label: `Delivery (${c.deliveryMethod.toUpperCase()})`, value: `₹${c.deliveryCost}` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                  <span>{row.label}</span><span>{row.value}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800,
                padding: '0.75rem', borderRadius: 'var(--radius-md)', marginTop: '0.5rem',
                background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(192,132,252,0.08))'
              }}>
                <span>Total Paid</span>
                <span style={{ color: 'var(--color-accent-sunrise)' }}>₹{Number(c.total).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72 }}
            onClick={() => { clearConfirmation(); navigate('/catalog'); }}
            style={{
              width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              background: 'var(--color-accent-forest)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius-lg)', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(124,58,237,0.3)'
            }}
          >
            Continue Shopping <ArrowRight size={18} />
          </motion.button>

        </motion.div>
      </div>
    );
  }

  // ═══════════════════ CHECKOUT FORM ═══════════════════
  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Secure Checkout</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', color: backendOnline ? '#10b981' : '#f59e0b' }}>
        {backendOnline ? <Server size={14} /> : <ServerOff size={14} />}
        {backendOnline ? '🟢 Inventory server connected — Stock & Excel logging active' : '🟡 Inventory server offline — Orders will process locally'}
      </div>

      <AnimatePresence>
        {checkoutError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444',
              color: '#fca5a5', padding: '1.25rem', borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Checkout Failed</p>
              <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-line' }}>{checkoutError}</p>
            </div>
            <button type="button" onClick={() => setCheckoutError(null)}
              style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '0.2rem' }}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {cart.length === 0 ? (
        <div className="dark-glass" style={{ textAlign: 'center', padding: '4rem', borderRadius: 'var(--radius-xl)' }}>
          <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>Your cart is empty.</p>
          <button type="button" onClick={() => navigate('/catalog')} style={{ marginTop: '1rem' }}>Browse Catalog</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Items */}
          <div className="dark-glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cart.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={item.image} alt={item.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span>₹{item.price.toLocaleString('en-IN')}</span>
                    <button type="button" onClick={() => removeFromCart(index)}
                      style={{ background: 'transparent', color: 'red', border: '1px solid red', padding: '0.2rem 0.5rem' }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right', fontSize: '1.1rem', color: 'var(--color-text-secondary)' }}>
              Subtotal: ₹{subtotal.toLocaleString('en-IN')}
            </div>
          </div>

          {/* AI Regret */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="dark-glass" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertCircle size={20} color="var(--color-accent-sunrise)" /> AI Regret Predictor
            </h3>
            {loadingRegret ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>Analyzing cart compatibility...</p>
            ) : regretInfo ? (
              <div>
                <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Dissatisfaction Probability</span>
                  <strong style={{ color: regretInfo.score > 50 ? '#ef4444' : '#10b981' }}>{regretInfo.score}%</strong>
                </p>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{ width: `${regretInfo.score}%`, height: '100%', background: regretInfo.score > 50 ? '#ef4444' : '#10b981' }} />
                </div>
                {regretInfo.score > 50
                  ? <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>⚠️ Warning: {regretInfo.message}.</p>
                  : <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontSize: '0.9rem' }}><CheckCircle size={16} /> Great choices! High satisfaction predicted.</p>
                }
              </div>
            ) : null}
          </motion.div>

          {/* Delivery */}
          <div className="dark-glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Intelligent Delivery Options</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Traffic:</span>
                <select value={traffic} onChange={handleTrafficChange} style={{ background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: 'var(--radius-md)', outline: 'none', cursor: 'pointer' }}>
                  <option value="low">Suburbs (Low)</option>
                  <option value="medium">City Center (Medium)</option>
                  <option value="high">Metro Rush Hour (High)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {renderDeliveryOption('van', 'Standard Van', 10, 'low', 'Cost-effective batch delivery.')}
              {renderDeliveryOption('bike', 'Agile Bike', 5, 'medium', 'Nimble through moderate congestion.')}
              {renderDeliveryOption('drone', 'Express Drone', 15, 'high', 'Air delivery, bypasses traffic.')}
            </div>
          </div>

          {/* Pay button */}
          <div className="dark-glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              Total to Pay: <span style={{ color: 'var(--color-accent-sunrise)' }}>₹{Number(total).toLocaleString('en-IN')}</span>
            </div>
            <button
              type="button"
              disabled={isCheckingOut}
              onClick={handleCheckout}
              style={{
                width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 600,
                background: isCheckingOut ? 'rgba(124,58,237,0.6)' : 'var(--color-accent-forest)',
                color: '#fff', border: 'none', borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 15px rgba(124,58,237,0.4)',
                cursor: isCheckingOut ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.3s'
              }}
            >
              {isCheckingOut ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                    style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%' }}
                  />
                  Processing...
                </>
              ) : (
                <>Confirm & Pay Securely <ArrowRight size={18} /></>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default Checkout;
