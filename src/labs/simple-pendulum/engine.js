/* ============================================================
   Simple Pendulum — the physics, with no DOM in sight.

   The bob is NOT solved with the textbook formula. It obeys the
   real equation of motion

       θ'' = −(g / L) · sin θ  −  b · θ'

   and the familiar T = 2π√(L/g) is derived separately, so the lab
   can show the two disagreeing. That disagreement is the point:
   the formula quietly replaces sin θ with θ, which is only honest
   while the swing is small.
   ============================================================ */

export const DEG = Math.PI / 180;
export const TAU = 2 * Math.PI;

/* ---------- the two drawings ----------
   A phone that scales a 900-unit drawing down to 360 px renders 10-unit type at
   4 px. So the scene keeps two geometries and picks one from its measured width:
   the compact one is a smaller drawing whose type is proportionally larger. */
export const PROFILES = {
  wide: {
    name: 'wide',
    W: 900, H: 515, beamY: 62, drop: 388,
    rulerX: 44, capY: 505,
    single: { x: 450, half: 372 },
    compare: { xa: 272, xb: 628, half: 164 },
    bobMin: 8, bobSpan: 8, protractor: 52, arrowMax: 54, arrowK: 1.6,
  },
  compact: {
    name: 'compact',
    W: 520, H: 372, beamY: 46, drop: 270,
    rulerX: 30, capY: 362,
    single: { x: 262, half: 212 },
    compare: { xa: 156, xb: 366, half: 98 },
    bobMin: 7, bobSpan: 6, protractor: 38, arrowMax: 38, arrowK: 1.1,
  },
};

export const GRAVITIES = [
  { value: 9.81,  name: 'Earth',        sub: 'everyday gravity' },
  { value: 10,    name: 'School value', sub: 'rounded, easier arithmetic' },
  { value: 1.62,  name: 'Moon',         sub: "about a sixth of Earth's" },
  { value: 3.72,  name: 'Mars',         sub: "roughly a third of Earth's" },
  { value: 24.79, name: 'Jupiter',      sub: "two and a half times Earth's" },
];

/* Chosen so a white numeral inside the bob clears 4.5:1, and the two
   pendulums stay tellable apart for the commonest kinds of colour blindness. */
export const COLOURS = { a: '#3272be', b: '#c8452e' };

export const LEN_MIN = 0.1, LEN_MAX = 10;
export const MASS_MIN = 0.1, MASS_MAX = 20;
/* A string can only pull. Released from beyond a quarter turn it would go slack
   and the bob would simply fall, which is no longer a pendulum. */
export const AMP_MAX = 85;
export const AMP_MIN = 1;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const round2 = (v) => Math.round(v * 100) / 100;

export function fmt(n, dp = 2) {
  if (!isFinite(n)) return '—';
  return n.toFixed(dp);
}
/** A number written without a tail of zeros: 0.8, not 0.800000000000001. */
export const tidy = (v) => (Math.round(v * 1000) / 1000).toFixed(3)
                             .replace(/0+$/, '').replace(/\.$/, '');

/* ============================================================
   PERIOD
   ============================================================ */

/** The textbook period. Note what is missing from it: the mass, and the swing. */
export const smallAnglePeriod = (L, g) => TAU * Math.sqrt(L / g);

/** Complete elliptic integral of the first kind K(m), by the
    arithmetic–geometric mean — a handful of iterations to full precision. */
export function ellipticK(m) {
  let a = 1, b = Math.sqrt(Math.max(0, 1 - m));
  for (let i = 0; i < 60 && Math.abs(a - b) > 1e-15; i++) {
    const next = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = next;
  }
  return Math.PI / (2 * a);
}

/** The period the pendulum actually keeps, swung to θ₀ (radians).
       T = 4 √(L/g) · K(sin²(θ₀/2))
    As θ₀ → 0 this becomes 2π√(L/g); at 85° it is about 18% longer. */
export function truePeriod(L, g, amplitudeRad) {
  const k = Math.sin(Math.abs(amplitudeRad) / 2);
  return 4 * Math.sqrt(L / g) * ellipticK(k * k);
}

/** How much longer the real swing is than the formula claims, as a percentage. */
export const amplitudeError = (L, g, ampRad) =>
  (truePeriod(L, g, ampRad) / smallAnglePeriod(L, g) - 1) * 100;

/* ============================================================
   MOTION
   The equation is integrated with classical Runge–Kutta at a fixed
   small step, so a 0.1 m pendulum (which swings three times a second)
   keeps its period over thousands of swings instead of quietly
   gaining energy the way Euler would.
   ============================================================ */
export const PHYS_STEP = 1 / 480;
export const DAMP_RATE = 0.25;      // 1/s, a visible but unhurried decay

const accel = (th, om, g, L, b) => -(g / L) * Math.sin(th) - b * om;

/** One RK4 step of [θ, ω]. */
export function rk4(th, om, g, L, b, h) {
  const k1v = accel(th, om, g, L, b);
  const k2v = accel(th + (h / 2) * om, om + (h / 2) * k1v, g, L, b);
  const k3v = accel(th + (h / 2) * (om + (h / 2) * k1v), om + (h / 2) * k2v, g, L, b);
  const k4v = accel(th + h * (om + (h / 2) * k2v), om + h * k3v, g, L, b);
  const k1x = om;
  const k2x = om + (h / 2) * k1v;
  const k3x = om + (h / 2) * k2v;
  const k4x = om + h * k3v;
  return [
    th + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    om + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v),
  ];
}

/* ---------- energy ---------- */
export const kinetic = (m, L, om) => 0.5 * m * (L * om) * (L * om);
export const potential = (m, g, L, th) => m * g * L * (1 - Math.cos(th));

/** Tension in the string: it holds the bob against gravity AND round the curve.
    At the bottom of a big swing it is several times the bob's weight. */
export const tension = (m, g, L, th, om) => m * (g * Math.cos(th) + L * om * om);
/** The only force that actually drives the swing back. */
export const restoring = (m, g, th) => m * g * Math.sin(th);

/* ============================================================
   DRAWING SCALE
   The pendulum is drawn to a scale that fits the frame — so in
   compare mode a rod twice as long really is twice as long on
   screen, which is the whole point of putting them side by side.
   ============================================================ */
const LADDER = [1, 1.5, 2, 3, 5, 7, 10];

/** The smallest tidy length that still contains the longest pendulum. */
export function niceFrame(maxL) {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(maxL, 1e-6))));
  for (const step of LADDER) if (step * pow >= maxL - 1e-9) return step * pow;
  return 10 * pow;
}

/** A tidy spacing for the ruler's marks: about five of them, on a 1/2/5 grid. */
export function niceStep(span) {
  const raw = span / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * pow;
}

/** Decimals a number actually needs (0.05 -> 2, 1 -> 0). */
export function decimalsOf(v) {
  const t = Number(v).toPrecision(12).replace(/0+$/, '').replace(/\.$/, '');
  const i = t.indexOf('.');
  return i < 0 ? 0 : t.length - i - 1;
}

/** Pixels per metre: the drop has to fit, and so does the widest swing. */
export function layout(P, s) {
  const arms = s.compare ? [s.a, s.b] : [s.a];
  const frame = niceFrame(Math.max(...arms.map((p) => p.length)));
  const half = (s.compare ? P.compare : P.single).half;
  /* a barely-swinging pendulum must not be allowed to grow without bound */
  const widest = Math.max(...arms.map((p) => Math.sin(p.amplitude * DEG)), 0.28);
  const pxPerM = Math.min(P.drop / frame, half / (frame * widest));
  return { frame, pxPerM, step: niceStep(frame) };
}

/** Where each pendulum hangs from, in drawing units. */
export const pivots = (P, compare) =>
  (compare ? [P.compare.xa, P.compare.xb] : [P.single.x, null]);

export const bobRadius = (P, m) => P.bobMin + P.bobSpan * Math.cbrt(clamp(m, 0.05, 40) / 2);

/* ============================================================
   READY-MADE SET-UPS
   Each one exists to settle a single question.
   ============================================================ */
export const PRESETS = {
  mass: {
    label: 'Same length, different mass',
    ask: 'Does a heavier bob swing slower?',
    state: { compare: true, a: { length: 1, mass: 1, amplitude: 20 },
                            b: { length: 1, mass: 8, amplitude: 20 } },
  },
  length: {
    label: 'Same mass, different length',
    ask: 'What does change the period?',
    state: { compare: true, a: { length: 0.5, mass: 2, amplitude: 20 },
                            b: { length: 2, mass: 2, amplitude: 20 } },
  },
  amplitude: {
    label: 'Small swing against big swing',
    ask: 'Where does the formula start to lie?',
    state: { compare: true, a: { length: 1.5, mass: 2, amplitude: 8 },
                            b: { length: 1.5, mass: 2, amplitude: 80 } },
  },
  seconds: {
    label: 'The seconds pendulum',
    ask: 'How long is a pendulum that ticks once a second?',
    state: { compare: false, a: { length: 0.994, mass: 2, amplitude: 12 } },
  },
  quarter: {
    label: 'Four times the length',
    ask: 'Four times as long — twice as slow?',
    state: { compare: true, a: { length: 0.5, mass: 2, amplitude: 15 },
                            b: { length: 2, mass: 2, amplitude: 15 } },
  },
};
