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
  const cell = Math.floor((w - 2 * pad - 7 * gap) / 8);
  const cellClamped = Math.max(26, Math.min(40, cell));
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

let board,
  score,
  best = 0,
  pieces,
  nextQueue = [],
  dragging = null;
let combo = 0,
  holdPiece = null,
  holdUsed = false;
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

function renderBoard(ghostCells = [], opts = {}) {
  if (!opts.fromMoveGhost) applyResponsiveCellSize();
  const el = document.getElementById('board');
  el.innerHTML = '';
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const d = document.createElement('div');
      const col = board[r][c];
      const isGhost = ghostCells.some(([gr, gc]) => gr === r && gc === c) && !col;
      d.className = 'cell' + (col ? ' filled' : '') + (isGhost ? ' ghost-snap' : '');
      if (col) {
        if (col === '#ff6b35') {
          d.classList.add('bomb-cell');
          const ic = document.createElement('div');
          ic.className = 'bomb-icon';
          ic.textContent = '💣';
          d.appendChild(ic);
        } else d.style.background = col;
      } else if (isGhost && dragging) {
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
  if (holdUsed) {
    slot.classList.add('used-hold');
    avail.textContent = 'usado';
    avail.style.color = '#6b7280';
  } else {
    avail.textContent = 'pronto';
    avail.style.color = '#34d399';
  }
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

function renderPieces() {
  const row = document.getElementById('pieces-row');
  row.innerHTML = '';
  const slotW = Math.min(96, Math.max(72, Math.floor(window.innerWidth * 0.26)));
  pieces.forEach((p, i) => {
    const slot = document.createElement('div');
    slot.className = 'pslot' + (p === null ? ' used' : '');
    if (p) {
      const { maxC, maxR } = getPieceBox(p);
      const dim = Math.max(maxC, maxR) + 1;
      const cs = Math.max(8, Math.min(maxC <= 2 && maxR <= 2 ? 20 : maxC <= 3 && maxR <= 3 ? 15 : 11, Math.floor((slotW - 12) / dim)));
      const mini = document.createElement('div');
      mini.className = 'pmini';
      mini.style.cssText = `grid-template-columns:repeat(${maxC + 1},${cs}px);grid-template-rows:repeat(${maxR + 1},${cs}px);gap:3px;`;
      for (let r2 = 0; r2 <= maxR; r2++)
        for (let c2 = 0; c2 <= maxC; c2++) {
          const mc = document.createElement('div');
          mc.className = 'pm-cell';
          mc.style.cssText = `width:${cs}px;height:${cs}px;`;
          const filled = p.c.some(([cc, rr]) => cc === c2 && rr === r2);
          mc.style.background = filled ? p.col : 'transparent';
          if (filled) mc.style.boxShadow = 'inset 0 1px 2px rgba(255,255,255,0.18)';
          if (p.bomb && filled) {
            mc.style.background = '#ff6b35';
            mc.textContent = '💣';
            mc.style.fontSize = '11px';
            mc.style.display = 'flex';
            mc.style.alignItems = 'center';
            mc.style.justifyContent = 'center';
          }
          mini.appendChild(mc);
        }
      slot.appendChild(mini);
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

function swapHold() {
  if (holdUsed) return;
  const fi = pieces.findIndex((p) => p !== null);
  if (fi === -1) return;
  const temp = holdPiece;
  holdPiece = pieces[fi];
  holdUsed = true;
  pieces[fi] = temp || rndShape();
  renderHold();
  renderPieces();
}

function startDrag(e, idx) {
  if (pieces[idx] === null) return;
  e.preventDefault();
  dragging = { idx, piece: pieces[idx] };
  snapR = null;
  snapC = null;
  document.querySelectorAll('.pslot')[idx]?.classList.add('drag-src');
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

function canPlace(p, r, c) {
  return p.c.every(([dc, dr]) => {
    const br = r + dr,
      bc = c + dc;
    return br >= 0 && br < ROWS && bc >= 0 && bc < COLS && !board[br][bc];
  });
}
function getGhostCells(p, r, c) {
  if (!p || !canPlace(p, r, c)) return [];
  return p.c.map(([dc, dr]) => [r + dr, c + dc]);
}

function updateDragPreview(e) {
  const finger = getClientPoint(e);
  const { r, c } = getBoardSnap(finger.x, finger.y);
  snapR = r;
  snapC = c;
  renderBoard(getGhostCells(dragging.piece, r, c), { fromMoveGhost: true });
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

function showComboBadge(c) {
  const b = document.getElementById('combo-badge');
  b.style.display = 'block';
  if (c >= 5) {
    b.style.background = '#f59e0b';
    b.textContent = 'COMBO MEGA x' + c;
  } else if (c >= 3) {
    b.style.background = '#8b5cf6';
    b.textContent = 'SUPER COMBO x' + c;
  } else {
    b.style.background = '#f472b6';
    b.textContent = 'COMBO x' + c;
  }
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = 'comboPop 0.3s ease';
  clearTimeout(b._t);
  b._t = setTimeout(() => (b.style.display = 'none'), 1400);
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
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    totalLines += cleared;
    checkLevelUp(cleared);
    const lineBonus = cleared * cleared * 10 * ((1 + level * 0.1) | 0);
    const comboBonus = combo > 1 ? Math.floor(lineBonus * (combo - 1) * 0.5) : 0;
    const pts = lineBonus + comboBonus;
    score += pts;
    if (combo > 1) {
      showComboBadge(combo);
      sndCombo(combo);
    }
    syncLayoutMetrics();
    showScorePop(pts, padPx + pc * CELL + cellPx / 2, padPx + pr * CELL - Math.max(8, cellPx * 0.25));
    document.getElementById('cd').textContent = 'x' + combo;
    document.getElementById('cd').style.color = combo >= 5 ? '#f59e0b' : combo >= 3 ? '#a78bfa' : '#fbbf24';
    return true;
  } else {
    combo = 0;
    document.getElementById('cd').textContent = 'x1';
    document.getElementById('cd').style.color = '#fbbf24';
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
  btn.textContent = 'Desfazer (' + undoStack.length + ')';
  btn.disabled = undoStack.length === 0;
}

function doUndo() {
  if (!undoStack.length) return;
  const s = undoStack.pop();
  board = s.board;
  score = s.score;
  pieces = s.pieces;
  combo = s.combo;
  totalLines = s.tl;
  level = s.lv;
  levelLines = s.ll;
  updateScore();
  updateUndo();
  updateDiffBar();
  renderBoard();
  renderPieces();
}

function checkGameOver() {
  const avail = pieces.filter((p) => p !== null);
  const ok = avail.some((p) => {
    if (p.bomb) return true;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (canPlace(p, r, c)) return true;
    return false;
  });
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
  const finger = getClientPoint(e);
  const { r, c } = getBoardSnap(finger.x, finger.y);
  const canDrop = dragging.piece.bomb ? r >= 0 && r < ROWS && c >= 0 && c < COLS : canPlace(dragging.piece, r, c);
  if (canDrop) {
    undoStack.push({
      board: cloneBoard(),
      score,
      pieces: clonePieces(),
      combo,
      tl: totalLines,
      lv: level,
      ll: levelLines,
    });
    if (undoStack.length > 10) undoStack.shift();
    updateUndo();
    holdUsed = false;
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
    pieces[dragging.idx] = null;
    clearLines(r, c);
    if (pieces.every((p) => p === null)) {
      popPieces();
      holdUsed = false;
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
}

function restart() {
  score = 0;
  combo = 0;
  bestCombo = 0;
  totalLines = 0;
  totalPlaced = 0;
  level = 1;
  levelLines = 0;
  holdPiece = null;
  holdUsed = false;
  undoStack = [];
  nextQueue = [];
  particles = [];
  document.getElementById('cd').textContent = 'x1';
  document.getElementById('cd').style.color = '#fbbf24';
  document.getElementById('combo-badge').style.display = 'none';
  pctx.clearRect(0, 0, pcanvas.width, pcanvas.height);
  fctx.clearRect(0, 0, fcanvas.width, fcanvas.height);
  initBoard();
  fillQueue();
  popPieces();
  updateScore();
  updateUndo();
  updateDiffBar();
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

document.getElementById('hold-slot').addEventListener('click', swapHold);
document.getElementById('hold-piece-btn').addEventListener('click', swapHold);
document.getElementById('rbtn').addEventListener('click', restart);
document.getElementById('undo-btn').addEventListener('click', doUndo);

let layoutTimer = null;
function onLayoutChange() {
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(() => {
    const ghostCells =
      dragging && snapR != null && snapC != null ? getGhostCells(dragging.piece, snapR, snapC) : [];
    renderBoard(ghostCells);
    renderPieces();
    renderHold();
    renderNext();
  }, 120);
}
window.addEventListener('resize', onLayoutChange);
window.addEventListener('orientationchange', onLayoutChange);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onLayoutChange);

restart();
