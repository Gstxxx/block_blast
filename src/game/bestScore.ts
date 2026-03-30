const KEY = 'octogrid_high_score_v1';

export function readStoredBest(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeStoredBest(best: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, String(best));
  } catch {
    /* quota / private mode */
  }
}

/** Atualiza `g.best` e grava em localStorage se a pontuação atual for recorde. */
export function syncBestFromScore(g: { score: number; best: number }): void {
  if (g.score > g.best) {
    g.best = g.score;
    writeStoredBest(g.best);
  }
}
