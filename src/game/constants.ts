import type { Piece } from "./types.js";

export const ROWS = 8;
export const COLS = 8;
export const PLACEMENT_OFFSET_Y = 50;

export const SHAPES: Piece[] = [
  {
    c: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    col: "#e94560",
    sz: 1,
  },
  {
    c: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    col: "#e94560",
    sz: 1,
  },
  {
    c: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
    col: "#0f9b8e",
    sz: 2,
  },
  {
    c: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    col: "#0f9b8e",
    sz: 2,
  },
  {
    c: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    col: "#f5a623",
    sz: 1,
  },
  {
    c: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
    col: "#9b59b6",
    sz: 1,
  },
  {
    c: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    col: "#3498db",
    sz: 1,
  },
  {
    c: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    col: "#2ecc71",
    sz: 1,
  },
  {
    c: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    col: "#1abc9c",
    sz: 0,
  },
  {
    c: [
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    col: "#e74c3c",
    sz: 0,
  },
  {
    c: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    col: "#f39c12",
    sz: 0,
  },
  { c: [[0, 0]], col: "#fbbf24", sz: 0 },
  {
    c: [
      [0, 0],
      [1, 0],
    ],
    col: "#e94560",
    sz: 0,
  },
  {
    c: [
      [0, 0],
      [0, 1],
    ],
    col: "#3498db",
    sz: 0,
  },
  {
    c: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ],
    col: "#9b59b6",
    sz: 1,
  },
  {
    c: [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    col: "#e67e22",
    sz: 1,
  },
  {
    c: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
    col: "#16a085",
    sz: 1,
  },
  {
    c: [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
    col: "#8e44ad",
    sz: 1,
  },
  {
    c: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    col: "#f5a623",
    sz: 3,
  },
  {
    c: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
    col: "#e94560",
    sz: 2,
  },
];

export const BOMB: Piece = { c: [[0, 0]], col: "#ff6b35", bomb: true, sz: 0 };

/** Limpa uma linha inteira (eixo horizontal do tabuleiro). */
export const CLEAR_ROW: Piece = {
  c: [[0, 0]],
  col: "#38bdf8",
  sz: 0,
  clearRow: true,
};

/** Limpa uma coluna inteira (eixo vertical do tabuleiro). */
export const CLEAR_COL: Piece = {
  c: [[0, 0]],
  col: "#a78bfa",
  sz: 0,
  clearCol: true,
};

/**
 * Multiplicador global aplicado a toda pontuação (peças, linhas, combos, especiais).
 * Ajuste apenas aqui; não há controlo na UI.
 */
export const SCORE_MULTIPLIER = 4;

export function scaleScore(raw: number): number {
  const v = raw * SCORE_MULTIPLIER;
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}
