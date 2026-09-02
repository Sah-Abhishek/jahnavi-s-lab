/* ============================================================
   Moment of Force — the state machine.
   Every change to the experiment goes through this reducer, which
   ends each transition by re-solving the auto-balancer. Keeping
   that normalisation in one place is what lets a balancer stay
   correct no matter which control the user touched.
   ============================================================ */
import {
  UNITS, PALETTE, MAX_MASSES, PRESETS,
  U, RL, LEN_MIN, LEN_MAX, MASS_MIN, MASS_MAX,
  clamp, tidy, round2, onGrid, getItems, rebalance,
} from './engine.js';

export const initialState = {
  units: 'mks',
  rodLength: 10,       // in the current length unit; changes the markings, not the drawing
  fulcrum: 5,
  g: 9.8,
  masses: [],
  showForces: true,
  showDistances: true,
  snap: true,
  useRodWeight: false,
  rodMass: 2,
  mode: 'explore',     // 'explore' | 'challenge'
  frozen: false,       // rod held level while a prediction is pending
  nextId: 1,
  score: 0,
  attempts: 0,
  tab: 'explore',
  snapshot: null,      // the explore scene, parked while a challenge runs
  /* bumped whenever the experiment is rebuilt rather than adjusted, so the beam
     knows to start from level instead of swinging in from wherever it was */
  epoch: 0,
};

/** Anything that changes the physics ends here: clone, then re-solve the balancer. */
function commit(s) {
  const next = { ...s, masses: s.masses.map((m) => ({ ...m })) };
  rebalance(next);
  return next;
}

/** A gap on the rod that no mass is already sitting in. */
function freeSpot(s) {
  const u = RL(s) / 10;                        // work in tenths of the rod
  for (let x = u; x <= 9 * u; x += u / 2) {
    if (!s.masses.some((k) => Math.abs(k.x - x) < u / 2)) return onGrid(s, x);
  }
  return RL(s) / 2;
}

function withMass(s, { m, x, locked, isTarget }) {
  if (s.masses.length >= MAX_MASSES) return s;
  const used = s.masses.map((k) => k.color);
  const color = PALETTE.find((c) => used.indexOf(c) === -1) ||
                PALETTE[s.masses.length % PALETTE.length];
  const obj = {
    id: s.nextId,
    m: m === undefined ? 2 : m,
    x: x === undefined ? freeSpot(s) : clamp(x, 0, RL(s)),
    color, locked: !!locked, isTarget: !!isTarget,
    enabled: true, auto: false, note: '',
  };
  return { ...s, masses: [...s.masses, obj], nextId: s.nextId + 1 };
}

const patchMass = (s, id, patch) => ({
  ...s,
  masses: s.masses.map((m) => (m.id === id ? { ...m, ...patch } : m)),
});

/** Build a scene from scratch: used by presets, reset and challenges. */
function setScene(s, fulcrum, list) {
  let next = { ...s, fulcrum, masses: [], nextId: 1 };
  list.forEach((d) => { next = withMass(next, d); });
  return next;
}

/* Changing the length re-marks the rod. Every mass keeps its distance from the
   pivot as a fraction of the rod, so the picture does not jump and — because the
   distances are rounded, not the positions — a balanced rod stays balanced. */
function setRodLength(s, raw) {
  if (!isFinite(raw)) return s;
  const next = clamp(raw, LEN_MIN(s), LEN_MAX(s));
  const k = next / s.rodLength;
  const offsets = s.masses.map((m) => (m.x - s.fulcrum) * k);
  const pivot = s.fulcrum * k;
  const grown = { ...s, rodLength: next };
  const fulcrum = clamp(onGrid(grown, pivot), 0, next);
  return {
    ...grown,
    fulcrum,
    /* round the sum as well, or float addition leaves 0.7999999999999998 behind */
    masses: s.masses.map((m, i) => ({
      ...m, x: clamp(onGrid(grown, fulcrum + onGrid(grown, offsets[i])), 0, next),
    })),
  };
}

/* Nothing about the physics changes when the unit system does: every quantity is
   simply restated. g·cm/s² is a dyne, so the same numbers mean the same thing. */
function setUnits(s, nextUnits) {
  if (!UNITS[nextUnits] || nextUnits === s.units) return s;
  const from = U(s), to = UNITS[nextUnits];
  const kL = to.L / from.L, kM = to.M / from.M;
  const world = from.g.indexOf(s.g);            // keep Earth as Earth
  return {
    ...s,
    units: nextUnits,
    rodLength: tidy(s.rodLength * kL),
    fulcrum: tidy(s.fulcrum * kL),
    rodMass: tidy(s.rodMass * kM),
    g: to.g[world >= 0 ? world : 0],
    masses: s.masses.map((m) => ({ ...m, x: tidy(m.x * kL), m: tidy(m.m * kM) })),
  };
}

/** Drop a counterweight on the light side and let it size itself. */
function addBalancer(s) {
  let net = 0;
  getItems(s).forEach((it) => { if (it.active) net += it.force * it.dSigned; });
  const side = net > 0 ? -1 : 1;                // clockwise-heavy -> go left
  const arm = side < 0 ? s.fulcrum : RL(s) - s.fulcrum;
  const pos = clamp(onGrid(s, s.fulcrum + side * arm * 0.7), 0, RL(s));
  let next = withMass(s, { m: 0, x: pos });
  if (next === s) return s;                     // the rod is full
  const added = next.masses[next.masses.length - 1].id;
  next = { ...next, masses: next.masses.map((m) => ({ ...m, auto: m.id === added })) };
  return next;
}

export function reducer(state, action) {
  const a = action;
  switch (a.type) {
    /* ---------- the apparatus ---------- */
    case 'fulcrum':
      return commit({ ...state, fulcrum: clamp(a.value, 0, RL(state)) });
    case 'rodLength':
      return commit(setRodLength(state, a.value));
    case 'units':
      return commit(setUnits(state, a.value));
    case 'gravity':
      return commit({ ...state, g: a.value });
    case 'rodMass':
      return commit({ ...state, rodMass: clamp(round2(a.value), 0, MASS_MAX(state)) });
    case 'toggle':                               // showForces / showDistances / snap / useRodWeight
      return commit({ ...state, [a.key]: a.value });

    /* ---------- the masses ---------- */
    case 'addMass':
      return commit(withMass(state, {}));
    case 'addBalancer':
      return commit(addBalancer(state));
    case 'removeMass':
      return commit({ ...state, masses: state.masses.filter((m) => m.id !== a.id) });
    case 'massValue': {
      const mo = state.masses.find((m) => m.id === a.id);
      if (!mo || mo.locked || mo.auto) return state;
      return commit(patchMass(state, a.id, { m: clamp(round2(a.value), MASS_MIN(state), MASS_MAX(state)) }));
    }
    case 'massPos': {
      const mo = state.masses.find((m) => m.id === a.id);
      if (!mo || mo.locked) return state;
      return commit(patchMass(state, a.id, { x: clamp(a.value, 0, RL(state)) }));
    }
    case 'massEnabled': {
      const mo = state.masses.find((m) => m.id === a.id);
      if (!mo || mo.locked) return state;
      return commit(patchMass(state, a.id, { enabled: a.value }));
    }
    case 'massAuto': {                           /* only ever one balancer */
      const mo = state.masses.find((m) => m.id === a.id);
      if (!mo || mo.locked) return state;
      const on = !mo.auto;
      return commit({
        ...state,
        masses: state.masses.map((m) => ({ ...m, auto: on && m.id === a.id, note: '' })),
      });
    }

    /* ---------- ready-made scenes ---------- */
    case 'preset': {
      const p = PRESETS[a.name];
      if (!p) return state;
      const base = leave(state);
      const f = clamp(onGrid(base, p.f * RL(base)), 0.1 * RL(base), 0.9 * RL(base));
      const built = setScene(base, f,
        p.list.map((d) => ({ m: d[0], x: clamp(f + onGrid(base, d[1] * RL(base)), 0, RL(base)) })));
      return commit({ ...built, epoch: state.epoch + 1 });
    }
    case 'reset': {
      const fresh = { ...initialState, tab: state.tab === 'learn' ? 'learn' : 'explore' };
      return commit({ ...setScene(fresh, 5, [{ m: 2, x: 2 }, { m: 3, x: 8 }]),
                      epoch: state.epoch + 1 });
    }

    /* ---------- challenge mode ---------- */
    case 'enterChallenge': {
      if (state.mode === 'challenge') return state;
      return commit({
        ...state,
        mode: 'challenge',
        snapshot: {
          fulcrum: state.fulcrum,
          masses: state.masses.map((m) => ({ ...m })),
          useRodWeight: state.useRodWeight,
          rodMass: state.rodMass,
          nextId: state.nextId,
        },
      });
    }
    case 'leaveChallenge':
      return commit({ ...leave(state), epoch: state.epoch + 1 });
    case 'loadTask': {
      let next = { ...state, useRodWeight: false, frozen: !!a.frozen };
      next = setScene(next, a.task.f, a.task.fixed.map((k) => ({ m: k.m, x: k.x, locked: true })));
      if (a.task.type === 'place') {
        next = withMass(next, { m: a.task.target.m, x: a.task.startX, isTarget: true });
      }
      return commit({ ...next, epoch: state.epoch + 1 });
    }
    case 'unfreeze':
      return commit({ ...state, frozen: false });
    case 'revealTarget': {
      const t = state.masses.find((m) => m.isTarget);
      if (!t) return state;
      return commit(patchMass(state, t.id, { x: a.x }));
    }
    case 'score':
      return { ...state, attempts: state.attempts + 1, score: state.score + (a.correct ? 1 : 0) };

    case 'tab':
      return { ...state, tab: a.value };
    case 'hydrate':
      return commit({ ...state, ...a.value });
    default:
      return state;
  }
}

/** Put the user's own experiment back on the rod. */
function leave(s) {
  if (s.mode !== 'challenge') return s;
  const snap = s.snapshot;
  return {
    ...s,
    mode: 'explore',
    frozen: false,
    snapshot: null,
    ...(snap ? {
      fulcrum: snap.fulcrum,
      masses: snap.masses,
      useRodWeight: snap.useRodWeight,
      rodMass: snap.rodMass,
      nextId: snap.nextId,
    } : {}),
  };
}

/** The lab as it should open: the saved set-up if there is one, else the
    two-mass experiment that shows the rule at a glance. */
export function createInitialState() {
  const saved = readState();
  if (saved) return commit(saved);
  return commit(setScene(initialState, 5, [{ m: 2, x: 2 }, { m: 3, x: 8 }]));
}

/* ============================================================
   SAVED SET-UP
   Everything lives in this browser only — nothing is sent anywhere.
   Storage can be unavailable (private windows, blocked site data) or
   full, so every call is guarded: the lab must work either way.
   ============================================================ */
const STORE_KEY = 'jahnavis-lab/moment-of-force/v1';

export function writeState(s) {
  /* While a challenge is running the masses on screen are the task's, not the
     user's — so persist the set-up they left behind, not the puzzle. */
  const src = (s.mode === 'challenge' && s.snapshot) ? s.snapshot : s;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 1,
      units: s.units,
      rodLength: s.rodLength,
      g: s.g,
      showForces: s.showForces,
      showDistances: s.showDistances,
      snap: s.snap,
      scene: {
        fulcrum: src.fulcrum,
        useRodWeight: src.useRodWeight,
        rodMass: src.rodMass,
        masses: src.masses.map((m) => ({
          m: m.m, x: m.x, color: m.color, enabled: m.enabled !== false, auto: !!m.auto,
        })),
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
  if (!d || d.v !== 1) return null;

  const num = (v, lo, hi, dflt) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : dflt);
  const bool = (v, dflt) => (typeof v === 'boolean' ? v : dflt);

  const s = { ...initialState };
  s.units = UNITS[d.units] ? d.units : 'mks';   // units first: every limit depends on them
  s.rodLength = num(d.rodLength, LEN_MIN(s), LEN_MAX(s), 10 * U(s).L);
  s.g = U(s).g.indexOf(d.g) >= 0 ? d.g : U(s).g[0];
  s.showForces = bool(d.showForces, true);
  s.showDistances = bool(d.showDistances, true);
  s.snap = bool(d.snap, true);

  const sc = (d.scene && typeof d.scene === 'object') ? d.scene : {};
  s.fulcrum = num(sc.fulcrum, 0, s.rodLength, s.rodLength / 2);
  s.useRodWeight = bool(sc.useRodWeight, false);
  s.rodMass = num(sc.rodMass, 0, MASS_MAX(s), 2 * U(s).M);

  let built = { ...s, masses: [], nextId: 1 };
  const list = Array.isArray(sc.masses) ? sc.masses.slice(0, MAX_MASSES) : [];
  list.forEach((m) => {
    if (!m || typeof m !== 'object') return;
    const before = built;
    built = withMass(built, {
      m: num(m.m, MASS_MIN(s), MASS_MAX(s), 2 * U(s).M),
      x: num(m.x, 0, s.rodLength, s.rodLength / 2),
    });
    if (built === before) return;               // the rod was full
    const added = built.masses[built.masses.length - 1];
    added.enabled = bool(m.enabled, true);
    added.auto = bool(m.auto, false) && !built.masses.some((k) => k !== added && k.auto);
    if (typeof m.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(m.color)) added.color = m.color;
  });

  if (d.score && typeof d.score === 'object') {
    built.score = num(d.score.score, 0, 1e6, 0);
    built.attempts = num(d.score.attempts, 0, 1e6, 0);
    if (built.score > built.attempts) built.score = built.attempts;
  }
  built.tab = ['explore', 'challenge', 'learn', 'world'].indexOf(d.tab) >= 0 ? d.tab : 'explore';
  /* a challenge is never restored — it belongs to the sitting it was set in */
  if (built.tab === 'challenge') built.tab = 'explore';
  return built;
}
