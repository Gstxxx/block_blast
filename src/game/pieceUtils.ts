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
