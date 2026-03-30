import type { CSSProperties } from 'react';

const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

function assetUrl(rel: string): string {
  return `${base}${rel.replace(/^\//, '')}`;
}

/** Único ficheiro de peça: coloca em `public/piece-square.png` (ex.: o glossy cinza Kenney). */
export const PIECE_SQUARE_URL = assetUrl('piece-square.png');

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

/**
 * Uma textura + cor da paleta (gradiente semitransparente em multiply sobre o cinza glossy).
 */
export function pieceCellStyle(hex: string): CSSProperties {
  const safe = typeof hex === 'string' && /^#?[0-9a-f]{6}$/i.test(hex.trim()) ? hex.trim() : '#888888';
  const h = safe.startsWith('#') ? safe : `#${safe}`;
  const overlay = hexToRgba(h, 0.74);
  return {
    backgroundImage: `linear-gradient(${overlay}, ${overlay}), url(${PIECE_SQUARE_URL})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundBlendMode: 'multiply',
    backgroundColor: 'transparent',
  };
}
