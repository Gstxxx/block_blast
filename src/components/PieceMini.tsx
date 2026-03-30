import { pieceCellStyle } from '../game/assets.js';
import { getPieceBox } from '../game/pieceUtils.js';
import type { Piece } from '../game/types.js';

export interface PieceMiniProps {
  piece: Piece | null;
  slotW: number;
  boardMode: boolean;
  cellPx?: number;
  gapPx?: number;
}

export function PieceMini({ piece, slotW, boardMode, cellPx = 32, gapPx = 3 }: PieceMiniProps) {
  if (!piece) return null;
  const { maxC, maxR } = getPieceBox(piece);
  let cs: number;
  let gap: number;
  let bombFs: string;
  if (boardMode) {
    cs = cellPx;
    gap = gapPx;
    bombFs = Math.max(11, Math.round(cs * 0.42)) + 'px';
  } else {
    gap = 3;
    const dim = Math.max(maxC, maxR) + 1;
    cs = Math.max(
      8,
      Math.min(
        maxC <= 2 && maxR <= 2 ? 20 : maxC <= 3 && maxR <= 3 ? 15 : 11,
        Math.floor((slotW - 12) / dim)
      )
    );
    bombFs = '11px';
  }
  const miniClass = 'pmini' + (boardMode ? ' pmini-board' : '');
  return (
    <div
      className={miniClass}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${maxC + 1}, ${cs}px)`,
        gridTemplateRows: `repeat(${maxR + 1}, ${cs}px)`,
        gap: `${gap}px`,
      }}
    >
      {Array.from({ length: (maxR + 1) * (maxC + 1) }, (_, i) => {
        const c2 = i % (maxC + 1);
        const r2 = Math.floor(i / (maxC + 1));
        const filled = piece.c.some(([cc, rr]) => cc === c2 && rr === r2);
        return (
          <div
            key={`${r2}-${c2}`}
            className={filled ? 'pm-cell pm-filled' : 'pm-cell'}
            style={{
              width: `${cs}px`,
              height: `${cs}px`,
              borderRadius: boardMode ? '6px' : undefined,
              overflow: filled ? 'hidden' : undefined,
              ...(filled ? pieceCellStyle(piece.col) : { background: 'transparent' }),
              boxShadow: filled ? 'inset 0 1px 2px rgba(255,255,255,0.18)' : undefined,
              fontSize:
                (piece.bomb || piece.clearRow || piece.clearCol) && filled ? bombFs : undefined,
              display:
                (piece.bomb || piece.clearRow || piece.clearCol) && filled ? 'flex' : undefined,
              alignItems:
                (piece.bomb || piece.clearRow || piece.clearCol) && filled ? 'center' : undefined,
              justifyContent:
                (piece.bomb || piece.clearRow || piece.clearCol) && filled ? 'center' : undefined,
            }}
          >
            {piece.bomb && filled
              ? '💣'
              : piece.clearRow && filled
                ? '↔'
                : piece.clearCol && filled
                  ? '↕'
                  : null}
          </div>
        );
      })}
    </div>
  );
}

export function NextMini({ piece }: { piece: Piece | null }) {
  if (!piece) return null;
  const { maxC, maxR } = getPieceBox(piece);
  const cs = Math.min(10, Math.floor(48 / (Math.max(maxC, maxR) + 1)));
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${maxC + 1}, ${cs}px)`,
        gridTemplateRows: `repeat(${maxR + 1}, ${cs}px)`,
        gap: '2px',
      }}
    >
      {Array.from({ length: (maxR + 1) * (maxC + 1) }, (_, i) => {
        const c2 = i % (maxC + 1);
        const r2 = Math.floor(i / (maxC + 1));
        const filled = piece.c.some(([cc, rr]) => cc === c2 && rr === r2);
        return (
          <div
            key={`${r2}-${c2}`}
            className={filled ? 'next-mini-fill' : undefined}
            style={{
              width: `${cs}px`,
              height: `${cs}px`,
              borderRadius: '2px',
              overflow: 'hidden',
              ...(filled ? pieceCellStyle(piece.col) : { background: 'transparent' }),
            }}
          />
        );
      })}
    </div>
  );
}

export function HoldMini({ piece }: { piece: Piece | null }) {
  if (!piece) return null;
  const { maxC, maxR } = getPieceBox(piece);
  const cs = maxC <= 2 && maxR <= 2 ? 13 : 10;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${maxC + 1}, ${cs}px)`,
        gridTemplateRows: `repeat(${maxR + 1}, ${cs}px)`,
        gap: '2px',
      }}
    >
      {Array.from({ length: (maxR + 1) * (maxC + 1) }, (_, i) => {
        const c2 = i % (maxC + 1);
        const r2 = Math.floor(i / (maxC + 1));
        const filled = piece.c.some(([cc, rr]) => cc === c2 && rr === r2);
        return (
          <div
            key={`${r2}-${c2}`}
            className={filled ? 'hold-mini-fill' : undefined}
            style={{
              width: `${cs}px`,
              height: `${cs}px`,
              borderRadius: '2px',
              overflow: 'hidden',
              ...(filled ? pieceCellStyle(piece.col) : { background: 'transparent' }),
            }}
          />
        );
      })}
    </div>
  );
}
