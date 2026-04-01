export interface GameSettings {
  soundEnabled: boolean;
  shakeEnabled: boolean;
}

const KEY = 'octogrid_settings_v1';
const DEFAULTS: GameSettings = { soundEnabled: true, shakeEnabled: true };

export function readSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GameSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
