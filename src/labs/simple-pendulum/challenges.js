/* ============================================================
   Simple Pendulum — the challenge generator.
   Two questions, chosen because they are the two things pupils
   most often get wrong: that a heavier bob must swing slower, and
   that period and length go up together in step.
   ============================================================ */
import { smallAnglePeriod, TAU } from './engine.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* lengths on a 0.05 m grid, so a tuned answer is reachable with the controls */
const LENGTHS = [];
for (let L = 0.2; L <= 2.5001; L += 0.05) LENGTHS.push(Math.round(L * 100) / 100);
const MASSES = [0.5, 1, 2, 3, 5, 8, 12];

/** Which of these two swings faster? Sometimes the honest answer is neither. */
function makePredictTask(g) {
  const same = Math.random() < 0.36;          /* the misconception case */
  let La = pick(LENGTHS), Lb;
  if (same) {
    Lb = La;
  } else {
    for (let i = 0; i < 60; i++) {
      Lb = pick(LENGTHS);
      if (Math.abs(Lb - La) >= 0.4) break;
      Lb = null;
    }
    if (!Lb) return null;
  }
  /* different masses always, so the answer never hangs on the bob's weight */
  let ma = pick(MASSES), mb = pick(MASSES);
  if (same && ma === mb) mb = MASSES[(MASSES.indexOf(ma) + 3) % MASSES.length];
  const amp = pick([8, 10, 12, 15]);
  return {
    type: 'predict', g,
    a: { length: La, mass: ma, amplitude: amp },
    b: { length: Lb, mass: mb, amplitude: amp },
    answer: Math.abs(La - Lb) < 1e-9 ? 'same' : (La < Lb ? 'a' : 'b'),
  };
}

/** Make this pendulum keep a given time. */
function makeTuneTask(g) {
  const target = pick(LENGTHS.filter((L) => L >= 0.3 && L <= 2.2));
  const T = smallAnglePeriod(target, g);
  /* start well away from the answer, and on the far side often enough that
     the answer cannot be found by always dragging the same way */
  const away = LENGTHS.filter((L) => Math.abs(L - target) >= 0.6);
  if (!away.length) return null;
  return {
    type: 'tune', g,
    target,
    period: T,
    a: { length: pick(away), mass: pick(MASSES), amplitude: 8 },
  };
}

export function newTask(g) {
  for (let i = 0; i < 40; i++) {
    const task = Math.random() < 0.5 ? makePredictTask(g) : makeTuneTask(g);
    if (task) return task;
  }
  return makeTuneTask(g);
}

/** The length that keeps a given period: rearranging T = 2π√(L/g). */
export const lengthForPeriod = (T, g) => g * Math.pow(T / TAU, 2);

/** Close enough to count: half a step of the length control either way. */
export const TUNE_TOLERANCE = 0.03;
