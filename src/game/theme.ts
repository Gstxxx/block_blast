import { COOLORS_PRESETS } from './coolorsPalettes.js';
import type { Piece } from './types.js';

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 24, g: 24, b: 40 };
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [c(r), c(g), c(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function luminance(rgb: { r: number; g: number; b: number }): number {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

function avgRgb(colors: readonly string[]): { r: number; g: number; b: number } {
  let r = 0,
    g = 0,
    b = 0;
  for (const c of colors) {
    const rgb = hexToRgb(c);
    r += rgb.r;
    g += rgb.g;
    b += rgb.b;
  }
  const n = Math.max(1, colors.length);
  return { r: r / n, g: g / n, b: b / n };
}

function boardSurfaceFromPalette(colors: readonly string[]): { boardBg: string; boardBorder: string; cellEmpty: string } {
  const avg = avgRgb(colors);
  const boardBg = rgbToHex(avg.r * 0.14, avg.g * 0.14, avg.b * 0.14);
  const boardBorder = rgbToHex(avg.r * 0.32 + 8, avg.g * 0.32 + 8, avg.b * 0.32 + 12);
  let darkest = colors[0]!;
  let minL = Infinity;
  for (const c of colors) {
    const rgb = hexToRgb(c);
    const L = luminance(rgb);
    if (L < minL) {
      minL = L;
      darkest = c;
    }
  }
  const d = hexToRgb(darkest);
  const cellEmpty = rgbToHex(d.r * 0.22, d.g * 0.22, d.b * 0.22);
  return { boardBg, boardBorder, cellEmpty };
}

function shuffleCopy<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

export interface BoardThemeVars {
  cellEmpty: string;
  boardBg: string;
  boardBorder: string;
}

/** Paleta completa: tabuleiro + cores harmonizadas para peças + bomba. */
export interface LevelPalette extends BoardThemeVars {
  pieceColors: string[];
  bombColor: string;
  clearRowColor: string;
  clearColColor: string;
}

/** Identidade da forma (ignora cor). */
export function pieceShapeKey(p: Pick<Piece, 'c' | 'bomb' | 'clearRow' | 'clearCol'>): string {
  if (p.bomb) return '__bomb__';
  if (p.clearRow) return '__clearRow__';
  if (p.clearCol) return '__clearCol__';
  return JSON.stringify(p.c);
}

/**
 * Paleta por nível/partida: sorteia um conjunto estilo Coolors trending e deriva tabuleiro + peças.
 * @see https://coolors.co/palettes/trending
 */
export function getLevelPalette(level: number, runSeed: number): LevelPalette {
  const mix = (runSeed ^ Math.imul(level, 0x9e3779b9) ^ Math.imul(level + 1, 0x517cc1b7)) >>> 0;
  const rng = seededRandom(mix);
  // XOR pode ser negativo em JS; % com índice negativo quebra o array. Forçar uint32 antes do módulo.
  const paletteIndex = ((mix ^ (runSeed >>> 0)) >>> 0) % COOLORS_PRESETS.length;
  const preset = COOLORS_PRESETS[paletteIndex]!;
  const { boardBg, boardBorder, cellEmpty } = boardSurfaceFromPalette(preset);

  const order = shuffleCopy(preset, rng);
  const pieceColors: string[] = [];
  for (let i = 0; i < 7; i++) pieceColors.push(order[i % order.length]!);

  const bombColor = order[Math.floor(rng() * order.length)]!;
  let clearRowColor = order[Math.floor(rng() * order.length)]!;
  let clearColColor = order[Math.floor(rng() * order.length)]!;
  let guard = 0;
  while (clearRowColor === clearColColor && guard++ < 12) {
    clearColColor = order[Math.floor(rng() * order.length)]!;
  }

  return { cellEmpty, boardBg, boardBorder, pieceColors, bombColor, clearRowColor, clearColColor };
}

export function colorizePiece(p: Piece, palette: LevelPalette, rng: () => number): Piece {
  if (p.bomb) {
    p.col = palette.bombColor;
    return p;
  }
  if (p.clearRow) {
    p.col = palette.clearRowColor;
    return p;
  }
  if (p.clearCol) {
    p.col = palette.clearColColor;
    return p;
  }
  const n = palette.pieceColors.length;
  if (n === 0) {
    p.col = '#e94560';
    return p;
  }
  const idx = Math.floor(rng() * n);
  p.col = palette.pieceColors[idx] ?? '#e94560';
  return p;
}

export function applyLevelPaletteToDom(
  gwEl: HTMLElement | null,
  boardEl: HTMLElement | null,
  palette: LevelPalette
): void {
  if (!gwEl || !boardEl) return;
  gwEl.style.setProperty('--cell-empty', palette.cellEmpty);
  boardEl.style.setProperty('--board-bg', palette.boardBg);
  boardEl.style.setProperty('--board-border', palette.boardBorder);
}
