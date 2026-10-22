import { colorOf, COLOR_LABEL } from './numbers.js';

/**
 * Optionale Geräusche (Rollen und Aufschlagen der Kugel) per Web Audio API
 * und Ansage per Sprachausgabe. Browser – vor allem iOS – erlauben Ton erst
 * nach einer Berührung, deshalb muss `unlock()` im Klick-Handler laufen.
 */
export function createSound() {
  let ctx = null;
  let noise = null;
  let roll = null;
  let speechUnlocked = false;

  function noiseBuffer() {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function createRoll() {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    // Leichtes Pulsieren macht aus dem Rauschen ein Rollgeräusch.
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0;
    lfo.connect(lfoDepth).connect(gain.gain);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    lfo.start();
    return { filter, gain, lfo, lfoDepth };
  }

  return {
    unlock({ sound, announce }) {
      if (sound) {
        const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
        if (!ctx && AudioCtx) {
          ctx = new AudioCtx();
          noise = noiseBuffer();
          roll = createRoll();
        }
        if (ctx?.state === 'suspended') ctx.resume();
      }
      if (announce && !speechUnlocked && 'speechSynthesis' in window) {
        // iOS spricht erst, nachdem einmal innerhalb einer Berührung gesprochen wurde.
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
        speechUnlocked = true;
      }
    },

    /** @param intensity 0 … 1 */
    setRoll(intensity) {
      if (!roll) return;
      const t = ctx.currentTime;
      const level = 0.11 * intensity ** 1.3;
      roll.gain.gain.setTargetAtTime(level, t, 0.05);
      roll.lfoDepth.gain.setTargetAtTime(level * 0.6, t, 0.05);
      roll.lfo.frequency.setTargetAtTime(6 + 26 * intensity, t, 0.05);
      roll.filter.frequency.setTargetAtTime(500 + 1400 * intensity, t, 0.05);
    },

    /** Kurzes Klacken, wenn die Kugel auf Stege und Fächer trifft. */
    click(strength = 1) {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2600 + Math.random() * 900;
      filter.Q.value = 4;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.9 * strength, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start(t, Math.random() * 0.5, 0.08);
    },

    say(text, lang = 'de-DE') {
      if (!('speechSynthesis' in window)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang.slice(0, 2)));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    },

    announceNumber(n) {
      this.say(n === 0 ? 'Zero' : `${n}, ${COLOR_LABEL[colorOf(n)]}`);
    },
  };
}
