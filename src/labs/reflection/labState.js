/* ============================================================
   Reflection — the state machine.

   The graph is a window on the plane, not a fixed frame: it has
   a centre it is looking at and a reach, and both move freely.
   Nothing here is clamped to what happens to be on screen, so
   panning and zooming can never disturb the maths — they only
   change where you are standing to look at it.

   The mirror is held as the line itself, a x + b y + c = 0. The
   two handles you drag are worked out at drawing time from where
   that line crosses the window, so they are always somewhere you
   can reach however far the graph has been scrolled — and the
   drawn mirror and the written mirror can never disagree, because
   there is only ever one of them.
   ============================================================ */
import {
  V, clamp, tidyLine, tidyPlane, translateLine,
  lenV, subV, normV, scaleV, addV,
  vertexCount, PRESETS_2D, PRESETS_3D, EPS,
} from './engine.js';

/* Nothing may be placed beyond this, in any direction. The view is free to
   wander anywhere; the maths stays somewhere a pupil can still read it. */
export const LIMIT = 500;

/* The reach of the graph: the world half-extent of its shorter side. Eight
   orders of magnitude between the ends, which is as good as unbounded for a
   lab whose numbers live between −500 and 500. */
export const RANGE_MIN = 1e-3;
export const RANGE_MAX = 1e5;
export const DEFAULT_RANGE = 8;
export const ZOOM_STEP = 1.4;          /* one press of + or − */
export const PAN_LIMIT = 1e6;
export const PITCH_MIN = -85, PITCH_MAX = 85;

export const initialState = {
  dim: '2d',                 // '2d' | '3d'
  object: 'point',           // 'point' | 'triangle' | 'quad'

  /* ---------- the flat graph ---------- */
  pts2: [{ x: 4, y: 1 }, { x: -1, y: 5 }, { x: -4, y: 4 }, { x: -3, y: 1 }],
  line2: { a: 1, b: -1, c: 0 },                    // y = x
  centre2: { x: 0, y: 0 },

  /* ---------- space ---------- */
  pts3: [{ x: 3, y: 2, z: 4 }, { x: 5, y: 2, z: 4 }, { x: 2, y: 5, z: 5 }, { x: 1, y: 1, z: 2 }],
  mirror3: 'plane',          // 'plane' | 'line'
  plane: { a: 0, b: 0, c: 1, d: 0 },               // the floor, z = 0
  lnA: { x: 0, y: 0, z: -7 }, lnB: { x: 0, y: 0, z: 7 },   // the z-axis
  centre3: { x: 0, y: 0, z: 0 },
  /* chosen so the three axes spread evenly on screen and a point with
     different x and y never lands on top of one of them */
  yaw: 62, pitch: 26,

  /* ---------- what is drawn ---------- */
  range: DEFAULT_RANGE,
  snap: true,
  showPerp: true,
  showDistance: true,
  showCoords: true,
  showNormal: true,
  showPanel: true,           // the floating controls
  showSheet: false,          // the floating working out

  /* ---------- the rest of the lab ---------- */
  mode: 'explore',           // 'explore' | 'challenge'
  pending: false,            // a challenge is set and not yet answered
  target: null,              // where a "find the mirror" task wants the image to land
  tab: 'explore',
  score: 0,
  attempts: 0,
  snapshot: null,
};

/* ============================================================
   HELPERS
   ============================================================ */

const fin = (v) => typeof v === 'number' && isFinite(v);
const lim = (v) => clamp(v, -LIMIT, LIMIT);

/** Round to the graph paper you are actually looking at: whole units at the
    everyday zoom, tenths once you are close enough for a tenth to be a real
    distance on screen, twenties when you are miles out. */
export const snapTo = (v, on, step = 1) => {
  if (!on) return Math.round(v * 1e4) / 1e4;
  const g = step > 0 ? step : 1;
  return Math.round(v / g) * g;
};

const clampPt2 = (p, R) => ({ x: clamp(p.x, -R, R), y: clamp(p.y, -R, R) });
const clampPt3 = (p, R) => ({ x: clamp(p.x, -R, R), y: clamp(p.y, -R, R), z: clamp(p.z, -R, R) });

/** The mirror, as the line it is. */
export const lineOf = (s) => s.line2;

/** The mirror line in space, as a point and a direction. */
export function line3Of(s) {
  const u = subV(s.lnB, s.lnA);
  return lenV(u) < EPS ? { A: s.lnA, u: V(0, 0, 1) } : { A: s.lnA, u };
}

/** The vertices actually in play — the shape decides how many. */
export const activePts = (s) =>
  (s.dim === '3d' ? s.pts3 : s.pts2).slice(0, vertexCount(s.object));

/* ============================================================
   THE REDUCER
   ============================================================ */

function setPoint(s, i, p) {
  /* bounded by the lab, never by the view: what is on screen is a matter of
     where you have scrolled to, and that must not be able to move a point */
  if (s.dim === '3d') {
    const pts3 = s.pts3.slice();
    pts3[i] = clampPt3({ x: p.x, y: p.y, z: p.z }, LIMIT);
    return { ...s, pts3 };
  }
  const pts2 = s.pts2.slice();
  pts2[i] = clampPt2({ x: p.x, y: p.y }, LIMIT);
  return { ...s, pts2 };
}

/** Zoom by a factor, holding one world point still under the pointer.
    Zooming towards the cursor is what makes a big canvas navigable: the
    thing you are looking at stays where you are looking. */
function zoomView(s, factor, at) {
  const range = clamp(s.range / factor, RANGE_MIN, RANGE_MAX);
  const f = s.range / range;                 /* what the zoom actually managed */
  if (!at || !fin(at.x) || !fin(at.y)) return { ...s, range };
  const c = s.centre2;
  return {
    ...s,
    range,
    centre2: {
      x: clamp(at.x + (c.x - at.x) / f, -PAN_LIMIT, PAN_LIMIT),
      y: clamp(at.y + (c.y - at.y) / f, -PAN_LIMIT, PAN_LIMIT),
    },
  };
}

export function reducer(state, action) {
  const a = action;
  switch (a.type) {
    case 'dim':
      return { ...state, dim: a.value };
    case 'object':
      return { ...state, object: a.value };

    /* ---------- the object ---------- */
    case 'point':
      return setPoint(state, a.index, a.value);

    /* ---------- the flat mirror ---------- */
    case 'line2': {
      const L = tidyLine(a.value);
      if (Math.hypot(L.a, L.b) < EPS) return state;
      return { ...state, line2: L };
    }
    case 'shiftLine':
      return { ...state, line2: tidyLine(translateLine(state.line2, a.dx, a.dy)) };

    /* ---------- the mirror in space ---------- */
    case 'mirror3':
      return { ...state, mirror3: a.value };
    case 'plane':
      return { ...state, plane: tidyPlane(a.value) };
    case 'planeCoef': {
      const next = { ...state.plane, [a.key]: a.value };
      /* a normal of (0, 0, 0) is not a plane — keep the last good one */
      if (Math.hypot(next.a, next.b, next.c) < EPS) return state;
      return { ...state, plane: next };
    }
    case 'lnPoint': {
      const p = clampPt3(a.value, LIMIT);
      const other = a.which === 'A' ? state.lnB : state.lnA;
      if (lenV(subV(p, other)) < 0.75) return state;
      return { ...state, [a.which === 'A' ? 'lnA' : 'lnB']: p };
    }
    case 'line3': {
      const { A, u } = a.value;
      const d = normV(u);
      const span = 7;
      return {
        ...state,
        lnA: clampPt3(subV(A, scaleV(d, span)), LIMIT),
        lnB: clampPt3(addV(A, scaleV(d, span)), LIMIT),
      };
    }
    case 'orbit':
      return {
        ...state,
        yaw: ((a.yaw % 360) + 360) % 360,
        pitch: clamp(a.pitch, PITCH_MIN, PITCH_MAX),
      };

    /* ---------- moving about the graph ---------- */
    case 'pan': {
      if (state.dim === '3d') {
        return {
          ...state,
          centre3: {
            x: clamp(state.centre3.x + a.dx, -PAN_LIMIT, PAN_LIMIT),
            y: clamp(state.centre3.y + a.dy, -PAN_LIMIT, PAN_LIMIT),
            z: clamp(state.centre3.z + (a.dz || 0), -PAN_LIMIT, PAN_LIMIT),
          },
        };
      }
      return {
        ...state,
        centre2: {
          x: clamp(state.centre2.x + a.dx, -PAN_LIMIT, PAN_LIMIT),
          y: clamp(state.centre2.y + a.dy, -PAN_LIMIT, PAN_LIMIT),
        },
      };
    }
    case 'zoom':
      return zoomView(state, a.factor, state.dim === '3d' ? null : a.at);
    case 'resetView':
      return {
        ...state,
        range: DEFAULT_RANGE,
        centre2: { x: 0, y: 0 },
        centre3: { x: 0, y: 0, z: 0 },
        yaw: initialState.yaw,
        pitch: initialState.pitch,
      };

    /* ---------- what is drawn ---------- */
    case 'view':
      return { ...state, [a.key]: a.value };
    case 'snap':
      return { ...state, snap: a.value };
    case 'panel':
      return { ...state, [a.key]: a.value };

    /* ---------- ready-made set-ups ---------- */
    case 'preset': {
      const p = (state.dim === '3d' ? PRESETS_3D : PRESETS_2D)[a.name];
      if (!p) return state;
      const base = leave(state);
      if (state.dim === '3d') {
        const pts3 = base.pts3.slice();
        p.pts.forEach((q, i) => { pts3[i] = { ...q }; });
        return {
          ...base, object: p.object, pts3, mirror3: p.mirror,
          plane: p.plane ? tidyPlane(p.plane) : base.plane,
          lnA: p.lnA ? { ...p.lnA } : base.lnA,
          lnB: p.lnB ? { ...p.lnB } : base.lnB,
        };
      }
      const pts2 = base.pts2.slice();
      p.pts.forEach((q, i) => { pts2[i] = { ...q }; });
      return { ...base, object: p.object, pts2, line2: tidyLine(p.line) };
    }
    case 'reset':
      return {
        ...initialState,
        dim: state.dim,
        tab: state.tab === 'learn' ? 'learn' : 'explore',
        score: state.score, attempts: state.attempts,
        showPanel: state.showPanel, showSheet: state.showSheet,
      };

    /* ---------- challenge mode ---------- */
    case 'enterChallenge': {
      if (state.mode === 'challenge') return state;
      const { mode, tab, snapshot, score, attempts, pending, target, ...rest } = state;
      return { ...state, mode: 'challenge', pending: false, target: null, snapshot: rest };
    }
    case 'leaveChallenge':
      return leave(state);
    case 'loadTask': {
      const t = a.task;
      /* a challenge is set on the everyday graph, wherever the visitor had
         scrolled to — otherwise the question could be off screen */
      const next = {
        ...state, dim: t.dim, object: 'point', mode: 'challenge',
        pending: true, target: t.type === 'mirror' ? { ...t.image } : null,
        range: DEFAULT_RANGE,
        centre2: { x: 0, y: 0 }, centre3: { x: 0, y: 0, z: 0 },
      };
      if (t.dim === '3d') {
        const pts3 = next.pts3.slice();
        pts3[0] = { ...t.point };
        return {
          ...next, pts3, mirror3: t.mirror,
          plane: t.plane ? tidyPlane(t.plane) : next.plane,
          lnA: t.lnA ? { ...t.lnA } : next.lnA,
          lnB: t.lnB ? { ...t.lnB } : next.lnB,
        };
      }
      const pts2 = next.pts2.slice();
      pts2[0] = { ...t.point };
      /* an "image" task is given its mirror; a "mirror" task has to find one,
         so it starts somewhere that is definitely NOT the answer — which the
         first candidate sometimes is, since y = 0 is itself a mirror it sets */
      const wanted = tidyLine(t.line);
      const away = [{ a: 0, b: 1, c: 0 }, { a: 1, b: 0, c: 0 }, { a: 1, b: -1, c: 0 }]
        .map(tidyLine).find((L) => !sameLine(L, wanted));
      return { ...next, pts2, line2: t.type === 'mirror' ? away : wanted };
    }
    case 'answered':
      return { ...state, pending: false };
    case 'score':
      return {
        ...state, pending: false,
        attempts: state.attempts + 1,
        score: state.score + (a.correct ? 1 : 0),
      };

    case 'tab':
      return { ...state, tab: a.value };
    case 'hydrate':
      return { ...state, ...a.value };
    default:
      return state;
  }
}

const sameLine = (p, q) =>
  Math.abs(p.a * q.b - p.b * q.a) < 1e-7 &&
  Math.abs(p.a * q.c - p.c * q.a) < 1e-7 &&
  Math.abs(p.b * q.c - p.c * q.b) < 1e-7;

/** Put the visitor's own set-up back on the graph. */
function leave(s) {
  if (s.mode !== 'challenge') return s;
  return {
    ...s, ...(s.snapshot || {}),
    mode: 'explore', pending: false, target: null, snapshot: null,
  };
}

/* ============================================================
   SAVED SET-UP
   In this browser only. Storage can be unavailable (private
   windows, blocked site data) or full, so every call is guarded.
   ============================================================ */
const STORE_KEY = 'jahnavis-lab/reflection/v2';

export function writeState(s) {
  /* a challenge borrows the graph — save what the visitor left, not the puzzle */
  const src = (s.mode === 'challenge' && s.snapshot) ? { ...s, ...s.snapshot } : s;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 2,
      dim: src.dim, object: src.object,
      pts2: src.pts2, pts3: src.pts3,
      line2: src.line2,
      mirror3: src.mirror3, plane: src.plane, lnA: src.lnA, lnB: src.lnB,
      centre2: src.centre2, centre3: src.centre3,
      yaw: src.yaw, pitch: src.pitch,
      range: src.range, snap: src.snap,
      view: {
        showPerp: s.showPerp, showDistance: s.showDistance,
        showCoords: s.showCoords, showNormal: s.showNormal,
        showPanel: s.showPanel, showSheet: s.showSheet,
      },
      tab: s.tab,
      score: { score: s.score, attempts: s.attempts },
    }));
  } catch (e) { /* out of space or storage denied — carry on unsaved */ }
}

/** Read the saved set-up, distrusting every value in it. */
export function readState() {
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  if (!raw) return null;
  let d;
  try { d = JSON.parse(raw); } catch (e) { return null; }
  if (!d || d.v !== 2) return null;

  const bool = (v, dflt) => (typeof v === 'boolean' ? v : dflt);
  const pt2 = (v, dflt) => (v && typeof v === 'object' && fin(v.x) && fin(v.y)
    ? { x: lim(v.x), y: lim(v.y) } : dflt);
  const pt3 = (v, dflt) => (v && typeof v === 'object' && fin(v.x) && fin(v.y) && fin(v.z)
    ? { x: lim(v.x), y: lim(v.y), z: lim(v.z) } : dflt);
  const seen = (v, dflt, n) => (v && typeof v === 'object'
    && ['x', 'y', 'z'].slice(0, n).every((k) => fin(v[k]))
    ? Object.fromEntries(['x', 'y', 'z'].slice(0, n)
      .map((k) => [k, clamp(v[k], -PAN_LIMIT, PAN_LIMIT)]))
    : dflt);
  const list = (v, dflt, one) => (Array.isArray(v) && v.length === dflt.length
    ? dflt.map((q, i) => one(v[i], q)) : dflt);

  const s = { ...initialState };
  s.dim = d.dim === '3d' ? '3d' : '2d';
  s.object = ['point', 'triangle', 'quad'].includes(d.object) ? d.object : 'point';
  s.pts2 = list(d.pts2, initialState.pts2, pt2);
  s.pts3 = list(d.pts3, initialState.pts3, pt3);
  s.range = fin(d.range) ? clamp(d.range, RANGE_MIN, RANGE_MAX) : initialState.range;
  s.centre2 = seen(d.centre2, initialState.centre2, 2);
  s.centre3 = seen(d.centre3, initialState.centre3, 3);

  /* a mirror with no direction is not a line at all */
  if (d.line2 && typeof d.line2 === 'object'
      && ['a', 'b', 'c'].every((k) => fin(d.line2[k]))
      && Math.hypot(d.line2.a, d.line2.b) > EPS) {
    s.line2 = tidyLine(d.line2);
  }

  s.mirror3 = d.mirror3 === 'line' ? 'line' : 'plane';
  if (d.plane && typeof d.plane === 'object'
      && ['a', 'b', 'c', 'd'].every((k) => fin(d.plane[k]))
      && Math.hypot(d.plane.a, d.plane.b, d.plane.c) > EPS) {
    s.plane = tidyPlane(d.plane);
  }
  const lnA = pt3(d.lnA, initialState.lnA);
  const lnB = pt3(d.lnB, initialState.lnB);
  if (lenV(subV(lnA, lnB)) < 0.5) {
    s.lnA = initialState.lnA; s.lnB = initialState.lnB;
  } else { s.lnA = lnA; s.lnB = lnB; }

  s.yaw = fin(d.yaw) ? ((d.yaw % 360) + 360) % 360 : initialState.yaw;
  s.pitch = fin(d.pitch) ? clamp(d.pitch, PITCH_MIN, PITCH_MAX) : initialState.pitch;
  s.snap = bool(d.snap, true);

  const view = (d.view && typeof d.view === 'object') ? d.view : {};
  s.showPerp = bool(view.showPerp, true);
  s.showDistance = bool(view.showDistance, true);
  s.showCoords = bool(view.showCoords, true);
  s.showNormal = bool(view.showNormal, true);
  s.showPanel = bool(view.showPanel, true);
  s.showSheet = bool(view.showSheet, false);

  if (d.score && typeof d.score === 'object') {
    s.attempts = fin(d.score.attempts) ? clamp(d.score.attempts, 0, 1e6) : 0;
    s.score = clamp(fin(d.score.score) ? d.score.score : 0, 0, s.attempts);
  }
  s.tab = ['explore', 'challenge', 'learn'].includes(d.tab) ? d.tab : 'explore';
  /* a challenge belongs to the sitting it was set in */
  if (s.tab === 'challenge') s.tab = 'explore';
  return s;
}

export const createInitialState = () => readState() || initialState;
