// Ringtone / ringback generated with WebAudio — no assets needed.
type Handle = { stop: () => void };

function makeCtx(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
}

/** Two-tone incoming call ring, repeating. Also vibrates when supported. */
export function playIncomingRing(): Handle {
  const ctx = makeCtx();
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const beep = () => {
    if (!ctx || stopped) return;
    const t = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = t + i * 0.42;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.05);
      gain.gain.linearRampToValueAtTime(0, start + 0.38);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  };

  const vibrate = () => {
    try { navigator.vibrate?.([300, 200, 300, 900]); } catch { /* */ }
  };

  beep(); vibrate();
  timer = setInterval(() => { beep(); vibrate(); }, 2200);

  return {
    stop: () => {
      stopped = true;
      if (timer) clearInterval(timer);
      try { navigator.vibrate?.(0); } catch { /* */ }
      ctx?.close().catch(() => {});
    },
  };
}

/** Soft outgoing "ringback" pulse for the caller while waiting. */
export function playRingback(): Handle {
  const ctx = makeCtx();
  let stopped = false;
  const timer = setInterval(() => {
    if (!ctx || stopped) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.08);
    gain.gain.linearRampToValueAtTime(0, t + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1);
  }, 3000);

  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
      ctx?.close().catch(() => {});
    },
  };
}
