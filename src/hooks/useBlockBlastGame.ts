import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import {
  BOMB,
  CLEAR_COL,
  CLEAR_ROW,
  COLS,
  PLACEMENT_OFFSET_Y,
  ROWS,
  SHAPES,
  scaleScore,
} from '../game/constants.js';
import { sndCombo8bit, sndNewGame, sndOver, sndPlace, sndScore } from '../game/audio.js';
import {
  applyLevelPaletteToDom,
  colorizePiece,
  getLevelPalette,
  pieceShapeKey,
} from '../game/theme.js';
import { createParticleLoop, flashLines } from '../game/canvasFx.js';
import {
  canPlace,
  cloneBoard,
  clonePieces,
  getGhostSpec,
  initBoard,
  predictLineClearAfterPlacement,
} from '../game/pieceUtils.js';
import { readStoredBest, syncBestFromScore } from '../game/bestScore.js';
import type { GameState, GhostSpec, LayoutMetrics, ParticleLoopAPI, Piece } from '../game/types.js';
import type { LineClearPreview } from '../game/pieceUtils.js';

function rndShape(g: GameState): Piece {
  const pool = g.level >= 3 ? SHAPES : SHAPES.filter((s) => s.sz < 3);
  const palette = getLevelPalette(g.level, g.themeSeed);
  const u = Math.random();
  let raw: Piece;
  if (u < 0.05) {
    const pick = Math.floor(Math.random() * 3);
    raw =
      pick === 0
        ? (JSON.parse(JSON.stringify(BOMB)) as Piece)
        : pick === 1
          ? (JSON.parse(JSON.stringify(CLEAR_ROW)) as Piece)
          : (JSON.parse(JSON.stringify(CLEAR_COL)) as Piece);
  } else {
    raw = JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]!)) as Piece;
  }
  return colorizePiece(raw, palette, Math.random);
}

function fillQueue(g: GameState): void {
  while (g.nextQueue.length < 6) g.nextQueue.push(rndShape(g));
}

function popPieces(g: GameState): void {
  g.comboNoClearStreak = 0;
  fillQueue(g);
  let a = g.nextQueue.shift()!;
  let b = g.nextQueue.shift()!;
  let c = g.nextQueue.shift()!;
  let tries = 0;
  while (
    pieceShapeKey(a) === pieceShapeKey(b) &&
    pieceShapeKey(b) === pieceShapeKey(c) &&
    tries < 80
  ) {
    g.nextQueue.unshift(c);
    c = rndShape(g);
    tries++;
  }
  fillQueue(g);
  g.pieces = [a, b, c];
}

function createInitialGame(): GameState {
  const board = initBoard();
  const nextQueue: Piece[] = [];
  const g: GameState = {
    board,
    score: 0,
    best: readStoredBest(),
    pieces: [null, null, null],
    nextQueue,
    combo: 0,
    holdPiece: null,
    comboNoClearStreak: 0,
    totalLines: 0,
    bestCombo: 0,
    totalPlaced: 0,
    level: 1,
    levelLines: 0,
    themeSeed: (Math.random() * 0xffffffff) >>> 0,
    undoStack: [],
    leaderboard: [],
    dragging: null,
    snapR: null,
    snapC: null,
    lastDragPoint: null,
    floatX: 0,
    floatY: 0,
    gameOver: false,
    gridToasts: [],
    bouncing: {},
  };
  popPieces(g);
  return g;
}

function readCssCellSize(gw: HTMLElement): number {
  const v = getComputedStyle(gw).getPropertyValue('--cell-size').trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 32;
}

function getClientPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  if ('changedTouches' in e && e.changedTouches[0]) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  const m = e as MouseEvent;
  return { x: m.clientX, y: m.clientY };
}

export function useBlockBlastGame() {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const gameRef = useRef<GameState>(createInitialGame());
  const layoutRef = useRef<LayoutMetrics>({ cellPx: 32, padPx: 8, gapPx: 3, CELL: 35 });
  const particleApiRef = useRef<ParticleLoopAPI | null>(null);

  const gwRef = useRef<HTMLDivElement>(null);
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const holdSlotRef = useRef<HTMLDivElement>(null);
  const pcanvasRef = useRef<HTMLCanvasElement>(null);
  const fcanvasRef = useRef<HTMLCanvasElement>(null);

  const syncLayoutMetrics = useCallback(() => {
    const boardEl = boardRef.current;
    const gw = gwRef.current;
    if (!boardEl || !gw) return;
    const first = boardEl.querySelector('.cell[data-r="0"][data-c="0"]');
    const second = boardEl.querySelector('.cell[data-r="0"][data-c="1"]');
    const br = boardEl.getBoundingClientRect();
    if (first && second) {
      const fr = first.getBoundingClientRect();
      const sr = second.getBoundingClientRect();
      layoutRef.current = {
        cellPx: fr.width,
        padPx: fr.left - br.left,
        CELL: sr.left - fr.left,
        gapPx: sr.left - fr.left - fr.width,
      };
    } else {
      const cellPx = readCssCellSize(gw);
      layoutRef.current = { cellPx, padPx: 8, gapPx: 3, CELL: cellPx + 3 };
    }
  }, []);

  const applyResponsiveCellSize = useCallback(() => {
    const wrap = boardWrapRef.current;
    const gw = gwRef.current;
    if (!wrap || !gw) return;
    const pad = 8;
    const gap = 3;
    let w = wrap.clientWidth;
    if (w < 48) w = Math.max(document.documentElement.clientWidth - 24, 200);
    const cellW = Math.floor((w - 2 * pad - 7 * gap) / 8);
    let cell = cellW;
    const h = wrap.clientHeight;
    if (h > 64) {
      const cellH = Math.floor((h - 2 * pad - 7 * gap) / 8);
      cell = Math.min(cellW, cellH);
    }
    const cellClamped = Math.max(22, Math.min(40, cell));
    gw.style.setProperty('--cell-size', cellClamped + 'px');
  }, []);

  const resizeCanvases = useCallback(() => {
    const board = boardRef.current;
    const pcanvas = pcanvasRef.current;
    const fcanvas = fcanvasRef.current;
    if (!board || !pcanvas || !fcanvas) return;
    const w = Math.max(1, Math.round(board.offsetWidth));
    const h = Math.max(1, Math.round(board.offsetHeight));
    if (pcanvas.width !== w || pcanvas.height !== h) {
      pcanvas.width = w;
      pcanvas.height = h;
      fcanvas.width = w;
      fcanvas.height = h;
    }
  }, []);

  useLayoutEffect(() => {
    const pc = pcanvasRef.current;
    if (!pc) return;
    const pctx = pc.getContext('2d');
    if (!pctx) return;
    particleApiRef.current = createParticleLoop(pc, pctx);
  }, []);

  useEffect(() => {
    const wrap = boardWrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      applyResponsiveCellSize();
      queueMicrotask(() => {
        syncLayoutMetrics();
        resizeCanvases();
        bump();
      });
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [applyResponsiveCellSize, syncLayoutMetrics, resizeCanvases, bump]);

  useEffect(() => {
    const onResize = () => {
      applyResponsiveCellSize();
      setTimeout(() => {
        syncLayoutMetrics();
        resizeCanvases();
        bump();
      }, 120);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (vv) vv.removeEventListener('resize', onResize);
    };
  }, [applyResponsiveCellSize, syncLayoutMetrics, resizeCanvases, bump]);

  const doShake = useCallback(() => {
    const gw = gwRef.current;
    if (!gw) return;
    gw.classList.remove('shake');
    void gw.offsetWidth;
    gw.classList.add('shake');
    setTimeout(() => gw.classList.remove('shake'), 400);
  }, []);

  const showGridTopToast = useCallback(
    (main: string, sub: string | undefined, opts: { duration?: number } = {}) => {
      const g = gameRef.current;
      const id = `${Date.now()}-${Math.random()}`;
      const duration = opts.duration ?? 820;
      g.gridToasts.push({ id, kind: 'line', main, sub });
      bump();
      setTimeout(() => {
        const el = document.querySelector(`[data-toast-id="${id}"]`);
        el?.classList.add('fade-out');
        setTimeout(() => {
          gameRef.current.gridToasts = gameRef.current.gridToasts.filter((t) => t.id !== id);
          bump();
        }, 260);
      }, duration);
    },
    [bump]
  );

  const showGridTopCombo = useCallback(
    (c: number, scoreThisClear?: number) => {
      const g = gameRef.current;
      const id = `${Date.now()}-${Math.random()}`;
      g.gridToasts.push({ id, kind: 'combo', combo: c });
      sndCombo8bit(c, scoreThisClear ?? 0);
      bump();
      setTimeout(() => {
        const el = document.querySelector(`[data-toast-id="${id}"]`);
        el?.classList.add('fade-out');
        setTimeout(() => {
          gameRef.current.gridToasts = gameRef.current.gridToasts.filter((t) => t.id !== id);
          bump();
        }, 260);
      }, 1200);
    },
    [bump]
  );

  const updateDiffBar = useCallback(() => {
    bump();
  }, [bump]);

  const checkLevelUp = useCallback(
    (linesCleared: number) => {
      const g = gameRef.current;
      g.levelLines += linesCleared;
      if (g.levelLines >= 10) {
        g.levelLines -= 10;
        g.level++;
        sndScore();
        const gw = gwRef.current;
        const b = boardRef.current;
        if (gw && b)
          applyLevelPaletteToDom(gw, b, getLevelPalette(g.level, g.themeSeed));
      }
      updateDiffBar();
    },
    [updateDiffBar]
  );

  const clearLines = useCallback(
    (_pr: number, _pc: number) => {
      const g = gameRef.current;
      const board = g.board;
      const toRemove = new Set<string>();
      let cleared = 0;
      for (let r = 0; r < ROWS; r++)
        if (board[r]!.every((v) => v !== null)) {
          for (let c = 0; c < COLS; c++) toRemove.add(`${r},${c}`);
          cleared++;
        }
      for (let c = 0; c < COLS; c++)
        if (board.every((row) => row[c] !== null)) {
          for (let r = 0; r < ROWS; r++) toRemove.add(`${r},${c}`);
          cleared++;
        }

      if (toRemove.size > 0) {
        const cells: [number, number][] = [...toRemove].map((k) => {
          const [r, c] = k.split(',').map(Number);
          return [r!, c!] as [number, number];
        });
        const fcanvas = fcanvasRef.current;
        const fctx = fcanvas?.getContext('2d') ?? null;
        syncLayoutMetrics();
        flashLines(fcanvas, fctx, layoutRef.current, cells, () => {
          toRemove.forEach((k) => {
            const [r, c] = k.split(',').map(Number);
            gameRef.current.board[r!]![c!] = null;
          });
          bump();
        });
        particleApiRef.current?.spawnParticles(layoutRef.current, cells);
        sndScore();
        if (cleared >= 2) doShake();
        g.comboNoClearStreak = 0;
        g.combo++;
        g.bestCombo = Math.max(g.bestCombo, g.combo);
        g.totalLines += cleared;
        checkLevelUp(cleared);
        const lineBonus = cleared * cleared * 10 * ((1 + g.level * 0.1) | 0);
        const comboAfter = g.combo;
        const pts = Math.floor(lineBonus * comboAfter);
        const ptsThisClear = scaleScore(pts);
        g.score += ptsThisClear;
        syncBestFromScore(g);
        const basePer = Math.floor(lineBonus / cleared);
        const rem = lineBonus - basePer * cleared;
        const stagger = Math.min(150, Math.max(85, 680 / cleared));
        for (let i = 0; i < cleared; i++) {
          const basePart = basePer + (i === cleared - 1 ? rem : 0);
          const partPts = Math.floor(basePart * comboAfter);
          setTimeout(
            () =>
              showGridTopToast(
                '+' + partPts,
                'Linha ' + (i + 1) + '/' + cleared + ' · ×' + comboAfter,
                { duration: 760 }
              ),
            i * stagger
          );
        }
        if (comboAfter > 1) {
          setTimeout(() => showGridTopCombo(comboAfter, ptsThisClear), cleared * stagger + 120);
        }
        syncLayoutMetrics();
        bump();
        return true;
      }
      g.comboNoClearStreak++;
      if (g.comboNoClearStreak >= 3) {
        g.combo = 0;
        g.comboNoClearStreak = 0;
      }
      bump();
      return false;
    },
    [bump, checkLevelUp, doShake, showGridTopToast, showGridTopCombo, syncLayoutMetrics]
  );

  const updateScore = useCallback(() => {
    const g = gameRef.current;
    syncBestFromScore(g);
    bump();
  }, [bump]);

  const updateUndo = useCallback(() => {
    bump();
  }, [bump]);

  const pushUndo = useCallback(() => {
    const g = gameRef.current;
    g.undoStack.push({
      board: cloneBoard(g.board),
      score: g.score,
      pieces: clonePieces(g.pieces),
      holdPiece: g.holdPiece ? JSON.parse(JSON.stringify(g.holdPiece)) as Piece : null,
      combo: g.combo,
      comboNoClearStreak: g.comboNoClearStreak,
      tl: g.totalLines,
      lv: g.level,
      ll: g.levelLines,
    });
    if (g.undoStack.length > 3) g.undoStack.shift();
    updateUndo();
  }, [updateUndo]);

  const checkGameOver = useCallback(() => {
    const g = gameRef.current;
    const pieceCanPlace = (p: Piece | null): boolean => {
      if (!p) return false;
      if (p.bomb || p.clearRow || p.clearCol) return true;
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) if (canPlace(g.board, p, r, c)) return true;
      return false;
    };
    const avail = g.pieces.filter((p): p is Piece => p !== null);
    const ok = avail.some(pieceCanPlace) || (g.holdPiece && pieceCanPlace(g.holdPiece));
    if (!ok) {
      syncBestFromScore(g);
      g.leaderboard.push(g.score);
      g.leaderboard.sort((a, b) => b - a);
      g.leaderboard = g.leaderboard.slice(0, 5);
      g.gameOver = true;
      sndOver();
      bump();
    }
  }, [bump]);

  const getPlacementPoint = (finger: { x: number; y: number }) => ({
    x: finger.x,
    y: finger.y - PLACEMENT_OFFSET_Y,
  });

  const getBoardRaw = useCallback(
    (cx: number, cy: number) => {
      syncLayoutMetrics();
      const boardEl = boardRef.current;
      if (!boardEl) return { c: 0, r: 0 };
      const rect = boardEl.getBoundingClientRect();
      const { CELL, padPx } = layoutRef.current;
      return { c: (cx - rect.left - padPx) / CELL, r: (cy - rect.top - padPx) / CELL };
    },
    [syncLayoutMetrics]
  );

  const getBoardSnap = useCallback(
    (cx: number, cy: number) => {
      const { r, c } = getBoardRaw(cx, cy);
      return { r: Math.floor(r), c: Math.floor(c) };
    },
    [getBoardRaw]
  );

  const fingerOrLast = (e: MouseEvent | TouchEvent, g: GameState) => {
    const p = getClientPoint(e);
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
    return g.lastDragPoint;
  };

  const fingerInHoldRect = useCallback((x: number, y: number) => {
    const el = holdSlotRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }, []);

  const endDrag = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const g = gameRef.current;
      if (!g.dragging) return;
      const drag = g.dragging;
      document.querySelectorAll('.pslot').forEach((s) => s.classList.remove('drag-src'));
      holdSlotRef.current?.classList.remove('drag-src-hold');

      g.dragging = null;
      const finger = fingerOrLast(e, g);
      if (!finger) {
        g.snapR = null;
        g.snapC = null;
        g.lastDragPoint = null;
        bump();
        return;
      }

      if (!drag.fromHold && fingerInHoldRect(finger.x, finger.y)) {
        pushUndo();
        const prevHold = g.holdPiece;
        g.holdPiece = JSON.parse(JSON.stringify(drag.piece)) as Piece;
        g.pieces[drag.idx] = prevHold ? JSON.parse(JSON.stringify(prevHold)) as Piece : rndShape(g);
        g.snapR = null;
        g.snapC = null;
        g.lastDragPoint = null;
        bump();
        return;
      }

      const place = getPlacementPoint(finger);
      const { r, c } = getBoardSnap(place.x, place.y);
      const canDrop =
        drag.piece.bomb || drag.piece.clearRow || drag.piece.clearCol
          ? r >= 0 && r < ROWS && c >= 0 && c < COLS
          : canPlace(g.board, drag.piece, r, c);

      if (drag.fromHold && fingerInHoldRect(finger.x, finger.y)) {
        g.snapR = null;
        g.snapC = null;
        g.lastDragPoint = null;
        bump();
        return;
      }

      if (canDrop) {
        pushUndo();
        const placedCells: [number, number][] =
          drag.piece.bomb || drag.piece.clearRow || drag.piece.clearCol
            ? []
            : drag.piece.c.map(([dc, dr]) => [r + dr, c + dc] as [number, number]);
        if (drag.piece.bomb) {
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
              const br = r + dr;
              const bc = c + dc;
              if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) g.board[br]![bc!] = null;
            }
          g.score += 15;
          syncLayoutMetrics();
          particleApiRef.current?.spawnParticles(
            layoutRef.current,
            (
              [
                [r, c],
                [r - 1, c],
                [r + 1, c],
                [r, c - 1],
                [r, c + 1],
              ] as [number, number][]
            ).filter(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS)
          );
        } else if (drag.piece.clearRow) {
          const cells: [number, number][] = [];
          for (let bc = 0; bc < COLS; bc++) {
            g.board[r]![bc] = null;
            cells.push([r, bc]);
          }
          g.score += 14;
          syncLayoutMetrics();
          particleApiRef.current?.spawnParticles(layoutRef.current, cells);
        } else if (drag.piece.clearCol) {
          const cells: [number, number][] = [];
          for (let br = 0; br < ROWS; br++) {
            g.board[br]![c] = null;
            cells.push([br, c]);
          }
          g.score += 14;
          syncLayoutMetrics();
          particleApiRef.current?.spawnParticles(layoutRef.current, cells);
        } else {
          drag.piece.c.forEach(([dc, dr]) => {
            g.board[r + dr]![c + dc] = drag.piece.col;
          });
          g.score += drag.piece.c.length;
        }
        g.totalPlaced++;
        syncLayoutMetrics();
        placedCells.forEach(([rr, cc]) => {
          const key = `${rr},${cc}`;
          g.bouncing[key] = true;
          setTimeout(() => {
            delete gameRef.current.bouncing[key];
            bump();
          }, 220);
        });
        if (drag.fromHold) {
          g.holdPiece = null;
        } else {
          g.pieces[drag.idx] = null;
        }
        const hadLineClear = clearLines(r, c);
        if (!hadLineClear) {
          if (drag.piece.bomb || drag.piece.clearRow || drag.piece.clearCol) {
            sndScore();
          } else {
            sndPlace();
          }
        }
        if (g.pieces.every((p) => p === null)) {
          popPieces(g);
        }
        updateScore();
        setTimeout(() => {
          checkGameOver();
        }, 360);
      }
      g.snapR = null;
      g.snapC = null;
      g.lastDragPoint = null;
      bump();
    },
    [
      bump,
      clearLines,
      fingerInHoldRect,
      getBoardSnap,
      checkGameOver,
      pushUndo,
      syncLayoutMetrics,
      updateScore,
    ]
  );

  const updateDragPreview = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const g = gameRef.current;
      if (!g.dragging) return;
      const finger = fingerOrLast(e, g);
      if (!finger) return;
      g.lastDragPoint = finger;
      const place = getPlacementPoint(finger);
      g.floatX = place.x;
      g.floatY = place.y;
      const { r, c } = getBoardSnap(place.x, place.y);
      g.snapR = r;
      g.snapC = c;
      bump();
    },
    [bump, getBoardSnap]
  );

  const startDrag = useCallback(
    (native: MouseEvent | TouchEvent, idx: number) => {
      const g = gameRef.current;
      if (g.pieces[idx] === null) return;
      native.preventDefault();
      const piece = g.pieces[idx]!;
      g.dragging = { fromHold: false, idx, piece };
      g.snapR = null;
      g.snapC = null;
      const p0 = getClientPoint(native);
      if (Number.isFinite(p0.x) && Number.isFinite(p0.y)) g.lastDragPoint = p0;
      queueMicrotask(() => {
        document.querySelectorAll('.pslot')[idx]?.classList.add('drag-src');
      });
      updateDragPreview(native);
    },
    [updateDragPreview]
  );

  const startDragFromHold = useCallback(
    (native: MouseEvent | TouchEvent) => {
      const g = gameRef.current;
      if (!g.holdPiece || g.dragging) return;
      const target = native.target as Node | null;
      if (!target || !(target instanceof Element) || !target.closest('#hold-slot')) return;
      native.preventDefault();
      native.stopPropagation();
      g.dragging = { fromHold: true, piece: g.holdPiece, idx: -1 };
      g.snapR = null;
      g.snapC = null;
      holdSlotRef.current?.classList.add('drag-src-hold');
      const p0 = getClientPoint(native);
      if (Number.isFinite(p0.x) && Number.isFinite(p0.y)) g.lastDragPoint = p0;
      updateDragPreview(native);
    },
    [updateDragPreview]
  );

  const restart = useCallback(() => {
    const pcanvas = pcanvasRef.current;
    const fcanvas = fcanvasRef.current;
    if (pcanvas) {
      const pctx = pcanvas.getContext('2d');
      pctx?.clearRect(0, 0, pcanvas.width, pcanvas.height);
    }
    if (fcanvas) {
      const fctx = fcanvas.getContext('2d');
      fctx?.clearRect(0, 0, fcanvas.width, fcanvas.height);
    }
    gameRef.current = createInitialGame();
    gameRef.current.gridToasts = [];
    sndNewGame();
    const gw = gwRef.current;
    const b = boardRef.current;
    if (gw && b)
      applyLevelPaletteToDom(gw, b, getLevelPalette(gameRef.current.level, gameRef.current.themeSeed));
    bump();
  }, [bump]);

  const doUndo = useCallback(() => {
    const g = gameRef.current;
    if (!g.undoStack.length) return;
    const s = g.undoStack.pop()!;
    g.board = s.board;
    g.score = s.score;
    g.pieces = s.pieces;
    g.combo = s.combo;
    g.comboNoClearStreak = s.comboNoClearStreak ?? 0;
    g.holdPiece = s.holdPiece !== undefined ? (s.holdPiece ? JSON.parse(JSON.stringify(s.holdPiece)) as Piece : null) : null;
    g.totalLines = s.tl;
    g.level = s.lv;
    g.levelLines = s.ll;
    const gw = gwRef.current;
    const b = boardRef.current;
    if (gw && b) applyLevelPaletteToDom(gw, b, getLevelPalette(g.level, g.themeSeed));
    updateUndo();
    bump();
  }, [bump, updateUndo]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (gameRef.current.dragging) updateDragPreview(e);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (gameRef.current.dragging) {
        e.preventDefault();
        updateDragPreview(e);
      }
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      if (gameRef.current.dragging) endDrag(e);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    document.addEventListener('touchcancel', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('touchcancel', onUp);
    };
  }, [endDrag, updateDragPreview]);

  useLayoutEffect(() => {
    applyResponsiveCellSize();
    queueMicrotask(() => {
      syncLayoutMetrics();
      resizeCanvases();
    });
  }, [applyResponsiveCellSize, syncLayoutMetrics, resizeCanvases]);

  const g = gameRef.current;
  const ghostSpec: GhostSpec | null =
    g.dragging && g.snapR != null && g.snapC != null
      ? getGhostSpec(g.board, g.dragging.piece, g.snapR, g.snapC)
      : null;

  const lineClearPreview: LineClearPreview | null =
    ghostSpec?.valid && g.dragging && g.snapR != null && g.snapC != null
      ? predictLineClearAfterPlacement(g.board, g.dragging.piece, g.snapR, g.snapC)
      : null;

  return {
    gameRef,
    bump,
    gwRef,
    boardWrapRef,
    boardRef,
    holdSlotRef,
    pcanvasRef,
    fcanvasRef,
    ghostSpec,
    lineClearPreview,
    layoutRef,
    syncLayoutMetrics,
    applyResponsiveCellSize,
    resizeCanvases,
    startDrag,
    startDragFromHold,
    restart,
    doUndo,
    endDrag,
    updateDragPreview,
  };
}
