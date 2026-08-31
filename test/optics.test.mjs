/* ============================================================
   Light — checking the optics headlessly.

   The lab holds two things apart on purpose: a tracer that knows
   only the law of reflection and Snell's law, and the formulas a
   textbook would use. This suite checks the tracer against its own
   definitions, checks the formulas against exact geometry, and then
   checks that the second really is the paraxial limit of the first —
   which is the claim the whole lab is built on.

   Tolerances, by kind:
     1e-12  algebra that ought to be exact — i = r, Snell, unit vectors
     1e-9   anything that went through a root solve or a trace
     1e-7   reversibility over several events, and prism symmetry
     orders rather than tolerances for the paraxial limits, because
            the whole point of those numbers is that they are not zero
   ============================================================ */
import * as E from '../src/labs/optics/engine.js';
import {
  reducer, initialState, createInitialState, writeState, readState,
  fitView, eyeRange, eyeRelaxed, eyeStrained, eyeSpec, eyeDefect, ACCOM,
  mirrorKind, lensKind, BENCHES, RANGE_MIN, RANGE_MAX, SEMI_MAX, U_MAX,
} from '../src/labs/optics/labState.js';
import { newTask, check, MIRROR_ROWS, LENS_ROWS } from '../src/labs/optics/challenges.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, extra); }
};
const near = (a, b, tol = 1e-9) => Number.isFinite(a) && Number.isFinite(b)
  && Math.abs(a - b) <= tol;
const nearPt = (a, b, tol = 1e-9) => near(a.x, b.x, tol) && near(a.y, b.y, tol);
const D = 180 / Math.PI;

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

/* a fixed spread of awkward cases, so every property below meets the same
   ones every run rather than whatever a random draw threw up */
const ANGLES = [];
for (let a = 1; a < 89; a += 3.7) ANGLES.push(a / D);
const INDICES = [1.31, 1.33, 1.47, 1.5, 1.52, 1.62, 1.77, 2.42];
const NORMALS = [];
for (let t = 0; t < 360; t += 23) NORMALS.push(E.fromAngle(t / D));

/* ============================================================ */
console.log('\n— the two laws, one event at a time —');
{
  let worstRefl = 0, worstLen = 0, worstTwice = 0, worstSnell = 0, worstBack = 0;
  for (const n of NORMALS) {
    for (const a of ANGLES) {
      /* an incident direction that really does meet this normal head-on-ish */
      const d = E.norm(E.add(E.mul(n, -Math.cos(a)), E.mul(E.V(-n.y, n.x), Math.sin(a))));
      const r = E.reflectDir(d, n);
      worstRefl = Math.max(worstRefl, Math.abs(Math.acos(-E.dot(d, n)) - Math.acos(E.dot(r, n))));
      worstLen = Math.max(worstLen, Math.abs(E.len(r) - 1));
      worstTwice = Math.max(worstTwice, E.len(E.sub(E.reflectDir(r, n), d)));
      for (const mu of INDICES) {
        const t = E.refractDir(d, n, 1 / mu);
        if (!t) continue;
        const i = Math.acos(E.clamp(-E.dot(d, n), -1, 1));
        const rr = Math.acos(E.clamp(-E.dot(t, n), -1, 1));
        worstSnell = Math.max(worstSnell, Math.abs(Math.sin(i) - mu * Math.sin(rr)));
        const back = E.refractDir(E.mul(t, -1), E.mul(n, -1), mu);
        if (back) worstBack = Math.max(worstBack, E.len(E.add(back, d)));
      }
    }
  }
  ok('i = r about the true normal, for every normal in the sample',
     worstRefl < 1e-12, worstRefl);
  ok('a reflected ray is still a unit vector', worstLen < 1e-12, worstLen);
  ok('reflecting a direction twice about any normal gives it back',
     worstTwice < 1e-12, worstTwice);
  ok('n₁ sin i = n₂ sin r, at every angle and in every medium',
     worstSnell < 1e-12, worstSnell);
  ok('refracting into glass and back out again returns the direction unchanged',
     worstBack < 1e-12, worstBack);

  const n = E.V(0, 1);
  ok('a ray along the normal is not bent at all',
     INDICES.every((mu) => {
       const t = E.refractDir(E.V(0, -1), n, 1 / mu);
       return t && nearPt(t, E.V(0, -1), 1e-12);
     }));
  ok('going into a denser medium there is no critical angle, at any angle whatever',
     ANGLES.every((a) => INDICES.every((mu) => {
       const d = E.norm(E.V(Math.sin(a), -Math.cos(a)));
       return E.refractDir(d, n, 1 / mu) !== null;
     })));
}

console.log('\n— where refraction gives out —');
{
  let allGood = true, allTIR = true;
  for (const mu of INDICES) {
    const C = E.criticalAngle(mu, 1);
    const shoot = (ang) => E.refractDir(E.norm(E.V(Math.sin(ang), -Math.cos(ang))), E.V(0, 1), mu);
    if (shoot(C - 1e-9) === null) allGood = false;
    if (shoot(C + 1e-9) !== null) allTIR = false;
  }
  ok('from glass into air the last angle that gets through is the critical one', allGood);
  ok('and one whisker past it, nothing does', allTIR);
  ok('and it is 41.81° for ordinary glass, and 48.75° for water',
     near(D * E.criticalAngle(1.5, 1), 41.8103, 1e-3)
     && near(D * E.criticalAngle(1.33, 1), 48.7535, 1e-3));
  ok('air into glass has no critical angle at all', E.criticalAngle(1, 1.5) === null);

  const d = E.norm(E.V(Math.sin(1.2), -Math.cos(1.2))), nn = E.V(0, 1);
  const refl = E.reflectDir(d, nn);
  ok('when refraction fails, what comes back obeys the law of reflection exactly',
     E.refractDir(d, nn, 1.5) === null
     && near(Math.acos(-E.dot(d, nn)), Math.acos(E.dot(refl, nn)), 1e-12));
}

console.log('\n— where a ray meets a surface —');
{
  const b = E.mirrorBench({ f: -20, semi: 8, halfX: 300, halfY: 100 });
  const onAxis = E.trace(b, { o: E.V(-100, 0), d: E.V(1, 0) });
  ok('a ray down the axis hits the pole and nothing else',
     onAxis.events.length === 1 && nearPt(onAxis.events[0].at, E.V(0, 0), 1e-12));
  ok('and comes straight back along itself',
     near(onAxis.d.x, -1, 1e-12) && near(onAxis.d.y, 0, 1e-12));

  const past = E.trace(b, { o: E.V(-100, 12), d: E.V(1, 0) });
  ok('a ray past the rim misses the mirror entirely',
     past.events.length === 0 && past.end === 'escaped');

  /* the near cap, not the far side of the sphere */
  let nearest = true, onSurface = 0, onRay = 0;
  for (let h = -7.5; h <= 7.5; h += 0.37) {
    const p = E.trace(b, { o: E.V(-100, h), d: E.V(1, 0) });
    if (!p.events.length) { nearest = false; continue; }
    const hp = p.events[0].at;
    onSurface = Math.max(onSurface, Math.abs(E.dist(hp, E.V(-40, 0)) - 40));
    onRay = Math.max(onRay, Math.abs(hp.y - h));
    if (hp.x < -40) nearest = false;             /* it tunnelled through the front */
  }
  ok('the near cap is taken, so a ray never tunnels through the front of a sphere', nearest);
  ok('every hit really is on its surface, and really is on its ray',
     onSurface < 1e-9 && onRay < 1e-9, `${onSurface}, ${onRay}`);

  ok('a ray that starts on a surface does not immediately hit it again',
     E.hit(E.V(0, 0), E.V(-1, 0), b.surfaces[0]) === null);

  const seg = E.segment({ id: 0, a: E.V(0, -5), b: E.V(0, 5) });
  ok('a segment is only ever hit between its two ends',
     E.raySegment(E.V(-10, 0), E.V(1, 0), seg.a, seg.b) !== null
     && E.raySegment(E.V(-10, 9), E.V(1, 0), seg.a, seg.b) === null);

  /* the cancellation case rayCircle is written for */
  const roots = E.rayCircle(E.V(-4e4, 0), E.V(1, 0), E.V(0, 0), 40);
  ok('the roots survive a ray passing a thousand radii from the centre',
     near(roots[0], 4e4 - 40, 1e-6) && near(roots[1], 4e4 + 40, 1e-6), roots.join(', '));
}

/* ============================================================ */
console.log('\n— the principle of reversibility, over every bench —');
{
  const benches = [
    ['concave mirror', E.mirrorBench({ f: -20, semi: 8, halfX: 300, halfY: 120 })],
    ['convex mirror', E.mirrorBench({ f: 15, semi: 6, halfX: 300, halfY: 120 })],
    ['convex lens', E.lensBench({ R1: 30, R2: -30, n: 1.5, thick: 1, semi: 6, halfX: 300, halfY: 120 })],
    ['concave lens', E.lensBench({ R1: -30, R2: 30, n: 1.5, thick: 0.4, semi: 6, halfX: 300, halfY: 120 })],
    ['slab', E.slabBench({ thickness: 6, n: 1.52, height: 40, halfX: 80, halfY: 50 })],
    ['prism', E.prismBench({ A: 60, n: 1.52, side: 22, halfX: 90, halfY: 60 })],
    ['interface', E.interfaceBench({ n1: 1, n2: 1.5, halfX: 60, halfY: 60 })],
    /* the other way round, where the light has to fight to get out at all */
    ['glass into air', E.interfaceBench({ n1: 1.6, n2: 1, halfX: 60, halfY: 60 })],
    ['water into air', E.interfaceBench({ n1: 1.33, n2: 1, halfX: 60, halfY: 60 })],
  ];
  let n = 0, tir = 0, worstPos = 0, worstDir = 0, worstLine = 0, kindsMatch = true;
  for (const [, bench] of benches) {
    for (let y = -14; y <= 14; y += 1.3) {
      for (let a = -1.15; a <= 1.15; a += 0.1) {
        const o = E.V(bench.box.x0 + 1, y);
        const d = E.norm(E.V(Math.cos(a), Math.sin(a)));
        const p = E.trace(bench, { o, d });
        if (p.end !== 'escaped' || p.events.length === 0) continue;
        const v = p.vertices;
        const back = E.trace(bench, {
          o: v[v.length - 1],
          d: E.norm(E.sub(v[v.length - 2], v[v.length - 1])),
          medium: p.medium,
        });
        if (back.end !== 'escaped') { kindsMatch = false; continue; }
        n++;
        if (p.events.some((e) => e.kind === 'tir')) tir++;
        /* the same surfaces, in the opposite order */
        const fwd = p.events.map((e) => `${e.kind}:${e.surf}`).join(' ');
        const rev = back.events.map((e) => `${e.kind}:${e.surf}`).reverse().join(' ');
        if (fwd !== rev) kindsMatch = false;
        for (let i = 0; i < p.events.length; i++) {
          worstPos = Math.max(worstPos,
            E.dist(p.events[i].at, back.events[back.events.length - 1 - i].at));
        }
        worstDir = Math.max(worstDir, E.len(E.add(back.d, d)));
        /* and it passes back through the point it was launched from */
        const bv = back.vertices;
        const bd = E.norm(E.sub(bv[bv.length - 1], bv[bv.length - 2]));
        worstLine = Math.max(worstLine, Math.abs(E.crossZ(bd, E.sub(o, bv[bv.length - 2]))));
      }
    }
  }
  ok(`reverse the last ray of any trace and it comes back out where it went in (${n} paths)`,
     n > 400 && worstPos < 1e-9, `${n} paths, worst ${worstPos}`);
  ok('the same surfaces, in the opposite order', kindsMatch);
  ok('and it leaves exactly the way it came', worstDir < 1e-12, worstDir);
  ok('and passes back through the point it was launched from', worstLine < 1e-9, worstLine);
  ok(`reversibility survives total internal reflection (${tir} such paths)`, tir >= 20, tir);
}

/* ============================================================ */
console.log('\n— the concave mirror, against the exact geometry —');
{
  const exact = (R, h) => R - R / (2 * Math.cos(Math.asin(h / Math.abs(R))));
  /* where the FIRST reflected ray crosses the axis. A mirror deep enough to
     catch its own light bounces a second time, which is real and interesting
     but is not what "the focus" means. */
  const firstCross = (p) => {
    const e = p.events[0];
    if (!e || Math.abs(e.dOut.y) < 1e-15) return null;
    return e.at.x - e.at.y * e.dOut.x / e.dOut.y;
  };
  let worst = 0;
  for (const R of [-20, -40, -80]) {
    const b = E.mirrorBench({ f: R / 2, semi: 0.9 * Math.abs(R), halfX: 400, halfY: 200 });
    for (let f = 0.02; f <= 0.85; f += 0.031) {
      const h = f * Math.abs(R);
      const p = E.trace(b, { o: E.V(-3 * Math.abs(R), h), d: E.V(1, 0) });
      const x = firstCross(p);
      if (x === null) { worst = Infinity; break; }
      worst = Math.max(worst, Math.abs(x - exact(R, h)));
    }
  }
  ok('a parallel ray crosses the axis at R − R/(2 cos θ), at every height there is',
     worst < 1e-9, worst);

  /* at 60° round from the pole it comes back exactly through the pole */
  const R = -40, h60 = Math.abs(R) * Math.sqrt(3) / 2;
  const b60 = E.mirrorBench({ f: R / 2, semi: h60 + 1, halfX: 400, halfY: 200 });
  const p60 = E.trace(b60, { o: E.V(-200, h60), d: E.V(1, 0) });
  ok('and at 60° round from the axis it comes back exactly through the pole',
     near(firstCross(p60), 0, 1e-9), firstCross(p60));

  const b = E.mirrorBench({ f: -20, semi: 18, halfX: 400, halfY: 200 });
  const cross = (h) => firstCross(E.trace(b, { o: E.V(-200, h), d: E.V(1, 0) }));
  const lsa = (h) => Math.abs(-20 - cross(h));
  let rising = true;
  for (let h = 1; h < 16; h += 1) if (lsa(h + 1) <= lsa(h)) rising = false;
  ok('so the rim of a fast mirror focuses short of the middle of it',
     cross(14) > -20 && rising);

  const orders = [];
  for (const h of [8, 4, 2, 1, 0.5]) orders.push(Math.log2(lsa(h) / lsa(h / 2)));
  ok('and halving the aperture quarters the miss — the error goes as h²',
     orders.every((o) => o > 1.9 && o < 2.1), orders.map((o) => o.toFixed(3)).join(', '));
  ok('a 12 cm aperture on a 40 cm mirror already misses the focus by 4.8%',
     near(100 * lsa(12) / 20, 4.83, 0.02), (100 * lsa(12) / 20).toFixed(3));

  /* a ray aimed at the centre of curvature meets the glass square-on */
  const C = E.V(-40, 0);
  const M = E.V(-40 + Math.sqrt(1600 - 100), 10);        /* a point on the mirror */
  const dirC = E.norm(E.sub(M, C));
  const pc = E.trace(b, { o: E.sub(C, E.mul(dirC, 20)), d: dirC });
  ok('a ray through the centre of curvature meets the mirror square-on',
     pc.events.length > 0 && near(pc.events[0].i, 0, 1e-12), pc.events[0] && pc.events[0].i);
  ok('and comes straight back along itself', E.len(E.add(pc.d, dirC)) < 1e-12);
}

console.log('\n— where the construction rays cross the glass —');
{
  const box = { x0: -400, x1: 400, y0: -400, y1: 400 };
  let wPar = 0, wFoc = 0, wMid = 0, wReach = 0, n = 0;
  for (const kind of ['mirror', 'lens']) {
    for (let f = -40; f <= 40; f += 2.5) {
      if (Math.abs(f) < 2) continue;
      for (let u = -200; u <= -5; u += 4.5) {
        const im = kind === 'mirror' ? E.mirrorImage(f, u, 4) : E.lensImage(f, u, 4);
        if (!isFinite(im.v)) continue;
        const rays = E.constructionRays(kind, f, u, 4, box);
        const at = Object.fromEntries(rays.map((r) => [r.id, r.at.y]));
        n++;
        wPar = Math.max(wPar, Math.abs(at.parallel - 4));
        wFoc = Math.max(wFoc, Math.abs(at.focus - im.hp));
        wMid = Math.max(wMid, Math.abs(kind === 'mirror' ? at.pole : at.centre));
        wReach = Math.max(wReach, Math.abs(
          Math.max(...rays.map((r) => Math.abs(r.at.y))) - E.constructionReach(kind, f, u, 4)));
      }
    }
  }
  ok(`the parallel ray crosses the element at h, every time (${n} set-ups)`,
     n > 500 && wPar < 1e-12, wPar);
  ok('the ray through the focus crosses it at h′ — the image height itself',
     wFoc < 1e-9, wFoc);
  ok('and the one through the centre crosses on the axis', wMid < 1e-12, wMid);
  ok('constructionReach agrees with the rays it is describing', wReach < 1e-12, wReach);

  /* the bug this was written for: a ray that crosses outside the aperture never
     meets the glass, so it is not light and must not be drawn as light */
  const f = 35.5, u = -45, h = 5, semi = 5;
  const rays = E.constructionRays('lens', f, u, h, box);
  const misses = rays.filter((r) => Math.abs(r.at.y) > semi);
  ok('a lens 5 cm in radius does not catch a ray crossing 18.7 cm off the axis',
     misses.length === 1 && misses[0].id === 'focus'
     && near(misses[0].at.y, -18.684, 1e-3), JSON.stringify(misses.map((m) => m.id)));
  ok('and widening it to that reach catches every one of them', (() => {
    const need = E.constructionReach('lens', f, u, h);
    return rays.every((r) => Math.abs(r.at.y) <= need + 1e-9) && near(need, 18.684, 1e-3);
  })());
  ok('a bigger object needs a bigger element, in proportion',
     near(E.constructionReach('lens', f, u, 2 * h), 2 * E.constructionReach('lens', f, u, h), 1e-9));
  ok('and at the focus, where the image runs away, so does the reach',
     !isFinite(E.constructionReach('lens', 20, -20, 4))
     || E.constructionReach('lens', 20, -20.0001, 4) > 1e5);
}

console.log('\n— and the formula it is being held to —');
{
  const b = E.mirrorBench({ f: -20, semi: 18, halfX: 600, halfY: 300 });
  /* rays from an axial object point, at smaller and smaller angles */
  const cross = (u, y) => E.axisCrossing(E.trace(b, {
    o: E.V(u, 0), d: E.norm(E.sub(E.V(0, y), E.V(u, 0))),
  }));
  const want = E.mirrorImage(-20, -60).v;
  const err = (y) => Math.abs(cross(-60, y) - want);
  const orders = [];
  for (const y of [4, 2, 1, 0.5]) orders.push(Math.log2(err(y) / err(y / 2)));
  ok('the traced image walks onto the mirror formula as the rays close on the axis',
     err(0.25) < 1e-3, err(0.25));
  ok('and it converges like the square of the ray height',
     orders.every((o) => o > 1.9 && o < 2.1), orders.map((o) => o.toFixed(3)).join(', '));
  ok('at 7 cm of ray height the formula is 0.25% out, and at 14 cm a full 1%',
     near(100 * err(7) / Math.abs(want), 0.254, 0.01)
     && near(100 * err(14) / Math.abs(want), 1.001, 0.01),
     `${(100 * err(7) / Math.abs(want)).toFixed(3)}%, ${(100 * err(14) / Math.abs(want)).toFixed(3)}%`);

  ok('1/v + 1/u = 1/f, and f = R/2', (() => {
    for (let f = -40; f <= 40; f += 2.5) {
      if (f === 0) continue;
      for (let u = -200; u <= -5; u += 3.5) {
        const im = E.mirrorImage(f, u);
        if (!isFinite(im.v)) continue;
        if (!near(1 / im.v + 1 / u, 1 / f, 1e-12)) return false;
        if (!near(im.m, -im.v / u, 1e-12)) return false;
      }
    }
    return true;
  })());

  ok('the two ways of writing the magnification agree everywhere', (() => {
    for (let f = -40; f <= 40; f += 1.5) {
      if (f === 0) continue;
      for (let u = -200; u <= -5; u += 1.5) {
        const im = E.mirrorImage(f, u);
        if (!isFinite(im.v)) continue;
        if (!near(im.m, f / (f - u), 1e-10)) return false;
      }
    }
    return true;
  })());

  ok('at the focus the image runs away, and the engine says so instead of dividing by zero',
     E.mirrorImage(-20, -20).v === Infinity && E.mirrorImage(-20, -20).atFocus === true
     && E.lensImage(20, -20).v === Infinity);
  ok('and "∞" is what reaches the page, not "NaN"', E.num(Infinity) === '∞'
     && E.num(NaN) === '—' && E.num(-0.0000001) === '0');

  ok('at u = R the image lands back on the object, which is how f is measured with a pin',
     near(E.mirrorImage(-20, -40).v, -40, 1e-12) && near(E.mirrorImage(-20, -40).m, -1, 1e-12));

  ok('object and image are conjugate: put the object where the image was', (() => {
    for (let f = -40; f <= -5; f += 2.5) {
      for (let u = -200; u <= -5; u += 3.5) {
        const a = E.mirrorImage(f, u);
        if (!isFinite(a.v) || a.v >= 0) continue;
        const back = E.mirrorImage(f, a.v);
        if (!near(back.v, u, 1e-8)) return false;
        if (!near(a.m * back.m, 1, 1e-8)) return false;
      }
    }
    return true;
  })());

  ok('a plane mirror puts the image as far behind as the object is in front, the right way up',
     (() => {
       for (let u = -150; u <= -2; u += 1.5) {
         const im = E.mirrorImage(0, u, 4);
         if (!near(im.v, -u, 1e-12) || !near(im.m, 1, 1e-12) || im.real) return false;
       }
       return true;
     })());

  ok('a single mirror or lens never makes a real image the right way up', (() => {
    for (let f = -60; f <= 60; f += 1.5) {
      if (f === 0) continue;
      for (let u = -200; u <= -2; u += 1.5) {
        const m = E.mirrorImage(f, u), l = E.lensImage(f, u);
        if (isFinite(m.v) && m.real && m.erect) return false;
        if (isFinite(l.v) && l.real && l.erect) return false;
      }
    }
    return true;
  })());

  /* the six standard positions, by their properties rather than by a table */
  const f = -20;
  const six = [
    ['beyond C', -60, (i) => i.real && !i.erect && Math.abs(i.m) < 1 && i.v > 2 * f && i.v < f],
    ['at C', -40, (i) => i.real && !i.erect && near(Math.abs(i.m), 1, 1e-9) && near(i.v, 2 * f, 1e-9)],
    ['between C and F', -30, (i) => i.real && !i.erect && Math.abs(i.m) > 1 && i.v < 2 * f],
    ['at F', -20, (i) => !isFinite(i.v)],
    ['between F and the pole', -10, (i) => !i.real && i.erect && Math.abs(i.m) > 1],
  ];
  ok('the six standard positions do what the book says they do',
     six.every(([, u, test]) => test(E.mirrorImage(f, u))),
     six.filter(([, u, t]) => !t(E.mirrorImage(f, u))).map((s) => s[0]).join(', '));
  ok('and a very distant object lands at the focus',
     near(E.mirrorImage(-20, -1e9).v, -20, 1e-6));
  ok('a convex mirror always gives a small, upright, virtual image', (() => {
    for (let u = -300; u <= -1; u += 1.5) {
      const i = E.mirrorImage(15, u);
      if (i.real || !i.erect || Math.abs(i.m) >= 1) return false;
    }
    return true;
  })());
}

/* ============================================================ */
console.log('\n— the lens, refracting twice —');
{
  const paraxialFocus = (R1, R2, n, d, y) => {
    const b = E.lensBench({ R1, R2, n, thick: d, semi: 9, halfX: 600, halfY: 200 });
    const p = E.trace(b, { o: E.V(-300, y), d: E.V(1, 0) });
    if (p.events.length < 2) return null;
    return E.axisCrossing(p);
  };

  ok('one spherical surface obeys n₂/v − n₁/u = (n₂ − n₁)/R',
     near(E.surfaceImage(1, 1.5, 20, -60), 180, 1e-9), E.surfaceImage(1, 1.5, 20, -60));

  ok('the lens maker’s formula, thin and thick', (() => {
    const thin = E.lensMaker(1.5, 20, -20, 0);
    const thick = E.lensMaker(1.5, 20, -20, 0.2);
    return near(thin.f, 20, 1e-12) && near(thick.f, 20.033389, 1e-5)
      && near(E.backFocal(1.5, 20, -20, 0.2), 19.966611, 1e-5);
  })());

  /* the trace converges on the THICK lens, not the thin one: the thin-lens
     value has forgotten the glass has body, and that is a bigger miss than
     the aberration at any sensible aperture */
  const bfdFromCentre = E.backFocal(1.5, 20, -20, 0.2) + 0.1;
  const errL = (y) => Math.abs(paraxialFocus(20, -20, 1.5, 0.2, y) - bfdFromCentre);
  ok('the traced focus walks onto the thick lens’s own back focal distance',
     errL(0.025) < 1e-4, errL(0.025));
  const ordersL = [];
  for (const y of [1.6, 0.8, 0.4, 0.2]) ordersL.push(Math.log2(errL(y) / errL(y / 2)));
  ok('and it converges like the square of the ray height, here too',
     ordersL.every((o) => o > 1.9 && o < 2.1), ordersL.map((o) => o.toFixed(3)).join(', '));
  /* two approximations peel away here, not one, and they are different sizes:
     the thin lens forgets the glass has body (0.067 cm), and the paraxial
     assumption forgets the rays are not on the axis (0.013 cm at h = 4 mm) */
  ok('so the focus is not where the thin lens says it is — the difference is the glass',
     near(bfdFromCentre - 20, 0.066611, 1e-5)
     && (bfdFromCentre - 20) / errL(0.4) > 4, (bfdFromCentre - 20).toFixed(6));
  ok('and as the glass is made thinner the two answers meet', (() => {
    let last = Infinity;
    for (const d of [2, 1, 0.5, 0.25, 0.125]) {
      const gap = Math.abs(E.backFocal(1.5, 20, -20, d) + d / 2 - 20);
      if (gap >= last) return false;
      last = gap;
    }
    return last < 0.05;
  })());

  ok('turning the lens round does not change its focal length', (() => {
    for (const [R1, R2] of [[20, -20], [30, -15], [25, 60], [-40, 22]]) {
      const a = E.lensMaker(1.5, R1, R2, 0.4).f;
      const b = E.lensMaker(1.5, -R2, -R1, 0.4).f;
      if (!near(a, b, 1e-12)) return false;
    }
    return true;
  })());

  ok('1/v − 1/u = 1/f, and m = v/u', (() => {
    for (let f = -50; f <= 50; f += 2.5) {
      if (f === 0) continue;
      for (let u = -200; u <= -5; u += 3.5) {
        const im = E.lensImage(f, u);
        if (!isFinite(im.v)) continue;
        if (!near(1 / im.v - 1 / u, 1 / f, 1e-12)) return false;
        if (!near(im.m, im.v / u, 1e-12)) return false;
      }
    }
    return true;
  })());

  ok('P = 100/f in dioptres, and a 20 cm convex lens is 5 D',
     near(E.dioptres(20), 5, 1e-12) && near(E.dioptres(-50), -2, 1e-12)
     && near(E.focalFromPower(5), 20, 1e-12));

  ok('a concave lens never makes a real image of a real object', (() => {
    for (let u = -300; u <= -1; u += 1.5) {
      const i = E.lensImage(-20, u);
      if (i.real || !i.erect || Math.abs(i.m) >= 1) return false;
    }
    return true;
  })());

  ok('the magnifying glass: inside the focus, the image is virtual, erect and bigger',
     (() => {
       for (let u = -19; u <= -2; u += 0.5) {
         const i = E.lensImage(20, u);
         if (i.real || !i.erect || Math.abs(i.m) <= 1) return false;
       }
       return true;
     })());

  ok('an object and its real image can never be closer than 4f', (() => {
    const f = 20;
    let best = Infinity, at = 0;
    for (let u = -400; u <= -20.1; u += 0.01) {
      const v = E.lensImage(f, u).v;
      if (!isFinite(v) || v <= 0) continue;
      const sep = Math.abs(u) + v;
      if (sep < best) { best = sep; at = u; }
    }
    return near(best, 4 * f, 0.01) && near(at, -2 * f, 0.05);
  })());

  ok('and the displacement method finds f without ever locating the lens', (() => {
    const f = 20;
    for (const Dsep of [100, 120, 150]) {
      /* the two lens positions that both throw a sharp image on the screen */
      const disc = Dsep * Dsep - 4 * f * Dsep;
      if (disc <= 0) return false;
      const d = Math.sqrt(disc);
      if (!near((Dsep * Dsep - d * d) / (4 * Dsep), f, 1e-9)) return false;
    }
    return true;
  })());
}

/* ============================================================ */
console.log('\n— the slab, and looking into water —');
{
  let worstParallel = 0, worstShift = 0;
  for (const t of [3, 6, 10]) {
    for (const n of [1.33, 1.5, 1.62]) {
      const b = E.slabBench({ thickness: t, n, height: 60, halfX: 90, halfY: 70 });
      for (const iDeg of [10, 25, 40, 55, 70, 80]) {
        const i = iDeg / D;
        const d = E.V(Math.cos(i), -Math.sin(i));
        const o = E.V(-40, 40 * Math.tan(i));
        const p = E.trace(b, { o, d });
        if (p.events.length !== 2) { worstParallel = Infinity; continue; }
        worstParallel = Math.max(worstParallel, Math.abs(1 - E.dot(p.d, d)));
        const v = p.vertices;
        const exit = v[v.length - 2];
        const perp = Math.abs(E.crossZ(d, E.sub(exit, o)));
        worstShift = Math.max(worstShift, Math.abs(perp - E.lateralShift(t, i, n)));
      }
    }
  }
  ok('the emergent ray is parallel to the incident one, to the last decimal',
     worstParallel < 1e-13, worstParallel);
  ok('and the shift is t sin(i − r) / cos r', worstShift < 1e-9, worstShift);
  ok('it is zero at normal incidence, and grows with the angle and the thickness',
     near(E.lateralShift(6, 0, 1.5), 0, 1e-15)
     && E.lateralShift(6, 1, 1.5) > E.lateralShift(6, 0.5, 1.5)
     && E.lateralShift(10, 1, 1.5) > E.lateralShift(6, 1, 1.5));
  ok('as the glass stops being glass the slab stops existing',
     near(E.lateralShift(6, 1, 1.0000001), 0, 1e-5));
  ok('and 6 cm of glass at 60° moves the ray 3.07 cm sideways',
     near(E.lateralShift(6, 60 / D, 1.5), 3.0748, 1e-3), E.lateralShift(6, 60 / D, 1.5));

  ok('a coin 8 cm down in water looks 6 cm down',
     near(E.apparentDepth(8, 4 / 3), 6, 1e-12));
  ok('real depth over apparent depth is the refractive index, whatever the depth',
     [2, 5, 8, 30].every((dd) => INDICES.every((n) => near(dd / E.apparentDepth(dd, n), n, 1e-12))));
}

/* ============================================================ */
console.log('\n— the prism —');
{
  /* fire a ray at the left face at a stated angle to ITS normal */
  const shoot = (A, n, i1deg) => {
    const b = E.prismBench({ A, n, side: 22, halfX: 100, halfY: 70 });
    const a = A / D, i = i1deg / D;
    const nIn = E.fromAngle(-a / 2);                    /* into the left face */
    const d = E.V(nIn.x * Math.cos(i) - nIn.y * Math.sin(i),
                  nIn.x * Math.sin(i) + nIn.y * Math.cos(i));
    const mid = E.V(-11 * Math.sin(a / 2) / 2, b.apex.y - 11 * Math.cos(a / 2) / 2);
    const p = E.trace(b, { o: E.sub(mid, E.mul(d, 40)), d });
    return { p, d, dev: Math.acos(E.clamp(E.dot(d, p.d), -1, 1)) };
  };

  let worstSum = 0, worstD = 0, n2 = 0;
  for (const A of [30, 45, 60]) {
    for (const n of [1.33, 1.5, 1.62]) {
      for (let i1 = 20; i1 <= 85; i1 += 2.5) {
        const s = shoot(A, n, i1);
        if (s.p.end !== 'escaped' || s.p.events.length !== 2) continue;
        if (s.p.events.some((e) => e.kind !== 'refract')) continue;
        /* in at the left face and out at the right one — not out through the base,
           which is a real path but is not the one A refers to */
        if (s.p.events[0].surf !== 2 || s.p.events[1].surf !== 0) continue;
        n2++;
        /* r₂ = A − r₁, signed. Past r₁ = A the ray reaches the second face from
           the far side of its normal and r₂ turns negative — which the tracer
           only ever reports as an angle, so it is |A − r₁| that must match. */
        const r1 = s.p.events[0].r, r2 = s.p.events[1].i;
        worstSum = Math.max(worstSum, Math.abs(Math.abs(A / D - r1) - r2));
        const want = E.prismDeviation(A / D, n, i1 / D);
        if (want && !want.tir) worstD = Math.max(worstD, Math.abs(s.dev - want.D));
      }
    }
  }
  ok(`r₂ = A − r₁, at every incidence that gets through (${n2} of them)`,
     n2 > 100 && worstSum < 1e-12, worstSum);
  ok('and D = i₁ + i₂ − A, measured as the angle between the ray in and the ray out',
     worstD < 1e-12, worstD);

  /* the minimum, swept and then solved */
  let worstMin = 0, worstSym = 0;
  for (const A of [30, 45, 50, 60]) {
    for (const n of [1.33, 1.5, 1.62]) {
      const md = E.minDeviation(A / D, n);
      if (!md) continue;
      let best = { D: Infinity, i: 0 };
      for (let i1 = 5; i1 <= 89; i1 += 0.002) {
        const r = E.prismDeviation(A / D, n, i1 / D);
        if (r && !r.tir && r.D < best.D) best = { D: r.D, i: i1 / D };
      }
      worstMin = Math.max(worstMin, Math.abs(best.D - md.D));
      const s = shoot(A, n, md.i1 * D);
      if (s.p.events.length === 2) {
        worstSym = Math.max(worstSym, Math.abs(s.p.events[0].r - A / D / 2));
      }
    }
  }
  ok('the swept minimum is the one the formula solves for', worstMin < 1e-7, worstMin);
  ok('and at the minimum the ray runs symmetrically through: r₁ = r₂ = A/2',
     worstSym < 1e-7, worstSym);
  ok('for a 60° crown prism that minimum is 38.93°, at 49.46° of incidence',
     near(D * E.minDeviation(60 / D, 1.52).D, 38.9284, 1e-3)
     && near(D * E.minDeviation(60 / D, 1.52).i1, 49.4642, 1e-3));
  ok('n = sin((A + D)/2)/sin(A/2) gives back the index the prism was given', (() => {
    for (const A of [30, 45, 50, 60, 70]) {
      for (const n of [1.33, 1.5, 1.52, 1.62]) {
        const md = E.minDeviation(A / D, n);
        if (!md) continue;
        if (!near(E.muFromPrism(A / D, md.D), n, 1e-12)) return false;
      }
    }
    return true;
  })());
  ok('it is a genuine minimum: the curve rises on both sides of it', (() => {
    const A = 60 / D, n = 1.52, md = E.minDeviation(A, n);
    const at = (di) => E.prismDeviation(A, n, md.i1 + di);
    return at(-0.05).D > md.D && at(0.05).D > md.D
      && at(-0.2).D > at(-0.05).D && at(0.2).D > at(0.05).D;
  })());
  ok('and it rises to the same height at both ends, because reversing a ray keeps its bending',
     (() => {
       const A = 60 / D, n = 1.52;
       const a = E.prismDeviation(A, n, 40 / D);
       /* the same deviation must be reachable from the other side */
       const b = E.prismDeviation(A, n, a.i2);
       return near(a.D, b.D, 1e-12) && near(b.i2, a.i1, 1e-12);
     })());
  ok('below 27.92° of incidence nothing comes out of a 60° glass prism at all', (() => {
    const A = 60 / D, n = 1.5;
    let lo = 0, hi = 60;
    for (let k = 0; k < 60; k++) {
      const m = (lo + hi) / 2;
      const r = E.prismDeviation(A, n, m / D);
      if (!r || r.tir) lo = m; else hi = m;
    }
    return near(lo, 27.92, 0.02);
  })());
  ok('and a prism wider than twice the critical angle passes nothing, whatever you do',
     (() => {
       const A = 84 / D, n = 1.5;
       for (let i1 = 0; i1 <= 89.9; i1 += 0.05) {
         const r = E.prismDeviation(A, n, i1 / D);
         if (r && !r.tir) return false;
       }
       return true;
     })());
  ok('a thin prism deviates by (n − 1)A, and goes wrong like A³', (() => {
    const n = 1.5;
    const err = (Adeg) => {
      const A = Adeg / D;
      const md = E.minDeviation(A, n);
      return Math.abs(md.D - E.thinPrism(A, n));
    };
    const orders = [];
    for (const A of [8, 4, 2, 1]) orders.push(Math.log2(err(A) / err(A / 2)));
    return orders.every((o) => o > 2.85 && o < 3.15);
  })());
}

/* ============================================================ */
console.log('\n— dispersion —');
{
  const glass = E.cauchyFor(1.52);
  ok('Cauchy is fitted so that sodium yellow gets the index it was asked for',
     near(E.indexAt(glass, 589.3), 1.52, 1e-12));
  ok('and makes violet slower than red, at every wavelength in the strip', (() => {
    let last = Infinity;
    for (let wl = 380; wl <= 720; wl += 2) {
      const n = E.indexAt(glass, wl);
      if (n >= last) return false;
      last = n;
    }
    return true;
  })());
  ok('so violet is deviated most and red least, in that order, for all seven colours',
     (() => {
       const A = 60 / D;
       let last = Infinity;
       for (const c of E.SPECTRUM) {
         const n = E.indexAt(glass, c.wl);
         const r = E.prismDeviation(A, n, 50 / D);
         if (!r || r.tir || r.D >= last) return false;
         last = r.D;
       }
       return true;
     })());
  ok('a 60° crown prism spreads the spectrum through 1.33°', (() => {
    const A = 60 / D;
    const dv = E.prismDeviation(A, E.indexAt(glass, 410), 50 / D).D;
    const dr = E.prismDeviation(A, E.indexAt(glass, 650), 50 / D).D;
    return near(D * (dv - dr), 1.327, 0.01);
  })());
  ok('and flint spreads it further than crown, at the same prism angle', (() => {
    const A = 60 / D;
    const spread = (nD, B) => {
      const g = E.cauchyFor(nD, B);
      return E.prismDeviation(A, E.indexAt(g, 410), 55 / D).D
           - E.prismDeviation(A, E.indexAt(g, 650), 55 / D).D;
    };
    return spread(1.62, 8000) > spread(1.52, 4200);
  })());
  ok('white light entering a slab comes out white, but not quite in one place', (() => {
    const b = E.slabBench({ thickness: 8, n: 1.52, height: 60, halfX: 90, halfY: 70,
                            disperse: true });
    const i = 55 / D, d = E.V(Math.cos(i), -Math.sin(i));
    const shifts = [];
    for (const c of E.SPECTRUM) {
      const p = E.trace(b, { o: E.V(-40, 40 * Math.tan(i)), d, wl: c.wl });
      if (p.events.length !== 2) return false;
      if (Math.abs(1 - E.dot(p.d, d)) > 1e-13) return false;      /* still parallel */
      const v = p.vertices;
      shifts.push(Math.abs(E.crossZ(d, E.sub(v[v.length - 2], E.V(-40, 40 * Math.tan(i))))));
    }
    return shifts[0] > shifts[shifts.length - 1];                  /* violet moved most */
  })());
  ok('every index the lab can produce is greater than one',
     E.MATERIALS.every((m) => m.n >= 1)
     && E.SPECTRUM.every((c) => E.indexAt(E.cauchyFor(1.31), c.wl) > 1));
}

/* ============================================================ */
console.log('\n— the eye —');
{
  const normal = { retina: 2.5, defect: 'normal', far: 200, near: 25 };
  ok('a relaxed normal eye is 40 D, and puts infinity on the retina',
     near(eyeRelaxed(normal), 40, 1e-12));
  ok('and 44 D at the near point — four dioptres of accommodation',
     near(eyeStrained(normal), 44, 1e-12) && near(eyeRange(normal).near, 25, 1e-12)
     && eyeRange(normal).far === Infinity);
  ok('the near point of a normal eye is 25 cm because the arithmetic says so',
     near(100 / (44 - 40), 25, 1e-12));

  const myope = { retina: 2.5, defect: 'myopia', far: 50, near: 25 };
  ok('a short-sighted eye cannot see past its far point',
     near(eyeRange(myope).far, 50, 1e-9));
  ok('and can read closer than a normal one can — which is the compensation',
     eyeRange(myope).near < 25);
  ok('a myopic far point of half a metre needs −2 D',
     near(eyeSpec(myope), -2, 1e-12));

  const hyper = { retina: 2.5, defect: 'hypermetropia', far: 200, near: 100 };
  ok('a long-sighted eye’s far point lies behind it, which is why it strains even for a star',
     eyeRange(hyper).far < 0);
  ok('a hypermetropic near point of one metre needs +3 D',
     near(eyeSpec(hyper), 3, 1e-12));

  /* the real check: put the spectacle on and re-run the whole eye */
  ok('and with the spectacle on, every defective eye becomes a normal one', (() => {
    for (const e of [
      { retina: 2.5, defect: 'myopia', far: 25, near: 25 },
      { retina: 2.5, defect: 'myopia', far: 100, near: 25 },
      { retina: 2.2, defect: 'myopia', far: 60, near: 25 },
      { retina: 2.5, defect: 'hypermetropia', far: 200, near: 40 },
      { retina: 2.5, defect: 'hypermetropia', far: 200, near: 75 },
      { retina: 3.0, defect: 'hypermetropia', far: 200, near: 60 },
    ]) {
      const base = 100 / e.retina;
      const relaxed = eyeRelaxed(e) + eyeSpec(e);
      const cNear = 100 / (relaxed + ACCOM - base);
      const cFar = relaxed - base;
      if (!near(cNear, 25, 1e-9)) return false;             /* reads at 25 cm */
      if (Math.abs(cFar) > 1e-9) return false;              /* and sees the stars */
    }
    return true;
  })());
  ok('correcting an eye that needs no correction asks for 0 D',
     near(eyeSpec(normal), 0, 1e-12) && eyeDefect(normal) === 'normal');
  ok('the two powers add, because the lenses are as good as in contact',
     near(eyeRelaxed(myope) + eyeSpec(myope), 100 / myope.retina, 1e-12));

  /* the retina catches what reaches it, and nothing goes past */
  const b = E.eyeBench({ retina: 2.5, power: 60, spec: 0, wearing: false,
                         semi: 1.1, eyeR: 1.2, halfX: 60, halfY: 20 });
  const p = E.trace(b, { o: E.V(-30, 0.4), d: E.norm(E.V(1, -0.01)) });
  ok('the retina stops the light rather than letting it out of the back of the head',
     p.end === 'absorbed' && p.events[p.events.length - 1].tag === 'retina');
}

/* ============================================================ */
console.log('\n— every law, at every event, on every bench —');
{
  const benches = [
    E.mirrorBench({ f: -20, semi: 9, halfX: 300, halfY: 120 }),
    E.mirrorBench({ f: 18, semi: 7, halfX: 300, halfY: 120 }),
    E.mirrorBench({ f: 0, semi: 9, halfX: 300, halfY: 120 }),
    E.lensBench({ R1: 30, R2: -30, n: 1.5, thick: 1, semi: 7, halfX: 300, halfY: 120 }),
    E.lensBench({ R1: -25, R2: 25, n: 1.62, thick: 0.4, semi: 6, halfX: 300, halfY: 120 }),
    E.slabBench({ thickness: 7, n: 1.52, height: 50, halfX: 90, halfY: 60 }),
    E.prismBench({ A: 60, n: 1.52, side: 22, halfX: 100, halfY: 70 }),
    E.prismBench({ A: 45, n: 1.62, side: 20, halfX: 100, halfY: 70 }),
    E.interfaceBench({ n1: 1, n2: 1.33, halfX: 60, halfY: 60 }),
    E.interfaceBench({ n1: 1.52, n2: 1, halfX: 60, halfY: 60 }),
  ];
  let events = 0, lost = 0;
  let wRefl = 0, wSnell = 0, wUnit = 0, wMed = 0, tirOK = true, sideOK = true;
  for (const bench of benches) {
    for (let y = -18; y <= 18; y += 0.9) {
      for (let a = -1.2; a <= 1.2; a += 0.13) {
        const d = E.norm(E.V(Math.cos(a), Math.sin(a)));
        const p = E.trace(bench, { o: E.V(bench.box.x0 + 0.5, y), d,
                                   medium: bench.startMedium || 1 });
        if (p.end === 'lost') lost++;
        for (const e of p.events) {
          if (!e.dOut) continue;
          events++;
          wUnit = Math.max(wUnit, Math.abs(E.len(e.dOut) - 1));
          wMed = Math.max(wMed, Math.abs(e.med - e.n1));
          if (e.kind === 'reflect' || e.kind === 'tir') {
            /* cos i against cos r, rather than the angles: acos loses digits at
               both ends of its range, and the law is about the ratio anyway */
            wRefl = Math.max(wRefl, Math.abs(-E.dot(e.dIn, e.n) - E.dot(e.dOut, e.n)));
            if (E.dot(e.dOut, e.n) < 0) sideOK = false;      /* it must come back out */
            if (e.kind === 'tir' && e.n1 > e.n2) {
              const C = E.criticalAngle(e.n1, e.n2);
              if (e.i < C - 1e-9) tirOK = false;
            }
          } else if (e.kind === 'refract') {
            wSnell = Math.max(wSnell, Math.abs(
              e.n1 * Math.abs(E.crossZ(e.n, e.dIn)) - e.n2 * Math.abs(E.crossZ(e.n, e.dOut))));
            if (E.dot(e.dOut, e.n) > 0) sideOK = false;      /* it must carry on through */
            /* and it never jumps to the other side of the normal */
            if (Math.sign(E.crossZ(e.n, e.dIn)) !== Math.sign(E.crossZ(e.n, e.dOut))
                && Math.abs(E.crossZ(e.n, e.dIn)) > 1e-12) sideOK = false;
          }
        }
      }
    }
  }
  ok(`${events} events, and every reflection has i = r`, wRefl < 1e-12, wRefl);
  ok('every refraction has n₁ sin i = n₂ sin r', wSnell < 1e-12, wSnell);
  ok('every total internal reflection happens at or beyond the critical angle', tirOK);
  ok('every ray leaves on the side it ought to, and never crosses its own normal', sideOK);
  ok('every direction is still a unit vector', wUnit < 1e-12, wUnit);
  ok('and the ray’s own account of what it is swimming in agrees with the surface',
     wMed < 1e-12, wMed);
  ok('no trace anywhere ran out of events', lost === 0, lost);
  ok('and there were enough of them to mean something', events > 1500, events);
}

/* ============================================================ */
console.log('\n— nothing that reaches the drawing is ever a NaN —');
{
  let bad = [];
  const fine = (label, v) => {
    if (typeof v !== 'number') return;
    if (Number.isNaN(v)) bad.push(label);
  };
  /* every mirror and lens the controls can be set to, including the awkward ones */
  for (const f of [-200, -40, -20, -2, 0, 2, 20, 40, 200]) {
    for (const u of [-300, -40.0001, -20, -19.9999, -20.0001, -2, -1]) {
      for (const h of [-15, -0.5, 0.5, 15]) {
        const m = E.mirrorImage(f, u, h);
        fine(`mirror f=${f} u=${u}`, m.v); fine('m', m.m); fine('hp', m.hp);
        if (f !== 0) {
          const l = E.lensImage(f, u, h);
          fine(`lens f=${f} u=${u}`, l.v); fine('m', l.m); fine('hp', l.hp);
        }
      }
    }
  }
  for (const n of [1, 1.0001, 1.33, 2.6]) {
    for (let i = 0; i <= 89.5; i += 0.5) {
      fine('snell', E.snellAngle(i / D, 1, n) ?? 0);
      fine('shift', E.lateralShift(6, i / D, n));
      const C = E.criticalAngle(n, 1);
      fine('critical', C === null ? 0 : C);
      for (const A of [15, 45, 85]) {
        const p = E.prismDeviation(A / D, n, i / D);
        if (p && p.D !== null) fine(`prism A=${A} n=${n} i=${i}`, p.D);
        const md = E.minDeviation(A / D, n);
        if (md) fine('minDev', md.D);
      }
    }
  }
  for (const retina of [1.8, 2.5, 3.4]) {
    for (const far of [10, 100, 500]) {
      for (const nearPt of [26, 60, 200]) {
        for (const defect of ['normal', 'myopia', 'hypermetropia']) {
          const e = { retina, defect, far, near: nearPt };
          fine('relaxed', eyeRelaxed(e)); fine('spec', eyeSpec(e));
          fine('near', eyeRange(e).near); fine('far', eyeRange(e).far);
        }
      }
    }
  }
  ok('every readout the controls can reach is a number, or an infinity said in words',
     bad.length === 0, bad.slice(0, 4).join(' | '));
  ok('and the two that are meant to be infinite say so',
     E.mirrorImage(-20, -20).v === Infinity && E.num(E.mirrorImage(-20, -20).v) === '∞');
}

/* ============================================================ */
console.log('\n— the challenges —');
{
  const seen = {};
  let unanswerable = 0, mismarked = 0, onOwnAnswer = 0, notWhole = 0, atFocus = 0;
  for (let k = 0; k < 600; k++) {
    const t = newTask();
    seen[t.family] = (seen[t.family] || 0) + 1;
    if (t.kind === 'choice') {
      if (!t.choices.some((c) => c.id === t.answer)) unanswerable++;
      if (!check(t, t.answer).ok) mismarked++;
      if (t.choices.some((c) => c.id === 'real|erect' && c.id === t.answer)) unanswerable++;
    } else {
      if (!isFinite(t.answer)) { unanswerable++; continue; }
      if (!check(t, String(t.answer.toFixed(6))).ok) mismarked++;
      if (check(t, String(t.answer + 5 * Math.max(0.1, Math.abs(t.answer) * 0.02))).ok) mismarked++;
    }
    if (t.patch.mirror) {
      const { f, u } = t.patch.mirror;
      if (Math.abs(u - f) < 1e-9) atFocus++;
      if (Math.abs(u - Math.round(u)) > 1e-9 || Math.abs(f - Math.round(f)) > 1e-9) notWhole++;
    }
    if (t.patch.lens && Math.abs(t.patch.lens.u + t.patch.lens.f) < 1e-9) atFocus++;
  }
  ok('600 challenges are all answerable', unanswerable === 0, unanswerable);
  ok('every stated answer is what the marking accepts, and a wrong one is not',
     mismarked === 0, mismarked);
  ok('no task ever puts the object at the focus, where there is no answer to give',
     atFocus === 0, atFocus);
  ok('every mirror set-up is a whole number of centimetres', notWhole === 0, notWhole);
  ok('and every family turns up', Object.keys(seen).length >= 10,
     Object.keys(seen).sort().join(', '));

  ok('and what the engine works out, the challenge agrees with', (() => {
    for (const r of MIRROR_ROWS) {
      const im = E.mirrorImage(r.f, r.u);
      if (!near(im.v, r.v, 1e-7) || !near(im.m, r.m, 1e-7)) return false;
    }
    for (const r of LENS_ROWS) {
      const im = E.lensImage(r.f, r.u);
      if (!near(im.v, r.v, 1e-7) || !near(im.m, r.m, 1e-7)) return false;
    }
    return true;
  })());
  ok('marking takes the answer written either way, and refuses the sign dropped', (() => {
    const t = { kind: 'number', answer: -30, signMatters: true, working: '' };
    return check(t, '-30').ok && check(t, '−30').ok && check(t, ' -30.00 ').ok
      && !check(t, '30').ok && check(t, '30').sign === true
      && check(t, 'banana').ok === null;
  })());
}

/* ============================================================ */
console.log('\n— what the browser remembers —');
{
  store.clear();
  ok('an empty browser starts the lab fresh', readState() === null);

  let s = initialState;
  s = reducer(s, { type: 'focal', value: -12 });
  s = reducer(s, { type: 'objectAt', value: -37 });
  s = reducer(s, { type: 'bench', value: 'refract' });
  s = reducer(s, { type: 'piece', value: 'prism' });
  s = reducer(s, { type: 'prismA', value: 55 });
  s = reducer(s, { type: 'bench', value: 'eye' });
  s = reducer(s, { type: 'defect', value: 'myopia' });
  s = reducer(s, { type: 'eye', key: 'far', value: 80 });
  writeState(s);
  const back = readState();
  ok('a set-up made across four benches comes back whole',
     back.mirror.f === -12 && back.mirror.u === -37
     && back.refract.piece === 'prism' && back.refract.A === 55
     && back.eye.defect === 'myopia' && back.eye.far === 80 && back.bench === 'eye');

  /* while a challenge is up it is the visitor's own bench that is kept */
  let c = reducer(back, { type: 'enterChallenge' });
  c = reducer(c, { type: 'loadTask', task: { family: 'x' }, patch: { mirror: { ...c.mirror, f: -33 } } });
  writeState(c);
  ok('a challenge in progress never overwrites the bench the visitor built',
     readState().mirror.f === -12);
  ok('and leaving the challenge hands that bench straight back',
     reducer(c, { type: 'leaveChallenge' }).mirror.f === -12);

  /* a reading is a measurement of one bench, and must not be read back as another's */
  {
    let r = { ...initialState, bench: 'lens' };
    for (const uu of [-30, -45, -60, -80, -120]) {
      const im = E.lensImage(r.lens.f, uu);
      r = reducer({ ...r, lens: { ...r.lens, u: uu } }, { type: 'logReading', u: uu, v: im.v });
    }
    ok('readings taken on the lens land on the lens', r.lens.readings.length === 5);
    ok('and none of them wandered onto the mirror', r.mirror.readings.length === 0);
    /* the whole point of the plot: the intercept gives f back without being told it */
    const fit = r.lens.readings.reduce((a, p) => a + (1 / p.v - 1 / p.u), 0) / 5;
    ok('and 1/v − 1/u averaged over them recovers f, which is what the graph reads off',
       near(1 / fit, r.lens.f, 1e-9), 1 / fit);

    let m = { ...initialState, bench: 'mirror' };
    for (const uu of [-30, -45, -60]) {
      const im = E.mirrorImage(m.mirror.f, uu);
      m = reducer({ ...m, mirror: { ...m.mirror, u: uu } }, { type: 'logReading', u: uu, v: im.v });
    }
    const fitM = m.mirror.readings.reduce((a, p) => a + (1 / p.v + 1 / p.u), 0) / 3;
    ok('the mirror keeps its own, and 1/v + 1/u recovers its f',
       m.mirror.readings.length === 3 && m.lens.readings.length === 0
       && near(1 / fitM, m.mirror.f, 1e-9), 1 / fitM);
    ok('clearing empties only the bench you are standing at',
       reducer(r, { type: 'clearReadings' }).lens.readings.length === 0);
    ok('and a reading that is not a number is never recorded at all',
       reducer(r, { type: 'logReading', u: -30, v: Infinity }).lens.readings.length === 5);
  }

  store.set('jahnavis-lab/optics/v1', JSON.stringify({
    v: 1, bench: 'nonsense',
    mirror: { f: 1e9, u: 55, h: 0, semi: 900, fanCount: 4.7, rays: 'sideways',
              screenX: 'left', showScreen: 'yes', readings: [{ u: null, v: 3 }] },
    lens: { f: 0, R1: 0, R2: null, n: 99, thick: -5, readings: [{ u: NaN, v: 3 }, 7, null] },
    refract: { piece: 'banana', i: 1000, n1: 0.2, n2: -3, A: 400 },
    eye: { retina: 99, defect: 'lycanthropy', far: -5, near: 1, object: 'far' },
    view: { normals: 'sort of' },
    centre: { x: 'over there', y: 1e99 }, range: -4,
    tab: 'challenge', score: 900, attempts: 3,
  }));
  const j = readState();
  ok('a bench that does not exist falls back to the mirror', j.bench === 'mirror');
  ok('a focal length longer than the bench is pulled back into range',
     Math.abs(j.mirror.f) <= 200 && Math.abs(j.mirror.f) >= 2, j.mirror.f);
  ok('an object behind the mirror is brought back in front of it', j.mirror.u < 0, j.mirror.u);
  ok('an object with no height is given one', Math.abs(j.mirror.h) > 0);
  ok('an aperture wider than the mirror is trimmed to it',
     j.mirror.semi <= SEMI_MAX && j.mirror.semi > 0, j.mirror.semi);
  ok('an even number of rays in the fan is made odd', j.mirror.fanCount % 2 === 1);
  ok('a way of drawing rays the lab has never heard of is replaced',
     ['construction', 'fan', 'both'].includes(j.mirror.rays));
  ok('a screen that is not a place goes back where it started',
     Number.isFinite(j.mirror.screenX));
  ok('a lens of zero focal length is not a lens', Math.abs(j.lens.f) >= 2);
  ok('a radius of zero is not a curve', j.lens.R1 !== 0 && j.lens.R2 !== 0);
  ok('a corrupt list of readings is dropped whole, on either bench',
     j.lens.readings.length === 0 && j.mirror.readings.length === 0);
  ok('an index below one is not a material', j.refract.n1 >= 1 && j.refract.n2 >= 1);
  ok('an angle of incidence past grazing is brought back', j.refract.i <= 89.5);
  ok('a prism too wide to be a prism is trimmed', j.refract.A <= 85 && j.refract.A >= 15);
  ok('a defect nobody has is not a defect',
     ['normal', 'myopia', 'hypermetropia'].includes(j.eye.defect));
  ok('an eyeball of impossible length is brought back to a human one',
     j.eye.retina >= 1.8 && j.eye.retina <= 3.4);
  ok('a place to look at that is not a place falls back to the origin',
     j.centre.x === 0 && Number.isFinite(j.centre.y));
  ok('a reach beyond anything the lab can draw is pulled back into range',
     j.range >= RANGE_MIN && j.range <= RANGE_MAX, j.range);
  ok('a score cannot exceed its attempts', j.score <= j.attempts, `${j.score}/${j.attempts}`);
  ok('and a challenge is never restored', j.tab === 'explore' && j.mode === 'explore');

  store.set('jahnavis-lab/optics/v1', 'not json');
  ok('unparseable storage just starts fresh', readState() === null);
  store.set('jahnavis-lab/optics/v1', '{"v":99}');
  ok('a version this lab does not know is ignored', readState() === null);
  store.clear();
  ok('and createInitialState always hands back something usable',
     createInitialState().bench === 'mirror');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
