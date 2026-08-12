// Reprodutor central de efeitos sonoros procedurais (Web Audio API).
// Mantém um único AudioContext e evita spam com throttle por id.

let ctx: AudioContext | null = null;
const lastPlayed = new Map<string, number>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  c: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.25,
  when = 0,
  glideTo?: number,
) {
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const players: Record<string, (c: AudioContext) => void> = {
  click: (c) => tone(c, 900, 0.05, "square", 0.15),
  "level-up": (c) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, f, 0.18, "square", 0.2, i * 0.08));
  },
  notification: (c) => {
    tone(c, 880, 0.1, "sine", 0.25);
    tone(c, 1320, 0.15, "sine", 0.25, 0.12);
  },
  // Coin: dois tons rápidos ascendentes, brilhantes tipo moeda de arcade.
  coin: (c) => {
    tone(c, 988, 0.07, "square", 0.22);
    tone(c, 1319, 0.14, "square", 0.22, 0.06);
  },
  // Swipe: varredura curta de frequência (whoosh curto).
  swipe: (c) => tone(c, 1200, 0.18, "sine", 0.2, 0, 300),
};

/** Toca um efeito por id. `throttleMs` evita disparos repetidos rápidos. */
export function playSfx(id: keyof typeof players | string, throttleMs = 400) {
  const player = players[id];
  if (!player) return;
  const now = Date.now();
  const last = lastPlayed.get(id) ?? 0;
  if (now - last < throttleMs) return;
  lastPlayed.set(id, now);
  try {
    const c = getCtx();
    if (c) player(c);
  } catch {
    // silêncio: alguns browsers exigem gesto do usuário antes de tocar
  }
}
