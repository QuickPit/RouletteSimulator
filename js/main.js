import { colorOf, COLOR_LABEL, frenchTerms } from './numbers.js';
import { drawNumber } from './rng.js';
import { planSpin, idleRotor, NO_BALL } from './motion.js';
import { createWheel } from './wheel.js';
import { createSound } from './sound.js';

const HISTORY_SIZE = 20;
const TRAIL_STEP = 0.009; // Sekunden zwischen den Spur-Kugeln
const SETTINGS_KEY = 'roulette-settings';
const DEFAULT_SETTINGS = { duration: 8, sound: false, announce: false };

const $ = (id) => document.getElementById(id);
const now = () => performance.now() / 1000;

// Einstellungen sind eine reine Komfortfunktion; ohne Speicher gelten die Standardwerte.
function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Privater Modus o. Ä. – Einstellungen gelten dann nur für diese Sitzung.
  }
}

const settings = loadSettings();
const wheel = createWheel($('wheel'));
const sound = createSound();
const history = [];

let rotor = idleRotor(now(), Math.random() * 360);
let plan = null;
let spinning = false;
let nextEvent = 0;

// ---------- Darstellung ----------

function setStatus(text) {
  $('status').textContent = text;
}

function showResult(n) {
  const result = $('result');
  const color = colorOf(n);
  result.dataset.color = color;
  result.classList.remove('is-stale', 'is-new');
  void result.offsetWidth; // Animation neu starten
  result.classList.add('is-new');
  $('result-number').textContent = String(n);
  $('result-color').textContent = COLOR_LABEL[color];
  $('result-terms').textContent = frenchTerms(n).join(' · ');
}

function renderHistory() {
  const list = $('history');
  list.replaceChildren();
  for (let i = 0; i < HISTORY_SIZE; i++) {
    const row = document.createElement('li');
    row.className = 'board-row';
    const n = history[i];
    if (n !== undefined) {
      const color = colorOf(n);
      row.dataset.color = color;
      if (i === 0) row.classList.add('is-latest');
      const cell = document.createElement('span');
      cell.className = `board-number board-${color}`;
      cell.textContent = String(n);
      row.append(cell);
    }
    list.append(row);
  }
}

function frame() {
  const t = now();
  const activeRotor = plan ? plan.rotor : rotor;
  const balls = plan
    ? [0, 1, 2, 3].map((k) => plan.ballState(t - k * TRAIL_STEP))
    : [NO_BALL];
  wheel.render(activeRotor.angle(t), balls);

  if (spinning) {
    sound.setRoll(settings.sound ? plan.rollIntensity(t) : 0);
    while (spinning && nextEvent < plan.events.length && plan.events[nextEvent].time <= t) {
      handleEvent(plan.events[nextEvent++], t);
    }
  }
  requestAnimationFrame(frame);
}

// ---------- Ablauf ----------

function handleEvent(event, t) {
  const late = t - event.time > 0.25; // z. B. nach Tab-Wechsel: keine Geräusche nachholen
  switch (event.type) {
    case 'noMoreBets':
      setStatus('Rien ne va plus');
      if (settings.announce && !late) sound.say('Rien ne va plus', 'fr-FR');
      break;
    case 'impact':
      if (settings.sound && !late) sound.click(event.strength);
      break;
    case 'result':
      finishSpin();
      break;
  }
}

function startSpin() {
  if (spinning) return;
  sound.unlock(settings);
  requestWakeLock();

  const number = drawNumber();
  const t = now();
  plan = planSpin({
    number,
    t0: t,
    rotor: plan ? plan.rotor : rotor,
    duration: settings.duration,
    previousPocket: plan ? plan.pocket : null,
  });
  nextEvent = 0;
  spinning = true;

  $('start').disabled = true;
  $('result').classList.add('is-stale');
  setStatus('Faites vos jeux');
}

function finishSpin() {
  spinning = false;
  sound.setRoll(0);
  const n = plan.number;
  showResult(n);
  history.unshift(n);
  history.length = Math.min(history.length, HISTORY_SIZE);
  renderHistory();
  if (settings.announce) sound.announceNumber(n);
  setStatus('Faites vos jeux');
  $('start').disabled = false;
}

// ---------- Bildschirm wach halten ----------

let wakeLock = null;
async function requestWakeLock() {
  if (wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => (wakeLock = null));
  } catch {
    // nicht unterstützt oder abgelehnt – kein Problem
  }
}
document.addEventListener('visibilitychange', () => {
  if (history.length > 0 || spinning) requestWakeLock();
});

// ---------- Einstellungen ----------

function bindSettings() {
  const dialog = $('settings');
  const duration = $('setting-duration');
  const durationValue = $('setting-duration-value');
  const soundToggle = $('setting-sound');
  const announceToggle = $('setting-announce');

  const formatSeconds = (s) => `${s.toLocaleString('de-DE')} s`;
  duration.value = settings.duration;
  durationValue.textContent = formatSeconds(settings.duration);
  soundToggle.checked = settings.sound;
  announceToggle.checked = settings.announce;

  duration.addEventListener('input', () => {
    settings.duration = Number(duration.value);
    durationValue.textContent = formatSeconds(settings.duration);
    saveSettings();
  });
  soundToggle.addEventListener('change', () => {
    settings.sound = soundToggle.checked;
    if (settings.sound) sound.unlock(settings);
    else sound.setRoll(0);
    saveSettings();
  });
  announceToggle.addEventListener('change', () => {
    settings.announce = announceToggle.checked;
    if (settings.announce) sound.unlock(settings);
    saveSettings();
  });

  $('settings-open').addEventListener('click', () => dialog.showModal());
  $('settings-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close(); // Tipp auf den Hintergrund schließt
  });
}

$('start').addEventListener('click', startSpin);
bindSettings();
renderHistory();
requestAnimationFrame(frame);
