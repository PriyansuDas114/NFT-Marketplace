import { useState, useEffect } from 'react';
import NFTCanvas from './NFTCanvas';
import './RotatingNFTGallery.css';

const COLORS = [
  '#f97316','#8b5cf6','#22c55e','#eab308',
  '#ef4444','#06b6d4','#ec4899','#14b8a6',
];

const VISIBLE = 3; // cards visible at once

const RotatingNFTGallery = () => {
  const [current, setCurrent] = useState(0);

  // Auto-rotate
  useEffect(() => {
    const id = setInterval(() => {
      setCurrent(prev => (prev + 1) % (COLORS.length - VISIBLE + 1));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const maxIndex = COLORS.length - VISIBLE;

  return (
    <div className="rotating-gallery">
      <div
        className="rotating-gallery__track"
        style={{ transform: `translateX(calc(-${current} * 216px))` }}
      >
        {COLORS.map((color, idx) => (
          <div key={color} className="rotating-gallery__card">
            <NFTCanvas color={color} seed={idx * 7} />
            <div className="rotating-gallery__card-label">
              NFT #{1000 + idx * 137}
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="rotating-gallery__controls">
        {Array.from({ length: maxIndex + 1 }).map((_, i) => (
          <button
            key={i}
            className={`rotating-gallery__dot${i === current ? ' active' : ''}`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default RotatingNFTGallery;
