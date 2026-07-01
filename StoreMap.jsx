import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, MessageSquare, Gamepad2, BookOpen, MonitorPlay, Zap, DollarSign, Star } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import BuyingQuiz from '../components/BuyingQuiz';
import NexTechLogo from '../components/NexTechLogo';

import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { products } = useShop();
  const [showQuiz, setShowQuiz] = useState(false);
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const featured = products.slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', overflowX: 'hidden' }}>
      
      {/* 1. Hero Section */}
      <motion.section 
        className="dark-glass"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        style={{ 
          borderRadius: 'var(--radius-2xl)', 
          padding: '4rem 4rem', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'radial-gradient(circle at center right, rgba(124, 58, 237, 0.15) 0%, var(--color-bg-primary) 100%)',
          border: '1px solid var(--color-border)',
          marginTop: '1rem'
        }}
      >
        <div style={{ flex: 1, textAlign: 'left' }}>
          <motion.h1 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="gradient-text" 
            style={{ fontSize: '4rem', marginBottom: '1.5rem', fontWeight: '800', lineHeight: 1.1 }}
          >
            Shop Smarter with NexTech AI
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', maxWidth: '600px', marginBottom: '2.5rem' }}
          >
            AI-powered platform to help you choose the best electronics easily. Experience next-gen personalized shopping perfectly tailored to your needs.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{ display: 'flex', gap: '1.5rem', justifyContent: 'flex-start' }}
          >
            <Link to="/catalog">
              <button style={{ 
                padding: '1rem 2.5rem', 
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, var(--color-accent-forest), var(--color-accent-sunrise))',
                boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
                color: '#fff'
              }}>
                Explore Products <ShoppingBag size={20} />
              </button>
            </Link>
            <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
                style={{ 
                padding: '1rem 2.5rem', 
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'transparent',
                border: '1px solid var(--color-accent-forest)',
                color: 'var(--color-text-primary)'
              }}>
              Ask AI <MessageSquare size={20} />
            </button>
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
          style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <div style={{ filter: 'drop-shadow(0 0 50px rgba(124,58,237,0.6)) drop-shadow(0 0 20px rgba(244,63,94,0.35))' }}>
            <NexTechLogo size="hero" />
          </div>
        </motion.div>
      </motion.section>

      {/* 2. AI Assistant Section */}
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        style={{ display: 'flex', justifyContent: 'center' }}
      >
        {!showQuiz ? (
          <div className="glass" style={{ padding: '3rem', borderRadius: 'var(--radius-xl)', textAlign: 'center', maxWidth: '500px', width: '100%', border: '1px solid rgba(59, 130, 246, 0.3)', position: 'relative', overflow: 'hidden' }}>
             <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--color-accent-moss)', filter: 'blur(80px)', opacity: 0.3, borderRadius: '50%' }} />
             <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Confused what to buy?</h2>
             <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Let our AI guide you to the perfect setup in just 3 questions.</p>
             <button onClick={() => setShowQuiz(true)} style={{ padding: '1rem 2rem', background: 'var(--color-accent-moss)', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }}>
               Start AI Guide <MessageSquare size={18} style={{ display: 'inline-block', marginLeft: '0.5rem' }} />
             </button>
          </div>
        ) : (
          <BuyingQuiz onComplete={(results) => {
            // Usually we'd map these to a state, but for simplicity we redirect to Instant mode.
            navigate('/catalog?mode=instant');
          }} products={products} />
        )}
      </motion.section>

      {/* 3. Need-Based Shopping Section */}
      <section className="container">
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>Shop By Setup</h2>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '2rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {[{ icon: <Gamepad2 size={40} />, title: "Gaming Setup" }, { icon: <BookOpen size={40} />, title: "Study Setup" }, { icon: <MonitorPlay size={40} />, title: "Creator Setup" }].map((item, idx) => (
            <motion.div key={idx} variants={itemVariants} whileHover={{ y: -10, boxShadow: 'var(--shadow-lg)' }} className="glass" style={{ flex: '0 0 300px', padding: '3rem 2rem', borderRadius: 'var(--radius-xl)', textAlign: 'center', cursor: 'pointer', transition: 'box-shadow 0.3s' }}>
              <div style={{ color: 'var(--color-accent-sunrise)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <motion.div whileHover={{ rotate: 10 }}>{item.icon}</motion.div>
              </div>
              <h3 style={{ color: 'var(--color-text-primary)' }}>{item.title}</h3>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 4. Top Trending Section */}
      <section className="container">
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>Top Trending Products</h2>
        <div style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '2rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {featured.map(product => (
            <Link to={`/product/${product.id}`} key={product.id} style={{ flex: '0 0 320px', display: 'block' }}>
              <motion.div 
                className="glass product-card" 
                whileHover="hover"
                style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}
              >
                <div style={{ position: 'relative', overflow: 'hidden', height: '200px' }}>
                  <motion.img 
                    src={product.image} 
                    alt={product.name} 
                    variants={{ hover: { scale: 1.1 } }}
                    transition={{ duration: 0.3 }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', backdropFilter: 'blur(5px)' }}>
                    Best Seller
                  </div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{product.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>₹{product.price.toLocaleString('en-IN')}</span>
                    <motion.button 
                      variants={{ hover: { opacity: 1, y: 0 } }}
                      initial={{ opacity: 0, y: 10 }}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      View
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Quick Decision Section */}
      <section className="container">
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>Top AI Picks</h2>
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '2rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {[
            { tag: "Best Performance", icon: <Zap size={24} color="#FBBF24" />, desc: "Uncompromised power for hardcore use.", pid: "1" },
            { tag: "Best Budget", icon: <DollarSign size={24} color="#34D399" />, desc: "Incredible value without breaking the bank.", pid: "2" },
            { tag: "Best Value", icon: <Star size={24} color="#60A5FA" />, desc: "The perfect sweet spot of price and features.", pid: "3" }
          ].map((item, idx) => (
            <motion.div key={idx} variants={itemVariants} className="dark-glass" style={{ flex: '0 0 300px', padding: '2rem', borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', width: '2px', height: '100%', left: 0, top: 0, background: 'linear-gradient(to bottom, transparent, var(--color-accent-sunrise), transparent)' }} />
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                 <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', padding: '0.8rem', borderRadius: '50%' }}>{item.icon}</div>
                 <h3 style={{ fontSize: '1.3rem' }}>{item.tag}</h3>
               </div>
               <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>{item.desc}</p>
               <Link to={`/product/${item.pid}`} style={{ color: 'var(--color-accent-sunrise)', fontWeight: 'bold' }}>See the pick →</Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 6. Confusion Solver Banner */}
      <section className="container" style={{ marginBottom: '4rem' }}>
        <div style={{ 
          background: 'linear-gradient(90deg, rgba(124,58,237,0.2) 0%, rgba(59,130,246,0.2) 100%)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 'var(--radius-xl)',
          padding: '4rem 2rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <motion.div 
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }} 
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.03) 100%)', backgroundSize: '200% 200%', zIndex: 0 }} 
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Feeling confused?</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.2rem', marginBottom: '2rem' }}>Skip the endless scrolling and let AI make the hard decisions for you.</p>
            <motion.button 
              onClick={() => { setShowQuiz(true); window.scrollTo({top: 0, behavior: 'smooth'}); }}
              animate={{ boxShadow: ['0 0 10px rgba(124,58,237,0.4)', '0 0 25px rgba(124,58,237,0.8)', '0 0 10px rgba(124,58,237,0.4)'] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ background: 'var(--color-accent-forest)', fontSize: '1.2rem', padding: '1rem 2.5rem' }}
            >
              Simplify My Choice
            </motion.button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
