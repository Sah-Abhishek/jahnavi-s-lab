/* ============================================================
   Moment of Force — the physics, with no DOM in sight.
   Everything here is a pure function of the lab's state, so the
   React layer can render it and the reducer can reason about it
   without either one owning the rules.

   The one rule underneath all of it:
       moment = force x perpendicular distance from the pivot
   ============================================================ */

export const DIVS = 10;          // the rod always carries 10 numbered divisions
export const MAX_MASSES = 6;

/* ---------- the rod is always 10 divisions; the drawing is not always 900 wide ----------
   A phone that scales a 900-unit drawing down to 360 px renders 10-unit type at
   4 px. So the scene keeps two geometries and picks one from its measured width:
   the compact one is a smaller drawing whose type is proportionally larger. */
export const PROFILES = {
  wide: {
    name: 'wide',
    W: 900, H: 515, X0: 60, DIV: 78, ROD_Y: 245, ROD_H: 8,
    PLATE: 373, MAX_TILT: 18,
    hang: 22, dim: 34, boxMin: 20, boxSpan: 22, arrowMax: 46, arrowK: 0.32,
    reactTail: 78, capY: 505, hitPad: 16,
  },
  compact: {
    name: 'compact',
    W: 520, H: 372, X0: 40, DIV: 44, ROD_Y: 160, ROD_H: 6,
    PLATE: 250, MAX_TILT: 13,
    hang: 18, dim: 26, boxMin: 20, boxSpan: 22, arrowMax: 34, arrowK: 0.22,
    reactTail: 56, capY: 362, hitPad: 32,
  },
};

/* The simulation is unit-agnostic: moment = (mass x g) x distance comes out the
   same in any consistent set, so switching systems only rescales the numbers and
   relabels them.  g·cm/s² is a dyne; dyne x cm is a dyne·cm. */
export const UNITS = {
  mks: {
    name: 'MKS', len: 'm', mass: 'kg', force: 'N', moment: 'N·m', field: 'N/kg',
    lenLong: 'metres (m)', forceLong: 'newtons (N)',
    lenWord: 'metres', lenOne: 'metre',
    L: 1, M: 1, g: [9.8, 10, 1.6],
  },
  cgs: {
    name: 'CGS', len: 'cm', mass: 'g', force: 'dyne', moment: 'dyne·cm',
    field: 'dyne/g', lenLong: 'centimetres (cm)', forceLong: 'dynes',
    lenWord: 'centimetres', lenOne: 'centimetre',
    L: 100, M: 1000, g: [980, 1000, 160],
  },
};

/* Chosen so white numerals inside a block clear 4.5:1, and every block still
   reads against the dark ground. */
export const PALETTE = ['#c8452e', '#3272be', '#a06a17', '#7a55cc',
                        '#11828d', '#b94a85', '#5e7f28', '#b65c1d'];

export const GRAVITIES = [
  { name: 'Earth',        sub: "everyday gravity" },
  { name: 'School value', sub: 'rounded, easier arithmetic' },
  { name: 'Moon',         sub: "about a sixth of Earth's" },
];

/* ---------- small numeric helpers ---------- */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** Kill the float dust a x100 conversion leaves behind. */
export const tidy = (v) => Number(v.toPrecision(12));
export const round2 = (v) => Math.round(v * 100) / 100;

const SUPER = { 0:'⁰', 1:'¹', 2:'²', 3:'³', 4:'⁴', 5:'⁵', 6:'⁶', 7:'⁷', 8:'⁸', 9:'⁹', '-':'⁻' };
/** 588000000 -> "5.88 × 10⁸" — CGS moments are far too big to write out. */
export function standardForm(v) {
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / Math.pow(10, e);
  return `${m.toFixed(2).replace(/\.?0+$/, '')} × 10` +
         String(e).split('').map((c) => SUPER[c] || c).join('');
}
export function fmt(n, d) {
  if (!isFinite(n) || Math.abs(n) < 5e-3) return '0';
  if (d !== undefined) return n.toFixed(d);
  const a = Math.abs(n);
  if (a >= 1e5) return standardForm(n);
  return a >= 1000 ? n.toFixed(0) : n.toFixed(1);
}
/** A mass written without a tail of zeros: 0.8, not 0.800000000000001. */
export const kgOf = (v) => (Math.round(v * 1000) / 1000).toFixed(3)
                             .replace(/0+$/, '').replace(/\.$/, '');
/** Decimals a number actually needs (0.05 -> 2, 1 -> 0). */
export function decimalsOf(v) {
  const t = Number(v).toPrecision(12).replace(/0+$/, '').replace(/\.$/, '');
  const i = t.indexOf('.');
  return i < 0 ? 0 : t.length - i - 1;
}

/* ---------- everything below reads the lab's state ---------- */
export const U = (s) => UNITS[s.units] || UNITS.mks;
export const RL = (s) => s.rodLength;
export const LEN_MIN = (s) => 0.1 * U(s).L;
export const LEN_MAX = (s) => 100 * U(s).L;
export const MASS_MIN = (s) => 0.1 * U(s).M;
export const MASS_MAX = (s) => 1000 * U(s).M;

/** A tidy spacing for the rod's numbered marks: about 8 of them, on a 1/2/5 grid.
    10 m -> every 1 m,  1 m -> every 0.1 m,  7.3 m -> every 1 m. */
export function niceStep(s) {
  const raw = s.rodLength / 8;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * pow;
}
export const snapStep = (s) => niceStep(s) / 4;          // 0.25 m on a 10 m rod
export const fineStep = (s) => niceStep(s) / 20;
export const posDp = (s) => Math.max(decimalsOf(snapStep(s)), decimalsOf(fineStep(s)));
export const tickDp = (s) => decimalsOf(niceStep(s));
export const toDp = (s, v) => { const p = Math.pow(10, posDp(s)); return Math.round(v * p) / p; };
export const onGrid = (s, v) => Math.round(v / fineStep(s)) * fineStep(s);
export const snapPos = (s, v) => {
  const st = s.snap ? snapStep(s) : fineStep(s);
  return Math.round(v / st) * st;
};

/* ---------- positions, as the rod is marked ----------
   The rod carries a scale whose zero is the pivot: negative to the left of it,
   positive to the right. Only the drawing and the numbers change — a mass is
   still stored as its position along the rod, so moving the pivot re-labels
   every mass without moving any of them. */
export const relOf = (s, x) => x - s.fulcrum;
export const absOf = (s, rel) => tidy(s.fulcrum + rel);
/** The marks lie on the pivot, so a dragged mass must snap from there. */
export const snapOnRod = (s, x) => absOf(s, snapPos(s, relOf(s, x)));
/** "-2.5", written with a real minus sign — the mark the pupil reads on the rod. */
export function fmtRel(s, rel, dp) {
  const d = dp === undefined ? posDp(s) : dp;
  const v = Math.abs(rel) < 5e-12 ? 0 : rel;          // never "-0.0"
  return (v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(d);
}
/** The same position said out loud, for a screen reader. */
export function sayRel(s, rel) {
  const u = U(s);
  if (Math.abs(rel) < 5e-12) return 'on the pivot';
  return `${Math.abs(rel).toFixed(posDp(s))} ${u.lenWord} ` +
         `${rel < 0 ? 'left' : 'right'} of the pivot`;
}

/* ---------- scene geometry ---------- */
/** Drawing units per unit of length. */
export const ppm = (s, P) => (P.DIV * DIVS) / s.rodLength;
export const pivotX = (s, P) => P.X0 + s.fulcrum * ppm(s, P);

/** A point on the rod, in drawing coordinates, allowing for the tilt. */
export function toWorld(s, P, posM, offsetPx, rad) {
  const dx = (posM - s.fulcrum) * ppm(s, P);
  const c = Math.cos(rad), sn = Math.sin(rad);
  return [pivotX(s, P) + dx * c - offsetPx * sn, P.ROD_Y + dx * sn + offsetPx * c];
}

/* ============================================================
   THE OBJECTS ON THE ROD
   ============================================================ */

function makeItem(s, id, m, x, color, locked, isRod, active) {
  const dSigned = x - s.fulcrum;              // + is right of the pivot
  const force = m * s.g;                      // weight
  return {
    id, m, x, color,
    locked: !!locked, isRod: !!isRod, active: !!active,
    dSigned,
    d: Math.abs(dSigned),
    force,
    moment: Math.abs(dSigned) * force,
    dir: !active ? 0 : (dSigned > 1e-9 ? 1 : (dSigned < -1e-9 ? -1 : 0)),   // 1 = clockwise
  };
}

/* The pivot cuts the rod in two. Each piece carries the share of the rod's mass that
   matches its share of the length, and its weight acts at the middle of THAT piece —
   so both sides of the rod turn it, instead of the whole rod counting on one side.
   The two moments always net to the same answer as "all the weight at the centre":
      W(L-f)^2/2L  -  W f^2/2L  =  W(L/2 - f)
   which is why the centre-of-mass shortcut is allowed in the first place. */
function addRodSegments(s, list) {
  const f = s.fulcrum, len = RL(s), M = s.rodMass;
  if (!s.useRodWeight || M <= 0 || len <= 0) return;
  [
    { id: 'rodL', span: f,       mid: f / 2,             from: 0, to: f,
      label: 'Rod, left of the pivot',  short: 'left part' },
    { id: 'rodR', span: len - f, mid: f + (len - f) / 2, from: f, to: len,
      label: 'Rod, right of the pivot', short: 'right part' },
  ].forEach((seg) => {
    if (seg.span <= 1e-9) return;
    const it = makeItem(s, seg.id, (M * seg.span) / len, seg.mid, '#7c8b9c', true, true, true);
    it.label = seg.label;
    it.short = seg.short;
    it.span = seg.span;
    it.from = seg.from;
    it.to = seg.to;
    list.push(it);
  });
}

/** Every object on the rod. Switched-off masses are listed but contribute nothing. */
export function getItems(s) {
  const list = s.masses.map((m) => {
    const it = makeItem(s, m.id, m.m, m.x, m.color, m.locked, false, m.enabled !== false);
    it.auto = !!m.auto;
    return it;
  });
  addRodSegments(s, list);
  return list;
}

export function getTotals(items) {
  let cw = 0, acw = 0;
  items.forEach((it) => { if (it.dir > 0) cw += it.moment; else if (it.dir < 0) acw += it.moment; });
  const net = cw - acw;
  /* relative, so it means the same in N·m as in dyne·cm — it forgives only the
     float dust of adding a few products together */
  return { cw, acw, net, balanced: Math.abs(net) <= 1e-9 * Math.max(cw + acw, 1) };
}

/* ============================================================
   HOW THE BEAM ACTUALLY MOVES
   A hanging weight always pulls straight down, so as the beam tilts its lever arm
   becomes d·cos(θ). Every term shrinks by the same factor, so an unbalanced beam
   has no level of its own — it keeps going until it meets the stand.
   What holds it back is the pivot sitting slightly ABOVE the beam's centre of
   gravity, exactly as on a real beam balance. That adds W·h·sin(θ), and the beam
   comes to rest where
       (net moment)·cos θ = W·h·sin θ    ->    tan θ = net moment / (W·h)
   A hair out of balance leans a little; genuinely out of balance goes right over.
   Note what that ratio does NOT contain: the size of the masses. Halve every mass
   and W halves too, so the lean is unchanged — a gram leans like a kilogram, which
   is exactly how a real bench behaves.  h is the beam's sensitivity.
   ============================================================ */
export const PIVOT_RISE = 0.045;   // pivot above the beam, as a fraction of its length
export const DEG = Math.PI / 180;
export const DAMPING = 0.65;       // fraction of critical: settles with barely an overshoot
/* A beam this sensitive really does swing with a period of several seconds — real
   balances are slow for exactly this reason. That is tedious to watch, so the clock
   runs faster by reducing the effective inertia. Every angle it settles at is
   untouched (equilibrium is where the torque vanishes, and inertia is not in that
   equation); only the time it takes to get there is compressed. */
export const SPEED = 3;

export function beam(s) {
  let torque = 0, weight = 0, inertia = 0;
  getItems(s).forEach((it) => {
    if (!it.active) return;
    torque += it.force * it.dSigned;          // + turns it clockwise
    weight += it.force;
  });
  s.masses.forEach((m) => {
    if (m.enabled === false) return;
    const d = m.x - s.fulcrum;
    inertia += m.m * d * d;                   // a hanging mass is a point mass
  });
  if (s.useRodWeight && s.rodMass > 0) {
    const a = RL(s) / 2 - s.fulcrum;          // pivot to the rod's own centre
    inertia += s.rodMass * ((RL(s) * RL(s)) / 12 + a * a);   // parallel axis
  }
  return { torque, weight, inertia, h: PIVOT_RISE * RL(s) };
}

/** The rod may only swing until its long arm reaches the stand. */
export function maxTilt(s, P) {
  const armPx = Math.max(s.fulcrum, RL(s) - s.fulcrum) * ppm(s, P);
  const geometric = (Math.asin(clamp((P.PLATE - P.ROD_Y) / Math.max(armPx, 1), 0, 1)) * 180) / Math.PI;
  return Math.min(P.MAX_TILT, geometric);
}

/* ---------- the self-sizing counterweight ----------
   One mass may be told to keep the rod balanced. Its position stays the user's;
   its mass is solved for on every change:
       m_b · g · d_b  +  M(everything else)  =  0
       m_b = -M_other / (g · d_b)
   Drag it inward and it must grow; drag it outward and it shrinks. There are
   three ways for that to have no answer, and each is reported rather than fudged. */
export function rebalance(s) {
  const b = s.masses.find((m) => m.auto);
  if (!b) return;
  b.note = '';
  if (b.enabled === false) { b.note = 'switched off'; return; }

  const d = b.x - s.fulcrum;
  let other = 0;
  getItems(s).forEach((it) => {
    if (it.active && it.id !== b.id) other += it.force * it.dSigned;
  });

  if (Math.abs(d) < 1e-9) { b.m = 0; b.note = 'sitting on the pivot — no lever arm'; return; }
  const needed = -other / (s.g * d);
  if (needed < 0) { b.m = 0; b.note = 'on the heavy side — drag it past the pivot'; return; }
  if (needed > MASS_MAX(s)) { b.m = MASS_MAX(s); b.note = 'too close in — drag it further out'; return; }
  b.m = needed;
}

/* Written as a pivot fraction plus each mass's offset from it, as fractions of the
   rod. Rounding the offsets (not the positions) keeps the intended distances exact,
   so a preset means the same thing on a 10 m rod and on a 0.8 m one. */
export const PRESETS = {
  equal:     { label: 'Equal masses, central pivot',   f: 0.5, list: [[3, -0.3], [3, 0.3]] },
  seesaw:    { label: 'Seesaw: heavy child, light child', f: 0.5, list: [[6, -0.15], [3, 0.2]] },
  offcentre: { label: 'Off-centre pivot',              f: 0.3, list: [[4, -0.2], [2, 0.3]] },
  crowbar:   { label: 'Crowbar: small force, big load', f: 0.2, list: [[8, -0.1], [1, 0.7]] },
  three:     { label: 'Three masses puzzle',           f: 0.5, list: [[2, -0.4], [3, 0.2], [1, 0.4]] },
  /* the proportions of a real tower crane: a short counter-jib carrying a heavy
     counterweight close in, a long jib carrying a light load far out —
     20 x 0.2L = 8 x 0.5L, so it balances at any rod length */
  crane:     { label: 'Tower crane: counterweight and load', f: 0.25, list: [[20, -0.2], [8, 0.5]] },
};
