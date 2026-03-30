import { COLS, ROWS } from './constants.js';
import type { Board, BoardCell, GhostSpec, Piece } from './types.js';

export function getPieceBox(p: Piece) {
  return {
    maxC: Math.max(...p.c.map(([x]) => x)),
    maxR: Math.max(...p.c.map(([, y]) => y)),
  };
}

export function initBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, (): BoardCell => null)
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((r) => [...r]);
}

export function clonePieces(pieces: (Piece | null)[]): (Piece | null)[] {
  return pieces.map((p) => (p ? JSON.parse(JSON.stringify(p)) as Piece : null));
}

export function canPlace(board: Board, p: Piece, r: number, c: number): boolean {
  return p.c.every(([dc, dr]) => {
    const br = r + dr;
    const bc = c + dc;
    return br >= 0 && br < ROWS && bc >= 0 && bc < COLS && !board[br][bc];
  });
}

export function placementValid(board: Board, p: Piece | null, r: number, c: number): boolean {
  if (!p) return false;
  if (p.bomb || p.clearRow || p.clearCol) return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  return canPlace(board, p, r, c);
}

/** Alinha o centro das células preenchidas ao centro da caixa da miniatura (translate -50%), reduzindo desvio do ghost. */
export function getDragFloatCentroidOffsetPx(
  p: Piece,
  cellPx: number,
  gapPx: number
): { dx: number; dy: number } {
  if (p.bomb || p.clearRow || p.clearCol) return { dx: 0, dy: 0 };
  const { maxC, maxR } = getPieceBox(p);
  if (p.c.length === 0) return { dx: 0, dy: 0 };
  let sumC = 0;
  let sumR = 0;
  for (const [cc, rr] of p.c) {
    sumC += cc;
    sumR += rr;
  }
  const n = p.c.length;
  const stride = cellPx + gapPx;
  return {
    dx: (sumC / n - maxC / 2) * stride,
    dy: (sumR / n - maxR / 2) * stride,
  };
}

/** Largura/altura do PieceMini em boardMode (grade inclui células vazias do bbox). */
export function getPieceMiniBboxSizePx(p: Piece, cellPx: number, gapPx: number) {
  const { maxC, maxR } = getPieceBox(p);
  return {
    w: (maxC + 1) * cellPx + maxC * gapPx,
    h: (maxR + 1) * cellPx + maxR * gapPx,
  };
}

/**
 * Ponto em coords de tela que corresponde ao canto superior esquerdo da célula (0,0) da miniatura
 * (mesmo referencial do anchor (r,c) no tabuleiro). Usar no snap/ghost em vez do dedo bruto —
 * senão o floor segue o centro da peça e o ghost fica ~1 célula deslocado na horizontal.
 */
export function getPlacementAnchorSnapPoint(
  place: { x: number; y: number },
  p: Piece,
  cellPx: number,
  gapPx: number
): { x: number; y: number } {
  const { dx, dy } = getDragFloatCentroidOffsetPx(p, cellPx, gapPx);
  const { w, h } = getPieceMiniBboxSizePx(p, cellPx, gapPx);
  return {
    x: place.x - dx - w / 2,
    y: place.y - dy - h / 2,
  };
}

export function getGhostSpec(board: Board, p: Piece | null, r: number, c: number): GhostSpec {
  if (!p) return { cells: [], valid: true };
  if (p.clearRow) {
    const cells: [number, number][] = Array.from({ length: COLS }, (_, i) => [r, i] as [number, number]);
    return { cells, valid: placementValid(board, p, r, c) };
  }
  if (p.clearCol) {
    const cells: [number, number][] = Array.from({ length: ROWS }, (_, i) => [i, c] as [number, number]);
    return { cells, valid: placementValid(board, p, r, c) };
  }
  const cells = p.c.map(([dc, dr]) => [r + dr, c + dc] as [number, number]);
  return { cells, valid: placementValid(board, p, r, c) };
}

/** Linhas e colunas que ficariam completas após a jogada (mesma lógica que clearLines no hook). */
export interface LineClearPreview {
  rows: number[];
  cols: number[];
}

export function predictLineClearAfterPlacement(
  board: Board,
  p: Piece,
  r: number,
  c: number
): LineClearPreview | null {
  if (!placementValid(board, p, r, c)) return null;
  const b = cloneBoard(board);
  if (p.bomb) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const br = r + dr;
        const bc = c + dc;
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) b[br]![bc] = null;
      }
    }
  } else if (p.clearRow) {
    for (let bc = 0; bc < COLS; bc++) b[r]![bc] = null;
  } else if (p.clearCol) {
    for (let br = 0; br < ROWS; br++) b[br]![c] = null;
  } else {
    p.c.forEach(([dc, dr]) => {
      b[r + dr]![c + dc] = p.col;
    });
  }
  const rows: number[] = [];
  for (let rr = 0; rr < ROWS; rr++) {
    if (b[rr]!.every((cell) => cell !== null)) rows.push(rr);
  }
  const cols: number[] = [];
  for (let cc = 0; cc < COLS; cc++) {
    if (b.every((row) => row[cc] !== null)) cols.push(cc);
  }
  return { rows, cols };
}
