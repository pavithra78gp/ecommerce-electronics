:root[data-theme='dark'] {
  --color-bg-primary: #0F172A;
  --color-bg-secondary: #1E293B;
  --color-accent-sunrise: #C084FC;
  --color-accent-forest: #7C3AED;
  --color-accent-moss: #3B82F6;
  --color-text-primary: #F8FAFC;
  --color-text-secondary: #94A3B8;
  --color-border: rgba(255, 255, 255, 0.1);
  --glass-bg: rgba(15, 23, 42, 0.6);
  --shadow-color: rgba(0, 0, 0, 0.5);
}

:root[data-theme='light'] {
  --color-bg-primary: #F8FAFC;
  --color-bg-secondary: #FFFFFF;
  --color-accent-sunrise: #A855F7;
  --color-accent-forest: #6D28D9;
  --color-accent-moss: #2563EB;
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-border: rgba(0, 0, 0, 0.1);
  --glass-bg: rgba(255, 255, 255, 0.8);
  --shadow-color: rgba(0, 0, 0, 0.05);
}

:root {
  --shadow-sm: 0 1px 2px 0 var(--shadow-color);
  --shadow-md: 0 4px 6px -1px var(--shadow-color), 0 2px 4px -1px rgba(0,0,0,0.02);
  --shadow-lg: 0 10px 25px -5px var(--shadow-color), 0 8px 10px -6px rgba(0,0,0,0.02);
  
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;

  font-family: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 0.4s ease, color 0.4s ease;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  display: flex;
  min-height: 100vh;
  min-width: 100vw;
  flex-direction: column;
}

/* Glassmorphism Classes replacing previous static ones */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  transition: background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
}

.dark-glass {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  transition: background-color 0.4s ease, border-color 0.4s ease;
}

/* Global Elements */
a {
  font-weight: 500;
  color: var(--color-text-primary);
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: var(--color-accent-forest);
}

button {
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: var(--color-accent-forest);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover {
  background-color: var(--color-accent-sunrise);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.gradient-text {
  background: linear-gradient(90deg, var(--color-accent-forest) 0%, var(--color-accent-sunrise) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
}

/* Product Card Hover Enhancements */
.product-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.product-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px -10px var(--color-border);
  border-color: var(--color-accent-sunrise);
}

/* Low Stock Pulse Animation */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.05); }
}

/* Spin Animation for Refresh */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}



/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

::-webkit-scrollbar-thumb {
  background: rgba(124, 58, 237, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(124, 58, 237, 0.5);
}
