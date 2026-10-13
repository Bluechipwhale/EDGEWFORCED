// ==============================================================================
// EDGEWFORCE - AUDIO CHIME & EMERGENCY ALARM SYNTHESIZER
// Web Audio API Synthesizer (Zero External Audio File Dependency)
// ==============================================================================

let isMuted = localStorage.getItem('ewf_audio_muted') === 'true';

export function toggleAudioMute() {
  isMuted = !isMuted;
  localStorage.setItem('ewf_audio_muted', isMuted ? 'true' : 'false');
  return isMuted;
}

export function isAudioMuted() {
  return isMuted;
}

/**
 * Plays a pleasant enterprise notification chime.
 */
export function playNotificationChime() {
  if (isMuted) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.00, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.22); // D6

    gainNode.gain.setValueAtTime(0.04, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.08);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  } catch {
    // Graceful fallback
  }
}

/**
 * Plays high-urgency SOS emergency alarm (cannot be muted for responders).
 */
export function playSOSAlarm() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.linearRampToValueAtTime(450, now + 0.25);
    osc.frequency.linearRampToValueAtTime(900, now + 0.50);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.75);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  } catch {
    // Graceful fallback
  }
}
