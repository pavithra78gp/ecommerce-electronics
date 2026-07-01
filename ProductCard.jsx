import React, { useState, useEffect } from 'react';

/**
 * NexTechLogo - Renders the NexTech AI brand logo from the uploaded PNG.
 * Uses canvas to remove white background for perfect transparency on any background.
 *
 * Props:
 *   size   - 'sm' | 'md' | 'lg' | 'xl' | 'hero' (controls overall scale)
 *   noText - if true, renders the icon-only version (cart + brain symbol)
 */

// Cache the processed images so we don't re-process on every render
const processedCache = {};

const NexTechLogo = ({ size = 'md', noText = false }) => {
  const [processedSrc, setProcessedSrc] = useState(null);
  const [error, setError] = useState(false);

  const cacheKey = `${size}-${noText}`;

  // Dimensions for each size variant
  const dims = {
    sm:   { w: noText ? 42  : 160, h: noText ? 42  : 48  },
    md:   { w: noText ? 80  : 260, h: noText ? 80  : 78  },
    lg:   { w: noText ? 140 : 400, h: noText ? 140 : 120 },
    xl:   { w: noText ? 200 : 500, h: noText ? 200 : 150 },
    hero: { w: 280, h: 280 },  // Special large hero size
  };
  const { w, h } = dims[size] || dims.md;

  useEffect(() => {
    // Return cached version if available
    if (processedCache[cacheKey]) {
      setProcessedSrc(processedCache[cacheKey]);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const id = ctx.getImageData(0, 0, c.width, c.height);
        const d = id.data;

        // Pass 1: remove white & near-white background
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          // Pure white → transparent
          if (r > 240 && g > 240 && b > 240) {
            d[i + 3] = 0;
          }
          // Near-white → fade out
          else if (r > 215 && g > 215 && b > 215) {
            const avg = (r + g + b) / 3;
            d[i + 3] = Math.round(Math.max(0, (240 - avg) * (255 / 25)));
          }
          // Light grey border artifacts → soften
          else if (r > 190 && g > 190 && b > 190) {
            const avg = (r + g + b) / 3;
            d[i + 3] = Math.round(Math.min(255, Math.max(80, (215 - avg) * 10)));
          }
        }
        ctx.putImageData(id, 0, 0);

        let result;
        if (noText || size === 'hero') {
          // Crop to just the cart+brain icon (left portion)
          // The logo image: icon is approximately left 30%, vertically centered
          const iconW = Math.round(c.width * 0.30);
          const iconH = c.height;
          // Find the actual bounding box of non-transparent pixels in the left portion
          const cropC = document.createElement('canvas');
          cropC.width = iconW;
          cropC.height = iconH;
          const cropCtx = cropC.getContext('2d');
          cropCtx.drawImage(c, 0, 0, iconW, iconH, 0, 0, iconW, iconH);

          // Trim transparent rows/cols for tight crop
          const cid = cropCtx.getImageData(0, 0, iconW, iconH);
          const cd = cid.data;
          let minX = iconW, maxX = 0, minY = iconH, maxY = 0;
          for (let y = 0; y < iconH; y++) {
            for (let x = 0; x < iconW; x++) {
              const idx = (y * iconW + x) * 4;
              if (cd[idx + 3] > 20) { // non-transparent
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          // Add small padding
          const pad = 8;
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(iconW - 1, maxX + pad);
          maxY = Math.min(iconH - 1, maxY + pad);

          const fw = maxX - minX + 1;
          const fh = maxY - minY + 1;
          const finalC = document.createElement('canvas');
          finalC.width = fw;
          finalC.height = fh;
          const fCtx = finalC.getContext('2d');
          fCtx.drawImage(cropC, minX, minY, fw, fh, 0, 0, fw, fh);
          result = finalC.toDataURL('image/png');
        } else {
          // Full logo with text — trim whitespace
          const fullId = ctx.getImageData(0, 0, c.width, c.height);
          const fd = fullId.data;
          let minX = c.width, maxX = 0, minY = c.height, maxY = 0;
          for (let y = 0; y < c.height; y++) {
            for (let x = 0; x < c.width; x++) {
              const idx = (y * c.width + x) * 4;
              if (fd[idx + 3] > 20) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          const pad = 4;
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(c.width - 1, maxX + pad);
          maxY = Math.min(c.height - 1, maxY + pad);

          const fw = maxX - minX + 1;
          const fh = maxY - minY + 1;
          const finalC = document.createElement('canvas');
          finalC.width = fw;
          finalC.height = fh;
          const fCtx = finalC.getContext('2d');
          fCtx.drawImage(c, minX, minY, fw, fh, 0, 0, fw, fh);
          result = finalC.toDataURL('image/png');
        }

        processedCache[cacheKey] = result;
        setProcessedSrc(result);
      } catch (e) {
        console.warn('Logo processing failed:', e);
        setError(true);
      }
    };
    img.onerror = () => setError(true);
    img.src = '/nextech-logo.png';
  }, [cacheKey, noText, size]);

  // Fallback: gradient text logo
  if (error) {
    const fs = { sm: '1rem', md: '1.4rem', lg: '2rem', xl: '2.5rem', hero: '3rem' };
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        width: w, height: h, justifyContent: noText ? 'center' : 'flex-start',
      }}>
        {noText || size === 'hero' ? (
          <span style={{ fontSize: fs[size] || '2rem' }}>🛒</span>
        ) : (
          <span style={{
            fontFamily: "'Segoe UI','Inter',sans-serif", fontWeight: 800,
            fontSize: fs[size] || '1.4rem',
            background: 'linear-gradient(135deg, #1565C0, #7C3AED, #F97316, #E63946)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>NexTech AI</span>
        )}
      </div>
    );
  }

  // Loading spinner while canvas processes
  if (!processedSrc) {
    return (
      <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: '2px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed',
          animation: 'ntLogoSpin 0.6s linear infinite',
        }} />
        <style>{`@keyframes ntLogoSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      width: w, height: h,
      display: 'flex', alignItems: 'center',
      justifyContent: noText || size === 'hero' ? 'center' : 'flex-start',
      overflow: 'hidden',
    }}>
      <img
        src={processedSrc}
        alt="NexTech AI"
        style={{
          maxWidth: '100%', maxHeight: '100%',
          objectFit: 'contain',
          objectPosition: noText || size === 'hero' ? 'center' : 'left center',
          // Slight sharpening for crisp look
          imageRendering: 'auto',
        }}
      />
    </div>
  );
};

export default NexTechLogo;
