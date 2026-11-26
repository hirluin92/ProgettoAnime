let ctx: AudioContext | null = null;

function audio(): AudioContext {
  ctx = ctx ?? new AudioContext();
  return ctx;
}

export function beep(freq: number, dur = 0.08, type: OscillatorType = "square", vol = 0.08) {
  try {
    const c = audio();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch {
    /* audio non disponibile */
  }
}

/** Glissando da una frequenza all'altra (whoosh d'ingresso, caduta del K.O.). */
export function sweep(
  from: number,
  to: number,
  dur = 0.5,
  type: OscillatorType = "sawtooth",
  vol = 0.06,
) {
  try {
    const c = audio();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch {
    /* audio non disponibile */
  }
}

/** Fanfara di vittoria: arpeggio maggiore ascendente. */
export function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => beep(f, 0.22, "triangle", 0.09), i * 120);
  });
}
