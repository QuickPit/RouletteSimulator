import { POCKET_COUNT } from './numbers.js';

const RANGE = 2 ** 32;

function cryptoUint32() {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0];
}

/**
 * Gleichverteilte Ganzzahl in [0, max) aus dem kryptografisch sicheren
 * Zufallsgenerator. Werte oberhalb des letzten vollständigen Vielfachen von
 * `max` werden verworfen (Rejection Sampling), damit es keinen Modulo-Bias gibt.
 */
export function randomInt(max, nextUint32 = cryptoUint32) {
  if (!Number.isInteger(max) || max < 1 || max > RANGE) {
    throw new RangeError(`max muss eine Ganzzahl zwischen 1 und 2^32 sein, war ${max}`);
  }
  const limit = RANGE - (RANGE % max);
  for (;;) {
    const value = nextUint32();
    if (value < limit) return value % max;
  }
}

/** Zieht die nächste Roulette-Zahl (0–36). */
export function drawNumber(nextUint32) {
  return randomInt(POCKET_COUNT, nextUint32);
}
