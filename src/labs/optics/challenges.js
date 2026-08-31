/* ============================================================
   Light — the challenge generator.

   Every set-up it offers is one where the numbers come out whole.
   That is not a kindness: it is the family of questions a pupil is
   actually asked, and it means an answer can be typed rather than
   fought for to three decimal places.

   The trick is to work backwards. Choosing u and f and hoping v is
   tidy almost never pays; choosing f and v and deriving u
   —  u = fv/(v − f)  for a mirror  —  pays about a third of the
   time, and the third that pays is exactly the textbook's own stock
   of questions. f = −20, v = −30 gives u = −60, and there is the
   question.

   Nothing is trusted to be true because it was constructed to be:
   every candidate is worked out again with the engine the lab draws
   with, and thrown away unless the two agree.
   ============================================================ */
import {
  mirrorImage, lensImage, dioptres, snellAngle, criticalAngle,
  minDeviation, muFromPrism, lateralShift, deg, rad, num,
} from './engine.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const whole = (v) => Math.abs(v - Math.round(v)) < 1e-9;

/* ---------- every tidy mirror question there is ---------- */
function mirrorTable() {
  const out = [];
  for (const f of [-10, -12, -15, -20, -24, -25, -30, -40, 10, 12, 15, 20, 24, 30]) {
    for (let v = -200; v <= 200; v += 1) {
      if (v === 0 || v === f) continue;
      const u = f * v / (v - f);
      if (!whole(u) || u >= -4 || u < -200) continue;
      const im = mirrorImage(f, Math.round(u));
      if (!isFinite(im.v) || Math.abs(im.v - v) > 1e-7) continue;   /* it must agree */
      if (Math.abs(im.m) < 0.08 || Math.abs(im.m) > 12) continue;
      out.push({ f, u: Math.round(u), v: im.v, m: im.m });
    }
  }
  return out;
}

/* ---------- and every tidy lens one ---------- */
function lensTable() {
  const out = [];
  for (const f of [-10, -12, -15, -20, -24, -30, 10, 12, 15, 20, 24, 25, 30, 40]) {
    for (let v = -200; v <= 200; v += 1) {
      if (v === 0 || v === f) continue;
      const u = f * v / (f - v);
      if (!whole(u) || u >= -4 || u < -200) continue;
      const im = lensImage(f, Math.round(u));
      if (!isFinite(im.v) || Math.abs(im.v - v) > 1e-7) continue;
      if (Math.abs(im.m) < 0.08 || Math.abs(im.m) > 12) continue;
      out.push({ f, u: Math.round(u), v: im.v, m: im.m });
    }
  }
  return out;
}

export const MIRROR_ROWS = mirrorTable();
export const LENS_ROWS = lensTable();

const sizeWord = (m) => (Math.abs(Math.abs(m) - 1) < 1e-9 ? 'the same size'
  : Math.abs(m) > 1 ? 'magnified' : 'diminished');

/* ============================================================
   THE FAMILIES
   Each returns a whole task: what is being asked, what the visitor
   is given, the answer, and the set-up to put on the bench.
   ============================================================ */

function taskMirrorV() {
  const r = pick(MIRROR_ROWS);
  return {
    family: 'mirrorV', bench: 'mirror', kind: 'number', unit: 'cm', dp: 2,
    ask: 'Where does the image form?',
    prompt: `A ${r.f < 0 ? 'concave' : 'convex'} mirror has a focal length of ` +
            `${Math.abs(r.f)} cm. An object stands ${Math.abs(r.u)} cm in front of it.`,
    given: [['f', `${num(r.f)} cm`], ['u', `${num(r.u)} cm`]],
    wants: 'v', answer: r.v, signMatters: true,
    working: `1/v + 1/u = 1/f  →  1/v = 1/(${num(r.f)}) − 1/(${num(r.u)})  →  v = ${num(r.v)} cm`,
    patch: { mirror: { f: r.f, u: r.u } },
  };
}

function taskMirrorF() {
  const r = pick(MIRROR_ROWS.filter((x) => whole(x.v)));
  return {
    family: 'mirrorF', bench: 'mirror', kind: 'number', unit: 'cm', dp: 2,
    ask: 'What is the focal length?',
    prompt: `An object ${Math.abs(r.u)} cm in front of a mirror gives an image ` +
            `${Math.abs(r.v)} cm ${r.v < 0 ? 'in front of' : 'behind'} it.`,
    given: [['u', `${num(r.u)} cm`], ['v', `${num(r.v)} cm`]],
    wants: 'f', answer: r.f, signMatters: true,
    working: `1/f = 1/v + 1/u = 1/(${num(r.v)}) + 1/(${num(r.u)})  →  f = ${num(r.f)} cm`,
    patch: { mirror: { f: r.f, u: r.u } },
  };
}

function taskLensV() {
  const r = pick(LENS_ROWS);
  return {
    family: 'lensV', bench: 'lens', kind: 'number', unit: 'cm', dp: 2,
    ask: 'Where does the image form?',
    prompt: `A ${r.f > 0 ? 'convex' : 'concave'} lens of focal length ` +
            `${Math.abs(r.f)} cm has an object ${Math.abs(r.u)} cm in front of it.`,
    given: [['f', `${num(r.f)} cm`], ['u', `${num(r.u)} cm`]],
    wants: 'v', answer: r.v, signMatters: true,
    working: `1/v − 1/u = 1/f  →  1/v = 1/(${num(r.f)}) + 1/(${num(r.u)})  →  v = ${num(r.v)} cm`,
    patch: { lens: { f: r.f, u: r.u } },
  };
}

function taskNature() {
  const mirror = Math.random() < 0.5;
  const r = pick(mirror ? MIRROR_ROWS : LENS_ROWS);
  const real = mirror ? r.v < 0 : r.v > 0;
  const erect = r.m > 0;
  const answer = `${real ? 'real' : 'virtual'}|${erect ? 'erect' : 'inverted'}`;
  return {
    family: 'nature', bench: mirror ? 'mirror' : 'lens', kind: 'choice',
    ask: 'What sort of image is this?',
    prompt: `A ${mirror ? (r.f < 0 ? 'concave mirror' : 'convex mirror')
      : (r.f > 0 ? 'convex lens' : 'concave lens')} of focal length ` +
      `${Math.abs(r.f)} cm, with the object ${Math.abs(r.u)} cm in front.`,
    given: [['f', `${num(r.f)} cm`], ['u', `${num(r.u)} cm`]],
    choices: [
      { id: 'real|inverted', label: 'Real and inverted' },
      { id: 'real|erect', label: 'Real and erect' },
      { id: 'virtual|erect', label: 'Virtual and erect' },
      { id: 'virtual|inverted', label: 'Virtual and inverted' },
    ],
    answer,
    working: `v = ${num(r.v)} cm and m = ${num(r.m)} — so the image is ` +
             `${real ? 'real' : 'virtual'}, ${erect ? 'erect' : 'inverted'} and ${sizeWord(r.m)}.`,
    patch: mirror ? { mirror: { f: r.f, u: r.u } } : { lens: { f: r.f, u: r.u } },
  };
}

function taskPower() {
  const f = pick([-50, -40, -25, -20, -12.5, -10, 10, 12.5, 20, 25, 40, 50]);
  return {
    family: 'power', bench: 'lens', kind: 'number', unit: 'D', dp: 2,
    ask: 'What is its power?',
    prompt: `A lens has a focal length of ${num(f)} cm.`,
    given: [['f', `${num(f)} cm`]],
    wants: 'P', answer: dioptres(f), signMatters: true,
    working: `P = 1/f in metres = 100/(${num(f)}) = ${num(dioptres(f))} D`,
    patch: { lens: { f: Math.sign(f) * Math.min(Math.abs(f), 200) } },
  };
}

function taskSnell() {
  const n = pick([1.33, 1.5, 1.52, 1.62, 2.42]);
  const i = pick([20, 30, 40, 45, 50, 60, 70]);
  const r = snellAngle(rad(i), 1, n);
  return {
    family: 'snell', bench: 'refract', kind: 'number', unit: '°', dp: 2,
    ask: 'What is the angle of refraction?',
    prompt: `Light strikes ${n === 1.33 ? 'water' : n === 2.42 ? 'diamond' : 'glass'} ` +
            `of refractive index ${n} at ${i}° to the normal.`,
    given: [['i', `${i}°`], ['n', String(n)]],
    wants: 'r', answer: deg(r), signMatters: false,
    working: `sin i = n sin r  →  sin r = sin ${i}° / ${n}  →  r = ${num(deg(r))}°`,
    patch: { refract: { piece: 'interface', i, n1: 1, n2: n } },
  };
}

function taskCritical() {
  const n = pick([1.33, 1.5, 1.52, 1.62, 1.77, 2.42]);
  const C = criticalAngle(n, 1);
  return {
    family: 'critical', bench: 'refract', kind: 'number', unit: '°', dp: 2,
    ask: 'What is the critical angle?',
    prompt: `For light trying to leave a medium of refractive index ${n} into air.`,
    given: [['n', String(n)]],
    wants: 'C', answer: deg(C), signMatters: false,
    working: `sin C = 1/n = 1/${n}  →  C = ${num(deg(C))}°`,
    patch: { refract: { piece: 'interface', i: Math.min(89, Math.round(deg(C)) + 5), n1: n, n2: 1 } },
  };
}

function taskPrismMin() {
  const A = pick([30, 45, 50, 60]);
  const n = pick([1.33, 1.5, 1.52, 1.62]);
  const md = minDeviation(rad(A), n);
  if (!md) return null;
  const back = Math.random() < 0.4;
  if (back) {
    return {
      family: 'prismN', bench: 'refract', kind: 'number', unit: '', dp: 3,
      ask: 'What is the refractive index of the glass?',
      prompt: `A prism of angle ${A}° has an angle of minimum deviation of ${num(deg(md.D))}°.`,
      given: [['A', `${A}°`], ['D', `${num(deg(md.D))}°`]],
      wants: 'n', answer: muFromPrism(rad(A), md.D), signMatters: false,
      working: `n = sin((A + D)/2) / sin(A/2) = ${num(muFromPrism(rad(A), md.D), 3)}`,
      patch: { refract: { piece: 'prism', A, nPrism: n, i: Math.round(deg(md.i1)) } },
    };
  }
  return {
    family: 'prismD', bench: 'refract', kind: 'number', unit: '°', dp: 2,
    ask: 'What is the angle of minimum deviation?',
    prompt: `A prism of angle ${A}° is made of glass of refractive index ${n}.`,
    given: [['A', `${A}°`], ['n', String(n)]],
    wants: 'D', answer: deg(md.D), signMatters: false,
    working: `at the minimum r = A/2, so sin i = n sin(A/2)  →  i = ${num(deg(md.i1))}°, ` +
             `and D = 2i − A = ${num(deg(md.D))}°`,
    patch: { refract: { piece: 'prism', A, nPrism: n, i: Math.round(deg(md.i1)) } },
  };
}

function taskSlab() {
  const t = pick([4, 5, 6, 8, 10]);
  const i = pick([30, 40, 45, 50, 60]);
  const n = pick([1.5, 1.52, 1.62]);
  return {
    family: 'slab', bench: 'refract', kind: 'number', unit: 'cm', dp: 3,
    ask: 'How far sideways is the emergent ray shifted?',
    prompt: `Light meets a ${t} cm glass slab of index ${n} at ${i}° to the normal.`,
    given: [['t', `${t} cm`], ['i', `${i}°`], ['n', String(n)]],
    wants: 'd', answer: lateralShift(t, rad(i), n), signMatters: false,
    working: `d = t sin(i − r) / cos r = ${num(lateralShift(t, rad(i), n), 3)} cm`,
    patch: { refract: { piece: 'slab', i, thickness: t, nSlab: n } },
  };
}

function taskSpec() {
  const myopic = Math.random() < 0.5;
  if (myopic) {
    const far = pick([25, 40, 50, 80, 100, 200]);
    return {
      family: 'specMyopia', bench: 'eye', kind: 'number', unit: 'D', dp: 2,
      ask: 'What power of spectacle lens does this eye need?',
      prompt: `A short-sighted eye cannot see clearly beyond ${far} cm.`,
      given: [['far point', `${far} cm`]],
      wants: 'P', answer: -100 / far, signMatters: true,
      working: `the lens must put infinity at the far point: f = −${far} cm, ` +
               `so P = −100/${far} = ${num(-100 / far)} D`,
      patch: { eye: { defect: 'myopia', far, wearing: false } },
    };
  }
  const near = pick([40, 50, 60, 75, 100]);
  return {
    family: 'specHyper', bench: 'eye', kind: 'number', unit: 'D', dp: 2,
    ask: 'What power of spectacle lens does this eye need?',
    prompt: `A long-sighted eye cannot see anything nearer than ${near} cm.`,
    given: [['near point', `${near} cm`]],
    wants: 'P', answer: 4 - 100 / near, signMatters: true,
    working: `the lens must put 25 cm at the near point: P = 100/25 − 100/${near} = ` +
             `${num(4 - 100 / near)} D`,
    patch: { eye: { defect: 'hypermetropia', near, wearing: false } },
  };
}

const FAMILIES = [
  taskMirrorV, taskMirrorV, taskMirrorF, taskLensV, taskLensV,
  taskNature, taskNature, taskPower, taskSnell, taskCritical,
  taskPrismMin, taskSlab, taskSpec,
];

/** A fresh problem. Only the benches that are asked for. */
export function newTask(only) {
  for (let tries = 0; tries < 40; tries++) {
    const t = pick(FAMILIES)();
    if (!t) continue;
    if (only && only.length && !only.includes(t.bench)) continue;
    if (!isFinite(t.kind === 'choice' ? 0 : t.answer)) continue;
    return { ...t, id: `${t.family}-${Math.random().toString(36).slice(2, 8)}` };
  }
  return taskMirrorV();
}

/* ---------- marking ---------- */
const parseNum = (text) => {
  const t = String(text).replace(/−/g, '-').replace(/\s|,/g, '').replace(/[°D]/gi, '');
  if (!t || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return parseFloat(t);
};

/**
 * Marking, with one rule worth stating: when the sign carries the physics,
 * the right size on the wrong side is not the right answer. It is the most
 * common way to lose the mark, so it is the one the lab will not wave through.
 */
export function check(task, input) {
  if (task.kind === 'choice') {
    const ok = input === task.answer;
    return { ok, hint: ok ? '' : 'Look at the sign of v, and then the sign of m.' };
  }
  const v = parseNum(input);
  if (v === null) return { ok: null, hint: 'Type a number.' };
  const tol = Math.max(0.02, Math.abs(task.answer) * 0.005);
  if (Math.abs(v - task.answer) <= tol) return { ok: true, hint: '' };
  if (task.signMatters && Math.abs(Math.abs(v) - Math.abs(task.answer)) <= tol) {
    return { ok: false, sign: true,
             hint: 'The right size, on the wrong side — which way was the light going?' };
  }
  return { ok: false, hint: `Not quite. ${task.working}` };
}
