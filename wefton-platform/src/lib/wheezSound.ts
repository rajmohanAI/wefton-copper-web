// ============================================================
// Wefton Copper — Wheez's soft click (WC-Issue-13)
// Made with the Web Audio API, so there is no sound file to load.
// Browsers only allow sound after the visitor has clicked or tapped
// on the page, so before that it stays silent.
// ============================================================

let ctx: AudioContext | null = null;
let lastPlayed = 0;

/** Quiet enough to notice, not to startle. */
const VOLUME = 0.05;
/** Two messages in a row (e.g. an order card and a question) click once. */
const MIN_GAP_MS = 150;

function hasInteracted(): boolean {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : true;
}

/** A short, soft "tok", like a button being pressed. */
export function playWheezClick(): void {
  if (typeof window === 'undefined' || !hasInteracted()) return;
  const now = Date.now();
  if (now - lastPlayed < MIN_GAP_MS) return;
  lastPlayed = now;

  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.045);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(VOLUME, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  } catch {
    // Sound is a nicety; never let it break the chat.
  }
}
