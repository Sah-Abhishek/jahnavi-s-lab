/* ============================================================
   Reflection — the mathematics, with no DOM in sight.

   One idea runs through the whole lab, in two dimensions and in
   three: the mirror is the perpendicular bisector of the join.
   Drop a perpendicular from the point to the mirror, keep going
   the same distance again, and you have arrived at the image.

       foot   M = P − t n
       image  P′ = P − 2t n          where  t = (n·P + c) / (n·n)

   In 2D the mirror is a line and n is its normal (a, b).
   In 3D a plane behaves exactly the same way with n = (a, b, c) —
   which is why the code below is one formula, not two.

   A line in 3D is the odd one out. It is not a mirror at all: the
   "image" is the point spun half a turn about the line, and it
   flips two directions instead of one. The lab shows both so the
   difference can be seen rather than asserted.
   ============================================================ */

export const EPS = 1e-9;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- vectors ---------- */
export const V = (x, y, z = 0) => ({ x, y, z });
export const addV = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const subV = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scaleV = (a, f) => ({ x: a.x * f, y: a.y * f, z: a.z * f });
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const lenV = (a) => Math.sqrt(dot(a, a));
export const normV = (a) => { const L = lenV(a); return L < EPS ? V(0, 0, 0) : scaleV(a, 1 / L); };
export const sameV = (a, b, tol = 1e-7) => lenV(subV(a, b)) <= tol;

/* ============================================================
   WRITING NUMBERS DOWN
   The lab is a maths lab, so it uses a real minus sign, and says
   3/2 where 3/2 is meant instead of 1.5000000000000002.
   ============================================================ */

/** A number with no tail of zeros, and a typographic minus. */
export function num(v, dp = 4) {
  if (!isFinite(v)) return '—';
  let t = (Math.round(v * 10 ** dp) / 10 ** dp).toFixed(dp)
    .replace(/0+$/, '').replace(/\.$/, '');
  if (t === '-0') t = '0';
  return t.replace('-', '−');
}

/** p/q when the number really is one, with a small denominator. */
export function fracText(v, maxDen = 16) {
  if (!isFinite(v)) return '—';
  if (Math.abs(v - Math.round(v)) < 1e-9) return num(Math.round(v));
  for (let d = 2; d <= maxDen; d++) {
    const n = v * d;
    if (Math.abs(n - Math.round(n)) < 1e-9) return `${num(Math.round(n))}/${d}`;
  }
  return num(v, 3);
}

/** "(3, −4)" or "(3, −4, 5)". The drawing asks for fewer decimals than the
    working out does, so that a label never grows longer than the graph. */
export const ptText = (p, three = false, dp = 4) =>
  `(${num(p.x, dp)}, ${num(p.y, dp)}${three ? `, ${num(p.z, dp)}` : ''})`;

/** A substitution written the way it would be by hand: "3(5) − 4(−2) + 5",
    never "3(5) + −4(−2) + 5". */
export function substituted(coeffs, values, constant) {
  let out = '';
  coeffs.forEach((v, i) => {
    const body = `${num(Math.abs(v))}(${num(values[i])})`;
    out += out ? ` ${v < 0 ? '−' : '+'} ${body}` : (v < 0 ? '−' : '') + body;
  });
  if (constant !== undefined) out += ` ${constant < 0 ? '−' : '+'} ${num(Math.abs(constant))}`;
  return out;
}

/** "3² + (−4)²" — the brackets matter, because −4² is something else. */
export const squares = (coeffs) =>
  coeffs.map((v) => (v < 0 ? `(${num(v)})²` : `${num(v)}²`)).join(' + ');

/** Terms strung together with the right signs: "3x − 4y + 5 = 0". */
export function generalText(coeffs, names) {
  let out = '';
  coeffs.forEach((v, i) => {
    if (Math.abs(v) < EPS) return;
    const mag = fracText(Math.abs(v));
    const nm = names[i];
    const body = nm ? (mag === '1' ? nm : `${mag}${nm}`) : mag;
    if (!out) out = (v < 0 ? '−' : '') + body;
    else out += ` ${v < 0 ? '−' : '+'} ${body}`;
  });
  return `${out || '0'} = 0`;
}

/* ============================================================
   READING AN EQUATION
   A small recursive-descent parser over linear expressions. It
   accepts every form a pupil is likely to write — y = 2x + 1,
   x = −2, 3x − 4y + 5 = 0, 2(x + 1) = y − x/2 — and refuses,
   with a reason, anything that is not a straight line.
   ============================================================ */

const VARS = ['x', 'y', 'z'];
const ZERO = () => ({ x: 0, y: 0, z: 0, k: 0 });

function tokenize(src) {
  const s = String(src).replace(/−/g, '-').replace(/[·×*]/g, '*');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const text = s.slice(i, j);
      const v = Number(text);
      if (!isFinite(v)) throw new Error(`"${text}" is not a number`);
      out.push({ t: 'num', v });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) { out.push({ t: 'var', v: ch.toLowerCase() }); i++; continue; }
    if ('+-*/()='.includes(ch)) { out.push({ t: ch }); i++; continue; }
    throw new Error(`"${ch}" does not belong in an equation`);
  }
  return out;
}

const isConst = (u) => VARS.every((v) => Math.abs(u[v]) < EPS);
const addLin = (u, w, s) => ({ x: u.x + s * w.x, y: u.y + s * w.y, z: u.z + s * w.z, k: u.k + s * w.k });
const scaleLin = (u, f) => ({ x: u.x * f, y: u.y * f, z: u.z * f, k: u.k * f });

function mulLin(u, w) {
  if (isConst(u)) return scaleLin(w, u.k);
  if (isConst(w)) return scaleLin(u, w.k);
  throw new Error('two unknowns multiplied together — that is a curve, not a straight line');
}

/** Parse one side of an equation into its x, y, z and constant parts. */
function parseSide(tokens, allowed) {
  let i = 0;
  const peek = () => tokens[i];
  const eat = (t) => (tokens[i] && tokens[i].t === t ? (i++, true) : false);
  const startsFactor = () => {
    const t = peek();
    return !!t && (t.t === 'num' || t.t === 'var' || t.t === '(');
  };

  function factor() {
    const t = peek();
    if (!t) throw new Error('the equation stops in the middle');
    if (t.t === 'num') { i++; return { ...ZERO(), k: t.v }; }
    if (t.t === 'var') {
      i++;
      if (!allowed.includes(t.v)) {
        throw new Error(`there is no "${t.v}" in this kind of equation`);
      }
      return { ...ZERO(), [t.v]: 1 };
    }
    if (t.t === '(') {
      i++;
      const inner = expr();
      if (!eat(')')) throw new Error('a bracket is left open');
      return inner;
    }
    if (t.t === '-') { i++; return scaleLin(factor(), -1); }
    if (t.t === '+') { i++; return factor(); }
    throw new Error(`"${t.t}" is out of place`);
  }

  function term() {
    let u = factor();
    for (;;) {
      if (eat('*')) u = mulLin(u, factor());
      else if (eat('/')) {
        const w = factor();
        if (!isConst(w)) throw new Error('dividing by an unknown would not leave a straight line');
        if (Math.abs(w.k) < EPS) throw new Error('that divides by zero');
        u = scaleLin(u, 1 / w.k);
      } else if (startsFactor()) u = mulLin(u, factor());   /* 2x, 3(x + 1) */
      else break;
    }
    return u;
  }

  function expr() {
    let u = term();
    for (;;) {
      if (eat('+')) u = addLin(u, term(), 1);
      else if (eat('-')) u = addLin(u, term(), -1);
      else break;
    }
    return u;
  }

  const out = expr();
  if (i < tokens.length) throw new Error('there is something left over at the end');
  return out;
}

/** Read "left = right" and return left − right, as coefficients.
    A bare expression with no = is read as "= 0", which is what
    someone typing "3x − 4y + 5" almost certainly means. */
export function parseLinearEquation(text, allowed) {
  if (!text || !String(text).trim()) throw new Error('type an equation first');
  const tokens = tokenize(text);
  const sides = [[]];
  for (const t of tokens) {
    if (t.t === '=') sides.push([]);
    else sides[sides.length - 1].push(t);
  }
  if (sides.length > 2) throw new Error('an equation can only have one = sign');
  const left = parseSide(sides[0], allowed);
  const right = sides.length === 2 ? parseSide(sides[1], allowed) : ZERO();
  return addLin(left, right, -1);
}

/* ============================================================
   TIDYING COEFFICIENTS
   x/2 + y/3 = 1 and 3x + 2y − 6 = 0 are the same line. The lab
   stores one of them, so two lines that are equal look equal.
   ============================================================ */

const gcdInt = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };

/** Try to write one scaling of these coefficients as whole numbers
    with no common factor. Returns null if none of the denominators fit. */
function asIntegers(arr, cap) {
  for (const den of [1, 2, 3, 4, 5, 6, 8, 9, 10, 12]) {
    const s = arr.map((v) => v * den);
    if (s.every((v) => Math.abs(v - Math.round(v)) < 1e-6 && Math.abs(v) <= cap)) {
      let ints = s.map((v) => Math.round(v));
      let g = 0;
      for (const v of ints) g = gcdInt(g, v);
      if (g > 1) ints = ints.map((v) => v / g);
      return ints;
    }
  }
  return null;
}

/** The same ratio, written as small whole numbers when it is one.

    A line dragged across the graph arrives as coefficients like
    11.28 : −15.04 : 18.8. That IS 3 : −4 : 5, but no whole-number
    multiple of it lands on integers — so each coefficient is tried
    in turn as the one to divide through by, which finds it. */
export function tidyCoeffs(arr) {
  if (!arr.every((v) => isFinite(v))) return arr.slice();
  const cap = 400;
  const direct = asIntegers(arr, cap);
  if (direct) return direct;
  /* biggest first: dividing through by a near-zero coefficient would
     blow the others up past the cap before they could be recognised */
  const scales = arr.map(Math.abs).filter((v) => v > 1e-9).sort((p, q) => q - p);
  for (const s of scales) {
    const got = asIntegers(arr.map((v) => v / s), cap);
    if (got) return got;
  }
  return arr.slice();
}

/** The same line, written the one agreed way: whole numbers where
    possible, and the first non-zero normal coefficient positive. */
export function tidyLine({ a, b, c }) {
  let [A, B, C] = tidyCoeffs([a, b, c]);
  const lead = Math.abs(A) > EPS ? A : B;
  if (lead < 0) { A = -A; B = -B; C = -C; }
  return { a: A, b: B, c: C };
}

export function tidyPlane({ a, b, c, d }) {
  let [A, B, C, D] = tidyCoeffs([a, b, c, d]);
  const lead = Math.abs(A) > EPS ? A : (Math.abs(B) > EPS ? B : C);
  if (lead < 0) { A = -A; B = -B; C = -C; D = -D; }
  return { a: A, b: B, c: C, d: D };
}

/* ============================================================
   THE MIRROR LINE, IN TWO DIMENSIONS
   Held as a x + b y + c = 0, which can say "x = 3" — something
   y = m x + c can never do, and every vertical mirror needs.
   ============================================================ */

/** Read a typed mirror line. Returns { line } or { error }. */
export function parseLine2(text) {
  try {
    const u = parseLinearEquation(text, ['x', 'y']);
    if (Math.hypot(u.x, u.y) < EPS) {
      throw new Error(Math.abs(u.k) < EPS
        ? 'that is true everywhere, so it does not draw a line'
        : 'that is never true, so there is no line to draw');
    }
    return { line: tidyLine({ a: u.x, b: u.y, c: u.k }) };
  } catch (e) {
    return { error: e.message };
  }
}

/** The line through two points — how a drawn mirror becomes an equation. */
export function lineFromPoints2(p, q) {
  const a = q.y - p.y;
  const b = p.x - q.x;
  if (Math.hypot(a, b) < EPS) return null;      /* the two handles are on top of each other */
  return tidyLine({ a, b, c: -(a * p.x + b * p.y) });
}

export const onLine2 = (line, p) => Math.abs(line.a * p.x + line.b * p.y + line.c) < 1e-7;

/** How far off the line the point is, and on which side. */
export const signedDist2 = (line, p) =>
  (line.a * p.x + line.b * p.y + line.c) / Math.hypot(line.a, line.b);

/** t, the one number both the foot and the image are built from. */
const t2 = (line, p) =>
  (line.a * p.x + line.b * p.y + line.c) / (line.a * line.a + line.b * line.b);

/** The foot of the perpendicular: where the join crosses the mirror. */
export function foot2(line, p) {
  const t = t2(line, p);
  return { x: p.x - line.a * t, y: p.y - line.b * t };
}

/** The image. Exactly the foot's step, taken twice. */
export function reflect2(line, p) {
  const t = t2(line, p);
  return { x: p.x - 2 * line.a * t, y: p.y - 2 * line.b * t };
}

export const slope2 = (line) => (Math.abs(line.b) < EPS ? Infinity : -line.a / line.b);
export const intercept2 = (line) => (Math.abs(line.b) < EPS ? NaN : -line.c / line.b);

/** The friendliest true way to write the line. */
export function lineText2(line) {
  const { a, b, c } = line;
  if (Math.abs(b) < EPS) return `x = ${fracText(-c / a)}`;
  if (Math.abs(a) < EPS) return `y = ${fracText(-c / b)}`;
  const m = -a / b, k = -c / b;
  const mt = fracText(m);
  /* 3/4x reads as three over four-x; (3/4)x cannot be misread */
  const mPart = mt === '1' ? 'x' : mt === '−1' ? '−x'
    : mt.includes('/') ? `(${mt})x` : `${mt}x`;
  if (Math.abs(k) < EPS) return `y = ${mPart}`;
  return `y = ${mPart} ${k < 0 ? '−' : '+'} ${fracText(Math.abs(k))}`;
}

export const generalText2 = (line) => generalText([line.a, line.b, line.c], ['x', 'y', '']);

/** Two lines are the same line when their coefficients are proportional. */
export const sameLine2 = (p, q) =>
  Math.abs(p.a * q.b - p.b * q.a) < 1e-7 &&
  Math.abs(p.a * q.c - p.c * q.a) < 1e-7 &&
  Math.abs(p.b * q.c - p.c * q.b) < 1e-7;

/** Where the mirror crosses the edge of the visible window, so it can be
    drawn right across the graph however it is angled. The window is a
    rectangle, not a square: once the graph fills a wide screen it shows
    more of x than of y, at the same scale in both. */
export function clipLineToWindow(line, x0, x1, y0, y1) {
  const { a, b, c } = line;
  const den = a * a + b * b;
  if (den < EPS) return null;
  const p0 = { x: -a * c / den, y: -b * c / den };     /* the point nearest the origin */
  const d = { x: -b, y: a };                            /* along the line */
  let t0 = -Infinity, t1 = Infinity;
  for (const [p, dd, lo, hi] of [[p0.x, d.x, x0, x1], [p0.y, d.y, y0, y1]]) {
    if (Math.abs(dd) < EPS) { if (p < lo - EPS || p > hi + EPS) return null; continue; }
    let ta = (lo - p) / dd, tb = (hi - p) / dd;
    if (ta > tb) { const s = ta; ta = tb; tb = s; }
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
  }
  if (t0 > t1) return null;
  return [
    { x: p0.x + d.x * t0, y: p0.y + d.y * t0 },
    { x: p0.x + d.x * t1, y: p0.y + d.y * t1 },
  ];
}

export const clipLineToRect = (line, hx, hy) => clipLineToWindow(line, -hx, hx, -hy, hy);
export const clipLineToBox = (line, R) => clipLineToRect(line, R, R);

/** How far along a straight path you can travel before leaving a rectangle.

    Given where the path is at t = 0 and how far it moves per unit of t, both
    in the drawing's own pixels, this returns the stretch of t that lies
    inside a W by H box — or null for a path that misses it, including one
    that has no length on screen at all, which is what an axis pointed
    straight at the camera projects to. */
export function pathInBox(ox, oy, dx, dy, W, H) {
  if (Math.hypot(dx, dy) < 1e-9) return null;
  let t0 = -Infinity, t1 = Infinity;
  for (const [p, d, hi] of [[ox, dx, W], [oy, dy, H]]) {
    if (Math.abs(d) < 1e-9) { if (p < 0 || p > hi) return null; continue; }
    let lo = -p / d, up = (hi - p) / d;
    if (lo > up) { const t = lo; lo = up; up = t; }
    t0 = Math.max(t0, lo);
    t1 = Math.min(t1, up);
  }
  return t0 > t1 ? null : [t0, t1];
}

/** The same line, slid across the plane without turning. */
export const translateLine = (line, dx, dy) =>
  ({ a: line.a, b: line.b, c: line.c - (line.a * dx + line.b * dy) });

/** The spacing of the graph paper, for a view of any size at all.

    Always 1, 2 or 5 times a power of ten — 0.02, 0.5, 1, 20, 500 — so however
    far the graph is zoomed the squares are a number you can count in, and the
    count of lines drawn stays about the same however far out you go. */
export function niceStep(span, want = 14) {
  const raw = Math.max(span, 1e-12) / want;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * pow;
}

/** How many decimals a number written to this grid step actually needs. */
export const stepDecimals = (step) =>
  Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));

/* ============================================================
   THE MIRROR PLANE, IN THREE DIMENSIONS
   The same formula as the line, with one more coefficient.
   ============================================================ */

export function parsePlane3(text) {
  try {
    const u = parseLinearEquation(text, ['x', 'y', 'z']);
    if (Math.hypot(u.x, u.y, u.z) < EPS) {
      throw new Error(Math.abs(u.k) < EPS
        ? 'that is true everywhere, so it does not draw a plane'
        : 'that is never true, so there is no plane to draw');
    }
    return { plane: tidyPlane({ a: u.x, b: u.y, c: u.z, d: u.k }) };
  } catch (e) {
    return { error: e.message };
  }
}

export const planeNormal = (pl) => V(pl.a, pl.b, pl.c);

const t3 = (pl, p) => {
  const n = planeNormal(pl);
  return (dot(n, p) + pl.d) / dot(n, n);
};

export function footPlane(pl, p) {
  return subV(p, scaleV(planeNormal(pl), t3(pl, p)));
}

export function reflectPlane(pl, p) {
  return subV(p, scaleV(planeNormal(pl), 2 * t3(pl, p)));
}

export const signedDistPlane = (pl, p) =>
  (dot(planeNormal(pl), p) + pl.d) / lenV(planeNormal(pl));

export function planeText(pl) {
  const nz = [pl.a, pl.b, pl.c].filter((v) => Math.abs(v) > EPS).length;
  if (nz === 1) {
    const i = [pl.a, pl.b, pl.c].findIndex((v) => Math.abs(v) > EPS);
    const co = [pl.a, pl.b, pl.c][i];
    return `${'xyz'[i]} = ${fracText(-pl.d / co)}`;
  }
  return generalText([pl.a, pl.b, pl.c, pl.d], ['x', 'y', 'z', '']);
}

export const samePlane = (p, q) => {
  const A = [p.a, p.b, p.c, p.d], B = [q.a, q.b, q.c, q.d];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (Math.abs(A[i] * B[j] - A[j] * B[i]) > 1e-7) return false;
    }
  }
  return true;
};

/* ============================================================
   THE MIRROR LINE, IN THREE DIMENSIONS
   Held as a point it passes through and a direction along it,
   because in space that is the only way to pin a line down.
   ============================================================ */

export const line3FromPoints = (A, B) => {
  const u = subV(B, A);
  return lenV(u) < EPS ? null : { A, u };
};

export function footLine3(ln, p) {
  const u = normV(ln.u);
  return addV(ln.A, scaleV(u, dot(subV(p, ln.A), u)));
}

/** Not a mirror image — the point turned half a revolution about the line. */
export function reflectLine3(ln, p) {
  return subV(scaleV(footLine3(ln, p), 2), p);
}

export const distLine3 = (ln, p) => lenV(subV(p, footLine3(ln, p)));

/** The same line, written the one agreed way.

    A line has no natural "starting point" — every point on it would do — so
    two ends dragged anywhere along it would otherwise print as two different
    equations. Anchoring at the point nearest the origin settles that, and
    has the happy effect of writing the z-axis as r = (0,0,0) + t(0,0,1). */
export function canonicalLine3(ln) {
  const t = tidyCoeffs([ln.u.x, ln.u.y, ln.u.z]);
  let u = V(t[0], t[1], t[2]);
  const lead = [u.x, u.y, u.z].find((v) => Math.abs(v) > EPS) || 1;
  if (lead < 0) u = scaleV(u, -1);
  const tidyOne = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : v);
  const round3 = (p) => V(tidyOne(p.x), tidyOne(p.y), tidyOne(p.z));
  const whole = (p) => [p.x, p.y, p.z].every((v) => Number.isInteger(v));

  /* the nearest point to the origin when that is a tidy one, otherwise
     whatever point the line was given by — never a shower of decimals */
  const foot = round3(footLine3(ln, V(0, 0, 0)));
  if (whole(foot)) return { A: foot, u };
  const given = round3(ln.A);
  return { A: whole(given) ? given : foot, u };
}

export function lineVectorText(ln) {
  const { A, u } = canonicalLine3(ln);
  return `r = (${num(A.x)}, ${num(A.y)}, ${num(A.z)})`
       + ` + t(${num(u.x)}, ${num(u.y)}, ${num(u.z)})`;
}

/** (x − a)/u = (y − b)/v = (z − c)/w, with a zero direction written out
    as the equation it really is. */
export function lineSymmetricText(line) {
  const ln = canonicalLine3(line);
  const u = [ln.u.x, ln.u.y, ln.u.z];
  const A = [ln.A.x, ln.A.y, ln.A.z];
  const ratios = [], fixed = [];
  'xyz'.split('').forEach((nm, i) => {
    const top = Math.abs(A[i]) < EPS ? nm : `(${nm} ${A[i] < 0 ? '+' : '−'} ${num(Math.abs(A[i]))})`;
    if (Math.abs(u[i]) < EPS) fixed.push(`${nm} = ${num(A[i])}`);
    else ratios.push(Math.abs(u[i] - 1) < EPS ? top : `${top}/${num(u[i])}`);
  });
  /* one ratio on its own is not an equation — a line along an axis is
     described entirely by the two coordinates that are pinned */
  const main = ratios.length >= 2 ? ratios.join(' = ') : '';
  return [main, fixed.join(', ')].filter(Boolean).join(',  ');
}

/** Read a typed line in space: vector form, or symmetric form. */
export function parseLine3(text) {
  const s = String(text || '').replace(/−/g, '-').trim();
  if (!s) return { error: 'type an equation first' };

  /* r = (1, 0, 2) + t(1, 1, 0) */
  const trip = '\\(\\s*(-?[\\d.]+)\\s*,\\s*(-?[\\d.]+)\\s*,\\s*(-?[\\d.]+)\\s*\\)';
  const vec = new RegExp(`^(?:r\\s*=\\s*)?${trip}\\s*\\+\\s*[a-z]?\\s*\\*?\\s*${trip}$`, 'i');
  const m = s.match(vec);
  if (m) {
    const n = m.slice(1).map(Number);
    if (n.some((v) => !isFinite(v))) return { error: 'one of those is not a number' };
    const u = V(n[3], n[4], n[5]);
    if (lenV(u) < EPS) return { error: 'the direction cannot be (0, 0, 0)' };
    return { line: { A: V(n[0], n[1], n[2]), u } };
  }

  /* (x − 1)/2 = (y + 3)/1 = z/4 */
  const parts = s.split('=');
  if (parts.length === 3) {
    const A = [0, 0, 0], u = [0, 0, 0];
    for (const raw of parts) {
      const p = raw.trim().replace(/\s+/g, '');
      const mm = p.match(/^\(?([xyz])([+-][\d.]+)?\)?(?:\/(-?[\d.]+))?$/i);
      if (!mm) {
        return { error: 'write it as r = (1, 0, 2) + t(1, 1, 0), or as (x − 1)/2 = (y + 3)/1 = z/4' };
      }
      const i = 'xyz'.indexOf(mm[1].toLowerCase());
      const off = mm[2] ? Number(mm[2]) : 0;
      const den = mm[3] === undefined ? 1 : Number(mm[3]);
      if (!isFinite(off) || !isFinite(den)) return { error: 'one of those is not a number' };
      if (Math.abs(den) < EPS) return { error: 'a denominator cannot be zero' };
      A[i] = -off;                    /* (x + 3) means the line passes through x = −3 */
      u[i] = den;
    }
    const uu = V(u[0], u[1], u[2]);
    if (lenV(uu) < EPS) return { error: 'the direction cannot be (0, 0, 0)' };
    return { line: { A: V(A[0], A[1], A[2]), u: uu } };
  }

  return { error: 'write it as r = (1, 0, 2) + t(1, 1, 0), or as (x − 1)/2 = (y + 3)/1 = z/4' };
}

export const sameLine3 = (p, q) =>
  lenV(cross(p.u, q.u)) < 1e-7 && lenV(cross(p.u, subV(q.A, p.A))) < 1e-7;

/* ============================================================
   LOOKING AT THREE DIMENSIONS ON A FLAT SCREEN
   An orthographic camera the visitor can swing round the scene.
   The three basis vectors are orthonormal, so nothing the camera
   does can stretch a shape or change a length.
   ============================================================ */

export function makeCamera(yawDeg, pitchDeg) {
  const y = yawDeg * DEG, p = pitchDeg * DEG;
  return {
    right: V(-Math.sin(y), Math.cos(y), 0),
    up: V(-Math.cos(y) * Math.sin(p), -Math.sin(y) * Math.sin(p), Math.cos(p)),
    fwd: V(Math.cos(y) * Math.cos(p), Math.sin(y) * Math.cos(p), Math.sin(p)),
  };
}

/** Screen coordinates, plus how near the camera the point is — so
    what is behind can be drawn before what is in front. */
export const project = (cam, v) => ({
  x: dot(v, cam.right),
  y: -dot(v, cam.up),
  depth: dot(v, cam.fwd),
});

/* ---------- clipping, so nothing is drawn outside the axes box ---------- */

/** The polygon where a plane cuts the cube [−R, R]³, or [] if it misses. */
export function planePolygon(pl, R) {
  const n = planeNormal(pl);
  const nn = dot(n, n);
  if (nn < EPS) return [];
  const p0 = scaleV(n, -pl.d / nn);
  /* two directions lying in the plane, at right angles to each other */
  const axes = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)];
  const helper = axes.reduce((best, ax) =>
    Math.abs(dot(normV(n), ax)) < Math.abs(dot(normV(n), best)) ? ax : best, axes[0]);
  const u = normV(cross(n, helper));
  const w = normV(cross(n, u));
  const S = R * 4;
  let poly = [
    addV(p0, addV(scaleV(u, -S), scaleV(w, -S))),
    addV(p0, addV(scaleV(u, S), scaleV(w, -S))),
    addV(p0, addV(scaleV(u, S), scaleV(w, S))),
    addV(p0, addV(scaleV(u, -S), scaleV(w, S))),
  ];
  for (const ax of axes) {
    poly = clipHalfSpace(poly, ax, R);            /*  p·ax ≤  R  */
    poly = clipHalfSpace(poly, scaleV(ax, -1), R); /* −p·ax ≤  R  */
    if (!poly.length) return [];
  }
  return poly;
}

/** Sutherland–Hodgman against one half-space: keep p where p·m ≤ q. */
function clipHalfSpace(poly, m, q) {
  const out = [];
  const val = (p) => q - dot(p, m);
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    const va = val(A), vb = val(B);
    if (va >= -1e-12) out.push(A);
    if ((va > 0 && vb < 0) || (va < 0 && vb > 0)) {
      out.push(addV(A, scaleV(subV(B, A), va / (va - vb))));
    }
  }
  return out;
}

/** The piece of a line in space that lies inside the axes box. */
export function clipLineToCube(ln, R) {
  const { A, u } = ln;
  let t0 = -Infinity, t1 = Infinity;
  for (const k of ['x', 'y', 'z']) {
    if (Math.abs(u[k]) < EPS) { if (A[k] < -R - EPS || A[k] > R + EPS) return null; continue; }
    let ta = (-R - A[k]) / u[k], tb = (R - A[k]) / u[k];
    if (ta > tb) { const s = ta; ta = tb; tb = s; }
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
  }
  if (t0 > t1) return null;
  return [addV(A, scaleV(u, t0)), addV(A, scaleV(u, t1))];
}

/* ============================================================
   THE OBJECT
   One point, or a shape whose vertices are each reflected in
   turn — which is the whole reason reflection is a congruence.
   ============================================================ */

export const OBJECTS = [
  { id: 'point', name: 'A single point', n: 1, labels: ['P'] },
  { id: 'triangle', name: 'A triangle', n: 3, labels: ['A', 'B', 'C'] },
  { id: 'quad', name: 'A quadrilateral', n: 4, labels: ['A', 'B', 'C', 'D'] },
];

export const objectById = (id) => OBJECTS.find((o) => o.id === id) || OBJECTS[0];
export const vertexCount = (id) => objectById(id).n;
export const vertexLabels = (id) => objectById(id).labels;

/** The perimeter of a closed shape — equal before and after, always. */
export function perimeter(pts, three = false) {
  if (pts.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    sum += three
      ? lenV(subV(b, a))
      : Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

/** Twice the signed area of a flat polygon. Its SIGN is the interesting
    part: reflection reverses it, which is what "the shape is flipped"
    means when you say it with numbers. */
export function shoelace(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/* ============================================================
   READY-MADE SET-UPS
   Each one exists to make a single result impossible to miss.
   ============================================================ */

export const PRESETS_2D = {
  yEqualsX: {
    label: 'The mirror y = x',
    ask: 'Why do the coordinates simply swap?',
    line: { a: 1, b: -1, c: 0 },
    pts: [{ x: 4, y: 1 }],
    object: 'point',
  },
  xAxis: {
    label: 'The mirror y = 0',
    ask: 'Which coordinate changes sign, and which does not?',
    line: { a: 0, b: 1, c: 0 },
    pts: [{ x: 3, y: 4 }],
    object: 'point',
  },
  slanted: {
    label: 'A slanted mirror',
    ask: 'What happens when the mirror is not friendly?',
    line: { a: 3, b: -4, c: 5 },
    pts: [{ x: 5, y: -2 }],
    object: 'point',
  },
  triangle: {
    label: 'A triangle in the mirror',
    ask: 'Same size — but is it the same way round?',
    line: { a: 1, b: 1, c: -2 },
    pts: [{ x: -4, y: 4 }, { x: -1, y: 5 }, { x: -3, y: 1 }],
    object: 'triangle',
  },
  onTheLine: {
    label: 'A point sitting on the mirror',
    ask: 'Where does a point on the mirror go?',
    line: { a: 1, b: -2, c: 2 },
    pts: [{ x: 4, y: 3 }],
    object: 'point',
  },
};

export const PRESETS_3D = {
  floor: {
    label: 'The floor, z = 0',
    ask: 'Only one coordinate changes. Which?',
    mirror: 'plane',
    plane: { a: 0, b: 0, c: 1, d: 0 },
    pts: [{ x: 3, y: 2, z: 4 }],
    object: 'point',
  },
  diagonal: {
    label: 'The plane x = y',
    ask: 'Two coordinates trade places — and one sits still.',
    mirror: 'plane',
    plane: { a: 1, b: -1, c: 0, d: 0 },
    pts: [{ x: 5, y: 1, z: 3 }],
    object: 'point',
  },
  tilted: {
    label: 'A tilted plane',
    ask: 'x + y + z = 3, with nothing lining up.',
    mirror: 'plane',
    plane: { a: 1, b: 1, c: 1, d: -3 },
    pts: [{ x: 4, y: 3, z: 5 }],
    object: 'point',
  },
  axis: {
    label: 'Turning about the z-axis',
    ask: 'A line is not a mirror. Two coordinates flip, not one.',
    mirror: 'line',
    lnA: { x: 0, y: 0, z: -6 },
    lnB: { x: 0, y: 0, z: 6 },
    pts: [{ x: 4, y: 2, z: 3 }],
    object: 'point',
  },
  skew: {
    label: 'Turning about a slanted line',
    ask: 'The same half-turn, about a line that lines up with nothing.',
    mirror: 'line',
    lnA: { x: -4, y: -4, z: -2 },
    lnB: { x: 4, y: 4, z: 2 },
    pts: [{ x: 5, y: -1, z: 4 }],
    object: 'point',
  },
  triangle3: {
    label: 'A triangle above the floor',
    ask: 'Every vertex reflects, so the whole shape does.',
    mirror: 'plane',
    plane: { a: 0, b: 0, c: 1, d: 0 },
    pts: [{ x: 1, y: 1, z: 2 }, { x: 5, y: 2, z: 4 }, { x: 2, y: 5, z: 5 }],
    object: 'triangle',
  },
};
