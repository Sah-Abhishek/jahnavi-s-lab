/* ============================================================
   Simple Pendulum — the state machine.
   Anything that changes the apparatus itself restarts the swing,
   so what you see is always a pendulum released from the angle the
   controls say. Mass is the deliberate exception: change it while
   the bob is moving and nothing happens, which is the lesson.
   ============================================================ */
import {
  GRAVITIES, PRESETS, COLOURS,
  LEN_MIN, LEN_MAX, MASS_MIN, MASS_MAX, AMP_MIN, AMP_MAX,
  clamp, round2,
} from './engine.js';

export const initialState = {
  g: 9.81,
  a: { length: 1, mass: 2, amplitude: 18 },
  b: { length: 2, mass: 2, amplitude: 18 },
  compare: false,
  damping: false,
  running: true,
  showSwing: true,
  showVelocity: false,
  showForces: false,
  showEnergy: false,
  mode: 'explore',     // 'explore' | 'challenge'
  frozen: false,       // held at rest while a prediction is pending
  tab: 'explore',
  score: 0,
  attempts: 0,
  snapshot: null,
  /* bumped whenever the apparatus changes rather than the view, so the bob
     knows to be released again from the top instead of jumping mid-swing */
  epoch: 0,
};

export const ARM_LIMITS = {
  length: [LEN_MIN, LEN_MAX],
  mass: [MASS_MIN, MASS_MAX],
  amplitude: [AMP_MIN, AMP_MAX],
};

/** Release the bob again from where the controls now say. */
const restart = (s) => ({ ...s, epoch: s.epoch + 1 });

function setArm(s, which, key, value) {
  const [lo, hi] = ARM_LIMITS[key] || [-Infinity, Infinity];
  const arm = { ...s[which], [key]: clamp(round2(value), lo, hi) };
  const next = { ...s, [which]: arm };
  /* mass alone leaves the swing alone — that is the whole demonstration */
  return key === 'mass' ? next : restart(next);
}

export function reducer(state, action) {
  const a = action;
  switch (a.type) {
    case 'gravity':
      return restart({ ...state, g: a.value });
    case 'arm':
      return setArm(state, a.which, a.key, a.value);
    case 'release':                       /* the bob was dragged and let go */
      return restart({ ...state, [a.which]: { ...state[a.which], amplitude: a.amplitude } });
    case 'compare':
      return restart({ ...state, compare: a.value });
    case 'restart':                       /* let it go again from the top */
      return restart({ ...state, running: true });
    case 'damping':
      return restart({ ...state, damping: a.value });

    /* view-only switches never disturb the swing */
    case 'view':
      return { ...state, [a.key]: a.value };
    case 'running':
      return { ...state, running: a.value };

    case 'preset': {
      const p = PRESETS[a.name];
      if (!p) return state;
      const base = leave(state);
      return restart({
        ...base,
        ...p.state,
        a: { ...base.a, ...p.state.a },
        b: p.state.b ? { ...base.b, ...p.state.b } : base.b,
        running: true,
      });
    }
    case 'reset':
      return restart({
        ...initialState,
        tab: state.tab === 'learn' ? 'learn' : 'explore',
        epoch: state.epoch,
      });

    /* ---------- challenge mode ---------- */
    case 'enterChallenge': {
      if (state.mode === 'challenge') return state;
      return {
        ...state,
        mode: 'challenge',
        snapshot: {
          g: state.g, a: { ...state.a }, b: { ...state.b },
          compare: state.compare, damping: state.damping,
        },
      };
    }
    case 'leaveChallenge':
      return restart(leave(state));
    case 'loadTask': {
      const t = a.task;
      const next = {
        ...state, damping: false, running: !a.frozen, frozen: !!a.frozen,
        g: t.g, compare: t.type === 'predict',
        a: { ...state.a, ...t.a },
        b: t.b ? { ...state.b, ...t.b } : state.b,
      };
      return restart(next);
    }
    case 'unfreeze':
      return restart({ ...state, frozen: false, running: true });

    case 'score':
      return { ...state, attempts: state.attempts + 1, score: state.score + (a.correct ? 1 : 0) };
    case 'tab':
      return { ...state, tab: a.value };
    case 'hydrate':
      return { ...state, ...a.value };
    default:
      return state;
  }
}

/** Put the visitor's own apparatus back on the stand. */
function leave(s) {
  if (s.mode !== 'challenge') return s;
  const snap = s.snapshot;
  return {
    ...s, mode: 'explore', frozen: false, running: true, snapshot: null,
    ...(snap || {}),
  };
}

export const armColour = (which) => COLOURS[which];

/* ============================================================
   SAVED SET-UP
   In this browser only. Storage can be unavailable (private
   windows, blocked site data) or full, so every call is guarded.
   ============================================================ */
const STORE_KEY = 'jahnavis-lab/simple-pendulum/v1';

export function writeState(s) {
  /* while a challenge is running the apparatus on screen is the task's, not
     the visitor's — persist what they left behind, not the puzzle */
  const src = (s.mode === 'challenge' && s.snapshot) ? s.snapshot : s;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 1,
      g: src.g,
      a: src.a, b: src.b,
      compare: src.compare,
      damping: src.damping,
      showSwing: s.showSwing,
      showVelocity: s.showVelocity,
      showForces: s.showForces,
      showEnergy: s.showEnergy,
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
  if (!d || d.v !== 1) return null;

  const num = (v, lo, hi, dflt) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : dflt);
  const bool = (v, dflt) => (typeof v === 'boolean' ? v : dflt);
  const arm = (v, dflt) => (v && typeof v === 'object' ? {
    length: num(v.length, LEN_MIN, LEN_MAX, dflt.length),
    mass: num(v.mass, MASS_MIN, MASS_MAX, dflt.mass),
    amplitude: num(v.amplitude, AMP_MIN, AMP_MAX, dflt.amplitude),
  } : dflt);

  const s = { ...initialState };
  s.g = GRAVITIES.some((o) => o.value === d.g) ? d.g : initialState.g;
  s.a = arm(d.a, initialState.a);
  s.b = arm(d.b, initialState.b);
  s.compare = bool(d.compare, false);
  s.damping = bool(d.damping, false);
  s.showSwing = bool(d.showSwing, true);
  s.showVelocity = bool(d.showVelocity, false);
  s.showForces = bool(d.showForces, false);
  s.showEnergy = bool(d.showEnergy, false);

  if (d.score && typeof d.score === 'object') {
    s.attempts = num(d.score.attempts, 0, 1e6, 0);
    s.score = clamp(num(d.score.score, 0, 1e6, 0), 0, s.attempts);
  }
  s.tab = ['explore', 'challenge', 'learn'].indexOf(d.tab) >= 0 ? d.tab : 'explore';
  /* a challenge is never restored — it belongs to the sitting it was set in */
  if (s.tab === 'challenge') s.tab = 'explore';
  return s;
}

export const createInitialState = () => readState() || initialState;
