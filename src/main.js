import './style.css';

const ROWS = 8,
  COLS = 8;
let padPx = 8,
  cellPx = 38,
  gapPx = 3,
  CELL = 41;

function readCssCellSize() {
  const v = getComputedStyle(document.getElementById('gw')).getPropertyValue('--cell-size').trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 32;
}

function applyResponsiveCellSize() {
  const wrap = document.getElementById('board-wrap');
  const gw = document.getElementById('gw');
  const pad = 8,
    gap = 3;
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
}

function syncLayoutMetrics() {
  const boardEl = document.getElementById('board');
  const first = boardEl.querySelector('.cell[data-r="0"][data-c="0"]');
  const second = boardEl.querySelector('.cell[data-r="0"][data-c="1"]');
  const br = boardEl.getBoundingClientRect();
  if (first && second) {
    const fr = first.getBoundingClientRect();
    const sr = second.getBoundingClientRect();
    cellPx = fr.width;
    padPx = fr.left - br.left;
    CELL = sr.left - fr.left;
    gapPx = CELL - cellPx;
  } else {
    cellPx = readCssCellSize();
    gapPx = 3;
    padPx = 8;
    CELL = cellPx + gapPx;
  }
}

function resizeCanvases() {
  const board = document.getElementById('board');
  const w = Math.max(1, Math.round(board.offsetWidth));
  const h = Math.max(1, Math.round(board.offsetHeight));
  if (pcanvas.width !== w || pcanvas.height !== h) {
    pcanvas.width = w;
    pcanvas.height = h;
    fcanvas.width = w;
    fcanvas.height = h;
  }
}
const SHAPES = [
  { c: [[0, 0], [1, 0], [2, 0]], col: '#e94560', sz: 1 },
  { c: [[0, 0], [0, 1], [0, 2]], col: '#e94560', sz: 1 },
  { c: [[0, 0], [1, 0], [2, 0], [3, 0]], col: '#0f9b8e', sz: 2 },
  { c: [[0, 0], [0, 1], [0, 2], [0, 3]], col: '#0f9b8e', sz: 2 },
  { c: [[0, 0], [1, 0], [0, 1], [1, 1]], col: '#f5a623', sz: 1 },
  { c: [[0, 0], [1, 0], [2, 0], [1, 1]], col: '#9b59b6', sz: 1 },
  { c: [[1, 0], [0, 1], [1, 1], [2, 1]], col: '#3498db', sz: 1 },
  { c: [[0, 0], [1, 0], [1, 1], [2, 1]], col: '#2ecc71', sz: 1 },
  { c: [[0, 0], [0, 1], [1, 1]], col: '#1abc9c', sz: 0 },
  { c: [[1, 0], [0, 1], [1, 1]], col: '#e74c3c', sz: 0 },
  { c: [[0, 0], [1, 0], [0, 1]], col: '#f39c12', sz: 0 },
  { c: [[0, 0]], col: '#fbbf24', sz: 0 },
  { c: [[0, 0], [1, 0]], col: '#e94560', sz: 0 },
  { c: [[0, 0], [0, 1]], col: '#3498db', sz: 0 },
  { c: [[0, 0], [1, 0], [2, 0], [0, 1]], col: '#9b59b6', sz: 1 },
  { c: [[0, 0], [1, 0], [2, 0], [2, 1]], col: '#e67e22', sz: 1 },
  { c: [[0, 0], [0, 1], [0, 2], [1, 2]], col: '#16a085', sz: 1 },
  { c: [[1, 0], [1, 1], [0, 2], [1, 2]], col: '#8e44ad', sz: 1 },
  { c: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], col: '#f5a623', sz: 3 },
  { c: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], col: '#e94560', sz: 2 },
];
const BOMB = { c: [[0, 0]], col: '#ff6b35', bomb: true, sz: 0 };

/** HSL → #rrggbb (h 0–360, s/l 0–100) */
function hslToHex(h, s, l) {
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

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Paleta única por nível (determinística, aparência variada). */
function applyBoardTheme(lv) {
  const rng = seededRandom(Math.imul(lv, 2654435761) ^ 1597334677);
  const h0 = rng() * 360;
  const h1 = (h0 + 28 + rng() * 48) % 360;
  const h2 = (h0 + 160 + rng() * 40) % 360;
  const bg = hslToHex(h0, 16 + rng() * 18, 8 + rng() * 7);
  const border = hslToHex(h1, 22 + rng() * 22, 18 + rng() * 14);
  const cellEmpty = hslToHex(h2, 28 + rng() * 25, 4 + rng() * 6);
  const gw = document.getElementById('gw');
  const board = document.getElementById('board');
  if (!gw || !board) return;
  gw.style.setProperty('--cell-empty', cellEmpty);
  board.style.setProperty('--board-bg', bg);
  board.style.setProperty('--board-border', border);
}

let board,
  score,
  best = 0,
  pieces,
  nextQueue = [],
  dragging = null;
let combo = 0,
  holdPiece = null;
/** Placements sem limpar linha no lote atual; em 3, o combo zera. */
let comboNoClearStreak = 0;
let totalLines = 0,
  bestCombo = 0,
  totalPlaced = 0,
  level = 1,
  levelLines = 0;
let undoStack = [];
let leaderboard = [];
let particles = [];
let animFrame = null;
let snapR = null,
  snapC = null;
let lastDragPoint = null;

/** Finger → board/float: ghost, snap, and dragged piece align to this point (px above touch). */
const PLACEMENT_OFFSET_Y = 200;
function getPlacementPoint(finger) {
  return { x: finger.x, y: finger.y - PLACEMENT_OFFSET_Y };
}

const pcanvas = document.getElementById('pcanvas');
const pctx = pcanvas.getContext('2d');
const fcanvas = document.getElementById('flash-canvas');
const fctx = fcanvas.getContext('2d');

const AC = window.AudioContext || window.webkitAudioContext;
let actx = null;
function ac() {
  if (!actx)
    try {
      actx = new AC();
    } catch (e) {}
  return actx;
}
function tone(f, d, t = 'sine', v = 0.13) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator(),
    g = a.createGain();
  o.type = t;
  o.frequency.value = f;
  g.gain.setValueAtTime(v, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d);
  o.connect(g);
  g.connect(a.destination);
  o.start();
  o.stop(a.currentTime + d);
}
function sndPlace() {
  tone(200, 0.07, 'square', 0.09);
}
function sndClear(n) {
  [380, 520, 680, 860].slice(0, n).forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.15), i * 55));
}
function sndCombo(c) {
  tone(280 + c * 75, 0.22, 'triangle', 0.18);
}
function sndBomb() {
  tone(70, 0.28, 'sawtooth', 0.18);
  tone(150, 0.18, 'square', 0.12);
}
function sndOver() {
  [280, 230, 185, 140].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'sine', 0.09), i * 110));
}
function sndLevel() {
  [440, 550, 660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.14), i * 70));
}

function spawnParticles(cells) {
  syncLayoutMetrics();
  const cx = cellPx / 2;
  cells.forEach(([r, c]) => {
    const x = padPx + c * CELL + cx,
      y = padPx + r * CELL + cx;
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2,
        s = 1.5 + Math.random() * 3;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        col: ['#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#fb923c'][Math.floor(Math.random() * 5)],
      });
    }
  });
  if (!animFrame) animP();
}
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

function flashLines(cells, cb) {
  syncLayoutMetrics();
  const rad = Math.max(3, cellPx * 0.16);
  let alpha = 1;
  function frame() {
    fctx.clearRect(0, 0, fcanvas.width, fcanvas.height);
    fctx.globalAlpha = alpha * 0.85;
    cells.forEach(([r, c]) => {
      fctx.fillStyle = '#fff';
      fctx.beginPath();
      fctx.roundRect(padPx + c * CELL, padPx + r * CELL, cellPx, cellPx, rad);
      fctx.fill();
    });
    alpha -= 0.12;
    if (alpha > 0) requestAnimationFrame(frame);
    else {
      fctx.clearRect(0, 0, fcanvas.width, fcanvas.height);
      if (cb) cb();
    }
  }
  requestAnimationFrame(frame);
}

function doShake() {
  const gw = document.getElementById('gw');
  gw.classList.remove('shake');
  void gw.offsetWidth;
  gw.classList.add('shake');
  setTimeout(() => gw.classList.remove('shake'), 400);
}

function initBoard() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}
function rndShape() {
  const pool = level >= 3 ? SHAPES : SHAPES.filter((s) => s.sz < 3);
  if (Math.random() < 0.07) return JSON.parse(JSON.stringify(BOMB));
  return pool[Math.floor(Math.random() * pool.length)];
}
function fillQueue() {
  while (nextQueue.length < 6) nextQueue.push(rndShape());
}
function popPieces() {
  comboNoClearStreak = 0;
  fillQueue();
  pieces = [nextQueue.shift(), nextQueue.shift(), nextQueue.shift()];
  fillQueue();
}
function cloneBoard() {
  return board.map((r) => [...r]);
}
function clonePieces() {
  return pieces.map((p) => (p ? JSON.parse(JSON.stringify(p)) : null));
}

function getPieceBox(p) {
  return { maxC: Math.max(...p.c.map(([x]) => x)), maxR: Math.max(...p.c.map(([, y]) => y)) };
}

function renderBoard(ghostSpec = null, opts = {}) {
  if (!opts.fromMoveGhost) applyResponsiveCellSize();
  const cells = ghostSpec?.cells ?? [];
  const valid = ghostSpec?.valid ?? true;
  const el = document.getElementById('board');
  el.innerHTML = '';
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const d = document.createElement('div');
      const col = board[r][c];
      const inGhost = cells.some(([gr, gc]) => gr === r && gc === c);
      let ghostClass = '';
      if (dragging && inGhost) {
        if (col) {
          if (!valid) ghostClass = ' ghost-invalid-overlap';
        } else {
          ghostClass = valid ? ' ghost-preview' : ' ghost-preview-invalid';
        }
      }
      d.className = 'cell' + (col ? ' filled' : '') + ghostClass;
      if (col) {
        if (col === '#ff6b35') {
          d.classList.add('bomb-cell');
          const ic = document.createElement('div');
          ic.className = 'bomb-icon';
          ic.textContent = '💣';
          d.appendChild(ic);
        } else d.style.background = col;
      } else if (inGhost && dragging && !col && valid) {
        d.style.background = dragging.piece.col;
      } else if (inGhost && dragging && !col && !valid) {
        d.style.background = dragging.piece.col;
      }
      d.dataset.r = r;
      d.dataset.c = c;
      el.appendChild(d);
    }
  syncLayoutMetrics();
  resizeCanvases();
}

function renderHold() {
  const slot = document.getElementById('hold-slot');
  const mini = document.getElementById('hold-mini');
  const avail = document.getElementById('hold-avail');
  mini.innerHTML = '';
  slot.className = '';
  if (!holdPiece) {
    avail.textContent = 'vazio';
    avail.style.color = '#4b5563';
    slot.style.borderStyle = 'dashed';
    slot.style.borderColor = '#2a2a50';
    return;
  }
  slot.classList.add('has-piece');
  avail.textContent = 'arraste → tabuleiro';
  avail.style.color = '#34d399';
  const { maxC, maxR } = getPieceBox(holdPiece);
  const cs = maxC <= 2 && maxR <= 2 ? 13 : 10;
  mini.style.cssText = `display:grid;grid-template-columns:repeat(${maxC + 1},${cs}px);grid-template-rows:repeat(${maxR + 1},${cs}px);gap:2px;`;
  for (let r2 = 0; r2 <= maxR; r2++)
    for (let c2 = 0; c2 <= maxC; c2++) {
      const mc = document.createElement('div');
      mc.style.cssText = `width:${cs}px;height:${cs}px;border-radius:2px;`;
      mc.style.background = holdPiece.c.some(([cc, rr]) => cc === c2 && rr === r2) ? holdPiece.col : 'transparent';
      mini.appendChild(mc);
    }
}

function renderNext() {
  const ns = document.getElementById('next-slots');
  ns.innerHTML = '';
  nextQueue.slice(0, 3).forEach((p) => {
    const slot = document.createElement('div');
    slot.className = 'next-slot';
    const { maxC, maxR } = getPieceBox(p);
    const cs = Math.min(10, Math.floor(48 / (Math.max(maxC, maxR) + 1)));
    const mini = document.createElement('div');
    mini.style.cssText = `display:grid;grid-template-columns:repeat(${maxC + 1},${cs}px);grid-template-rows:repeat(${maxR + 1},${cs}px);gap:2px;`;
    for (let r2 = 0; r2 <= maxR; r2++)
      for (let c2 = 0; c2 <= maxC; c2++) {
        const mc = document.createElement('div');
        mc.style.cssText = `width:${cs}px;height:${cs}px;border-radius:2px;`;
        mc.style.background = p.c.some(([cc, rr]) => cc === c2 && rr === r2) ? p.col : 'transparent';
        mini.appendChild(mc);
      }
    slot.appendChild(mini);
    ns.appendChild(slot);
  });
}

function buildPieceMini(p, slotW) {
  const { maxC, maxR } = getPieceBox(p);
  const dim = Math.max(maxC, maxR) + 1;
  let cs, gap, boardMode = false;
  if (slotW === 'board') {
    syncLayoutMetrics();
    cs = cellPx;
    gap = gapPx;
    boardMode = true;
  } else {
    gap = 3;
    cs = Math.max(8, Math.min(maxC <= 2 && maxR <= 2 ? 20 : maxC <= 3 && maxR <= 3 ? 15 : 11, Math.floor((slotW - 12) / dim)));
  }
  const mini = document.createElement('div');
  mini.className = 'pmini' + (boardMode ? ' pmini-board' : '');
  mini.style.cssText = `grid-template-columns:repeat(${maxC + 1},${cs}px);grid-template-rows:repeat(${maxR + 1},${cs}px);gap:${gap}px;`;
  const bombFs = boardMode ? Math.max(11, Math.round(cs * 0.42)) + 'px' : '11px';
  for (let r2 = 0; r2 <= maxR; r2++)
    for (let c2 = 0; c2 <= maxC; c2++) {
      const mc = document.createElement('div');
      mc.className = 'pm-cell';
      mc.style.cssText = `width:${cs}px;height:${cs}px;`;
      if (boardMode) mc.style.borderRadius = '6px';
      const filled = p.c.some(([cc, rr]) => cc === c2 && rr === r2);
      mc.style.background = filled ? p.col : 'transparent';
      if (filled) mc.style.boxShadow = 'inset 0 1px 2px rgba(255,255,255,0.18)';
      if (p.bomb && filled) {
        mc.style.background = '#ff6b35';
        mc.textContent = '💣';
        mc.style.fontSize = bombFs;
        mc.style.display = 'flex';
        mc.style.alignItems = 'center';
        mc.style.justifyContent = 'center';
      }
      mini.appendChild(mc);
    }
  return mini;
}

function createDragFloat(p) {
  const wrap = document.createElement('div');
  wrap.id = 'drag-float';
  wrap.appendChild(buildPieceMini(p, 'board'));
  document.body.appendChild(wrap);
  return wrap;
}

function removeDragFloat(el) {
  if (el && el.parentNode) el.remove();
}

function renderPieces() {
  const row = document.getElementById('pieces-row');
  row.innerHTML = '';
  const slotW = Math.min(96, Math.max(72, Math.floor(window.innerWidth * 0.26)));
  pieces.forEach((p, i) => {
    const slot = document.createElement('div');
    slot.className = 'pslot' + (p === null ? ' used' : '');
    if (p) {
      slot.appendChild(buildPieceMini(p, slotW));
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:10px;color:#6b7280;margin-top:3px;';
      lbl.textContent = p.bomb
        ? 'Bomba'
        : p.c.length + ' ' + (p.c.length > 1 ? 'blocos' : 'bloco');
      slot.appendChild(lbl);
      slot.addEventListener('mousedown', (e) => startDrag(e, i));
      slot.addEventListener(
        'touchstart',
        (e) => startDrag(e, i),
        { passive: false }
      );
    }
    row.appendChild(slot);
  });
}

function fingerInHoldRect(x, y) {
  const el = document.getElementById('hold-slot');
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function startDragFromHold(e) {
  if (!holdPiece || dragging) return;
  if (!e.target.closest('#hold-slot')) return;
  e.preventDefault();
  e.stopPropagation();
  dragging = { fromHold: true, piece: holdPiece, floatEl: createDragFloat(holdPiece) };
  snapR = null;
  snapC = null;
  document.getElementById('hold-slot')?.classList.add('drag-src-hold');
  const p0 = getClientPoint(e);
  if (Number.isFinite(p0.x) && Number.isFinite(p0.y)) lastDragPoint = p0;
  updateDragPreview(e);
}

function startDrag(e, idx) {
  if (pieces[idx] === null) return;
  e.preventDefault();
  dragging = { fromHold: false, idx, piece: pieces[idx], floatEl: createDragFloat(pieces[idx]) };
  snapR = null;
  snapC = null;
  document.querySelectorAll('.pslot')[idx]?.classList.add('drag-src');
  const p0 = getClientPoint(e);
  if (Number.isFinite(p0.x) && Number.isFinite(p0.y)) lastDragPoint = p0;
  updateDragPreview(e);
}

function getBoardRaw(cx, cy) {
  syncLayoutMetrics();
  const boardEl = document.getElementById('board');
  const rect = boardEl.getBoundingClientRect();
  return { c: (cx - rect.left - padPx) / CELL, r: (cy - rect.top - padPx) / CELL };
}
/** Cell under pointer: floor so the anchor matches the cell region you point at (not nearest-center round). */
function getBoardSnap(cx, cy) {
  const { r, c } = getBoardRaw(cx, cy);
  return { r: Math.floor(r), c: Math.floor(c) };
}

function getClientPoint(e) {
  const t =
    e.touches && e.touches[0]
      ? e.touches[0]
      : e.changedTouches && e.changedTouches[0]
        ? e.changedTouches[0]
        : e;
  return { x: t.clientX, y: t.clientY };
}

function fingerOrLast(e) {
  const p = getClientPoint(e);
  if (Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  return lastDragPoint;
}

function canPlace(p, r, c) {
  return p.c.every(([dc, dr]) => {
    const br = r + dr,
      bc = c + dc;
    return br >= 0 && br < ROWS && bc >= 0 && bc < COLS && !board[br][bc];
  });
}

/** Matches endDrag: bomb only needs in-bounds; blocks need empty cells. */
function placementValid(p, r, c) {
  if (!p) return false;
  if (p.bomb) return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  return canPlace(p, r, c);
}

function getGhostSpec(p, r, c) {
  if (!p) return { cells: [], valid: true };
  const cells = p.c.map(([dc, dr]) => [r + dr, c + dc]);
  return { cells, valid: placementValid(p, r, c) };
}

function updateDragPreview(e) {
  const finger = fingerOrLast(e);
  if (!finger) return;
  lastDragPoint = finger;
  const place = getPlacementPoint(finger);
  if (dragging.floatEl) {
    dragging.floatEl.style.left = place.x + 'px';
    dragging.floatEl.style.top = place.y + 'px';
  }
  const { r, c } = getBoardSnap(place.x, place.y);
  snapR = r;
  snapC = c;
  renderBoard(getGhostSpec(dragging.piece, r, c), { fromMoveGhost: true });
}

function getCellEl(r, c) {
  return document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
}

function bounceCells(cells) {
  cells.forEach(([r, c]) => {
    const el = getCellEl(r, c);
    if (el) {
      el.classList.remove('drop-bounce');
      void el.offsetWidth;
      el.classList.add('drop-bounce');
    }
  });
}

function showScorePop(pts, x, y) {
  const wrap = document.getElementById('score-pop-wrap');
  const pop = document.createElement('div');
  pop.className = 'spop';
  pop.textContent = '+' + pts;
  pop.style.left = x + 'px';
  pop.style.top = y + 'px';
  wrap.appendChild(pop);
  setTimeout(() => pop.remove(), 680);
}

function showGridTopToast(main, sub, opts = {}) {
  const wrap = document.getElementById('grid-toast-wrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'grid-toast-item';
  const m = document.createElement('div');
  m.className = 'grid-toast-main';
  m.textContent = main;
  el.appendChild(m);
  if (sub) {
    const s = document.createElement('div');
    s.className = 'grid-toast-sub';
    s.textContent = sub;
    el.appendChild(s);
  }
  wrap.appendChild(el);
  const dur = opts.duration ?? 820;
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 260);
  }, dur);
}

function showGridTopCombo(c) {
  const wrap = document.getElementById('grid-toast-wrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'grid-toast-item';
  const inner = document.createElement('div');
  inner.className = 'grid-toast-combo';
  if (c >= 5) {
    inner.classList.add('combo-orange');
    inner.textContent = 'MEGA ×' + c;
  } else if (c >= 3) {
    inner.classList.add('combo-purple');
    inner.textContent = 'SUPER ×' + c;
  } else {
    inner.classList.add('combo-pink');
    inner.textContent = 'COMBO ×' + c;
  }
  el.appendChild(inner);
  wrap.appendChild(el);
  sndCombo(c);
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 260);
  }, 1200);
}

function updateDiffBar() {
  const linesPerLevel = 10;
  const prog = Math.min(1, levelLines / linesPerLevel);
  document.getElementById('diff-fill').style.width = prog * 100 + '%';
  document.getElementById('lvd').textContent = level;
  const remaining = linesPerLevel - levelLines;
  document.getElementById('diff-next').textContent = remaining > 0 ? remaining + ' linhas' : 'MÁX';
}

function checkLevelUp(linesCleared) {
  levelLines += linesCleared;
  if (levelLines >= 10) {
    levelLines -= 10;
    level++;
    sndLevel();
    applyBoardTheme(level);
    updateDiffBar();
  } else updateDiffBar();
}

function clearLines(pr, pc) {
  const toRemove = new Set();
  let cleared = 0;
  for (let r = 0; r < ROWS; r++)
    if (board[r].every((v) => v !== null)) {
      for (let c = 0; c < COLS; c++) toRemove.add(`${r},${c}`);
      cleared++;
    }
  for (let c = 0; c < COLS; c++)
    if (board.every((r) => r[c] !== null)) {
      for (let r = 0; r < ROWS; r++) toRemove.add(`${r},${c}`);
      cleared++;
    }
  if (toRemove.size > 0) {
    const cells = [...toRemove].map((k) => k.split(',').map(Number));
    flashLines(cells, () => {
      toRemove.forEach((k) => {
        const [r, c] = k.split(',').map(Number);
        board[r][c] = null;
      });
      renderBoard();
    });
    spawnParticles(cells);
    sndClear(cleared);
    if (cleared >= 2) doShake();
    comboNoClearStreak = 0;
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    totalLines += cleared;
    checkLevelUp(cleared);
    const lineBonus = cleared * cleared * 10 * ((1 + level * 0.1) | 0);
    const pts = Math.floor(lineBonus * combo);
    score += pts;
    const basePer = Math.floor(lineBonus / cleared);
    const rem = lineBonus - basePer * cleared;
    const stagger = Math.min(150, Math.max(85, 680 / cleared));
    for (let i = 0; i < cleared; i++) {
      const basePart = basePer + (i === cleared - 1 ? rem : 0);
      const partPts = Math.floor(basePart * combo);
      setTimeout(
        () =>
          showGridTopToast('+' + partPts, 'Linha ' + (i + 1) + '/' + cleared + ' · ×' + combo, {
            duration: 760,
          }),
        i * stagger
      );
    }
    if (combo > 1) {
      setTimeout(() => showGridTopCombo(combo), cleared * stagger + 120);
    }
    syncLayoutMetrics();
    document.getElementById('cd').textContent = 'x' + combo;
    document.getElementById('cd').style.color = combo >= 5 ? '#f59e0b' : combo >= 3 ? '#a78bfa' : '#fbbf24';
    return true;
  } else {
    comboNoClearStreak++;
    if (comboNoClearStreak >= 3) {
      combo = 0;
      comboNoClearStreak = 0;
      document.getElementById('cd').textContent = 'x1';
      document.getElementById('cd').style.color = '#fbbf24';
    }
    return false;
  }
}

function updateScore() {
  if (score > best) best = score;
  document.getElementById('sd').textContent = score;
  document.getElementById('bd').textContent = best;
  document.getElementById('ld').textContent = totalLines;
}
function updateUndo() {
  const btn = document.getElementById('undo-btn');
  const n = undoStack.length;
  btn.disabled = n === 0;
  const tip = n ? `Desfazer (${n} restante${n > 1 ? 's' : ''})` : 'Nada para desfazer';
  btn.title = tip;
  btn.setAttribute('aria-label', tip);
}

function doUndo() {
  if (!undoStack.length) return;
  const s = undoStack.pop();
  board = s.board;
  score = s.score;
  pieces = s.pieces;
  combo = s.combo;
  comboNoClearStreak = s.comboNoClearStreak ?? 0;
  holdPiece = s.holdPiece !== undefined ? (s.holdPiece ? JSON.parse(JSON.stringify(s.holdPiece)) : null) : null;
  totalLines = s.tl;
  level = s.lv;
  levelLines = s.ll;
  updateScore();
  updateUndo();
  updateDiffBar();
  applyBoardTheme(level);
  renderBoard();
  renderPieces();
  renderHold();
}

function checkGameOver() {
  const avail = pieces.filter((p) => p !== null);
  const pieceCanPlace = (p) => {
    if (!p) return false;
    if (p.bomb) return true;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (canPlace(p, r, c)) return true;
    return false;
  };
  const ok =
    avail.some(pieceCanPlace) || (holdPiece && pieceCanPlace(holdPiece));
  if (!ok) {
    showGameOver();
    sndOver();
  }
}

function showGameOver() {
  leaderboard.push(score);
  leaderboard.sort((a, b) => b - a);
  leaderboard = leaderboard.slice(0, 5);
  const sl = document.getElementById('stats-list');
  sl.innerHTML = '';
  [
    { l: 'Pontuação final', v: score },
    { l: 'Nível alcançado', v: level },
    { l: 'Melhor combo', v: 'x' + bestCombo },
    { l: 'Linhas limpas', v: totalLines },
    { l: 'Peças colocadas', v: totalPlaced },
  ].forEach(({ l, v }) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `<span>${l}</span><span>${v}</span>`;
    sl.appendChild(row);
  });
  const lbr = document.getElementById('lb-rows');
  lbr.innerHTML = '';
  leaderboard.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `<span>${i === 0 ? 'Campeão' : '#' + (i + 1)}</span><span>${s}</span>`;
    lbr.appendChild(row);
  });
  document.getElementById('go').classList.add('show');
}

function endDrag(e) {
  if (!dragging) return;
  document.querySelectorAll('.pslot').forEach((s) => s.classList.remove('drag-src'));
  document.getElementById('hold-slot')?.classList.remove('drag-src-hold');
  removeDragFloat(dragging.floatEl);
  dragging.floatEl = null;
  const finger = fingerOrLast(e);
  if (!finger) {
    dragging = null;
    snapR = null;
    snapC = null;
    lastDragPoint = null;
    renderBoard();
    return;
  }

  if (!dragging.fromHold && fingerInHoldRect(finger.x, finger.y)) {
    undoStack.push({
      board: cloneBoard(),
      score,
      pieces: clonePieces(),
      holdPiece: holdPiece ? JSON.parse(JSON.stringify(holdPiece)) : null,
      combo,
      comboNoClearStreak,
      tl: totalLines,
      lv: level,
      ll: levelLines,
    });
    if (undoStack.length > 3) undoStack.shift();
    updateUndo();
    const prevHold = holdPiece;
    holdPiece = JSON.parse(JSON.stringify(dragging.piece));
    pieces[dragging.idx] = prevHold ? JSON.parse(JSON.stringify(prevHold)) : rndShape();
    renderHold();
    renderPieces();
    renderBoard();
    dragging = null;
    snapR = null;
    snapC = null;
    lastDragPoint = null;
    return;
  }

  const place = getPlacementPoint(finger);
  const { r, c } = getBoardSnap(place.x, place.y);
  const canDrop = dragging.piece.bomb ? r >= 0 && r < ROWS && c >= 0 && c < COLS : canPlace(dragging.piece, r, c);

  if (dragging.fromHold && fingerInHoldRect(finger.x, finger.y)) {
    renderBoard();
    dragging = null;
    snapR = null;
    snapC = null;
    lastDragPoint = null;
    return;
  }

  if (canDrop) {
    undoStack.push({
      board: cloneBoard(),
      score,
      pieces: clonePieces(),
      holdPiece: holdPiece ? JSON.parse(JSON.stringify(holdPiece)) : null,
      combo,
      comboNoClearStreak,
      tl: totalLines,
      lv: level,
      ll: levelLines,
    });
    if (undoStack.length > 3) undoStack.shift();
    updateUndo();
    const placedCells = dragging.piece.bomb ? [] : dragging.piece.c.map(([dc, dr]) => [r + dr, c + dc]);
    if (dragging.piece.bomb) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const br = r + dr,
            bc = c + dc;
          if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) board[br][bc] = null;
        }
      score += 15;
      sndBomb();
      spawnParticles(
        [
          [r, c],
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ].filter(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS)
      );
    } else {
      dragging.piece.c.forEach(([dc, dr]) => {
        board[r + dr][c + dc] = dragging.piece.col;
      });
      score += dragging.piece.c.length;
      sndPlace();
    }
    totalPlaced++;
    renderBoard();
    bounceCells(placedCells);
    if (dragging.fromHold) {
      holdPiece = null;
    } else {
      pieces[dragging.idx] = null;
    }
    clearLines(r, c);
    if (pieces.every((p) => p === null)) {
      popPieces();
    }
    updateScore();
    renderPieces();
    renderHold();
    renderNext();
    setTimeout(checkGameOver, 360);
  } else {
    renderBoard();
  }
  dragging = null;
  snapR = null;
  snapC = null;
  lastDragPoint = null;
}

function restart() {
  if (dragging?.floatEl) removeDragFloat(dragging.floatEl);
  dragging = null;
  snapR = null;
  snapC = null;
  lastDragPoint = null;
  score = 0;
  combo = 0;
  comboNoClearStreak = 0;
  bestCombo = 0;
  totalLines = 0;
  totalPlaced = 0;
  level = 1;
  levelLines = 0;
  holdPiece = null;
  undoStack = [];
  nextQueue = [];
  particles = [];
  document.getElementById('cd').textContent = 'x1';
  document.getElementById('cd').style.color = '#fbbf24';
  document.getElementById('combo-badge').style.display = 'none';
  document.getElementById('grid-toast-wrap')?.replaceChildren();
  pctx.clearRect(0, 0, pcanvas.width, pcanvas.height);
  fctx.clearRect(0, 0, fcanvas.width, fcanvas.height);
  initBoard();
  fillQueue();
  popPieces();
  updateScore();
  updateUndo();
  updateDiffBar();
  applyBoardTheme(level);
  renderBoard();
  renderPieces();
  renderHold();
  renderNext();
  document.getElementById('go').classList.remove('show');
}

document.addEventListener('mousemove', (e) => {
  if (dragging) updateDragPreview(e);
});
document.addEventListener(
  'touchmove',
  (e) => {
    if (dragging) {
      e.preventDefault();
      updateDragPreview(e);
    }
  },
  { passive: false }
);
document.addEventListener('mouseup', (e) => {
  if (dragging) endDrag(e);
});
document.addEventListener('touchend', (e) => {
  if (dragging) endDrag(e);
});
document.addEventListener('touchcancel', (e) => {
  if (dragging) endDrag(e);
});

document.getElementById('hold-panel').addEventListener('mousedown', (e) => {
  if (!holdPiece || dragging) return;
  if (!e.target.closest('#hold-slot')) return;
  startDragFromHold(e);
});
document.getElementById('hold-panel').addEventListener(
  'touchstart',
  (e) => {
    if (!holdPiece || dragging) return;
    if (!e.target.closest('#hold-slot')) return;
    startDragFromHold(e);
  },
  { passive: false }
);
document.getElementById('rbtn').addEventListener('click', restart);
document.getElementById('undo-btn').addEventListener('click', doUndo);

let layoutTimer = null;
function onLayoutChange() {
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(() => {
    const ghostSpec =
      dragging && snapR != null && snapC != null ? getGhostSpec(dragging.piece, snapR, snapC) : null;
    renderBoard(ghostSpec);
    renderPieces();
    renderHold();
    renderNext();
  }, 120);
}
window.addEventListener('resize', onLayoutChange);
window.addEventListener('orientationchange', onLayoutChange);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onLayoutChange);

restart();
