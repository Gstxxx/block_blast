import { useEffect, useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useBlockBlastGame } from './hooks/useBlockBlastGame.js';
import { pieceCellStyle } from './game/assets.js';
import { applyLevelPaletteToDom, getLevelPalette } from './game/theme.js';
import { COLS, ROWS } from './game/constants.js';
import { HoldMini, NextMini, PieceMini } from './components/PieceMini.js';

export default function App() {
  const {
    gameRef,
    gwRef,
    boardWrapRef,
    boardRef,
    holdSlotRef,
    pcanvasRef,
    fcanvasRef,
    ghostSpec,
    lineClearPreview,
    layoutRef,
    startDrag,
    startDragFromHold,
    restart,
    doUndo,
  } = useBlockBlastGame();

  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 400);
  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const g = gameRef.current;
  const slotW = Math.min(96, Math.max(72, Math.floor(vw * 0.26)));

  useLayoutEffect(() => {
    const gw = gwRef.current;
    const b = boardRef.current;
    if (gw && b)
      applyLevelPaletteToDom(gw, b, getLevelPalette(gameRef.current.level, gameRef.current.themeSeed));
  }, []);

  const linesPerLevel = 10;
  const diffProg = Math.min(1, g.levelLines / linesPerLevel);
  const remaining = linesPerLevel - g.levelLines;
  const comboColor = g.combo >= 5 ? '#f59e0b' : g.combo >= 3 ? '#a78bfa' : '#fbbf24';
  const comboDisplay = g.combo === 0 ? 1 : g.combo;
  const comboFx = g.combo > 0 ? Math.min(g.combo / 10, 1) : 0;
  const rgbParty = g.combo >= 10;

  useEffect(() => {
    document.body.classList.toggle('combo-rgb-global', rgbParty);
    return () => document.body.classList.remove('combo-rgb-global');
  }, [rgbParty]);

  const undoN = g.undoStack.length;
  const undoTip = undoN ? `Desfazer (${undoN} restante${undoN > 1 ? 's' : ''})` : 'Nada para desfazer';

  const { cellPx, gapPx } = layoutRef.current;

  const showLineClearHint =
    lineClearPreview &&
    (lineClearPreview.rows.length > 0 || lineClearPreview.cols.length > 0);

  return (
    <div
      id="gw"
      ref={gwRef}
      style={
        {
          '--combo-fx': String(comboFx),
        } as CSSProperties
      }
    >
      <div className="combo-screen-fx" aria-hidden />
      <button
        type="button"
        id="undo-btn"
        className="undo-icon-btn"
        disabled={undoN === 0}
        aria-label={undoTip}
        title={undoTip}
        onClick={doUndo}
      >
        <span aria-hidden="true">↩</span>
      </button>
      <header id="hud-minimal" aria-label="Estatísticas">
        <div className="hud-top-row">
          <div className="hud-corner-left">
            <div className="hud-left-cluster">
              <div className="hud-mini-block">
                <span className="hud-lbl">Nível</span>
                <span className="hud-val-compact" id="lvd">
                  {g.level}
                </span>
              </div>
              <div className="hud-mini-block">
                <span className="hud-lbl">Linhas</span>
                <span className="hud-val-compact" id="ld">
                  {g.totalLines}
                </span>
              </div>
            </div>
          </div>
          <div className="hud-score-center">
            <div className="hud-best-row" title="Máxima">
              <span className="hud-crown" aria-hidden>
                👑
              </span>
              <span className="hud-best-val" id="bd">
                {g.best}
              </span>
            </div>
            <div className="hud-current-stack">
              <span className="hud-val-current" id="sd">
                {g.score}
              </span>
            </div>
          </div>
          <div className="hud-corner-spacer" aria-hidden />
        </div>
        <div className="hud-sub">
          <span id="cd" style={{ color: comboColor }}>
            ×{comboDisplay}
          </span>
          <span className="hud-sub-sep" aria-hidden>
            ·
          </span>
          <span id="diff-next">{remaining > 0 ? `${remaining}→nível` : 'máx'}</span>
        </div>
        <div id="diff-bar">
          <div id="diff-track">
            <div id="diff-fill" style={{ width: `${diffProg * 100}%` }} />
          </div>
        </div>
      </header>
      <div id="mid">
        <div id="top-rail">
          <div id="next-panel">
            <div className="panel-lbl panel-lbl-min">Próximas</div>
            <div id="next-slots">
              {g.nextQueue.slice(0, 3).map((p, i) => (
                <div key={i} className="next-slot">
                  <NextMini piece={p} />
                </div>
              ))}
            </div>
          </div>
          <div id="hold-panel">
            <div className="panel-lbl panel-lbl-min">Reserva</div>
            <div
              id="hold-slot"
              ref={holdSlotRef}
              className={g.holdPiece ? 'has-piece' : ''}
              style={
                g.holdPiece
                  ? { borderStyle: 'solid', borderColor: '#34d399' }
                  : { borderStyle: 'dashed', borderColor: '#2a2a50' }
              }
              onMouseDown={(e) => startDragFromHold(e.nativeEvent)}
              onTouchStart={(e) => startDragFromHold(e.nativeEvent)}
            >
              <div id="hold-mini">{g.holdPiece ? <HoldMini piece={g.holdPiece} /> : null}</div>
              <div
                id="hold-avail"
                style={{
                  color: g.holdPiece ? '#34d399' : '#4b5563',
                }}
              >
                {g.holdPiece ? 'arraste → tabuleiro' : 'vazio'}
              </div>
            </div>
          </div>
        </div>
        <div id="board-wrap" ref={boardWrapRef}>
          <div id="grid-toast-wrap" aria-live="polite">
            {g.gridToasts.map((t) =>
              t.kind === 'line' ? (
                <div key={t.id} className="grid-toast-item" data-toast-id={t.id}>
                  <div className="grid-toast-main">{t.main}</div>
                  {t.sub ? <div className="grid-toast-sub">{t.sub}</div> : null}
                </div>
              ) : (
                <div key={t.id} className="grid-toast-item" data-toast-id={t.id}>
                  <div
                    className={
                      'grid-toast-combo ' +
                      (t.combo >= 5 ? 'combo-orange' : t.combo >= 3 ? 'combo-purple' : 'combo-pink')
                    }
                  >
                    {t.combo >= 5
                      ? 'MEGA ×' + t.combo
                      : t.combo >= 3
                        ? 'SUPER ×' + t.combo
                        : 'COMBO ×' + t.combo}
                  </div>
                </div>
              )
            )}
          </div>
          <canvas id="pcanvas" ref={pcanvasRef} width={1} height={1} />
          <canvas id="flash-canvas" ref={fcanvasRef} width={1} height={1} />
          <div id="board" ref={boardRef}>
            {Array.from({ length: ROWS * COLS }, (_, i) => {
              const r = Math.floor(i / COLS);
              const c = i % COLS;
              const col = g.board[r]![c]!;
              const cells = ghostSpec?.cells ?? [];
              const valid = ghostSpec?.valid ?? true;
              const inGhost = cells.some(([gr, gc]) => gr === r && gc === c);
              let ghostClass = '';
              if (g.dragging && inGhost) {
                if (col) {
                  if (!valid) ghostClass = ' ghost-invalid-overlap';
                } else {
                  ghostClass = valid ? ' ghost-preview' : ' ghost-preview-invalid';
                }
              }
              const bounceKey = `${r},${c}`;
              const bounce = g.bouncing[bounceKey];
              const onScoringLine =
                showLineClearHint &&
                lineClearPreview &&
                (lineClearPreview.rows.includes(r) || lineClearPreview.cols.includes(c));
              return (
                <div
                  key={`${r}-${c}-${bounce ? 'b' : 'n'}`}
                  className={
                    'cell' +
                    (col ? ' filled' : '') +
                    ghostClass +
                    (bounce ? ' drop-bounce' : '') +
                    (onScoringLine ? ' line-clear-hint' : '')
                  }
                  data-r={r}
                  data-c={c}
                  style={
                    col
                      ? pieceCellStyle(col)
                      : inGhost && g.dragging && !col
                        ? pieceCellStyle(g.dragging.piece.col)
                        : undefined
                  }
                >
                  {col === '#ff6b35' ? <div className="bomb-icon">💣</div> : null}
                </div>
              );
            })}
          </div>
          <div id="score-pop-wrap" />
          <div id="go" className={g.gameOver ? 'show' : ''}>
            <h2>Fim de jogo</h2>
            <div id="stats-list">
              <div className="stat-row">
                <span>Pontuação final</span>
                <span>{g.score}</span>
              </div>
              <div className="stat-row">
                <span>Nível alcançado</span>
                <span>{g.level}</span>
              </div>
              <div className="stat-row">
                <span>Melhor combo</span>
                <span>×{g.bestCombo}</span>
              </div>
              <div className="stat-row">
                <span>Linhas limpas</span>
                <span>{g.totalLines}</span>
              </div>
              <div className="stat-row">
                <span>Peças colocadas</span>
                <span>{g.totalPlaced}</span>
              </div>
            </div>
            <div id="lb-section">
              <h3>Ranking</h3>
              <div id="lb-rows">
                {g.leaderboard.map((s, i) => (
                  <div key={i} className="lb-row">
                    <span>{i === 0 ? 'Campeão' : '#' + (i + 1)}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <button type="button" id="rbtn" onClick={restart}>
              Jogar de novo
            </button>
          </div>
        </div>
      </div>
      <div id="pieces-row">
        {g.pieces.map((p, i) => (
          <div
            key={i}
            className={'pslot' + (p === null ? ' used' : '')}
            onMouseDown={(e) => startDrag(e.nativeEvent, i)}
            onTouchStart={(e) => startDrag(e.nativeEvent, i)}
          >
            {p ? (
              <>
                <PieceMini piece={p} slotW={slotW} boardMode={false} />
                <div
                  style={{
                    fontSize: '10px',
                    color: '#6b7280',
                    marginTop: '3px',
                  }}
                >
                  {p.bomb
                    ? 'Bomba'
                    : p.clearRow
                      ? 'Limpeza horizontal'
                      : p.clearCol
                        ? 'Limpeza vertical'
                        : p.c.length + ' ' + (p.c.length > 1 ? 'blocos' : 'bloco')}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
      {g.dragging &&
        createPortal(
          <div
            id="drag-float"
            className={rgbParty ? 'drag-float-rgb' : undefined}
            style={{
              left: g.floatX + 'px',
              top: g.floatY + 'px',
            }}
          >
            <PieceMini piece={g.dragging.piece} slotW={0} boardMode cellPx={cellPx} gapPx={gapPx} />
          </div>,
          document.body
        )}
    </div>
  );
}
