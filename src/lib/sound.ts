// src/lib/sound.ts
// Feedback suara untuk scan diterima/ditolak.
// Pakai Web Audio API murni (bukan file .mp3) supaya ringan & tetap
// jalan walau PWA sedang offline.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function beep(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.25) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Suara bukan hal kritis untuk fungsi utama app — kalau gagal, diamkan saja.
  }
}

/** Dua nada naik pendek — untuk resi yang berhasil masuk/match */
export function playAcceptedSound() {
  beep(880, 0.12);
  setTimeout(() => beep(1318, 0.15), 100);
}

/** Nada rendah berulang seperti buzzer — untuk resi ditolak/duplikat/salah */
export function playRejectedSound() {
  beep(220, 0.18, "square", 0.2);
  setTimeout(() => beep(160, 0.22, "square", 0.2), 150);
}