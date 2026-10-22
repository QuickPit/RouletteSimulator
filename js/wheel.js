import { WHEEL_ORDER, colorOf } from './numbers.js';
import { SEGMENT, GEOMETRY as G, mod } from './motion.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEWBOX = '-500 -500 1000 1000';
const TRAIL_OPACITY = [0.28, 0.16, 0.08];

const POCKET_FILL = { red: '#b3141f', black: '#151515', green: '#0f7a3a' };

function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (parent) parent.appendChild(node);
  return node;
}

function svgLayer(className) {
  return el('svg', { viewBox: VIEWBOX, class: `wheel-layer ${className}`, 'aria-hidden': 'true' });
}

function polar(r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [+(r * Math.cos(a)).toFixed(3), +(r * Math.sin(a)).toFixed(3)];
}

function annularSector(rInner, rOuter, fromDeg, toDeg) {
  const [x1, y1] = polar(rOuter, fromDeg);
  const [x2, y2] = polar(rOuter, toDeg);
  const [x3, y3] = polar(rInner, toDeg);
  const [x4, y4] = polar(rInner, fromDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M${x1} ${y1}A${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}Z`;
}

function gradient(defs, type, id, stops, attrs = {}) {
  const g = el(type, { id, ...attrs }, defs);
  for (const [offset, color, opacity = 1] of stops) {
    el('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }, g);
  }
  return g;
}

function brassGradient(defs, id) {
  gradient(defs, 'linearGradient', id, [
    [0, '#fff3b8'], [0.25, '#e2bd55'], [0.5, '#9c7418'], [0.75, '#d9b24a'], [1, '#fbe7a0'],
  ], { x1: 0, y1: 0, x2: 1, y2: 1 });
}

function ring(parent, r, stroke, width, extra = {}) {
  return el('circle', { r, fill: 'none', stroke, 'stroke-width': width, ...extra }, parent);
}

/** Feststehender Kessel: Holzrand, Kugelbahn, Rauten. */
function buildBowl() {
  const svg = svgLayer('wheel-bowl');
  const defs = el('defs', {}, svg);
  brassGradient(defs, 'bowl-brass');
  gradient(defs, 'radialGradient', 'bowl-rim', [
    [0.9, '#4a220d'], [0.95, '#2a1006'], [1, '#140702'],
  ]);
  gradient(defs, 'radialGradient', 'bowl-track', [
    [0.8, '#1e0c04'], [0.84, '#5c2c12'], [0.9, '#93522a'], [0.93, '#a9643a'], [0.96, '#6b3517'], [1, '#2b1207'],
  ]);
  gradient(defs, 'radialGradient', 'bowl-apron', [
    [0.88, '#0d0502'], [0.96, '#2d1408'], [1, '#4a2410'],
  ]);

  el('circle', { r: G.rimOuter, fill: 'url(#bowl-rim)' }, svg);
  ring(svg, G.rimOuter - 2, 'url(#bowl-brass)', 4);
  el('circle', { r: G.rimInner, fill: 'url(#bowl-track)' }, svg);
  ring(svg, G.rimInner, 'url(#bowl-brass)', 3);
  el('circle', { r: G.trackInner, fill: 'url(#bowl-apron)' }, svg);
  ring(svg, G.trackInner, '#c9a24a', 1.5, { opacity: 0.7 });

  for (let k = 0; k < 8; k++) {
    const radial = k % 2 === 0;
    const points = radial ? '0,-16 6,0 0,16 -6,0' : '-15,0 0,-6 15,0 0,6';
    el('polygon', {
      points,
      fill: 'url(#bowl-brass)',
      stroke: '#5c420c',
      'stroke-width': 1,
      transform: `rotate(${22.5 + k * 45}) translate(0 ${-G.deflector})`,
    }, svg);
  }
  return svg;
}

/** Drehteller: Zahlenkranz, Fächer, Stege, Konus und Drehkreuz. */
function buildRotor() {
  const svg = svgLayer('wheel-rotor');
  const defs = el('defs', {}, svg);
  brassGradient(defs, 'rotor-brass');
  gradient(defs, 'radialGradient', 'rotor-cone', [
    [0, '#8c4a22'], [0.55, '#6a3214'], [0.9, '#3d1a08'], [1, '#2a1105'],
  ]);
  gradient(defs, 'radialGradient', 'rotor-pocket-depth', [
    [G.pocketInner / G.numberInner, '#000', 0.55], [0.9, '#000', 0.15], [1, '#000', 0],
  ]);
  gradient(defs, 'radialGradient', 'rotor-dome', [
    [0, '#fff6c8'], [0.35, '#e8c35c'], [0.8, '#9a7116'], [1, '#5c420c'],
  ], { cx: 0.38, cy: 0.35, r: 0.7 });
  gradient(defs, 'radialGradient', 'rotor-knob', [
    [0, '#fffbe0'], [0.4, '#e3bd55'], [1, '#7d5a12'],
  ], { cx: 0.35, cy: 0.3, r: 0.75 });

  el('circle', { r: G.numberOuter + 2, fill: '#0b0b0b' }, svg);

  const numbers = el('g', {}, svg);
  const pockets = el('g', {}, svg);
  WHEEL_ORDER.forEach((n, i) => {
    const from = (i - 0.5) * SEGMENT;
    const to = (i + 0.5) * SEGMENT;
    const fill = POCKET_FILL[colorOf(n)];
    el('path', { d: annularSector(G.numberInner, G.numberOuter, from, to), fill }, numbers);
    el('path', { d: annularSector(G.pocketInner, G.numberInner, from, to), fill }, pockets);
    const label = el('text', {
      class: 'wheel-number',
      x: 0,
      y: -(G.numberInner + G.numberOuter) / 2,
      transform: `rotate(${i * SEGMENT})`,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    }, numbers);
    label.textContent = String(n);
  });
  el('circle', { r: G.numberInner, fill: 'url(#rotor-pocket-depth)' }, svg);

  // Trennlinien im Zahlenkranz und Stege zwischen den Fächern
  const dividers = el('g', { stroke: '#d9b24a', 'stroke-linecap': 'round' }, svg);
  for (let i = 0; i < WHEEL_ORDER.length; i++) {
    const a = (i + 0.5) * SEGMENT;
    const [x1, y1] = polar(G.numberInner, a);
    const [x2, y2] = polar(G.numberOuter, a);
    el('line', { x1, y1, x2, y2, 'stroke-width': 1.2, opacity: 0.55 }, dividers);
    const [x3, y3] = polar(G.pocketInner, a);
    el('line', { x1: x3, y1: y3, x2: x1, y2: y1, stroke: 'url(#rotor-brass)', 'stroke-width': 5 }, dividers);
    const [cx, cy] = polar(G.numberInner, a);
    el('circle', { cx, cy, r: 3.5, fill: '#f0d27a', stroke: 'none' }, dividers);
  }

  ring(svg, G.numberOuter, 'url(#rotor-brass)', 4);
  ring(svg, G.numberInner, 'url(#rotor-brass)', 3);

  // Konus mit Furnier-Segmenten
  el('circle', { r: G.pocketInner, fill: 'url(#rotor-cone)' }, svg);
  for (let k = 0; k < 8; k++) {
    el('path', {
      d: annularSector(G.coneTop + 14, G.pocketInner - 10, k * 45 + 3, k * 45 + 42),
      fill: k % 2 === 0 ? '#ffffff' : '#000000',
      opacity: k % 2 === 0 ? 0.05 : 0.12,
    }, svg);
  }
  ring(svg, G.pocketInner, 'url(#rotor-brass)', 5);
  ring(svg, G.pocketInner - 10, '#d9b24a', 1.2, { opacity: 0.6 });
  ring(svg, G.coneTop + 14, '#d9b24a', 1.5, { opacity: 0.6 });

  // Drehkreuz
  const turret = el('g', {}, svg);
  for (let k = 0; k < 4; k++) {
    const arm = el('g', { transform: `rotate(${k * 90 + 45})` }, turret);
    el('path', { d: 'M-7 -30 L-4 -104 L4 -104 L7 -30 Z', fill: 'url(#rotor-brass)', stroke: '#5c420c', 'stroke-width': 1 }, arm);
    el('circle', { cy: -112, r: 13, fill: 'url(#rotor-knob)', stroke: '#5c420c', 'stroke-width': 1 }, arm);
  }
  el('circle', { r: 40, fill: 'url(#rotor-dome)', stroke: '#5c420c', 'stroke-width': 1.5 }, turret);
  el('circle', { r: 14, fill: 'url(#rotor-knob)' }, turret);
  return svg;
}

/** Oberste Ebene: Kugel mit Bewegungsspur und feststehendes Glanzlicht. */
function buildTop() {
  const svg = svgLayer('wheel-top');
  const defs = el('defs', {}, svg);
  gradient(defs, 'radialGradient', 'top-ball', [
    [0, '#ffffff'], [0.45, '#f1f1ee'], [0.8, '#b9b9b4'], [1, '#7c7c78'],
  ], { cx: 0.35, cy: 0.3, r: 0.75 });
  gradient(defs, 'radialGradient', 'top-ball-shadow', [
    [0, '#000', 0.55], [1, '#000', 0],
  ]);
  gradient(defs, 'radialGradient', 'top-gloss', [
    [0, '#fff', 0.2], [0.45, '#fff', 0.05], [1, '#fff', 0],
  ], { cx: 0.32, cy: 0.22, r: 0.75 });
  gradient(defs, 'radialGradient', 'top-shade', [
    [0.6, '#000', 0], [1, '#000', 0.28],
  ], { cx: 0.42, cy: 0.38, r: 0.62 });

  const makeBall = (opacityScale) => {
    const g = el('g', { opacity: 0 }, svg);
    if (opacityScale === 1) el('circle', { cx: 3, cy: 4, r: G.ballRadius + 4, fill: 'url(#top-ball-shadow)' }, g);
    el('circle', { r: G.ballRadius, fill: 'url(#top-ball)' }, g);
    return { node: g, opacityScale };
  };
  const trail = TRAIL_OPACITY.map(makeBall);
  const ball = makeBall(1);

  el('circle', { r: G.rimOuter, fill: 'url(#top-shade)', 'pointer-events': 'none' }, svg);
  el('circle', { r: G.rimOuter, fill: 'url(#top-gloss)', 'pointer-events': 'none' }, svg);
  return { svg, balls: [ball, ...trail] };
}

function placeBall({ node, opacityScale }, state) {
  const opacity = state.opacity * opacityScale;
  node.setAttribute('opacity', opacity.toFixed(3));
  if (opacity <= 0) return;
  const angle = mod(state.angle, 360).toFixed(3);
  node.setAttribute('transform', `rotate(${angle}) translate(0 ${(-state.radius).toFixed(2)}) scale(${state.scale.toFixed(3)})`);
}

export function createWheel(container) {
  const rotor = buildRotor();
  const top = buildTop();
  container.append(buildBowl(), rotor, top.svg);

  return {
    /** @param balls Kugelzustand gefolgt von bis zu drei Spur-Zuständen (ältester zuletzt). */
    render(rotorAngle, balls) {
      rotor.style.transform = `rotate(${mod(rotorAngle, 360).toFixed(3)}deg)`;
      top.balls.forEach((ball, i) => placeBall(ball, balls[i] ?? { opacity: 0 }));
    },
  };
}
