import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WHEEL_ORDER } from '../js/numbers.js';
import { planSpin, idleRotor, pocketAngle, mod, SEGMENT, GEOMETRY, ROTOR } from '../js/motion.js';

const angleDiff = (a, b) => {
  const d = mod(a - b, 360);
  return d > 180 ? d - 360 : d;
};

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

test('Fach-Winkel folgen der Kessel-Reihenfolge', () => {
  assert.equal(pocketAngle(0), 0);
  assert.equal(pocketAngle(32), SEGMENT);
  assert.equal(pocketAngle(26), 36 * SEGMENT);
  assert.throws(() => pocketAngle(37), RangeError);
});

for (const duration of [4, 8, 15]) {
  test(`Kugel landet für jede Zahl im richtigen Fach (Dauer ${duration} s)`, () => {
    const jitter = seeded(duration);
    let rotor = idleRotor(0, 123);
    let t = 3.7;
    let previousPocket = null;
    for (const number of WHEEL_ORDER) {
      const plan = planSpin({ number, t0: t, rotor, duration, previousPocket, jitter });
      for (const time of [plan.landTime, plan.endTime, plan.endTime + 20]) {
        const ball = plan.ballState(time);
        const relative = angleDiff(ball.angle - plan.rotor.angle(time), pocketAngle(number));
        assert.ok(Math.abs(relative) < 1e-6, `Zahl ${number}: Abweichung ${relative}°`);
        assert.equal(ball.radius, GEOMETRY.pocketBall);
        assert.equal(ball.opacity, 1);
      }
      rotor = plan.rotor;
      previousPocket = plan.pocket;
      t = plan.endTime + 2.5;
    }
  });
}

test('Bewegung ist stetig: keine Sprünge zwischen zwei Frames', () => {
  const plan = planSpin({ number: 17, t0: 10, rotor: idleRotor(), duration: 8, jitter: seeded(1) });
  const frame = 1 / 60;
  let prev = plan.ballState(plan.startTime + 0.9);
  for (let t = plan.startTime + 0.9 + frame; t < plan.endTime + 1; t += frame) {
    const ball = plan.ballState(t);
    assert.ok(Math.abs(angleDiff(ball.angle, prev.angle)) < 20, `Winkelsprung bei t=${t}`);
    assert.ok(Math.abs(ball.radius - prev.radius) < 25, `Radiussprung bei t=${t}`);
    prev = ball;
  }
});

test('Teller beschleunigt und läuft danach ruhig aus', () => {
  const plan = planSpin({ number: 5, t0: 0, rotor: idleRotor(), duration: 8 });
  assert.equal(plan.rotor.speed(0), ROTOR.idleSpeed);
  assert.equal(plan.rotor.speed(ROTOR.rampTime), ROTOR.peakSpeed);
  assert.ok(plan.rotor.speed(8) < ROTOR.peakSpeed / 3);
  assert.ok(Math.abs(plan.rotor.speed(200) - ROTOR.idleSpeed) < 1e-6);
});

test('Ereignisse sind zeitlich geordnet und enden mit dem Ergebnis', () => {
  const plan = planSpin({ number: 0, t0: 1, rotor: idleRotor(), duration: 8 });
  const times = plan.events.map((e) => e.time);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  assert.equal(plan.events.at(-1).type, 'result');
  assert.equal(plan.events.at(-1).time, plan.endTime);
});
