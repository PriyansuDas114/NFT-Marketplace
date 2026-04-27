import { useRef, useEffect } from 'react';

/**
 * NFTCanvas — generative on-canvas art.
 * Renders a unique piece based on `color` + `seed`.
 */
const NFTCanvas = ({ color = '#f97316', seed = 0 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const SIZE = 480;
    canvas.width  = SIZE;
    canvas.height = SIZE;

    // Seeded pseudo-random
    const rng = (() => {
      let s = seed * 1000 + color.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
    })();

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    bg.addColorStop(0, '#0f0f14');
    bg.addColorStop(1, '#17171e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Parse hex to rgba helper
    const hexAlpha = (hex, a) => {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return `rgba(${r},${g},${b},${a})`;
    };

    const style = Math.floor(rng() * 4);

    if (style === 0) {
      // ── Concentric circles
      const cx = SIZE * (0.3 + rng() * 0.4);
      const cy = SIZE * (0.3 + rng() * 0.4);
      const rings = 10 + Math.floor(rng() * 8);
      for (let i = rings; i > 0; i--) {
        const r2 = (i / rings) * (SIZE * 0.46);
        ctx.beginPath();
        ctx.arc(cx, cy, r2, 0, Math.PI * 2);
        ctx.strokeStyle = hexAlpha(color, 0.08 + (i / rings) * 0.55);
        ctx.lineWidth = 2 + rng() * 3;
        ctx.stroke();
      }
      // Glow core
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE * 0.22);
      glow.addColorStop(0, hexAlpha(color, 0.35));
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, SIZE * 0.22, 0, Math.PI * 2);
      ctx.fill();

    } else if (style === 1) {
      // ── Flowing lines
      const lines = 18 + Math.floor(rng() * 10);
      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        ctx.moveTo(rng() * SIZE, rng() * SIZE);
        const cp1x = rng() * SIZE; const cp1y = rng() * SIZE;
        const cp2x = rng() * SIZE; const cp2y = rng() * SIZE;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, rng() * SIZE, rng() * SIZE);
        ctx.strokeStyle = hexAlpha(color, 0.12 + rng() * 0.4);
        ctx.lineWidth = 1 + rng() * 4;
        ctx.stroke();
      }
      // Bright node dots
      for (let i = 0; i < 6; i++) {
        const x = rng() * SIZE; const y = rng() * SIZE; const r = 4 + rng() * 10;
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
        g2.addColorStop(0, hexAlpha(color, 0.9));
        g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (style === 2) {
      // ── Grid of cells
      const cols = 5 + Math.floor(rng() * 4);
      const rows = 5 + Math.floor(rng() * 4);
      const cw = SIZE / cols; const ch = SIZE / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const alpha = rng() * 0.6;
          ctx.fillStyle = hexAlpha(color, alpha);
          ctx.fillRect(c * cw + 2, r * ch + 2, cw - 4, ch - 4);
        }
      }
      // Diagonal overlay
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(SIZE, SIZE);
      ctx.strokeStyle = hexAlpha(color, 0.25);
      ctx.lineWidth = 3;
      ctx.stroke();

    } else {
      // ── Polygon burst
      const cx2 = SIZE / 2; const cy2 = SIZE / 2;
      const layers = 5 + Math.floor(rng() * 4);
      for (let l = 0; l < layers; l++) {
        const sides = 3 + Math.floor(rng() * 5);
        const radius = SIZE * (0.1 + (l / layers) * 0.4);
        const rot = rng() * Math.PI * 2;
        ctx.beginPath();
        for (let v = 0; v <= sides; v++) {
          const angle = (v / sides) * Math.PI * 2 + rot;
          const x = cx2 + Math.cos(angle) * radius;
          const y = cy2 + Math.sin(angle) * radius;
          v === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = hexAlpha(color, 0.15 + (l / layers) * 0.5);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = hexAlpha(color, 0.03 + (l / layers) * 0.06);
        ctx.fill();
      }
    }

    // Noise vignette overlay
    const vignette = ctx.createRadialGradient(SIZE/2, SIZE/2, SIZE*0.28, SIZE/2, SIZE/2, SIZE*0.75);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, SIZE, SIZE);

  }, [color, seed]);

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />;
};

export default NFTCanvas;
