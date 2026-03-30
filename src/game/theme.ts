import type { Piece } from './types.js';

/** HSL → #rrggbb (h 0–360, s/l 0–100) */
export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = l - c / 2;
  let rp = 0,
    gp = 0,
    bp = 0;
  if (hh < 1) {
    rp = c;
    gp = x;
  } else if (hh < 2) {
    rp = x;
    gp = c;
  } else if (hh < 3) {
    gp = c;
    bp = x;
  } else if (hh < 4) {
    gp = x;
    bp = c;
  } else if (hh < 5) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  const r = Math.round(255 * (rp + m));
  const g = Math.round(255 * (gp + m));
  const b = Math.round(255 * (bp + m));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
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
 * Paleta única por nível e por partida (runSeed).
 * Cores das peças derivam do mesmo matiz base do tabuleiro para harmonia visual.
 */
export function getLevelPalette(level: number, runSeed: number): LevelPalette {
  const mix = (runSeed ^ Math.imul(level, 0x9e3779b9) ^ Math.imul(level + 1, 0x517cc1b7)) >>> 0;
  const rng = seededRandom(mix);

  const hueBase = rng() * 360;
  const satBoard = 16 + rng() * 18;
  const lightBoard = 8 + rng() * 7;
  const boardBg = hslToHex(hueBase, satBoard, lightBoard);

  const borderHue = (hueBase + 28 + rng() * 48) % 360;
  const boardBorder = hslToHex(borderHue, 22 + rng() * 22, 18 + rng() * 14);

  const cellHue = (hueBase + 160 + rng() * 40) % 360;
  const cellEmpty = hslToHex(cellHue, 28 + rng() * 25, 4 + rng() * 6);

  const n = 7;
  const pieceColors: string[] = [];
  const hueSpread = 22;
  for (let i = 0; i < n; i++) {
    const h = (hueBase + (i - (n - 1) / 2) * hueSpread + rng() * 10) % 360;
    const s = 54 + rng() * 16;
    const l = 50 + rng() * 12;
    pieceColors.push(hslToHex(h, s, l));
  }

  const bombHue = (hueBase + 165 + rng() * 25) % 360;
  const bombColor = hslToHex(bombHue, 70 + rng() * 18, 56 + rng() * 8);

  const clearRowHue = (hueBase + 42 + rng() * 18) % 360;
  const clearRowColor = hslToHex(clearRowHue, 66 + rng() * 14, 58 + rng() * 8);
  const clearColHue = (hueBase + 210 + rng() * 22) % 360;
  const clearColColor = hslToHex(clearColHue, 66 + rng() * 14, 58 + rng() * 8);

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
  const idx = Math.floor(rng() * palette.pieceColors.length);
  p.col = palette.pieceColors[idx]!;
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
