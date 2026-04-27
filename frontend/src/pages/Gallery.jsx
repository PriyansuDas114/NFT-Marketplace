import { useState, useCallback } from 'react';
import NFTCanvas from '../components/NFTCanvas';
import './Gallery.css';

const PALETTE = [
  '#f97316','#8b5cf6','#22c55e','#eab308','#ef4444',
  '#06b6d4','#ec4899','#14b8a6','#f59e0b','#a855f7',
];

const NAMES = [
  'Ember Wave','Violet Drift','Forest Spirit','Gold Rush','Crimson Pulse',
  'Cyan Storm','Neon Bloom','Teal Echo','Amber Rise','Lilac Dream',
];

const Gallery = () => {
  const [activeColor, setActiveColor] = useState(null);
  const [seed, setSeed] = useState(0);

  const visibleColors = activeColor
    ? PALETTE.filter(c => c === activeColor)
    : PALETTE;

  const handleRegen = useCallback(() => {
    setSeed(s => s + 1);
  }, []);

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <h1>Visual Gallery</h1>
        <p>Generative on-canvas NFT art — each piece is algorithmically unique</p>
      </div>

      {/* Controls */}
      <div className="gallery-controls">
        <span className="label">Filter by color</span>
        <div className="color-swatch-bar">
          {PALETTE.map(color => (
            <button
              key={color}
              className={`color-swatch${activeColor === color ? ' active' : ''}`}
              style={{ background: color }}
              title={color}
              onClick={() => setActiveColor(prev => prev === color ? null : color)}
            />
          ))}
        </div>
        <button className="btn btn-ghost btn-sm gallery-regen-btn" onClick={handleRegen}>
          ↻ Regenerate
        </button>
        {activeColor && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setActiveColor(null)}
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="gallery-grid">
        {PALETTE.map((color, idx) => {
          if (activeColor && color !== activeColor) return null;
          return (
            <div
              key={`${color}-${seed}`}
              className="gallery-item"
              style={{ animationDelay: `${(idx % 4) * 0.06}s` }}
            >
              <div className="gallery-canvas-wrap">
                <NFTCanvas color={color} seed={seed + idx} />
              </div>
              <div className="gallery-item__footer">
                <span className="gallery-item__name">{NAMES[idx]}</span>
                <span className="gallery-item__tag">#{(1000 + idx * 137 + seed * 13) % 9999}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Gallery;
