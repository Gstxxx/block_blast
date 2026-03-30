/** Cell offset [column, row] within piece bounding box */
export type CellOffset = [number, number];

export interface Piece {
  c: CellOffset[];
  col: string;
  sz: number;
  bomb?: boolean;
  /** Limpa a linha inteira ao colocar (horizontal). */
  clearRow?: boolean;
  /** Limpa a coluna inteira ao colocar (vertical). */
  clearCol?: boolean;
}

export type BoardCell = string | null;
export type Board = BoardCell[][];

export interface DraggingState {
  fromHold: boolean;
  idx: number;
  piece: Piece;
  /** clientX/Y do dedo menos o centro do slot/hold no down — normaliza onde cada um segura a peça */
  grabDx: number;
  grabDy: number;
}

export interface GhostSpec {
  cells: [number, number][];
  valid: boolean;
}

export type GridToast =
  | { id: string; kind: 'line'; main: string; sub?: string }
  | { id: string; kind: 'combo'; combo: number };

export interface UndoSnapshot {
  board: Board;
  score: number;
  pieces: (Piece | null)[];
  holdPiece: Piece | null;
  combo: number;
  comboNoClearStreak: number;
  tl: number;
  lv: number;
  ll: number;
}

export interface GameState {
  board: Board;
  score: number;
  best: number;
  pieces: (Piece | null)[];
  nextQueue: Piece[];
  combo: number;
  holdPiece: Piece | null;
  comboNoClearStreak: number;
  totalLines: number;
  bestCombo: number;
  totalPlaced: number;
  level: number;
  levelLines: number;
  /** Seed aleatório por partida — define a paleta base do tabuleiro e das peças. */
  themeSeed: number;
  undoStack: UndoSnapshot[];
  leaderboard: number[];
  dragging: DraggingState | null;
  snapR: number | null;
  snapC: number | null;
  lastDragPoint: { x: number; y: number } | null;
  floatX: number;
  floatY: number;
  gameOver: boolean;
  gridToasts: GridToast[];
  bouncing: Record<string, boolean>;
}

export interface LayoutMetrics {
  cellPx: number;
  padPx: number;
  gapPx: number;
  CELL: number;
}

export interface ParticleLoopAPI {
  spawnParticles(layout: LayoutMetrics, cells: [number, number][]): void;
}
