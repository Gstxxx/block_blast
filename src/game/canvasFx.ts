import type { LayoutMetrics, ParticleLoopAPI } from './types.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  col: string;
}

/**
 * Particle + line-flash canvas (same behavior as original main.js).
 * Does not trigger React re-renders during animation frames.
 */
export function createParticleLoop(
  pcanvas: HTMLCanvasElement,
  pctx: CanvasRenderingContext2D
): ParticleLoopAPI {
  let particles: Particle[] = [];
  let animFrame: number | null = null;

  function animP() {
    pctx.clearRect(0, 0, pcanvas.width, pcanvas.height);
    particles = particles.filter((p) => p.life > 0.02);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.032;
      pctx.globalAlpha = Math.max(0, p.life);
      pctx.fillStyle = p.col;
      pctx.beginPath();
      pctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      pctx.fill();
    });
    pctx.globalAlpha = 1;
    if (particles.length) animFrame = requestAnimationFrame(animP);
    else {
      animFrame = null;
      pctx.clearRect(0, 0, pcanvas.width, pcanvas.height);
    }
  }

  function spawnParticles(layout: LayoutMetrics, cells: [number, number][]) {
    const cx = layout.cellPx / 2;
    const colors = ['#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#fb923c'];
    cells.forEach(([r, c]) => {
      const x = layout.padPx + c * layout.CELL + cx;
      const y = layout.padPx + r * layout.CELL + cx;
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1.5 + Math.random() * 3;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
          col: colors[Math.floor(Math.random() * 5)]!,
        });
      }
    });
    if (!animFrame) animFrame = requestAnimationFrame(animP);
  }

  return { spawnParticles };
}

export function flashLines(
  fcanvas: HTMLCanvasElement | null,
  fctx: CanvasRenderingContext2D | null,
  layout: LayoutMetrics,
  cells: [number, number][],
  onDone?: () => void
): void {
  if (!fcanvas || !fctx) {
    onDone?.();
    return;
  }
  const fc = fcanvas;
  const fcx = fctx;
  const rad = Math.max(3, layout.cellPx * 0.16);
  let alpha = 1;
  function frame() {
    fcx.clearRect(0, 0, fc.width, fc.height);
    fcx.globalAlpha = alpha * 0.85;
    cells.forEach(([r, c]) => {
      fcx.fillStyle = '#fff';
      fcx.beginPath();
      fcx.roundRect(
        layout.padPx + c * layout.CELL,
        layout.padPx + r * layout.CELL,
        layout.cellPx,
        layout.cellPx,
        rad
      );
      fcx.fill();
    });
    alpha -= 0.12;
    if (alpha > 0) requestAnimationFrame(frame);
    else {
      fcx.clearRect(0, 0, fc.width, fc.height);
      onDone?.();
    }
  }
  requestAnimationFrame(frame);
}
