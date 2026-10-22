import { WHEEL_ORDER, POCKET_COUNT } from './numbers.js';

// Winkel in Grad, im Uhrzeigersinn ab 12 Uhr. Zeiten in Sekunden.
// Radien in Einheiten der SVG-viewBox (-500 … 500).

export const SEGMENT = 360 / POCKET_COUNT;

export const GEOMETRY = Object.freeze({
  rimOuter: 500,
  rimInner: 478,
  trackInner: 404,
  deflector: 390,
  numberOuter: 372,
  numberInner: 306,
  pocketInner: 246,
  coneTop: 120,
  ballRadius: 11,
  trackBall: 456, // Kugel rollt außen an der Kesselwand
  pocketBall: 276, // Kugel liegt im Fach
});

export const ROTOR = Object.freeze({
  idleSpeed: 14, // ruhiges Weiterdrehen zwischen den Ziehungen
  peakSpeed: 170,
  rampTime: 0.8,
});

const BALL = Object.freeze({
  pickupTime: 0.35, // alte Kugel wird aus dem Fach genommen
  fadeIn: 0.15,
  baseSpeed: 620, // Startgeschwindigkeit relativ zum Teller (°/s)
  speedJitter: 120,
  decayPower: 2.6, // Form der Abbremsung: ψ(u) = ψ₀ − Δ·(1 − (1−u)^p)
  noMoreBets: 0.45, // Anteile der Laufzeit zwischen Wurf und Landung
  dropStart: 0.55,
  dropEnd: 0.72,
  bounceEnd: 0.93,
  bounces: 3,
  bounceHeight: 48,
  trackDrift: 6,
});

export const mod = (a, m) => ((a % m) + m) % m;

export function pocketAngle(number) {
  const index = WHEEL_ORDER.indexOf(number);
  if (index < 0) throw new RangeError(`Keine Roulette-Zahl: ${number}`);
  return index * SEGMENT;
}

/**
 * Winkelverlauf des Tellers: lineare Beschleunigung von speed0 auf peak in
 * `ramp` Sekunden, danach exponentielles Auslaufen zurück auf `idle`.
 * Geschlossen integriert, damit Endwinkel vorab exakt berechnet werden können.
 */
export function rotorProfile({ t0, angle0, speed0, idle, peak, ramp, decay }) {
  const angleAfterRamp = angle0 + ((speed0 + peak) / 2) * ramp;
  return {
    angle(t) {
      const s = Math.max(0, t - t0);
      if (s <= ramp) return angle0 + speed0 * s + ((peak - speed0) * s * s) / (2 * ramp);
      const d = s - ramp;
      return angleAfterRamp + idle * d + ((peak - idle) * (1 - Math.exp(-decay * d))) / decay;
    },
    speed(t) {
      const s = Math.max(0, t - t0);
      if (s <= ramp) return speed0 + ((peak - speed0) * s) / ramp;
      return idle + (peak - idle) * Math.exp(-decay * (s - ramp));
    },
  };
}

export function idleRotor(t0 = 0, angle0 = 0) {
  const idle = ROTOR.idleSpeed;
  return rotorProfile({ t0, angle0, speed0: idle, idle, peak: idle, ramp: 1, decay: 1 });
}

/** Kugel ohne Ziehung: unsichtbar. */
export const NO_BALL = Object.freeze({ angle: 0, radius: GEOMETRY.pocketBall, opacity: 0, scale: 1 });

/**
 * Plant eine komplette Drehung, deren Kugel garantiert im Fach von `number`
 * landet. Die Zahl wird vorher gezogen; `jitter` variiert nur die Optik.
 */
export function planSpin({ number, t0, rotor, duration, previousPocket = null, jitter = Math.random }) {
  const spinRotor = rotorProfile({
    t0,
    angle0: rotor.angle(t0),
    speed0: rotor.speed(t0),
    idle: ROTOR.idleSpeed,
    peak: ROTOR.peakSpeed,
    ramp: ROTOR.rampTime,
    decay: 2.4 / duration,
  });

  const throwTime = Math.min(0.9, 0.12 * duration);
  const landTime = duration - Math.max(0.8, 0.1 * duration);
  const flight = landTime - throwTime;

  const throwAngle = -40 + (jitter() - 0.5) * 30;
  const startSpeed = BALL.baseSpeed + jitter() * BALL.speedJitter;
  const p = BALL.decayPower;

  // ψ = Winkel der Kugel relativ zum Teller. Er läuft von psiStart um `travel`
  // zurück und endet exakt (mod 360°) auf dem Zielfach.
  const target = pocketAngle(number);
  const psiStart = throwAngle - spinRotor.angle(t0 + throwTime);
  const nominal = (startSpeed * flight) / p;
  const travel = nominal + mod(psiStart - nominal - target, 360);

  const progress = (t) => Math.min(1, Math.max(0, (t - t0 - throwTime) / flight));
  const timeAt = (u) => t0 + throwTime + u * flight;

  function radiusAt(u) {
    const { trackBall, pocketBall } = GEOMETRY;
    const drifted = trackBall - BALL.trackDrift;
    if (u < BALL.dropStart) return trackBall - BALL.trackDrift * (u / BALL.dropStart) ** 3;
    if (u < BALL.dropEnd) {
      const v = (u - BALL.dropStart) / (BALL.dropEnd - BALL.dropStart);
      return drifted - (drifted - pocketBall) * v * v;
    }
    if (u < BALL.bounceEnd) return pocketBall + bounceHeightAt(u);
    return pocketBall;
  }

  function bounceHeightAt(u) {
    if (u < BALL.dropEnd || u >= BALL.bounceEnd) return 0;
    const w = (u - BALL.dropEnd) / (BALL.bounceEnd - BALL.dropEnd);
    return BALL.bounceHeight * Math.abs(Math.sin(Math.PI * BALL.bounces * w)) * (1 - w) ** 2;
  }

  function ballState(t) {
    const s = t - t0;
    if (s < throwTime) {
      if (previousPocket === null || s >= BALL.pickupTime) return NO_BALL;
      return {
        angle: spinRotor.angle(t) + previousPocket,
        radius: GEOMETRY.pocketBall,
        opacity: 1 - s / BALL.pickupTime,
        scale: 1,
      };
    }
    const u = progress(t);
    const psi = psiStart - travel * (1 - (1 - u) ** p);
    return {
      angle: spinRotor.angle(t) + psi,
      radius: radiusAt(u),
      opacity: Math.min(1, (s - throwTime) / BALL.fadeIn),
      scale: 1 + (0.22 * bounceHeightAt(u)) / BALL.bounceHeight,
    };
  }

  /** 0 … 1: Lautstärke des Rollgeräuschs, solange die Kugel auf der Bahn läuft. */
  function rollIntensity(t) {
    if (t - t0 < throwTime) return 0;
    const u = progress(t);
    if (u >= BALL.dropEnd) return 0;
    return (1 - u) ** (p - 1);
  }

  const events = [{ time: timeAt(BALL.noMoreBets), type: 'noMoreBets' }];
  for (let k = 0; k <= BALL.bounces; k++) {
    const u = BALL.dropEnd + ((BALL.bounceEnd - BALL.dropEnd) * k) / BALL.bounces;
    events.push({ time: timeAt(u), type: 'impact', strength: (1 - k / (BALL.bounces + 1)) ** 2 });
  }
  events.push({ time: t0 + duration, type: 'result' });

  return {
    number,
    pocket: target,
    rotor: spinRotor,
    startTime: t0,
    landTime: t0 + landTime,
    endTime: t0 + duration,
    ballState,
    rollIntensity,
    events,
  };
}
