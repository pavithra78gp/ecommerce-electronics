import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '../context/ShopContext';
import { Search, Loader, Mic, MicOff, Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const GoalBundler = () => {
  const { products, addToCart } = useShop();
  const [goal, setGoal] = useState('');
  const [budget, setBudget] = useState('');
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [media, setMedia] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMedia({ url: URL.createObjectURL(file), name: file.name });
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera API is not supported in this browser or requires an HTTPS connection.");
      return;
    }
    setShowWebcam(true);
  };

  useEffect(() => {
    let activeStream = null;
    if (showWebcam) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          activeStream = stream;
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          alert("Could not access camera: " + err.message);
          setShowWebcam(false);
        });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showWebcam]);

  const captureCamera = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setMedia({ url: dataUrl, name: 'camera-capture.jpg' });
      stopCamera();
    }
  };

  const stopCamera = () => {
    setShowWebcam(false);
  };

  // Web Speech API
  let recognition = null;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setGoal(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
  }

  const toggleListen = () => {
    if (isListening) {
      recognition?.stop();
      setIsListening(false);
    } else {
      recognition?.start();
      setIsListening(true);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!goal.trim()) return;

    setLoading(true);
    setBundle(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const finalBudget = budget ? parseInt(budget) : 99999;

    if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
      // Simulate Gemini API
      setTimeout(() => {
        let suggestedProducts = [];
        let title = '';
        let desc = '';

        if (goal.toLowerCase().includes('youtube') || goal.toLowerCase().includes('stream')) {
          title = "The Content Creator Setup";
          desc = "Perfect for launching your channel with pristine visuals and crisp audio.";
          suggestedProducts = [
            products.find(p => p.category === 'Camera'),
            products.find(p => p.category === 'Audio') || products[0]
          ].filter(Boolean);
        } else if (goal.toLowerCase().includes('game') || goal.toLowerCase().includes('gaming')) {
          title = "The Next-Gen Battlestation";
          desc = "Dominate the arena with high-framerate graphics and an ultra-responsive monitor.";
          suggestedProducts = [
             products.find(p => p.category === 'GPU'),
             products.find(p => p.category === 'Monitor'),
          ].filter(Boolean);
        } else if (goal.toLowerCase().includes('study')) {
          title = "The Focus Setup";
          desc = "A balanced ecosystem for maximum productivity.";
          suggestedProducts = [
             products.find(p => p.category === 'Laptop'),
             products.find(p => p.category === 'Monitor'),
          ].filter(Boolean);
        } else {
          title = "The Ultimate Ecosystem";
          desc = "A perfectly balanced arrangement for your general needs.";
          suggestedProducts = products.slice(0, 2);
        }

        // Apply budget filter simulation
        const filtered = [];
        let curSum = 0;
        for (let p of suggestedProducts) {
          if (curSum + p.price <= finalBudget) {
            filtered.push(p);
            curSum += p.price;
          }
        }
        if (filtered.length === 0 && suggestedProducts.length > 0) {
            filtered.push(suggestedProducts[0]); // fallback if budget is too low
        }

        setBundle({ title, desc, items: filtered });
        setLoading(false);
      }, 1500);
      return;
    }

    // Call Real Gemini API
    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        const systemPrompt = `You are the Intent-Based Bundler for NexTech AI.
        User Goal: "${goal}"
        Budget limit: ₹${finalBudget}
        Available Products Array: ${JSON.stringify(products.map(p => ({id: p.id, name: p.name, category: p.category, price: p.price} )))}.
        Task: Suggest exactly 2 or 3 product IDs from the list that form the best bundle to achieve this goal, and make sure the sum of their prices is less than or equal to the budget limit (if reasonable, otherwise get as close as possible).
        Return ONLY a JSON object exactly like this:
        {"title": "Creative string for bundle name", "desc": "Short explanation", "itemIds": ["id1", "id2"]}
        Nothing else.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
        });
        
        const text = response.text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
        const data = JSON.parse(text);
        
        const suggestedProducts = data.itemIds.map(id => products.find(p => p.id === id)).filter(Boolean);
        
        setBundle({ title: data.title, desc: data.desc, items: suggestedProducts });
        setLoading(false);
    } catch (e) {
        console.error(e);
        setLoading(false);
        setBundle({
            title: "Simulated Bundle",
            desc: "Failed to reach AI. Here is a generic bundle.",
            items: products.slice(0, 2)
        });
    }
  };

  const handleChipClick = (preset) => {
    setGoal(preset);
  };

  const bundleTotal = bundle ? bundle.items.reduce((sum, item) => sum + item.price, 0) : 0;

  return (
    <div style={{ marginTop: '2rem' }}>
      
      {/* Webcam Overlay */}
      {showWebcam && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', background: 'var(--color-bg-primary)', padding: '1rem', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <video 
               ref={videoRef} 
               autoPlay 
               playsInline 
               style={{ width: '100%', maxWidth: '600px', borderRadius: 'var(--radius-md)' }}
            />
            <button type="button" onClick={stopCamera} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '0.4rem', border: 'none', cursor: 'pointer' }}>
              <X size={20} color="#fff" />
            </button>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
               <button type="button" onClick={captureCamera} style={{ background: 'var(--color-accent-sunrise)', color: '#000', padding: '0.75rem 2.5rem', borderRadius: 'var(--radius-2xl)', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
                  📸 Capture Picture
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Needs Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['Gaming Setup', 'Study Setup', 'YouTube Setup'].map((need) => (
          <button 
            key={need} 
            onClick={() => handleChipClick(need)}
            style={{ 
              padding: '0.4rem 1rem', 
              borderRadius: 'var(--radius-full)', 
              background: goal === need ? 'var(--color-accent-forest)' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '0.9rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            {need}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: '#fff', padding: '0.5rem', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-md)', alignItems: 'center' }}>
          
          {media && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.05)', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
               <ImageIcon size={16} color="var(--color-text-secondary)" />
               <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.name}</span>
               <button type="button" onClick={() => setMedia(null)} style={{ background: 'transparent', padding: '0.1rem', cursor: 'pointer' }}>
                 <X size={14} color="#ef4444" />
               </button>
             </div>
          )}

          <input 
            type="text" 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={media ? "Add context to your image..." : "What do you want to achieve?"}
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.5rem 1rem', outline: 'none', fontSize: '1.1rem', color: '#000' }}
          />

          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleMediaUpload} accept="image/*,.pdf" />
          
          <button type="button" onClick={startCamera} style={{ background: 'transparent', color: 'var(--color-text-secondary)', padding: '0.5rem', cursor: 'pointer' }}>
             <Camera size={20} />
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'transparent', color: 'var(--color-text-secondary)', padding: '0.5rem', cursor: 'pointer' }}>
             <Upload size={20} />
          </button>
          
          {recognition && (
             <button 
                type="button" 
                onClick={toggleListen}
                style={{ 
                  background: isListening ? '#f43f5e' : 'transparent', 
                  color: isListening ? '#fff' : 'var(--color-text-secondary)',
                  padding: '0.5rem',
                  borderRadius: '50%'
                }}
             >
               {isListening ? <Mic size={20} /> : <MicOff size={20} />}
             </button>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
           <input 
             type="number" 
             value={budget}
             onChange={(e) => setBudget(e.target.value)}
             placeholder="Max Budget (₹)"
             style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-2xl)', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
           />
           <button type="submit" disabled={loading} style={{ background: 'var(--color-accent-sunrise)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: 'var(--radius-2xl)', padding: '0.75rem 1.5rem', fontWeight: 'bold' }}>
             {loading ? <Loader size={20} className="spinner" /> : <Search size={20} />}
             Find My Bundle
           </button>
        </div>
      </form>

      {bundle && (
        <div className="dark-glass" style={{ marginTop: '2rem', padding: '2rem', borderRadius: 'var(--radius-xl)', color: '#fff', textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.5rem', color: 'var(--color-accent-sunrise)' }}>{bundle.title}</h3>
          <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', opacity: 0.9 }}>{bundle.desc}</p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {bundle.items.map((item) => (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', flex: '1 1 200px' }}>
                <p style={{ fontWeight: 'bold' }}>{item.name}</p>
                <p style={{ color: 'var(--color-accent-sunrise)' }}>₹{item.price.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Bundle Total: ₹{bundleTotal.toLocaleString('en-IN')}</p>
            <button 
              onClick={() => {
                bundle.items.forEach(addToCart);
                alert("Bundle added to cart!");
              }}
              style={{ background: '#fff', color: 'var(--color-text-primary)' }}
            >
              Add Bundle to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalBundler;
