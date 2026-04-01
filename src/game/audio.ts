const URL_PLACE = '/Audio/impactPlate_light_000.ogg';
const URL_NEW_GAME = '/Audio/jingles_PIZZI00.ogg';
const URL_GAME_OVER = '/Audio/jingles_NES13.ogg';
const URL_SCORE = '/Audio/jingles_SAX10.ogg';

let _soundEnabled = true;

export function setSoundEnabled(v: boolean): void {
  _soundEnabled = v;
}

const AC: (typeof AudioContext) | undefined =
  typeof window !== 'undefined'
    ? window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    : undefined;

let actx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (!actx && AC) {
    try {
      actx = new AC();
    } catch {
      /* ignore */
    }
  }
  return actx;
}

function playUrl(path: string): void {
  if (!_soundEnabled) return;
  try {
    const a = new Audio(encodeURI(path));
    a.volume = 0.92;
    void a.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Colocar peça sem limpar linhas (sem “pontuar” no sentido de combo/linhas). */
export function sndPlace(): void {
  playUrl(URL_PLACE);
}

export function sndScore(): void {
  playUrl(URL_SCORE);
}

export function sndNewGame(): void {
  playUrl(URL_NEW_GAME);
}

export function sndOver(): void {
  playUrl(URL_GAME_OVER);
}

/**
 * Jingle 8-bit (ondas quadradas) ao surgir combo; pitch sobe com o multiplicador e com a pontuação da jogada.
 */
export function sndCombo8bit(combo: number, scoreThisClear = 0): void {
  if (!_soundEnabled) return;
  const a = ac();
  if (!a) return;
  if (a.state === 'suspended') void a.resume();
  const t0 = a.currentTime;
  const c = Math.max(1, Math.min(20, combo));
  const pitchBoost = Math.min(180, Math.log1p(scoreThisClear) * 18);
  const baseHz = 130 + (c - 1) * 38 + pitchBoost;
  const steps = [0, 3, 7, 10, 12, 15];
  const vol = 0.11;

  steps.forEach((semi, i) => {
    const f = baseHz * Math.pow(2, semi / 12);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'square';
    o.frequency.value = f;
    const start = t0 + i * 0.065;
    g.gain.setValueAtTime(0.0008, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, start + 0.09);
    o.connect(g);
    g.connect(a.destination);
    o.start(start);
    o.stop(start + 0.095);
  });
}
