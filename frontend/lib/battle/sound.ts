let ctx: AudioContext | null = null;

export function beep(freq: number, dur = 0.08, type: OscillatorType = "square", vol = 0.08) {
  try {
    ctx = ctx ?? new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {
    /* audio non disponibile */
  }
}
