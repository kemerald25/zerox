/* eslint-disable @typescript-eslint/no-explicit-any */
// Simple sound helpers using the Web Audio API. No assets required.
// All functions are safe to call multiple times; the audio context is created lazily on first use.

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let volume: number = 0.8; // 0..1
let muted: boolean = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  return audioContext;
}

function ensureMaster(): { ctx: AudioContext, out: GainNode } | null {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }
  return { ctx, out: masterGain };
}

function playTone(
  frequency: number,
  durationMs: number,
  options?: { type?: OscillatorType; startAt?: number; gain?: number }
): void {
  const nodes = ensureMaster();
  if (!nodes) return;
  const { ctx, out } = nodes;

  const now = ctx.currentTime + (options?.startAt ?? 0);
  const duration = Math.max(0, durationMs) / 1000;

  // Slight humanization for a more natural feel
  const cents = (Math.random() - 0.5) * 4; // +/- 2 cents
  const freqHuman = frequency * Math.pow(2, cents / 1200);

  // Dual oscillator for richer timbre
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = options?.type ?? 'triangle';
  osc2.type = options?.type ?? 'triangle';
  osc1.frequency.setValueAtTime(freqHuman, now);
  osc2.frequency.setValueAtTime(freqHuman * 2, now); // octave above for brightness

  // Filter to tame highs
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(4000, now);
  filter.Q.setValueAtTime(0.7, now);

  // Per-voice gain envelope
  const voiceGain = ctx.createGain();
  const peak = options?.gain ?? 0.08;
  voiceGain.gain.setValueAtTime(0.0001, now);
  voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + 0.008);
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(voiceGain);
  voiceGain.connect(out);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration + 0.02);
  osc2.stop(now + duration + 0.02);
}

function playSequence(
  parts: Array<{ freq: number; dur: number; type?: OscillatorType; gain?: number }>,
  startDelayMs = 0
): void {
  let offset = startDelayMs;
  for (const part of parts) {
    playTone(part.freq, part.dur, { type: part.type, startAt: offset / 1000, gain: part.gain });
    offset += part.dur;
  }
}

export function playMove(): void {
  // Snappy UI click
  playSequence([
    { freq: 740, dur: 50, type: 'square' },
    { freq: 987, dur: 40, type: 'triangle' },
  ]);
}

export function playAIMove(): void {
  // Subtler, lower UI click
  playSequence([
    { freq: 392, dur: 55, type: 'square' },
    { freq: 523.25, dur: 45, type: 'triangle' },
  ]);
}

export function playWin(): void {
  // Cheerful arpeggio
  playSequence([
    { freq: 523.25, dur: 100, type: 'triangle' },  // C5
    { freq: 659.25, dur: 100, type: 'triangle' },  // E5
    { freq: 783.99, dur: 130, type: 'triangle' }, // G5
    { freq: 1046.5, dur: 180, type: 'sine' },    // C6
  ]);
}

export function playLoss(): void {
  // Soft minor fall
  playSequence([
    { freq: 392.0, dur: 140, type: 'sine' },  // G4
    { freq: 329.63, dur: 120, type: 'sine' }, // E4
    { freq: 261.63, dur: 140, type: 'sine' }, // C4
  ]);
}

export function playDraw(): void {
  // Neutral, short chime
  playSequence([
    { freq: 587.33, dur: 110, type: 'sine' }, // D5
    { freq: 587.33, dur: 120, type: 'triangle' },
  ]);
}

export function playReset(): void {
  // Quick up-down sweep
  playSequence([
    { freq: 440, dur: 60, type: 'square' },
    { freq: 660, dur: 70, type: 'square' },
    { freq: 440, dur: 80, type: 'square' },
  ]);
}

// Optionally expose a manual resume to unlock audio on iOS/Safari.
export async function resumeAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {}
  }
  ensureMaster();
}

// Volume/mute controls
export function setVolume(newVolume: number): void {
  const nodes = ensureMaster();
  if (!nodes) return;
  volume = Math.min(1, Math.max(0, newVolume));
  if (!muted) {
    nodes.out.gain.setTargetAtTime(volume, nodes.ctx.currentTime, 0.01);
  }
}

export function getVolume(): number {
  return volume;
}

export function setMuted(nextMuted: boolean): void {
  const nodes = ensureMaster();
  if (!nodes) {
    muted = nextMuted;
    return;
  }
  muted = nextMuted;
  const target = muted ? 0 : volume;
  nodes.out.gain.setTargetAtTime(target, nodes.ctx.currentTime, 0.01);
}

export function toggleMute(): void {
  setMuted(!muted);
}


