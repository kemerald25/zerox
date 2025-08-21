/* eslint-disable @typescript-eslint/no-explicit-any */
// Simple sound helpers using the Web Audio API. No assets required.
// All functions are safe to call multiple times; the audio context is created lazily on first use.

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  durationMs: number,
  options?: { type?: OscillatorType; startAt?: number; gain?: number }
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + (options?.startAt ?? 0);
  const duration = Math.max(0, durationMs) / 1000;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = options?.type ?? 'sine';
  oscillator.frequency.setValueAtTime(frequency, now);

  const gainValue = options?.gain ?? 0.06;
  // Quick attack and exponential decay to avoid clicks.
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
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
  // Bright, short tick
  playSequence([
    { freq: 660, dur: 60, type: 'triangle' },
    { freq: 880, dur: 50, type: 'triangle' },
  ]);
}

export function playAIMove(): void {
  // Slightly lower tone
  playSequence([
    { freq: 440, dur: 60, type: 'triangle' },
    { freq: 523.25, dur: 50, type: 'triangle' },
  ]);
}

export function playWin(): void {
  // Small ascending arpeggio
  playSequence([
    { freq: 523.25, dur: 90, type: 'sine' },  // C5
    { freq: 659.25, dur: 90, type: 'sine' },  // E5
    { freq: 783.99, dur: 120, type: 'sine' }, // G5
    { freq: 1046.5, dur: 160, type: 'sine' }, // C6
  ]);
}

export function playLoss(): void {
  // Small descending tones
  playSequence([
    { freq: 392.0, dur: 120, type: 'sine' },  // G4
    { freq: 329.63, dur: 100, type: 'sine' }, // E4
    { freq: 261.63, dur: 120, type: 'sine' }, // C4
  ]);
}

export function playDraw(): void {
  // Neutral chime
  playSequence([
    { freq: 523.25, dur: 100, type: 'sine' },
    { freq: 523.25, dur: 120, type: 'sine' },
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
}


