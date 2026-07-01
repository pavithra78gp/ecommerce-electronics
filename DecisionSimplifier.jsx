import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { GoogleGenAI } from '@google/genai';
import { MessageSquare, X, Send, Mic, Paperclip, Loader, Bot, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Local smart search fallback (when API quota is exhausted) ─────────────────
const localSearch = (query, products) => {
  const q = query.toLowerCase();

  // Price filter: "under X" or "below X" or "less than X"
  const priceMatch = q.match(/(?:under|below|less than|within|max|budget)\s*[₹$]?\s*(\d+[\d,]*)/i);
  const maxPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;

  // Category keywords
  const categoryMap = {
    laptop: 'Laptop', macbook: 'Laptop', notebook: 'Laptop', computer: 'Laptop',
    phone: 'Smartphone', mobile: 'Smartphone', smartphone: 'Smartphone', iphone: 'Smartphone',
    monitor: 'Monitor', screen: 'Monitor', display: 'Monitor',
    camera: 'Camera', photo: 'Camera', photography: 'Camera',
    gpu: 'GPU', graphics: 'GPU', 'graphic card': 'GPU', 'video card': 'GPU',
    audio: 'Audio', headphone: 'Audio', speaker: 'Audio',
  };

  let filterCategory = null;
  for (const [kw, cat] of Object.entries(categoryMap)) {
    if (q.includes(kw)) { filterCategory = cat; break; }
  }

  // Brand keywords
  const brandMap = { apple: 'Apple', samsung: 'Samsung', lg: 'LG', sony: 'Sony', asus: 'Asus' };
  let filterBrand = null;
  for (const [kw, brand] of Object.entries(brandMap)) {
    if (q.includes(kw)) { filterBrand = brand; break; }
  }

  let results = [...products];
  if (filterCategory) results = results.filter(p => p.category === filterCategory);
  if (filterBrand) results = results.filter(p => p.brand === filterBrand);
  if (maxPrice) results = results.filter(p => p.price <= maxPrice);

  // Sort by relevance (name/desc match first, then by price)
  const words = q.split(/\s+/).filter(w => w.length > 3);
  results.sort((a, b) => {
    const aScore = words.filter(w => a.name.toLowerCase().includes(w)).length;
    const bScore = words.filter(w => b.name.toLowerCase().includes(w)).length;
    return bScore - aScore || a.price - b.price;
  });

  // Intent detection: "best", "cheapest", "most expensive"
  if (q.includes('cheap') || q.includes('budget') || q.includes('affordable') || q.includes('lowest')) {
    results.sort((a, b) => a.price - b.price);
  } else if (q.includes('best') || q.includes('top') || q.includes('premium') || q.includes('expensive')) {
    results.sort((a, b) => b.price - a.price);
  }

  const top3 = results.slice(0, 3);

  if (top3.length === 0) {
    return "I couldn't find products matching your query. Try searching by category (laptop, phone, monitor, camera, GPU) or brand (Apple, Sony, LG, Asus).";
  }

  let reply = `Here are the best matches${filterCategory ? ` in **${filterCategory}**` : ''}${maxPrice ? ` under ₹${maxPrice.toLocaleString('en-IN')}` : ''}:\n\n`;
  top3.forEach((p, i) => {
    reply += `${i + 1}. **${p.name}** by ${p.brand}\n`;
    reply += `   💰 ₹${p.price.toLocaleString('en-IN')}\n`;
    const specEntries = Object.entries(p.specs).slice(0, 2);
    if (specEntries.length > 0) {
      reply += `   🔧 ${specEntries.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')}\n`;
    }
    reply += '\n';
  });

  return reply.trim();
};

// ─── Component ─────────────────────────────────────────────────────────────────
const Chatbot = () => {
  const { products } = useShop();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! 👋 I am the NexTech AI Assistant. Ask me anything about our products — specs, comparisons, recommendations, and more!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-chatbot', handleOpen);
    return () => window.removeEventListener('open-chatbot', handleOpen);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const appendMessage = (role, content) =>
    setMessages(prev => [...prev, { role, content }]);

  const handleSend = async (customMessage = null) => {
    const userPrompt = customMessage || input.trim();
    if (!userPrompt || isTyping) return;

    appendMessage('user', userPrompt);
    setInput('');
    setIsTyping(true);

    // If quota is already known to be exceeded, skip API call
    if (quotaExceeded) {
      setTimeout(() => {
        const localReply = localSearch(userPrompt, products);
        setIsTyping(false);
        appendMessage('assistant', `📦 **(Local Search Mode — API quota exceeded)**\n\n${localReply}`);
      }, 600);
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      setIsTyping(false);
      appendMessage('assistant', '⚠️ **API key not configured.** Please add `VITE_GEMINI_API_KEY` to your `.env` file.\n\nIn the meantime, I can still search products locally. Try: "Show me laptops" or "Best phone under ₹80000".');
      setQuotaExceeded(true);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = `You are NexTech AI, a friendly and expert sales assistant for an Indian electronics store. 
Product catalog: ${JSON.stringify(products.map(p => ({
  id: p.id, name: p.name, brand: p.brand,
  category: p.category, price: p.price, specs: p.specs
})))}
Rules: All prices are in Indian Rupees (₹). Be concise and helpful. Answer based only on the catalog.
User query: ${userPrompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemPrompt,
      });

      setIsTyping(false);
      appendMessage('assistant', response.text || "I couldn't generate a response. Please try again.");

    } catch (err) {
      setIsTyping(false);
      console.error('Chatbot Error:', err.message);

      let errBody = {};
      try { errBody = JSON.parse(err.message); } catch {}
      const code = errBody?.error?.code;
      const errMsg = errBody?.error?.message || '';

      if (code === 429 || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        setQuotaExceeded(true);
        const localReply = localSearch(userPrompt, products);
        appendMessage('assistant',
          `⚡ **API quota reached** (free-tier limit exhausted). Switching to **Local Search Mode**.\n\nTo restore AI responses, [get a new API key](https://aistudio.google.com/app/apikey) and update your \`.env\` file.\n\n---\n\n${localReply}`
        );
      } else if (code === 401 || code === 403 || errMsg.includes('API_KEY')) {
        appendMessage('assistant', '🔑 **Invalid API key.** Please check your `VITE_GEMINI_API_KEY` in the `.env` file and restart the dev server.');
      } else if (errMsg.includes('NOT_FOUND') || errMsg.includes('404')) {
        appendMessage('assistant', '🚫 **Model not available.** The selected Gemini model is not found. Please report this issue.');
      } else {
        // Network or unknown error — use local fallback silently
        const localReply = localSearch(userPrompt, products);
        appendMessage('assistant', `📦 **(Local Search Mode)**\n\n${localReply}`);
      }
    }
  };

  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      appendMessage('assistant', '🎤 Voice recognition is not supported in your browser. Please try Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => {
      setIsListening(false);
      appendMessage('assistant', '🎤 Could not capture speech. Please try again or type your question.');
    };
    rec.onresult = e => handleSend(e.results[0][0].transcript);
    rec.start();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleSend(`I uploaded a file: "${file.name}". Can you suggest related products from your catalog?`);
    e.target.value = '';
  };

  const quickPrompts = ['Best laptops', 'Phones under ₹80k', 'Compare monitors', 'Best GPU'];

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            title="Open AI Chat"
            style={{
              position: 'fixed', bottom: '2rem', right: '2rem',
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #f43f5e)',
              color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center',
              boxShadow: '0 8px 32px rgba(124,58,237,0.55)', zIndex: 999,
              border: 'none', cursor: 'pointer'
            }}
          >
            <MessageSquare size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.85 }}
            transition={{ duration: 0.3, type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: '2rem', right: '2rem',
              width: '390px', height: '620px',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.2)',
              display: 'flex', flexDirection: 'column',
              zIndex: 1000, overflow: 'hidden',
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)'
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              padding: '1rem 1.25rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Bot size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    NexTech AI Assistant
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {quotaExceeded
                      ? <><AlertCircle size={10} /> Local Search Mode</>
                      : isTyping ? '● Thinking...' : '● Online'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                  padding: '0.4rem', boxShadow: 'none', borderRadius: '8px',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quota warning banner */}
            {quotaExceeded && (
              <div style={{
                background: 'rgba(234,179,8,0.12)',
                borderBottom: '1px solid rgba(234,179,8,0.3)',
                padding: '0.5rem 1rem',
                fontSize: '0.75rem',
                color: '#EAB308',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <AlertCircle size={13} />
                AI quota exceeded — running in local product-search mode.
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#EAB308', textDecoration: 'underline', marginLeft: '4px' }}
                >
                  Get new key
                </a>
              </div>
            )}

            {/* Messages */}
            <div style={{
              flex: 1, padding: '1rem', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: '0.75rem',
              background: 'var(--color-bg-primary)'
            }}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    padding: '0.7rem 1rem',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                      : 'var(--color-bg-secondary)',
                    color: msg.role === 'user' ? '#fff' : 'var(--color-text-primary)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--color-border)',
                    fontSize: '0.88rem',
                    lineHeight: '1.58',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {msg.content}
                </motion.div>
              ))}

              {isTyping && (
                <div style={{
                  alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '0.7rem 1.1rem',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: '18px 18px 18px 4px',
                  border: '1px solid var(--color-border)'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: 'var(--color-accent-forest)',
                      animation: `dotPulse 1.1s ease-in-out ${i * 0.18}s infinite`
                    }} />
                  ))}
                </div>
              )}

              {isListening && (
                <div style={{
                  alignSelf: 'flex-end', color: '#ef4444', fontSize: '0.82rem',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '0.45rem 0.9rem',
                  background: 'rgba(239,68,68,0.08)',
                  borderRadius: '12px', border: '1px solid rgba(239,68,68,0.25)'
                }}>
                  <Mic size={12} style={{ animation: 'dotPulse 1s ease-in-out infinite' }} />
                  Listening…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts + Media */}
            <div style={{
              display: 'flex', gap: '0.4rem', padding: '0.45rem 0.9rem',
              background: 'var(--color-bg-secondary)',
              borderTop: '1px solid var(--color-border)',
              overflowX: 'auto', flexWrap: 'nowrap', alignItems: 'center'
            }}>
              <button
                onClick={handleMicClick}
                title="Voice input"
                style={{
                  background: isListening ? 'rgba(239,68,68,0.15)' : 'transparent',
                  padding: '0.4rem', color: isListening ? '#ef4444' : 'var(--color-text-secondary)',
                  boxShadow: 'none', borderRadius: '8px',
                  border: isListening ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                  cursor: 'pointer', flexShrink: 0
                }}
              >
                <Mic size={16} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload file"
                style={{
                  background: 'transparent', padding: '0.4rem',
                  color: 'var(--color-text-secondary)', boxShadow: 'none',
                  borderRadius: '8px', border: '1px solid transparent', cursor: 'pointer', flexShrink: 0
                }}
              >
                <Paperclip size={16} />
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,.pdf,.txt" />

              {quickPrompts.map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  style={{
                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
                    color: '#a855f7', padding: '0.28rem 0.6rem', borderRadius: '20px',
                    fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap',
                    boxShadow: 'none', flexShrink: 0
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{
              padding: '0.75rem 1rem', background: 'var(--color-bg-secondary)',
              display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--color-border)',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={quotaExceeded ? 'Search products locally...' : 'Ask about products...'}
                disabled={isTyping}
                style={{
                  flex: 1, padding: '0.65rem 1rem', borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                  outline: 'none', fontFamily: 'inherit', fontSize: '0.88rem',
                  opacity: isTyping ? 0.6 : 1
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={isTyping || !input.trim()}
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'none', padding: '0.65rem', borderRadius: '12px',
                  border: 'none',
                  cursor: isTyping || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: isTyping || !input.trim() ? 0.45 : 1, transition: 'opacity 0.2s'
                }}
              >
                {isTyping
                  ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} color="#fff" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes dotPulse {
          0%,80%,100% { transform:scale(0.55); opacity:0.25; }
          40%          { transform:scale(1.1);  opacity:1; }
        }
        @keyframes spin {
          from { transform:rotate(0deg); } to { transform:rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default Chatbot;
