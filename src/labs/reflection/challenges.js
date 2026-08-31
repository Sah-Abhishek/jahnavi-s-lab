/* ============================================================
   Reflection — the challenge generator.

   Every mirror it offers is one that sends whole numbers to whole
   numbers. That is not a shortcut: it is the family of mirrors a
   pupil is asked about, and it means an answer can be typed as
   coordinates rather than fought for to three decimal places.

   Nothing is trusted to be true because it was constructed to be.
   Each candidate task is worked out with the same engine the lab
   draws with, and thrown away unless the answer really does land
   on the lattice, inside the graph, and somewhere other than the
   point it started at.
   ============================================================ */
import {
  V, reflect2, reflectPlane, reflectLine3, tidyLine, tidyPlane,
  lineFromPoints2, parseLine2, sameLine2, subV, addV, scaleV,
} from './engine.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ints = (lo, hi) => { const a = []; for (let v = lo; v <= hi; v++) a.push(v); return a; };

/* the graph the challenge is set on */
export const BOARD = 8;
const REACH = 7;                       /* how far a drawn mirror is carried */
const COORDS = ints(-6, 6);
const OFFSETS = ints(-5, 5);

const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
const inBoard = (v) => Math.abs(v) <= BOARD + 1e-9;
const wholeAndVisible2 = (p) => isInt(p.x) && isInt(p.y) && inBoard(p.x) && inBoard(p.y);
const wholeAndVisible3 = (p) =>
  isInt(p.x) && isInt(p.y) && isInt(p.z) && inBoard(p.x) && inBoard(p.y) && inBoard(p.z);

const round3 = (p) => ({ x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z) });
const round2 = (p) => ({ x: Math.round(p.x), y: Math.round(p.y) });

/* ============================================================
   THE MIRRORS ON OFFER
   ============================================================ */

/** Flat mirrors that keep the lattice: the axes, the lines parallel
    to them, and the two diagonals with any offset. */
function someLine2() {
  const k = pick(OFFSETS);
  return tidyLine(pick([
    { a: 0, b: 1, c: 0 },              // y = 0
    { a: 1, b: 0, c: 0 },              // x = 0
    { a: 0, b: 1, c: -k },             // y = k
    { a: 1, b: 0, c: -k },             // x = k
    { a: 1, b: -1, c: 0 },             // y = x
    { a: 1, b: 1, c: 0 },              // y = −x
    { a: 1, b: -1, c: k },             // y = x + k
    { a: 1, b: 1, c: -k },             // y = −x + k
  ]));
}

/** Mirror planes that keep the lattice. */
function somePlane3() {
  const k = pick(OFFSETS);
  const i = Math.floor(Math.random() * 3);
  const axis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i];
  const pair = pick([[1, -1, 0], [0, 1, -1], [1, 0, -1], [1, 1, 0], [0, 1, 1], [1, 0, 1]]);
  const n = Math.random() < 0.45 ? axis : pair;
  return tidyPlane({ a: n[0], b: n[1], c: n[2], d: -k });
}

/** Lines in space to turn about: the axes, lines parallel to them,
    and the diagonals of the coordinate planes. */
function someLine3() {
  const dir = pick([
    [1, 0, 0], [0, 1, 0], [0, 0, 1],
    [1, 1, 0], [1, -1, 0], [0, 1, 1], [0, 1, -1], [1, 0, 1], [1, 0, -1],
  ]);
  /* somewhere the line passes through — offset only across the direction,
     so it stays a genuinely different line */
  const off = [0, 0, 0];
  if (Math.random() < 0.55) {
    for (let i = 0; i < 3; i++) if (dir[i] === 0) off[i] = pick(ints(-3, 3));
  }
  const d = V(dir[0], dir[1], dir[2]);
  const A = V(off[0], off[1], off[2]);
  const span = Math.floor(REACH / Math.max(...dir.map(Math.abs)));
  return { A, u: d, lnA: subV(A, scaleV(d, span)), lnB: addV(A, scaleV(d, span)) };
}

/* ============================================================
   THE TASKS
   ============================================================ */

let seq = 0;

/** Given the point and the mirror, where does it land? */
function makeImage2() {
  const line = someLine2();
  const point = { x: pick(COORDS), y: pick(COORDS) };
  const image = reflect2(line, point);
  if (!wholeAndVisible2(image)) return null;
  if (Math.hypot(image.x - point.x, image.y - point.y) < 1e-9) return null;  /* on the mirror */
  return { type: 'image', dim: '2d', point, line, answer: round2(image) };
}

/** Given both points, where is the mirror? */
function makeMirror2() {
  const base = makeImage2();
  if (!base) return null;
  /* the mirror is the perpendicular bisector, so it must be recoverable
     from the two points alone — check that before setting the question */
  const found = lineFromPoints2(
    { x: (base.point.x + base.answer.x) / 2, y: (base.point.y + base.answer.y) / 2 },
    { x: (base.point.x + base.answer.x) / 2 + (base.answer.y - base.point.y),
      y: (base.point.y + base.answer.y) / 2 - (base.answer.x - base.point.x) },
  );
  if (!found || !sameLine2(found, base.line)) return null;
  return { type: 'mirror', dim: '2d', point: base.point, image: base.answer, line: base.line };
}

function makeImagePlane() {
  const plane = somePlane3();
  const point = V(pick(COORDS), pick(COORDS), pick(COORDS));
  const image = reflectPlane(plane, point);
  if (!wholeAndVisible3(image)) return null;
  if (Math.hypot(image.x - point.x, image.y - point.y, image.z - point.z) < 1e-9) return null;
  return { type: 'image', dim: '3d', mirror: 'plane', point, plane, answer: round3(image) };
}

function makeImageLine3() {
  const { A, u, lnA, lnB } = someLine3();
  const point = V(pick(COORDS), pick(COORDS), pick(COORDS));
  const image = reflectLine3({ A, u }, point);
  if (!wholeAndVisible3(image)) return null;
  if (Math.hypot(image.x - point.x, image.y - point.y, image.z - point.z) < 1e-9) return null;
  /* the lab turns the point about the line its two ends describe, so the
     answer has to be right for THAT line, not merely for the one meant */
  const drawn = reflectLine3({ A: lnA, u: subV(lnB, lnA) }, point);
  if (Math.hypot(drawn.x - image.x, drawn.y - image.y, drawn.z - image.z) > 1e-9) return null;
  return { type: 'image', dim: '3d', mirror: 'line', point, lnA, lnB, answer: round3(image) };
}

/** A fresh question for the graph the visitor is on. */
export function newTask(dim) {
  const makers = dim === '3d'
    ? [makeImagePlane, makeImagePlane, makeImageLine3]
    : [makeImage2, makeImage2, makeMirror2];
  for (let i = 0; i < 200; i++) {
    const t = pick(makers)();
    if (t) return { ...t, id: ++seq };
  }
  /* the families above always yield something; this is belt and braces */
  return { ...(dim === '3d' ? makeImagePlane() : makeImage2()) || makeImage2(), id: ++seq };
}

/* ============================================================
   MARKING
   ============================================================ */

/** Coordinates are marked exactly. There is nothing to round: every
    answer the generator sets is a whole number. */
export function checkImage(task, guess) {
  const keys = task.dim === '3d' ? ['x', 'y', 'z'] : ['x', 'y'];
  return keys.every((k) => {
    const v = Number(guess[k]);
    return isFinite(v) && Math.abs(v - task.answer[k]) < 1e-6;
  });
}

/** A mirror is marked as a line, not as a string — so x + y = 4,
    y = 4 − x and 2x + 2y − 8 = 0 all count, because they are the
    same mirror. */
export function checkMirror(task, text) {
  const got = parseLine2(text);
  if (got.error) return { ok: false, error: got.error };
  return { ok: sameLine2(got.line, task.line), line: got.line };
}
