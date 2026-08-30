/* ============================================================
   Moment of Force — the challenge generator.
   Problems are built in whole numbered divisions of the rod and
   only then converted to length units. Working that way keeps
   every number tidy and guarantees the answer lands exactly on
   the snap grid, so a correct drag really can be exact.
   ============================================================ */
import { RL, niceStep, clamp } from './engine.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const isQuarter = (v) => Math.abs(v * 4 - Math.round(v * 4)) < 1e-9;

/** Whole numbered divisions on the rod, and the pivot positions worth using. */
function divisions(s) {
  const step = niceStep(s);
  const N = Math.floor(RL(s) / step + 1e-9);
  const lo = Math.max(1, Math.round(N * 0.3));
  const hi = Math.min(N - 1, Math.round(N * 0.7));
  const fs = [];
  for (let v = lo; v <= hi; v++) fs.push(v);
  return { step, N, fs };
}

/** Somewhere on the target arm that is clearly NOT the correct answer. */
function startingSpot(f, dirToTarget, arm, answerD, N) {
  let best = 0.5, bestGap = -1;
  for (let d = 0.5; d <= arm - 0.25; d += 0.25) {
    const gap = Math.abs(d - answerD);
    if (gap > bestGap) { bestGap = gap; best = d; }
  }
  return clamp(f + dirToTarget * best, 0, N);
}

function makePlacementTask(s, nFixed) {
  const D = divisions(s);
  if (D.N < 4 || !D.fs.length) return null;
  for (let tries = 0; tries < 400; tries++) {
    const f = pick(D.fs);
    const fixedLeft = Math.random() < 0.5;
    const fixedArm = fixedLeft ? f : D.N - f;
    const targetArm = fixedLeft ? D.N - f : f;

    const fixed = [];
    let momentSum = 0, ok = true;
    for (let i = 0; i < nFixed; i++) {
      const m = pick([1, 2, 2, 3, 4, 5]);
      const d = pick([0.5, 1, 1.5, 2, 2.5, 3]);
      if (d > fixedArm - 0.25) { ok = false; break; }
      if (fixed.some((k) => Math.abs(k.d - d) < 0.5)) { ok = false; break; }
      fixed.push({ m, d });
      momentSum += m * d;
    }
    if (!ok) continue;

    const tm = pick([1, 2, 3, 4, 5, 6]);
    const td = momentSum / tm;
    if (!isQuarter(td) || td < 0.5 || td > targetArm - 0.25) continue;

    const sign = fixedLeft ? -1 : 1;
    const u = D.step;                            // divisions -> length units
    return {
      type: 'place',
      f: f * u,
      fixed: fixed.map((k) => ({ m: k.m, x: (f + sign * k.d) * u, d: k.d * u })),
      target: { m: tm, d: td * u, x: (f - sign * td) * u },
      startX: startingSpot(f, -sign, targetArm, td, D.N) * u,
    };
  }
  return null;
}

function makePredictTask(s) {
  const D = divisions(s);
  if (D.N < 4 || !D.fs.length) return null;
  for (let tries = 0; tries < 400; tries++) {
    const f = pick(D.fs);
    const a = { m: pick([1, 2, 3, 4, 5]), x: f - pick([1, 1.5, 2, 2.5, 3]) };
    const b = { m: pick([1, 2, 3, 4, 5]), x: f + pick([1, 1.5, 2, 2.5, 3]) };
    if (a.x < 0.25 || b.x > D.N - 0.25) continue;
    const diff = b.m * (b.x - f) - a.m * (f - a.x);
    if (Math.abs(diff) > 0 && Math.abs(diff) < 0.5) continue;    // too close to call
    const u = D.step;
    return {
      type: 'predict',
      f: f * u,
      fixed: [{ m: a.m, x: a.x * u }, { m: b.m, x: b.x * u }],
      answer: Math.abs(diff) < 1e-9 ? 'bal' : (diff > 0 ? 'cw' : 'acw'),
    };
  }
  return null;
}

/** A fresh problem: a third are "which way will it tip", the rest are placements. */
export function newTask(s) {
  for (let depth = 0; depth < 6; depth++) {
    const roll = Math.random();
    const task = roll < 0.34 ? makePredictTask(s) : makePlacementTask(s, roll < 0.75 ? 1 : 2);
    if (task) return task;
  }
  return makePlacementTask(s, 1) || makePredictTask(s);
}
