import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomInt, drawNumber } from '../js/rng.js';

test('drawNumber liefert nur Ganzzahlen von 0 bis 36', () => {
  for (let i = 0; i < 100_000; i++) {
    const n = drawNumber();
    assert.ok(Number.isInteger(n) && n >= 0 && n <= 36, `ungültig: ${n}`);
  }
});

test('Werte im unvollständigen letzten Block werden verworfen', () => {
  // 2^32 mod 37 = 7 → die obersten 7 Werte erzeugen einen Bias und müssen verworfen werden.
  assert.equal(2 ** 32 % 37, 7);
  const values = [2 ** 32 - 1, 2 ** 32 - 7, 2 ** 32 - 8];
  const n = randomInt(37, () => values.shift());
  assert.equal(values.length, 0, 'alle drei Werte wurden gelesen');
  assert.equal(n, (2 ** 32 - 8) % 37);
});

test('ungültige Grenzen werden abgelehnt', () => {
  assert.throws(() => randomInt(0), RangeError);
  assert.throws(() => randomInt(1.5), RangeError);
});

test('Gleichverteilung (Chi-Quadrat-Test über 1 Mio. Ziehungen)', () => {
  const draws = 1_000_000;
  const counts = new Array(37).fill(0);
  for (let i = 0; i < draws; i++) counts[drawNumber()]++;
  const expected = draws / 37;
  const chi2 = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
  // 36 Freiheitsgrade: kritischer Wert für p = 0,0001 liegt bei ≈ 77,6.
  assert.ok(chi2 < 77.6, `Chi² = ${chi2.toFixed(1)} deutet auf ungleiche Verteilung hin`);
});

test('aufeinanderfolgende Ziehungen sind unabhängig (Chi-Quadrat über alle 37×37 Paare)', () => {
  const draws = 1_000_000;
  const pairs = new Float64Array(37 * 37);
  let prev = drawNumber();
  let repeats = 0;
  for (let i = 0; i < draws; i++) {
    const n = drawNumber();
    pairs[prev * 37 + n]++;
    if (n === prev) repeats++;
    prev = n;
  }
  const expected = draws / pairs.length;
  const chi2 = pairs.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
  // 1368 Freiheitsgrade: kritischer Wert für p = 0,0001 liegt bei ≈ 1580.
  assert.ok(chi2 < 1580, `Chi² = ${chi2.toFixed(0)} deutet auf Abhängigkeit zwischen Ziehungen hin`);
  // Direkte Wiederholung muss mit 1/37 ≈ 2,70 % auftreten.
  assert.ok(Math.abs(repeats / draws - 1 / 37) < 0.001, `Wiederholungsrate ${(repeats / draws * 100).toFixed(3)} %`);
});
