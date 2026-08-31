/* ============================================================
   Light — the optics.

   Pure functions of state. Nothing here touches the DOM, so the
   whole of it can be run and checked headlessly, and the React
   layer only ever decides how to draw what it is handed.

   Two things live side by side in this file and they are not the
   same thing:

     the TRACER   sends a ray at a surface and applies the law of
                  reflection or Snell's law to it. It knows nothing
                  about focal lengths and has never heard of 1/v + 1/u.

     the FORMULAS are what the textbook says should happen, worked
                  out from the paraxial approximation.

   Keeping them apart is the whole point of the lab. The mirror and
   lens formulas are not laws — they are what the laws become when
   every ray stays close to the axis. Trace honestly and you can
   watch the approximation come apart: a wide mirror smears its focus
   into a caustic, and white light through a prism shows that the
   "refractive index" was never one number.

   Everything is in centimetres. Angles are radians inside and
   degrees at the edges, where a person has to read them.

   THE SIGN CONVENTION is New Cartesian, and it is not a formatting
   choice — it is the coordinate system. The pole (or the optical
   centre) sits at x = 0, light starts out travelling towards +x, and
   every distance in the readout is just the x coordinate of the thing
   it names. So u is negative because the object really is drawn to
   the left of zero, and there is no state in which the drawing and
   the arithmetic can disagree about a sign.
   ============================================================ */

/* ---------- the tolerances, and why each one is what it is ---------- */
export const EPS       = 1e-12;   /* exact algebra's idea of zero */
export const TMIN      = 1e-9;    /* cm: a ray never re-hits what it just left */
export const GRAZE     = 1e-15;   /* sin²r this close to 1 is called total reflection */
export const COS_GRAZE = 1e-9;    /* a ray this parallel to a surface is let go */
export const MAX_EVENTS = 24;     /* a trace that bounces more than this is lost */
export const R_MIN     = 2;       /* cm: below this a mirror is not a mirror */

/* ---------- numbers a person has to read ---------- */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** A number for the page: '—' for nothing, '∞' for the runaway image. */
export function num(v, dp = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
  const s = Math.abs(v) < 5e-13 ? 0 : v;              /* -0 is not a number anyone wants */
  return String(Number(s.toFixed(dp))).replace('-', '−');
}

/** The same, but the sign is the information, so it is always written. */
export function signed(v, dp = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (!isFinite(v)) return v > 0 ? '+∞' : '−∞';
  const n = Number(v.toFixed(dp));
  if (n === 0) return '0';
  return (n > 0 ? '+' : '−') + String(Math.abs(n));
}

export const deg = (r) => r * 180 / Math.PI;
export const rad = (d) => d * Math.PI / 180;
export const round2 = (v) => Math.round(v * 100) / 100;

/** Graph paper on 1, 2 or 5 times a power of ten, so the squares stay countable. */
export function niceStep(span) {
  const raw = span / 10;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
}
export const stepDecimals = (step) => Math.max(0, Math.ceil(-Math.log10(step) + 1e-9));

/* ---------- vectors, in the plane ---------- */
export const V = (x, y) => ({ x, y });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
export const dot = (a, b) => a.x * b.x + a.y * b.y;
/** The z of the cross product: which side of a you are on. */
export const crossZ = (a, b) => a.x * b.y - a.y * b.x;
export const len = (a) => Math.hypot(a.x, a.y);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function norm(a) {
  const L = Math.hypot(a.x, a.y);
  return L < EPS ? { x: 1, y: 0 } : { x: a.x / L, y: a.y / L };
}
export const fromAngle = (t) => ({ x: Math.cos(t), y: Math.sin(t) });

/* ============================================================
   THE TWO LAWS
   Everything the tracer does to a ray, it does here. Both take a
   direction and a normal and return a direction; neither knows what
   surface it is standing on or what the ray is for.
   ============================================================ */

/** The law of reflection, as one line of vector algebra. */
export const reflectDir = (d, n) => sub(d, mul(n, 2 * dot(d, n)));

/**
 * Snell's law, in vectors. `n` must face against the ray (dot(d,n) < 0)
 * and `eta` is n1/n2.
 *
 * Returns null when there is no refracted ray to be had — and that IS
 * the condition for total internal reflection, so nothing that calls
 * this has to know the critical angle to find it. The angle falls out
 * of the algebra rather than being tested for.
 */
export function refractDir(d, n, eta) {
  const ci = -dot(d, n);
  const s2 = eta * eta * (1 - ci * ci);
  if (s2 > 1 - GRAZE) return null;
  return norm(add(mul(d, eta), mul(n, eta * ci - Math.sqrt(1 - s2))));
}

/** Where refraction gives out, going from n1 into a rarer n2. */
export const criticalAngle = (n1, n2 = 1) => (n1 <= n2 ? null : Math.asin(n2 / n1));

/** Snell for a single angle, which is what the working-out is written from. */
export function snellAngle(i, n1, n2) {
  const s = n1 * Math.sin(i) / n2;
  return Math.abs(s) > 1 ? null : Math.asin(s);
}

/* ============================================================
   SURFACES, AND WHERE A RAY MEETS ONE

   Two kinds, and only two: a straight segment and an arc of a
   circle. A plane mirror is a segment; a spherical mirror and each
   face of a lens are arcs; the faces of a slab and a prism are
   segments; a screen or a retina is a segment that stops the light.

   Every surface carries a normal direction it calls its own, and
   the two materials either side of it — `mOut` on the side the
   normal points to, `mIn` on the other. That is the only place the
   answer to "what am I going into?" is written down, so a bench
   built with its media the wrong way round is caught by one check
   rather than by a wrong picture.
   ============================================================ */

/** A material: a plain number, or Cauchy's two constants for one that disperses. */
export const indexAt = (m, wl = 589.3) =>
  (typeof m === 'number' ? m : m.A + m.B / (wl * wl));

export function segment({ id, a, b, act = 'refract', mOut = 1, mIn = 1, tag }) {
  const e = sub(b, a);
  return { id, kind: 'seg', a, b, e, nGeom: norm(V(-e.y, e.x)), act, mOut, mIn, tag };
}

/**
 * An arc, given the vertex it is centred on rather than by angles —
 * which is how an optician thinks of it, and how the sign convention
 * writes it: the centre of curvature sits at `vertex + R`, so a
 * negative R really does put it on the near side.
 */
export function arc({ id, vx, R, semi, act = 'mirror', mOut = 1, mIn = 1, tag }) {
  const rho = Math.abs(R);
  const c = V(vx + R, 0);
  return {
    id, kind: 'arc', c, rho, R,
    axis: V(-Math.sign(R), 0),                 /* centre → vertex */
    cosHalf: Math.cos(Math.asin(clamp(semi / rho, 0, 1))),
    semi, vx, act, mOut, mIn, tag,
  };
}

/**
 * The two roots of |o + t d − c|² = ρ², written so that the far one
 * does not lose its digits. Solving the quadratic the schoolbook way
 * subtracts two nearly equal numbers whenever the ray starts a long
 * way from the sphere — which on an optical bench is most of the time.
 */
export function rayCircle(o, d, c, rho) {
  const m = sub(o, c);
  const b = dot(m, d);
  const c0 = dot(m, m) - rho * rho;
  const disc = b * b - c0;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  const q = -(b + (b >= 0 ? sq : -sq));
  const t1 = q;
  const t2 = Math.abs(q) < EPS ? -b + sq : c0 / q;
  return t1 <= t2 ? [t1, t2] : [t2, t1];
}

/** Where a ray crosses a segment, and how far along it (0…1). */
export function raySegment(o, d, a, b) {
  const e = sub(b, a);
  const den = crossZ(d, e);
  if (Math.abs(den) < EPS) return null;              /* running alongside it */
  const w = sub(o, a);
  const t = -crossZ(w, e) / den;
  const s = crossZ(d, w) / den;
  if (t < TMIN || s < -1e-12 || s > 1 + 1e-12) return null;
  return { t, s };
}

/** The nearest place ahead of the ray where this surface actually is. */
export function hit(o, d, surf) {
  /* a screen only catches the light coming back off the mirror; it is not
     also a wall standing in front of the object */
  if (surf.dirn && Math.sign(d.x) !== surf.dirn) return null;
  if (surf.kind === 'seg') {
    const r = raySegment(o, d, surf.a, surf.b);
    return r ? { t: r.t, p: add(o, mul(d, r.t)), n: surf.nGeom, surf } : null;
  }
  for (const t of rayCircle(o, d, surf.c, surf.rho)) {
    if (t < TMIN) continue;
    const p = add(o, mul(d, t));
    const rvec = mul(sub(p, surf.c), 1 / surf.rho);
    /* is it on the cap, or round the back of the sphere where no glass is? */
    if (dot(rvec, surf.axis) < surf.cosHalf - 1e-12) continue;
    return { t, p, n: rvec, surf };
  }
  return null;
}

/* ============================================================
   THE TRACER

   One ray, a list of surfaces, and the two laws. It has no idea what
   any of the surfaces are for; it applies reflection or Snell at
   whatever it meets and keeps going until the light leaves, is
   stopped, or has bounced more times than any real bench would.
   ============================================================ */
export function trace(bench, ray0, box) {
  const B = box || bench.box;
  const wl = ray0.wl || 589.3;
  let o = ray0.o;
  let d = norm(ray0.d);
  let medium = ray0.medium === undefined ? 1 : ray0.medium;

  const vertices = [o];
  const events = [];
  let end = 'lost';

  for (let step = 0; step < MAX_EVENTS; step++) {
    let best = null;
    for (const s of bench.surfaces) {
      const h = hit(o, d, s);
      if (h && (!best || h.t < best.t)) best = h;
    }

    if (!best) { vertices.push(exitBox(o, d, B)); end = 'escaped'; break; }

    const surf = best.surf;
    /* the normal, turned to face the ray, which is what both laws want */
    const facing = dot(d, best.n) < 0 ? best.n : mul(best.n, -1);
    /* the surface's own outward normal: fixed for a segment, radial for an arc */
    const nOwn = surf.kind === 'seg' ? surf.nGeom : best.n;
    const fromOut = dot(d, nOwn) < 0;
    const n1 = indexAt(fromOut ? surf.mOut : surf.mIn, wl);
    const n2 = indexAt(fromOut ? surf.mIn : surf.mOut, wl);
    const ci = -dot(d, facing);

    vertices.push(best.p);
    o = best.p;

    if (surf.act === 'stop') {
      events.push({ kind: 'stop', at: best.p, surf: surf.id, tag: surf.tag });
      end = 'absorbed'; break;
    }
    if (ci < COS_GRAZE) {                       /* grazing: let it go rather than guess */
      events.push({ kind: 'graze', at: best.p, surf: surf.id });
      vertices.push(exitBox(o, d, B)); end = 'grazed'; break;
    }

    if (surf.act === 'mirror') {
      const dIn = d;
      d = reflectDir(d, facing);
      events.push({ kind: 'reflect', at: best.p, surf: surf.id, tag: surf.tag, med: medium,
                    n: facing, i: Math.acos(clamp(ci, -1, 1)), dIn, dOut: d, n1, n2 });
      continue;
    }

    /* refracting: Snell decides, and its failure is the total reflection */
    const dIn = d;
    const t = refractDir(d, facing, n1 / n2);
    if (t === null) {
      d = reflectDir(d, facing);
      events.push({ kind: 'tir', at: best.p, surf: surf.id, tag: surf.tag, med: medium,
                    n: facing, i: Math.acos(clamp(ci, -1, 1)), dIn, dOut: d, n1, n2 });
      continue;
    }
    d = t;
    const was = medium;
    medium = n2;
    events.push({ kind: 'refract', at: best.p, surf: surf.id, tag: surf.tag, med: was,
                  n: facing, i: Math.acos(clamp(ci, -1, 1)),
                  r: Math.acos(clamp(-dot(d, facing), -1, 1)), dIn, dOut: d, n1, n2 });
  }

  return { vertices, events, end, d, medium, wl };
}

/** Where a ray that meets nothing leaves the drawing. */
export function exitBox(o, d, box) {
  let t = Infinity;
  if (Math.abs(d.x) > EPS) {
    const tx = ((d.x > 0 ? box.x1 : box.x0) - o.x) / d.x;
    if (tx > 0) t = Math.min(t, tx);
  }
  if (Math.abs(d.y) > EPS) {
    const ty = ((d.y > 0 ? box.y1 : box.y0) - o.y) / d.y;
    if (ty > 0) t = Math.min(t, ty);
  }
  if (!isFinite(t)) t = 1;
  return add(o, mul(d, t));
}

/** Where a traced path last crosses the axis, and heading which way. */
export function axisCrossing(path) {
  const v = path.vertices;
  for (let i = v.length - 1; i > 0; i--) {
    const a = v[i - 1], b = v[i];
    if ((a.y > 0) === (b.y > 0) || Math.abs(b.y - a.y) < EPS) continue;
    return a.x + (b.x - a.x) * (0 - a.y) / (b.y - a.y);
  }
  return null;
}

/* ============================================================
   THE FORMULAS

   What the textbook says, worked out from the paraxial
   approximation — every one of them a limit of what the tracer
   above does, and none of them consulted by it.

   New Cartesian throughout: u is negative because the object is at
   negative x; f is negative for a concave mirror because its focus
   is; f is positive for a converging lens because its is.
   ============================================================ */

/** True when a denominator is about to vanish — tested on the numerator,
    at the scale of the numbers involved, so it holds for f = 2 and f = 200. */
const atFocus = (a, b) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));

/**
 * A mirror.  1/v + 1/u = 1/f,  m = −v/u,  f = R/2.
 * f = 0 is the sentinel for a plane mirror, whose focus is at infinity.
 */
export function mirrorImage(f, u, h = 1) {
  if (f === 0 || !isFinite(f)) {
    return { v: -u, m: 1, hp: h, f, u, h, plane: true, real: false, erect: true };
  }
  if (atFocus(u, f)) {
    return { v: Infinity, m: Infinity, hp: Infinity, f, u, h, atFocus: true,
             real: false, erect: true };
  }
  const v = f * u / (u - f);
  const m = -v / u;
  return { v, m, hp: m * h, f, u, h, real: v < 0, erect: m > 0 };
}

/**
 * A lens.  1/v − 1/u = 1/f,  m = v/u.
 * The sign between the terms is the whole difference, and it is not
 * arbitrary: a mirror sends the light back the way it came, so image and
 * object are measured in the same direction; a lens sends it on through,
 * so they are measured in opposite ones.
 */
export function lensImage(f, u, h = 1) {
  if (atFocus(u, -f)) {
    return { v: Infinity, m: Infinity, hp: Infinity, f, u, h, atFocus: true,
             real: false, erect: true };
  }
  const v = f * u / (u + f);
  const m = v / u;
  return { v, m, hp: m * h, f, u, h, real: v > 0, erect: m > 0 };
}

/** Power in dioptres, from a focal length in centimetres. */
export const dioptres = (fcm) => (fcm === 0 || !isFinite(fcm) ? 0 : 100 / fcm);
export const focalFromPower = (P) => (Math.abs(P) < 1e-9 ? Infinity : 100 / P);

/** The lens maker's formula — thin when d is left out, thick when it is not. */
export function lensMaker(n, R1, R2, d = 0) {
  const thin = (n - 1) * (1 / R1 - 1 / R2);
  const inv = thin + (n - 1) * (n - 1) * d / (n * R1 * R2);
  return { f: 1 / inv, fThin: 1 / thin, inv };
}

/** How far behind the back face the focus actually is, for a lens with body. */
export function backFocal(n, R1, R2, d) {
  const { f } = lensMaker(n, R1, R2, d);
  return f * (1 - (n - 1) * d / (n * R1));
}

/** One spherical refracting surface:  n2/v − n1/u = (n2 − n1)/R. */
export function surfaceImage(n1, n2, R, u) {
  const inv = (n2 - n1) / R + n1 / u;
  return Math.abs(inv) < 1e-15 ? Infinity : n2 / inv;
}

/* ---------- a prism ---------- */
export function prismDeviation(A, n, i1) {
  const r1 = snellAngle(i1, 1, n);
  if (r1 === null) return null;
  const r2 = A - r1;
  const i2 = snellAngle(r2, n, 1);
  if (i2 === null) return { tir: true, r1, r2, D: null };
  return { D: i1 + i2 - A, i1, i2, r1, r2, tir: false };
}

/** The symmetric passage, where the deviation is least. */
export function minDeviation(A, n) {
  const s = n * Math.sin(A / 2);
  if (s > 1) return null;                       /* nothing gets through at all */
  const i = Math.asin(s);
  return { D: 2 * i - A, i1: i, i2: i, r1: A / 2, r2: A / 2 };
}

/** Reading the index off the prism, which is how it is really measured. */
export const muFromPrism = (A, Dmin) => Math.sin((A + Dmin) / 2) / Math.sin(A / 2);

/** A thin prism barely deviates, and by an angle that has forgotten about i. */
export const thinPrism = (A, n) => (n - 1) * A;

/* ---------- a slab, and looking into water ---------- */
export function lateralShift(t, i, n) {
  const r = snellAngle(i, 1, n);
  if (r === null) return 0;
  return t * Math.sin(i - r) / Math.cos(r);
}
export const apparentDepth = (real, n) => real / n;

/* ---------- colour ---------- */
/** Cauchy's relation, fitted so yellow sodium light gets the index asked for. */
export function cauchyFor(n589, B = 4200) {
  return { A: n589 - B / (589.3 * 589.3), B };
}
export const SPECTRUM = [
  { name: 'violet', wl: 410, cls: 'spec-violet' },
  { name: 'indigo', wl: 445, cls: 'spec-indigo' },
  { name: 'blue',   wl: 475, cls: 'spec-blue' },
  { name: 'green',  wl: 510, cls: 'spec-green' },
  { name: 'yellow', wl: 570, cls: 'spec-yellow' },
  { name: 'orange', wl: 600, cls: 'spec-orange' },
  { name: 'red',    wl: 650, cls: 'spec-red' },
];

/* ---------- the eye ---------- */
/** What the eye must supply to put an object `dObj` cm in front onto its retina. */
export const eyePower = (retina, dObj) =>
  100 / retina + (isFinite(dObj) ? 100 / dObj : 0);

/** The spectacle that moves a defective far or near point back where it belongs. */
export function specPower({ defect, far, near }) {
  if (defect === 'myopia') return isFinite(far) ? -100 / far : 0;
  if (defect === 'hypermetropia') return 4 - 100 / near;
  return 0;
}

/* ---------- materials the bench knows by name ---------- */
export const MATERIALS = [
  { id: 'air',      name: 'Air',         sub: 'very nearly nothing',          n: 1.0003 },
  { id: 'ice',      name: 'Ice',         sub: 'frozen water',                 n: 1.31 },
  { id: 'water',    name: 'Water',       sub: 'the everyday one',             n: 1.33 },
  { id: 'oil',      name: 'Olive oil',   sub: 'thicker than water',           n: 1.47 },
  { id: 'crown',    name: 'Crown glass', sub: 'ordinary laboratory glass',    n: 1.52 },
  { id: 'flint',    name: 'Flint glass', sub: 'heavier, spreads colour more', n: 1.62 },
  { id: 'sapphire', name: 'Sapphire',    sub: 'a hard, clear crystal',        n: 1.77 },
  { id: 'diamond',  name: 'Diamond',     sub: 'the highest there is, nearly', n: 2.42 },
];

/* ============================================================
   THE BENCHES

   Each one turns the controls into a list of surfaces the tracer
   can be pointed at. Which side of a face the glass is on is never
   worked out by hand — `body()` asks the geometry, by stepping a
   whisker along the normal and seeing whether it lands inside the
   shape. Getting that backwards is the classic way to build a prism
   that refracts the wrong way, and this makes it unbuildable.
   ============================================================ */

const inPolygon = (p, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

/** A solid piece of glass, as the polygon that bounds it. */
export function body(poly, nGlass, tag, id0 = 0) {
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const s = segment({ id: id0 + i, a, b, act: 'refract', tag });
    const mid = mul(add(a, b), 0.5);
    const glassSide = inPolygon(add(mid, mul(s.nGeom, 1e-6)), poly);
    return glassSide ? { ...s, mOut: nGlass, mIn: 1 } : { ...s, mOut: 1, mIn: nGlass };
  });
}

/** One curved face of a lens, with the glass on the side you say it is. */
function face({ id, vx, R, semi, glassDir, nGlass, tag }) {
  const a = arc({ id, vx, R, semi, act: 'refract', tag });
  const normalX = -Math.sign(R);
  return normalX === glassDir
    ? { ...a, mOut: nGlass, mIn: 1 }
    : { ...a, mOut: 1, mIn: nGlass };
}

const boxFor = (halfX, halfY) => ({ x0: -halfX, x1: halfX, y0: -halfY, y1: halfY });

/** A mirror at the origin: an arc, or a flat segment when f is 0. */
export function mirrorBench(s) {
  const surfaces = [];
  if (s.f === 0 || !isFinite(s.f)) {
    surfaces.push(segment({ id: 0, a: V(0, -s.semi), b: V(0, s.semi),
                            act: 'mirror', tag: 'mirror' }));
  } else {
    surfaces.push(arc({ id: 0, vx: 0, R: 2 * s.f, semi: s.semi,
                        act: 'mirror', tag: 'mirror' }));
  }
  if (s.showScreen) {
    surfaces.push({
      ...segment({ id: 1, a: V(s.screenX, -s.screenH || -12), b: V(s.screenX, s.screenH || 12),
                   act: 'stop', tag: 'screen' }),
      dirn: -1,                     /* it catches the light coming back, not the light going */
    });
  }
  return { surfaces, box: boxFor(s.halfX || 400, s.halfY || 200), kind: 'mirror' };
}

/** Where a spherical face sits at a given height above the axis. */
export const faceX = (vx, R, y) =>
  vx + R - Math.sign(R) * Math.sqrt(Math.max(0, R * R - y * y));

/** How much glass there is at the rim — negative means no such lens can be ground. */
export const edgeThickness = (R1, R2, d, semi) =>
  faceX(d / 2, R2, semi) - faceX(-d / 2, R1, semi);

/**
 * The widest this lens can be and still exist. A biconvex lens runs out of
 * body at the rim long before it runs out of sphere, and asking for more
 * aperture than that is asking for a lens whose two faces have crossed.
 */
export function maxSemi(R1, R2, d, want) {
  const cap = Math.min(Math.abs(R1), Math.abs(R2)) * 0.98;
  let hi = Math.min(want, cap);
  if (edgeThickness(R1, R2, d, hi) >= 0.02) return hi;
  let lo = 0;
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2;
    if (edgeThickness(R1, R2, d, m) >= 0.02) lo = m; else hi = m;
  }
  return lo;
}

/**
 * A lens: two curved faces, and the rim that joins them.
 *
 * The rim is not decoration. Without it a ray can enter the front face, find
 * nothing to leave by, and escape still believing itself to be inside glass —
 * which is exactly the sort of quiet inconsistency the corpus check exists to
 * catch, and it caught this one.
 */
export function lensBench(s) {
  const d = s.thick;
  const nG = s.disperse ? cauchyFor(s.n) : s.n;
  const semi = maxSemi(s.R1, s.R2, d, s.semi);
  const xF = faceX(-d / 2, s.R1, semi);
  const xB = faceX(d / 2, s.R2, semi);
  const rim = (id, y, a, b) => {
    const seg = segment({ id, a, b, act: 'refract', tag: 'rim' });
    /* the normal of a left-to-right segment points away from the axis, into the air */
    return seg.nGeom.y * y > 0 ? { ...seg, mOut: 1, mIn: nG } : { ...seg, mOut: nG, mIn: 1 };
  };
  const surfaces = [
    face({ id: 0, vx: -d / 2, R: s.R1, semi, glassDir: 1, nGlass: nG, tag: 'front' }),
    face({ id: 1, vx: d / 2, R: s.R2, semi, glassDir: -1, nGlass: nG, tag: 'back' }),
    rim(2, semi, V(xF, semi), V(xB, semi)),
    rim(3, -semi, V(xF, -semi), V(xB, -semi)),
  ];
  if (s.showScreen) {
    surfaces.push({
      ...segment({ id: 2, a: V(s.screenX, -(s.screenH || 12)), b: V(s.screenX, s.screenH || 12),
                   act: 'stop', tag: 'screen' }),
      dirn: 1,
    });
  }
  return { surfaces, semi, xF, xB,
           box: boxFor(s.halfX || 400, s.halfY || 200), kind: 'lens' };
}

/** One flat boundary, with the normal lying along the bench. */
export function interfaceBench(s) {
  const H = s.halfY || 60;
  const nA = s.disperse ? cauchyFor(s.n1) : s.n1;
  const nB = s.disperse ? cauchyFor(s.n2) : s.n2;
  const seg = segment({ id: 0, a: V(0, -H), b: V(0, H), act: 'refract', tag: 'face' });
  /* the normal of a bottom-to-top segment points along −x, into the near side */
  const s0 = seg.nGeom.x < 0 ? { ...seg, mOut: nA, mIn: nB } : { ...seg, mOut: nB, mIn: nA };
  /* light on this bench starts on the near side, which may not be air */
  return { surfaces: [s0], box: boxFor(s.halfX || 60, H), kind: 'interface',
           startMedium: indexAt(nA) };
}

/** A rectangular block: in one face and out of the other, parallel but moved along. */
export function slabBench(s) {
  const t = s.thickness, H = s.height || 20;
  const nG = s.disperse ? cauchyFor(s.n) : s.n;
  const poly = [V(-t / 2, -H / 2), V(t / 2, -H / 2), V(t / 2, H / 2), V(-t / 2, H / 2)];
  return { surfaces: body(poly, nG, 'slab'), poly,
           box: boxFor(s.halfX || 60, s.halfY || 40), kind: 'slab' };
}

/** A prism, apex up, sitting on its base. */
export function prismBench(s) {
  const A = rad(s.A), L = s.side || 22;
  const nG = s.disperse ? cauchyFor(s.n) : s.n;
  const yTop = L * Math.cos(A / 2) / 2;
  const apex = V(0, yTop);
  const bl = V(-L * Math.sin(A / 2), yTop - L * Math.cos(A / 2));
  const br = V(L * Math.sin(A / 2), yTop - L * Math.cos(A / 2));
  const poly = [apex, br, bl];
  return { surfaces: body(poly, nG, 'prism'), poly, apex, A,
           box: boxFor(s.halfX || 70, s.halfY || 45), kind: 'prism' };
}

/**
 * An eye: one thin lens standing in for the cornea and lens together,
 * and a retina that stops whatever reaches it. The spectacle, when it
 * is worn, is a second thin lens in front — and because the two are
 * effectively in contact, their powers simply add.
 */
export function eyeBench(s) {
  const P = s.power + (s.wearing ? s.spec : 0);
  const f = focalFromPower(P);
  return {
    surfaces: [{
      ...segment({ id: 1, a: V(s.retina, -s.eyeR || -1.2), b: V(s.retina, s.eyeR || 1.2),
                   act: 'stop', tag: 'retina' }),
      dirn: 1,
    }],
    thin: { x: 0, f, power: P, semi: s.semi || 1.1 },
    box: boxFor(s.halfX || 60, s.halfY || 20), kind: 'eye',
  };
}

/* ============================================================
   RAYS

   Two quite different things get drawn, and the lab is careful to
   keep them apart because their disagreement is the lesson.

   The CONSTRUCTION rays are the paraxial ones a pupil draws with a
   ruler. They are worked out from the formula, and they bend at the
   plane through the pole — NOT at the curved surface. That is not a
   cheat: it is what the thin-element approximation says, and drawing
   them off the true arc would make them miss the point the formula
   puts the image at, so the picture would contradict the working.

   The TRACED rays are the honest ones. They meet the real surface,
   obey the real law, and are under no obligation to agree.
   ============================================================ */

/** Point the line P→Q whichever way has x running the way we want. */
function along(P, Q, wantX) {
  const d = norm(sub(Q, P));
  return Math.sign(d.x) === Math.sign(wantX) ? d : mul(d, -1);
}
const toBox = (P, d, box) => exitBox(P, d, box);
/** Where the line through P in direction d crosses the plane of the element. */
const atPlane = (P, d) => (Math.abs(d.x) < EPS ? null : add(P, mul(d, (0 - P.x) / d.x)));

/**
 * The standard construction, for a mirror or a lens.
 * Each ray comes back as where it starts, where it bends, which way it
 * goes on, and — when the image is virtual — the dashed line back to
 * where the light only appears to have come from.
 */
export function constructionRays(kind, f, u, h, box) {
  const O = V(u, h);
  const rays = [];
  const push = (id, label, P, dOut) => {
    if (!P || !dOut) return;
    rays.push({ id, label, from: O, at: P, to: toBox(P, dOut, box),
                back: toBox(P, mul(dOut, -1), box) });
  };

  if (kind === 'mirror') {
    const wantX = -1;                                  /* it all comes back leftwards */
    const F = V(f, 0), C = V(2 * f, 0);
    push('parallel', 'parallel in, through the focus out', V(0, h), along(V(0, h), F, wantX));
    const pF = atPlane(O, norm(sub(F, O)));
    push('focus', 'through the focus in, parallel out', pF, V(-1, 0));
    const pC = atPlane(O, norm(sub(C, O)));
    if (pC) push('centre', 'through the centre, straight back',
                 pC, mul(norm(sub(pC, O)), -1));
    const dIn = norm(sub(V(0, 0), O));
    push('pole', 'to the pole, equal angles about the axis',
         V(0, 0), V(-dIn.x, dIn.y));
  } else {
    const wantX = 1;                                   /* it carries on rightwards */
    const F2 = V(f, 0), F1 = V(-f, 0);
    push('parallel', 'parallel in, through the far focus out',
         V(0, h), along(V(0, h), F2, wantX));
    push('centre', 'through the optical centre, straight on',
         V(0, 0), norm(sub(V(0, 0), O)));
    const pF = atPlane(O, along(O, F1, wantX));
    push('focus', 'through the near focus in, parallel out', pF, V(1, 0));
  }
  return rays;
}

/**
 * How tall the element would have to be for the WHOLE construction to be real
 * light rather than pencil.
 *
 * The two heights that matter fall straight out of the geometry: the parallel
 * ray crosses the element at h, and the ray through the focus crosses it at
 * h·m — which is to say at the image height, because it leaves parallel at that
 * height and so must have arrived there. Magnify hard enough and that is taller
 * than any lens you would ever grind, which is exactly why the construction is a
 * construction: a small lens still forms the whole image, only fainter, because
 * every point of the object sends it a cone and it catches the middle of each.
 */
export function constructionReach(kind, f, u, h) {
  if (!isFinite(f) || f === 0) return Math.abs(h);
  const m = kind === 'mirror' ? f / (f - u) : f / (u + f);
  const hs = [Math.abs(h), Math.abs(h * m)];
  if (kind === 'mirror') hs.push(Math.abs(2 * h * f / (2 * f - u)));
  const finite = hs.filter((v) => isFinite(v));
  return finite.length ? Math.max(...finite) : Math.abs(h);
}

/** A fan of real rays from a point, spread across the whole aperture. */
export function fanRays(from, semi, count, box) {
  const out = [];
  const n = Math.max(2, count | 0);
  for (let i = 0; i < n; i++) {
    const y = semi * (n === 1 ? 0 : -1 + (2 * i) / (n - 1));
    out.push({ o: from, d: norm(sub(V(0, y), from)), h: y });
  }
  return out;
}
