import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WHEEL_ORDER, POCKET_COUNT, colorOf, frenchTerms } from '../js/numbers.js';

test('Kessel enthält jede Zahl von 0 bis 36 genau einmal', () => {
  assert.equal(POCKET_COUNT, 37);
  assert.deepEqual([...WHEEL_ORDER].sort((a, b) => a - b), Array.from({ length: 37 }, (_, i) => i));
});

test('18 rote, 18 schwarze Zahlen und eine grüne Zero', () => {
  const counts = { red: 0, black: 0, green: 0 };
  for (let n = 0; n <= 36; n++) counts[colorOf(n)]++;
  assert.deepEqual(counts, { red: 18, black: 18, green: 1 });
});

test('Farben wechseln im Kessel zwischen Rot und Schwarz ab', () => {
  for (let i = 1; i < WHEEL_ORDER.length - 1; i++) {
    assert.notEqual(colorOf(WHEEL_ORDER[i]), colorOf(WHEEL_ORDER[i + 1]));
  }
  assert.equal(colorOf(WHEEL_ORDER[1]), 'red'); // 32 rechts neben der Zero
  assert.equal(colorOf(WHEEL_ORDER[36]), 'black'); // 26 links neben der Zero
});

test('französische Begriffe', () => {
  assert.deepEqual(frenchTerms(0), ['Zéro']);
  assert.deepEqual(frenchTerms(17), ['Noir', 'Impair', 'Manque']);
  assert.deepEqual(frenchTerms(32), ['Rouge', 'Pair', 'Passe']);
});
