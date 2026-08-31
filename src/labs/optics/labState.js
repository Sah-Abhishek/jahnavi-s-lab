/* ============================================================
   Light — the reducer, and what the browser remembers.

   Four benches, each keeping its own set-up, so switching from the
   mirror to the lens and back finds everything where it was left.

   Two rules run through the whole file.

   ONE NUMBER, NOT TWO. A mirror is not stored as "concave, f = 20";
   it is stored as f = −20, and being concave is read back off the
   sign. There is no state in which the drawn mirror and the written
   sign disagree, because there is only ever one of them. The same
   goes for the eye: the defect is worked out from where the far and
   near points actually are, and the spectacle power is worked out
   from the defect, so neither can drift from the other.

   REPRESENTABLE IS NOT THE SAME AS SENSIBLE. The clamps here only
   keep numbers inside what the lab can draw. A prism too fat to let
   any light out is allowed, and explained — quietly moving a
   visitor's slider away from an interesting answer would teach them
   nothing.
   ============================================================ */
import { clamp, specPower as specFor } from './engine.js';

export const STORE_KEY = 'jahnavis-lab/optics/v1';

/* ---------- what the apparatus can be set to ---------- */
export const U_MIN = 1, U_MAX = 300;          /* cm in front of the element */
export const F_MIN = 2, F_MAX = 200;
export const SEMI_MIN = 0.5, SEMI_MAX = 25;
export const H_MIN = 0.5, H_MAX = 15;
export const FAN_MIN = 3, FAN_MAX = 25;
export const N_MIN = 1, N_MAX = 2.6;
export const A_MIN = 15, A_MAX = 85;
export const I_MAX = 89.5;
export const SLAB_MIN = 1, SLAB_MAX = 30;
export const THICK_MIN = 0.05, THICK_MAX = 6;
export const R_ABS_MIN = 5, R_ABS_MAX = 200;
export const RETINA_MIN = 1.8, RETINA_MAX = 3.4;
export const FAR_MIN = 10, FAR_MAX = 500;
export const NEAR_MIN = 26, NEAR_MAX = 200;
export const OBJ_MIN = 5, OBJ_MAX = 500;
export const READINGS_MAX = 12;

/* ---------- the window on the bench ---------- */
export const RANGE_MIN = 0.5, RANGE_MAX = 5000;
export const ZOOM_STEP = 1.4;
export const PAN_LIMIT = 1e5;
export const BENCH_ASPECT = 2.6;              /* a bench is wider than it is tall */
export const FIT_MAX = 250;                   /* cm: beyond this the image is named, not framed */

export const BENCHES = [
  { id: 'mirror',  name: 'Mirrors',    sub: 'plane, concave, convex' },
  { id: 'lens',    name: 'Lenses',     sub: 'convex and concave' },
  { id: 'refract', name: 'Refraction', sub: 'slab, surface, prism' },
  { id: 'eye',     name: 'The eye',    sub: 'near point and far point' },
];

/* ---------- reading a shape off a signed number ---------- */
export const mirrorKind = (f) => (f === 0 ? 'plane' : f < 0 ? 'concave' : 'convex');
export const lensKind = (f) => (f < 0 ? 'concave' : 'convex');

export const initialState = {
  bench: 'mirror',

  mirror: {
    f: -20, semi: 6, u: -60, h: 5,
    rays: 'construction', fanCount: 11, real: false,
    screenX: -30, showScreen: false,
    readings: [],
  },
  lens: {
    f: 20, u: -45, h: 5, semi: 5,
    rays: 'construction', fanCount: 11, real: false,
    screenX: 40, showScreen: false,
    maker: false, R1: 30, R2: -30, n: 1.5, thick: 0.6,
    readings: [],
  },
  refract: {
    piece: 'interface',                        /* 'interface' | 'slab' | 'prism' */
    i: 45, n1: 1, n2: 1.52,
    thickness: 6, nSlab: 1.52,
    A: 60, nPrism: 1.52,
    white: false,
  },
  eye: {
    retina: 2.5, defect: 'normal', far: 50, near: 25,
    wearing: false, object: 25, objectFar: false,
  },

  view: { normals: true, angles: true, virtual: true, labels: true, paraxial: true },
  centre: { x: 0, y: 0 },
  range: 90,
  snap: true,
  showPanel: true, showSheet: false,

  mode: 'explore', pending: false, task: null,
  tab: 'explore', score: 0, attempts: 0, snapshot: null,
};

/* ---------- the derived facts, which are never stored ---------- */
/** What the eye's defect actually is, read off where its far and near points are. */
export function eyeDefect(e) {
  if (e.defect === 'myopia' && e.far < FAR_MAX) return 'myopia';
  if (e.defect === 'hypermetropia' && e.near > 25.5) return 'hypermetropia';
  return 'normal';
}
/** The spectacle the eye needs — worked out, so it cannot disagree with the defect. */
export const eyeSpec = (e) => specFor({
  defect: eyeDefect(e),
  far: eyeDefect(e) === 'myopia' ? e.far : Infinity,
  near: e.near,
});
/**
 * How much the eye can change its own power — the whole of accommodation.
 * A defect slides this range up or down; it does not make it wider or narrower,
 * which is why a short-sighted eye can read closer than a normal one.
 */
export const ACCOM = 4;

/** The power the relaxed eye runs at, which is what puts its far point on the retina. */
export function eyeRelaxed(e) {
  const d = eyeDefect(e);
  if (d === 'myopia') return 100 / e.retina + 100 / e.far;
  if (d === 'hypermetropia') return 100 / e.retina + 100 / e.near - ACCOM;
  return 100 / e.retina;
}
/** And the most it can screw itself up to, which is what sets the near point. */
export const eyeStrained = (e) => eyeRelaxed(e) + ACCOM;

/** Where this eye can actually see clearly, as two distances in front of it. */
export function eyeRange(e) {
  const base = 100 / e.retina;
  const relaxed = eyeRelaxed(e);
  const near = 100 / (eyeStrained(e) - base);
  const farInv = relaxed - base;
  /* a negative far point is a real answer, not a missing one: the long-sighted
     eye's far point lies BEHIND it, which is why it must strain even for a star */
  return { near, far: Math.abs(farInv) < 1e-9 ? Infinity : 100 / farInv };
}

/** What the eye must supply to put an object this far in front onto the retina. */
export const eyeNeeds = (e, dObj) =>
  100 / e.retina + (isFinite(dObj) ? 100 / dObj : 0);

/* ---------- moving the window ---------- */
export const snapTo = (v, on, step) => (on ? Math.round(v / step) * step : v);

export function zoomView(s, factor, at) {
  const range = clamp(s.range / factor, RANGE_MIN, RANGE_MAX);
  const f = s.range / range;
  const c = s.centre;
  if (!at || f === 1) return { ...s, range };
  return {
    ...s,
    range,
    centre: {
      x: clamp(at.x + (c.x - at.x) / f, -PAN_LIMIT, PAN_LIMIT),
      y: clamp(at.y + (c.y - at.y) / f, -PAN_LIMIT, PAN_LIMIT),
    },
  };
}

/**
 * Frame everything worth looking at.
 *
 * An optical bench has a singularity a graph does not: as the object
 * walks up to the focus the image runs away to infinity. So the fit is
 * capped — past FIT_MAX the image is not framed but named, in words, at
 * the edge of the drawing. Zooming out until a 40 metre image fits would
 * leave the apparatus a dot.
 */
export function fitView(s) {
  const pts = benchPoints(s);
  if (!pts.length) return s;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (!isFinite(p.x) || Math.abs(p.x) > FIT_MAX) continue;
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y || 0); y1 = Math.max(y1, p.y || 0);
  }
  if (!isFinite(x0)) return s;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const halfX = Math.max((x1 - x0) / 2, 2);
  const halfY = Math.max((y1 - y0) / 2, 1);
  const range = clamp(Math.max(halfX, halfY * BENCH_ASPECT) * 1.18, RANGE_MIN, RANGE_MAX);
  return { ...s, centre: { x: cx, y: cy }, range };
}

/** Everything the fit should try to keep on the drawing. */
export function benchPoints(s) {
  const P = [{ x: 0, y: 0 }];
  if (s.bench === 'mirror' || s.bench === 'lens') {
    const b = s.bench === 'mirror' ? s.mirror : s.lens;
    const mir = s.bench === 'mirror';
    P.push({ x: b.u, y: b.h }, { x: b.u, y: 0 }, { x: 0, y: b.semi }, { x: 0, y: -b.semi });
    P.push({ x: b.f, y: 0 }, { x: mir ? 2 * b.f : 2 * b.f, y: 0 });
    if (!mir) P.push({ x: -b.f, y: 0 }, { x: -2 * b.f, y: 0 });
    const v = mir
      ? (b.f === 0 ? -b.u : b.f * b.u / (b.u - b.f))
      : b.f * b.u / (b.u + b.f);
    if (isFinite(v)) P.push({ x: v, y: 0 });
    if (b.showScreen) P.push({ x: b.screenX, y: 0 });
  } else if (s.bench === 'refract') {
    const r = s.refract;
    const w = r.piece === 'slab' ? r.thickness : r.piece === 'prism' ? 24 : 12;
    P.push({ x: -w * 1.6, y: w }, { x: w * 1.6, y: -w });
  } else {
    /* An eye is 2.5 cm long and what it is looking at may be five metres away.
       Framing both leaves the eye a dot and the blur invisible, so the eye is
       what gets framed and the object is named at the edge instead. */
    P.push({ x: -4.5, y: 2.7 }, { x: s.eye.retina + 1.2, y: -2.7 });
  }
  return P;
}

/* ---------- the reducer ---------- */
const numIn = (v, lo, hi) => clamp(Number.isFinite(v) ? v : lo, lo, hi);
const oddIn = (v, lo, hi) => { const n = Math.round(numIn(v, lo, hi)); return n % 2 ? n : n + 1; };
/** Keep the object in front of the element, and never through it. */
const uIn = (v) => -clamp(Math.abs(Number.isFinite(v) ? v : U_MIN), U_MIN, U_MAX);
/** A focal length keeps its sign; only a mirror may be flat. */
const fIn = (v, allowFlat) => {
  if (!Number.isFinite(v)) return allowFlat ? 0 : F_MIN;
  if (allowFlat && v === 0) return 0;
  const s = v < 0 ? -1 : 1;
  return s * clamp(Math.abs(v), F_MIN, F_MAX);
};
const rIn = (v) => {
  const s = v < 0 ? -1 : 1;
  return Number.isFinite(v) && v !== 0 ? s * clamp(Math.abs(v), R_ABS_MIN, R_ABS_MAX) : R_ABS_MIN;
};

const setIn = (s, key, patch) => ({ ...s, [key]: { ...s[key], ...patch } });

export function reducer(state, a) {
  switch (a.type) {
    /* ---------- the window ---------- */
    case 'pan':
      return { ...state, centre: {
        x: clamp(state.centre.x + a.dx, -PAN_LIMIT, PAN_LIMIT),
        y: clamp(state.centre.y + a.dy, -PAN_LIMIT, PAN_LIMIT) } };
    case 'zoom': return zoomView(state, a.factor, a.at);
    case 'fit': return fitView(state);
    case 'resetView':
      return { ...state, centre: { x: 0, y: 0 }, range: initialState.range };

    /* ---------- which bench, and what is drawn ---------- */
    case 'bench': {
      if (!BENCHES.some((b) => b.id === a.value)) return state;
      return fitView({ ...state, bench: a.value });
    }
    case 'view': return { ...state, view: { ...state.view, [a.key]: !!a.value } };
    case 'panel': return { ...state, [a.key]: !!a.value };
    case 'snap': return { ...state, snap: !!a.value };
    case 'tab': return { ...state, tab: a.value };

    /* ---------- mirrors and lenses ---------- */
    case 'focal': {
      const key = state.bench === 'mirror' ? 'mirror' : 'lens';
      return setIn(state, key, { f: fIn(a.value, key === 'mirror') });
    }
    case 'objectAt': {
      const key = state.bench === 'mirror' ? 'mirror' : 'lens';
      return setIn(state, key, { u: uIn(a.value) });
    }
    case 'objectH': {
      const key = state.bench === 'mirror' ? 'mirror' : 'lens';
      const h = Number.isFinite(a.value) ? a.value : H_MIN;
      const s = h < 0 ? -1 : 1;
      return setIn(state, key, { h: s * clamp(Math.abs(h), H_MIN, H_MAX) });
    }
    case 'aperture': {
      const key = state.bench === 'mirror' ? 'mirror' : 'lens';
      const cap = key === 'mirror' && state[key].f !== 0
        ? Math.min(SEMI_MAX, 0.92 * Math.abs(2 * state[key].f))
        : SEMI_MAX;
      return setIn(state, key, { semi: numIn(a.value, SEMI_MIN, cap) });
    }
    case 'rays': {
      const key = state.bench === 'mirror' ? 'mirror' : 'lens';
      return setIn(state, key, { rays: a.value });
    }
    case 'fanCount': {
      const key = state.bench === 'mirror' ? 'mirror' : 'lens';
      return setIn(state, key, { fanCount: oddIn(a.value, FAN_MIN, FAN_MAX) });
    }
    case 'real': {
      const key = state.bench === 'mirror' ? 'mirror' : 'lens';
      return setIn(state, key, { real: !!a.value });
    }
    case 'screen': {
      const key = state.bench === 'mirror' ? 'mirror' : 'lens';
      if (a.show !== undefined) return setIn(state, key, { showScreen: !!a.show });
      return setIn(state, key, { screenX: numIn(a.value, -U_MAX, U_MAX) });
    }

    /* ---------- the lens's own extras ---------- */
    case 'maker': return setIn(state, 'lens', { maker: !!a.value });
    case 'makerPart': {
      const p = a.key === 'n'
        ? { n: numIn(a.value, 1.05, 3) }
        : a.key === 'thick'
          ? { thick: numIn(a.value, THICK_MIN, THICK_MAX) }
          : { [a.key]: rIn(a.value) };
      return setIn(state, 'lens', p);
    }
    /* a reading belongs to the bench it was taken on: logging one on the mirror
       and reading it back on the lens would quietly poison the fitted f */
    case 'logReading': {
      const key = state.bench === 'mirror' ? 'mirror' : 'lens';
      if (!isFinite(a.u) || !isFinite(a.v)) return state;
      const r = state[key].readings.filter((x) => Math.abs(x.u - a.u) > 0.01);
      return setIn(state, key, { readings: [...r, { u: a.u, v: a.v }].slice(-READINGS_MAX) });
    }
    case 'clearReadings':
      return setIn(state, state.bench === 'mirror' ? 'mirror' : 'lens', { readings: [] });

    /* ---------- refraction ---------- */
    case 'piece': return setIn(state, 'refract', { piece: a.value });
    case 'incidence': return setIn(state, 'refract', { i: numIn(a.value, 0, I_MAX) });
    case 'index': return setIn(state, 'refract', { [a.key]: numIn(a.value, N_MIN, N_MAX) });
    case 'slabT': return setIn(state, 'refract', { thickness: numIn(a.value, SLAB_MIN, SLAB_MAX) });
    case 'prismA': return setIn(state, 'refract', { A: numIn(a.value, A_MIN, A_MAX) });
    case 'white': return setIn(state, 'refract', { white: !!a.value });

    /* ---------- the eye ---------- */
    case 'eye': {
      const lim = {
        retina: [RETINA_MIN, RETINA_MAX], far: [FAR_MIN, FAR_MAX],
        near: [NEAR_MIN, NEAR_MAX], object: [OBJ_MIN, OBJ_MAX],
      }[a.key];
      if (!lim) return state;
      return setIn(state, 'eye', { [a.key]: numIn(a.value, lim[0], lim[1]) });
    }
    case 'defect': {
      const d = ['normal', 'myopia', 'hypermetropia'].includes(a.value) ? a.value : 'normal';
      const patch = { defect: d };
      if (d === 'myopia' && state.eye.far > 120) patch.far = 50;
      if (d === 'hypermetropia' && state.eye.near <= 25.5) patch.near = 60;
      return setIn(state, 'eye', patch);
    }
    case 'wearing': return setIn(state, 'eye', { wearing: !!a.value });
    case 'objectFar': return setIn(state, 'eye', { objectFar: !!a.value });

    /* ---------- presets and starting again ---------- */
    case 'preset': return fitView({ ...state, ...a.patch });
    case 'reset': return fitView({ ...initialState, bench: state.bench, tab: state.tab });

    /* ---------- challenge mode ---------- */
    case 'enterChallenge': {
      const { mirror, lens, refract, eye, bench } = state;
      return { ...state, mode: 'challenge',
               snapshot: { bench, mirror, lens, refract, eye } };
    }
    case 'leaveChallenge': return leave(state);
    case 'loadTask':
      return fitView({ ...state, ...(a.patch || {}), task: a.task, pending: true });
    case 'answered': return { ...state, pending: false };
    case 'score':
      return { ...state, attempts: state.attempts + 1, score: state.score + (a.correct ? 1 : 0) };

    case 'hydrate': return { ...state, ...a.value };
    default: return state;
  }
}

/** Hand the visitor's own bench back, exactly as they left it. */
function leave(s) {
  const snap = s.snapshot;
  const back = snap ? { ...s, ...snap } : s;
  return fitView({ ...back, mode: 'explore', pending: false, task: null, snapshot: null });
}

/* ============================================================
   WHAT THE BROWSER REMEMBERS

   Everything is kept in this browser and nowhere else. The reader
   trusts none of it: every field is checked against the same limits
   the controls use, because storage can be edited by hand, written
   by an older version of this lab, or simply corrupt.
   ============================================================ */
const numOr = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d);
/* isFinite(null) is true, and JSON writes a NaN out as null — so the type has to
   be checked as well as the value, or a corrupt reading walks back in */
const readingsOf = (list) => (Array.isArray(list)
  ? list
    .filter((r) => r && typeof r === 'object'
      && typeof r.u === 'number' && isFinite(r.u)
      && typeof r.v === 'number' && isFinite(r.v))
    .slice(0, READINGS_MAX).map((r) => ({ u: r.u, v: r.v }))
  : []);
const boolOr = (v, d) => (typeof v === 'boolean' ? v : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);

export function writeState(s) {
  try {
    /* while a challenge is up, keep the visitor's own bench rather than the puzzle */
    const src = s.mode === 'challenge' && s.snapshot ? { ...s, ...s.snapshot } : s;
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 1,
      bench: src.bench, mirror: src.mirror, lens: src.lens,
      refract: src.refract, eye: src.eye,
      view: src.view, centre: src.centre, range: src.range,
      snap: src.snap, showPanel: src.showPanel, showSheet: src.showSheet,
      tab: src.tab, score: src.score, attempts: src.attempts,
    }));
  } catch (e) { /* a private window, or a full disk. The lab still works. */ }
}

export function readState() {
  let d;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    d = JSON.parse(raw);
  } catch (e) { return null; }
  if (!d || typeof d !== 'object' || d.v !== 1) return null;

  const I = initialState;
  const mo = d.mirror && typeof d.mirror === 'object' ? d.mirror : {};
  const le = d.lens && typeof d.lens === 'object' ? d.lens : {};
  const re = d.refract && typeof d.refract === 'object' ? d.refract : {};
  const ey = d.eye && typeof d.eye === 'object' ? d.eye : {};
  const vw = d.view && typeof d.view === 'object' ? d.view : {};

  const mf = typeof mo.f === 'number' && isFinite(mo.f) ? fIn(mo.f, true) : I.mirror.f;
  const lf = typeof le.f === 'number' && isFinite(le.f) ? fIn(le.f, false) : I.lens.f;

  const mirror = {
    f: mf,
    semi: numOr(mo.semi, SEMI_MIN, mf === 0 ? SEMI_MAX
      : Math.min(SEMI_MAX, 0.92 * Math.abs(2 * mf)), I.mirror.semi),
    u: typeof mo.u === 'number' && isFinite(mo.u) ? uIn(mo.u) : I.mirror.u,
    h: typeof mo.h === 'number' && isFinite(mo.h) && mo.h !== 0
      ? (mo.h < 0 ? -1 : 1) * clamp(Math.abs(mo.h), H_MIN, H_MAX) : I.mirror.h,
    rays: oneOf(mo.rays, ['construction', 'fan', 'both'], I.mirror.rays),
    fanCount: oddIn(numOr(mo.fanCount, FAN_MIN, FAN_MAX, I.mirror.fanCount), FAN_MIN, FAN_MAX),
    real: boolOr(mo.real, I.mirror.real),
    screenX: numOr(mo.screenX, -U_MAX, U_MAX, I.mirror.screenX),
    showScreen: boolOr(mo.showScreen, I.mirror.showScreen),
    readings: readingsOf(mo.readings),
  };
  const lens = {
    f: lf,
    u: typeof le.u === 'number' && isFinite(le.u) ? uIn(le.u) : I.lens.u,
    h: typeof le.h === 'number' && isFinite(le.h) && le.h !== 0
      ? (le.h < 0 ? -1 : 1) * clamp(Math.abs(le.h), H_MIN, H_MAX) : I.lens.h,
    semi: numOr(le.semi, SEMI_MIN, SEMI_MAX, I.lens.semi),
    rays: oneOf(le.rays, ['construction', 'fan', 'both'], I.lens.rays),
    fanCount: oddIn(numOr(le.fanCount, FAN_MIN, FAN_MAX, I.lens.fanCount), FAN_MIN, FAN_MAX),
    real: boolOr(le.real, I.lens.real),
    screenX: numOr(le.screenX, -U_MAX, U_MAX, I.lens.screenX),
    showScreen: boolOr(le.showScreen, I.lens.showScreen),
    maker: boolOr(le.maker, I.lens.maker),
    R1: typeof le.R1 === 'number' && isFinite(le.R1) && le.R1 !== 0 ? rIn(le.R1) : I.lens.R1,
    R2: typeof le.R2 === 'number' && isFinite(le.R2) && le.R2 !== 0 ? rIn(le.R2) : I.lens.R2,
    n: numOr(le.n, 1.05, 3, I.lens.n),
    thick: numOr(le.thick, THICK_MIN, THICK_MAX, I.lens.thick),
    readings: readingsOf(le.readings),
  };
  const refract = {
    piece: oneOf(re.piece, ['interface', 'slab', 'prism'], I.refract.piece),
    i: numOr(re.i, 0, I_MAX, I.refract.i),
    n1: numOr(re.n1, N_MIN, N_MAX, I.refract.n1),
    n2: numOr(re.n2, N_MIN, N_MAX, I.refract.n2),
    thickness: numOr(re.thickness, SLAB_MIN, SLAB_MAX, I.refract.thickness),
    nSlab: numOr(re.nSlab, N_MIN, N_MAX, I.refract.nSlab),
    A: numOr(re.A, A_MIN, A_MAX, I.refract.A),
    nPrism: numOr(re.nPrism, N_MIN, N_MAX, I.refract.nPrism),
    white: boolOr(re.white, I.refract.white),
  };
  const eye = {
    retina: numOr(ey.retina, RETINA_MIN, RETINA_MAX, I.eye.retina),
    defect: oneOf(ey.defect, ['normal', 'myopia', 'hypermetropia'], I.eye.defect),
    far: numOr(ey.far, FAR_MIN, FAR_MAX, I.eye.far),
    near: numOr(ey.near, NEAR_MIN, NEAR_MAX, I.eye.near),
    wearing: boolOr(ey.wearing, I.eye.wearing),
    object: numOr(ey.object, OBJ_MIN, OBJ_MAX, I.eye.object),
    objectFar: boolOr(ey.objectFar, I.eye.objectFar),
  };

  const attempts = Math.max(0, Math.round(numOr(d.attempts, 0, 1e6, 0)));
  return {
    ...I,
    bench: oneOf(d.bench, BENCHES.map((b) => b.id), I.bench),
    mirror, lens, refract, eye,
    view: {
      normals: boolOr(vw.normals, I.view.normals),
      angles: boolOr(vw.angles, I.view.angles),
      virtual: boolOr(vw.virtual, I.view.virtual),
      labels: boolOr(vw.labels, I.view.labels),
      paraxial: boolOr(vw.paraxial, I.view.paraxial),
    },
    centre: {
      x: numOr(d.centre && d.centre.x, -PAN_LIMIT, PAN_LIMIT, 0),
      y: numOr(d.centre && d.centre.y, -PAN_LIMIT, PAN_LIMIT, 0),
    },
    range: numOr(d.range, RANGE_MIN, RANGE_MAX, I.range),
    snap: boolOr(d.snap, I.snap),
    showPanel: boolOr(d.showPanel, I.showPanel),
    showSheet: boolOr(d.showSheet, I.showSheet),
    /* a challenge belongs to the sitting it was set in */
    tab: oneOf(d.tab, ['explore', 'learn'], 'explore'),
    attempts,
    score: Math.max(0, Math.min(attempts, Math.round(numOr(d.score, 0, 1e6, 0)))),
    mode: 'explore', pending: false, task: null, snapshot: null,
  };
}

/* A first visit arrives framed. A returning one arrives where it was left, which
   matters more — somebody who zoomed in on the rim of a mirror meant to. */
export const createInitialState = () => readState() || fitView(initialState);
