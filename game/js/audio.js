// 효과음: 파일 없이 브라우저에서 바로 만든다.
const SFX = (() => {
  let ctx = null, muted = false;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.15, when = 0, slide = 0) {
    const a = ac(); if (!a || muted) return;
    const t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.08, freq = 900) {
    const a = ac(); if (!a || muted) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = vol;
    s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start();
  }
  return {
    click: () => tone(660, 0.08, 'triangle', 0.12),
    blip: () => tone(880, 0.06, 'sine', 0.06),
    pour: () => noise(0.7, 0.12, 700),
    wrong: () => { tone(300, 0.12, 'square', 0.06); tone(240, 0.16, 'square', 0.06, 0.1); },
    good: () => { tone(660, 0.12, 'triangle', 0.1); tone(880, 0.16, 'triangle', 0.1, 0.09); },
    ding: () => { tone(1320, 0.6, 'sine', 0.12); tone(1980, 0.5, 'sine', 0.05, 0.02); },
    sparkle: () => { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.25, 'sine', 0.07, i * 0.07)); },
    swoosh: () => noise(0.35, 0.06, 1600),
    unlock: () => ac(),
    toggle: () => (muted = !muted),
    get muted() { return muted; }
  };
})();
