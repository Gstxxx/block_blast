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

function tone(
  f: number,
  d: number,
  t: OscillatorType = 'sine',
  v = 0.13
): void {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = t;
  o.frequency.value = f;
  g.gain.setValueAtTime(v, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d);
  o.connect(g);
  g.connect(a.destination);
  o.start();
  o.stop(a.currentTime + d);
}

export function sndPlace(): void {
  tone(200, 0.07, 'square', 0.09);
}

export function sndClear(n: number): void {
  [380, 520, 680, 860].slice(0, n).forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.15), i * 55));
}

export function sndCombo(c: number): void {
  tone(280 + c * 75, 0.22, 'triangle', 0.18);
}

export function sndBomb(): void {
  tone(70, 0.28, 'sawtooth', 0.18);
  tone(150, 0.18, 'square', 0.12);
}

export function sndOver(): void {
  [280, 230, 185, 140].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'sine', 0.09), i * 110));
}

export function sndLevel(): void {
  [440, 550, 660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.14), i * 70));
}
