import * as E from '../src/labs/reflection/engine.js';
import {
  reducer, initialState, createInitialState, writeState, readState,
  lineOf, line3Of, snapTo, LIMIT, RANGE_MIN, RANGE_MAX, DEFAULT_RANGE, ZOOM_STEP,
} from '../src/labs/reflection/labState.js';
import { newTask, checkImage, checkMirror } from '../src/labs/reflection/challenges.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, extra); }
};
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const nearPt = (a, b, tol = 1e-9) =>
  near(a.x, b.x, tol) && near(a.y, b.y, tol) && near(a.z || 0, b.z || 0, tol);

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

/* a fixed spread of points, so every property below is checked against the
   same awkward cases every time rather than whatever a random run threw up */
const SAMPLE2 = [];
for (let x = -5; x <= 5; x += 2) for (let y = -5; y <= 5; y += 2) SAMPLE2.push({ x, y });
SAMPLE2.push({ x: 0.5, y: -3.25 }, { x: -7.4, y: 6.1 });

const SAMPLE3 = [];
for (let x = -4; x <= 4; x += 4) for (let y = -4; y <= 4; y += 4) for (let z = -4; z <= 4; z += 4) {
  SAMPLE3.push(E.V(x, y, z));
}
SAMPLE3.push(E.V(1.5, -2.25, 3.75));

const LINES = ['y = 0', 'x = 0', 'y = x', 'y = -x', 'y = 3', 'x = -2',
               'y = 2x + 1', '3x - 4y + 5 = 0', 'x/2 + y/3 = 1', 'y = -0.5x + 4']
  .map((t) => E.parseLine2(t).line);

const PLANES = ['z = 0', 'y = 0', 'x = 0', 'x = y', 'x + y + z = 3',
                '2x - y + 3z = 6', 'z = 4', 'x - 2y + 2z + 5 = 0']
  .map((t) => E.parsePlane3(t).plane);

const LINES3 = [
  { A: E.V(0, 0, 0), u: E.V(1, 0, 0) },
  { A: E.V(0, 0, 0), u: E.V(0, 0, 1) },
  { A: E.V(0, 0, 0), u: E.V(1, 1, 0) },
  { A: E.V(1, -2, 3), u: E.V(2, 1, -2) },
  { A: E.V(-3, 0, 1), u: E.V(1, 1, 1) },
];

console.log('\n— reading an equation —');
for (const [text, want] of [
  ['y = x', '3x − 3y = 0'], ['y = 2x + 1', '2x − y + 1 = 0'], ['x = -2', 'x + 2 = 0'],
  ['y=3', 'y − 3 = 0'], ['3x - 4y + 5 = 0', '3x − 4y + 5 = 0'],
  ['x/2 + y/3 = 1', '3x + 2y − 6 = 0'], ['2(x+1) = y - x/2', '5x − 2y + 4 = 0'],
  ['3x - 4y + 5', '3x − 4y + 5 = 0'], ['−y = −x', 'x − y = 0'],
]) {
  const got = E.parseLine2(text);
  const same = !got.error && E.sameLine2(got.line, E.parseLine2(want.replace(' = 0', '')).line);
  ok(`"${text}" is read as a line`, same, got.error || E.generalText2(got.line));
}
for (const bad of ['y = z', 'x*y = 1', 'y =', '2 = 3', '0 = 0', 'y ~ x', 'x = = 2', 'y/x = 2']) {
  const got = E.parseLine2(bad);
  ok(`"${bad}" is refused, with a reason`, !!got.error && got.error.length > 8, JSON.stringify(got));
}
ok('a bare expression is read as "= 0"',
   E.sameLine2(E.parseLine2('x + y - 4').line, E.parseLine2('x + y = 4').line));
ok('a typographic minus is accepted too',
   E.sameLine2(E.parseLine2('y = −2x').line, E.parseLine2('y = -2x').line));

console.log('\n— the same line is always written the same way —');
ok('x/2 + y/3 = 1 and 3x + 2y = 6 come out identical',
   JSON.stringify(E.parseLine2('x/2 + y/3 = 1').line) === JSON.stringify(E.parseLine2('3x + 2y = 6').line));
ok('a dragged line still reduces to whole numbers',
   JSON.stringify(E.tidyLine({ a: 11.28, b: -15.04, c: 18.799999999999997 }))
     === JSON.stringify({ a: 3, b: -4, c: 5 }));
ok('an irrational ratio is left exactly as it is',
   Math.abs(E.tidyLine({ a: 1, b: -Math.SQRT2, c: 0.3 }).b + Math.SQRT2) < 1e-12);
for (const L of LINES) {
  const back = E.parseLine2(E.lineText2(L));
  ok(`"${E.lineText2(L)}" reads back as itself`, !back.error && E.sameLine2(back.line, L),
     back.error || E.generalText2(back.line));
}

console.log('\n— reflection in a line, against known results —');
for (const [text, p, want] of [
  ['y = x', { x: 4, y: 1 }, { x: 1, y: 4 }],
  ['y = 0', { x: 3, y: 4 }, { x: 3, y: -4 }],
  ['x = 0', { x: 3, y: 4 }, { x: -3, y: 4 }],
  ['y = -x', { x: 3, y: 4 }, { x: -4, y: -3 }],
  ['y = 3', { x: 5, y: 1 }, { x: 5, y: 5 }],
  ['x = -2', { x: 3, y: 1 }, { x: -7, y: 1 }],
  ['3x - 4y + 5 = 0', { x: 5, y: -2 }, { x: -1.72, y: 6.96 }],
]) {
  const got = E.reflect2(E.parseLine2(text).line, p);
  ok(`${E.ptText(p)} in ${text} → ${E.ptText(want)}`, nearPt(got, want, 1e-9), E.ptText(got));
}

console.log('\n— and against the definition, for every sample point —');
{
  let twice = 0, mid = 0, perp = 0, equal = 0, still = 0, onMirror = 0, checked = 0;
  for (const L of LINES) {
    const dir = { x: -L.b, y: L.a };                 /* along the mirror */
    for (const p of SAMPLE2) {
      const q = E.reflect2(L, p);
      const m = E.foot2(L, p);
      if (!nearPt(E.reflect2(L, q), p, 1e-9)) twice++;
      if (!nearPt({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, m, 1e-9)) mid++;
      if (!E.onLine2(L, m)) mid++;
      /* the join and the mirror meet at right angles */
      const join = { x: q.x - p.x, y: q.y - p.y };
      if (Math.hypot(join.x, join.y) > 1e-9
          && Math.abs(join.x * dir.x + join.y * dir.y) > 1e-7) perp++;
      if (!near(Math.hypot(p.x - m.x, p.y - m.y), Math.hypot(q.x - m.x, q.y - m.y), 1e-9)) equal++;
      if (Math.abs(L.a * p.x + L.b * p.y + L.c) < 1e-12) {
        onMirror++;
        if (!nearPt(q, p, 1e-12)) still++;
      }
      checked++;
    }
  }
  ok('reflecting twice always gives the point back', twice === 0, `${twice} failed`);
  ok('the foot is always the midpoint, and always on the mirror', mid === 0, `${mid} failed`);
  ok('the join always meets the mirror at right angles', perp === 0, `${perp} failed`);
  ok('the two distances are always equal', equal === 0, `${equal} failed`);
  ok('a point on the mirror never moves', still === 0, `${still} failed`);
  ok(`${checked} point-and-mirror pairs checked, ${onMirror} of them on the mirror`,
     checked === LINES.length * SAMPLE2.length && onMirror > 0, `${checked}, ${onMirror}`);
}

console.log('\n— the mirrors worth memorising do what the table says —');
{
  const rule = [
    ['y = 0', (p) => ({ x: p.x, y: -p.y })],
    ['x = 0', (p) => ({ x: -p.x, y: p.y })],
    ['y = x', (p) => ({ x: p.y, y: p.x })],
    ['y = -x', (p) => ({ x: -p.y, y: -p.x })],
    ['x = 4', (p) => ({ x: 8 - p.x, y: p.y })],
    ['y = -3', (p) => ({ x: p.x, y: -6 - p.y })],
  ];
  let bad = 0;
  for (const [text, f] of rule) {
    const L = E.parseLine2(text).line;
    for (const p of SAMPLE2) if (!nearPt(E.reflect2(L, p), f(p), 1e-9)) bad++;
  }
  ok('all six shortcuts agree with the general formula', bad === 0, `${bad} disagreed`);
}

console.log('\n— a shape keeps its size and loses its handedness —');
{
  let sizeBad = 0, flipBad = 0;
  const tri = [{ x: -4, y: 4 }, { x: -1, y: 5 }, { x: -3, y: 1 }];
  for (const L of LINES) {
    const img = tri.map((p) => E.reflect2(L, p));
    if (!near(E.perimeter(tri), E.perimeter(img), 1e-9)) sizeBad++;
    const a = E.shoelace(tri), b = E.shoelace(img);
    if (!near(Math.abs(a), Math.abs(b), 1e-9) || Math.sign(a) === Math.sign(b)) flipBad++;
  }
  ok('every perimeter survives untouched', sizeBad === 0, `${sizeBad} changed`);
  ok('and every signed area comes back with its sign reversed', flipBad === 0, `${flipBad} failed`);
}

console.log('\n— reflection in a plane —');
for (const [text, p, want] of [
  ['z = 0', E.V(3, 2, 4), E.V(3, 2, -4)],
  ['x = 0', E.V(3, 2, 4), E.V(-3, 2, 4)],
  ['x = y', E.V(5, 1, 3), E.V(1, 5, 3)],
  ['z = 4', E.V(1, 1, 1), E.V(1, 1, 7)],
  ['x + y + z = 3', E.V(4, 3, 5), E.V(-2, -3, -1)],
]) {
  const got = E.reflectPlane(E.parsePlane3(text).plane, p);
  ok(`${E.ptText(p, true)} in ${text} → ${E.ptText(want, true)}`, nearPt(got, want, 1e-9),
     E.ptText(got, true));
}
{
  let twice = 0, mid = 0, perp = 0;
  for (const pl of PLANES) {
    const n = E.planeNormal(pl);
    for (const p of SAMPLE3) {
      const q = E.reflectPlane(pl, p);
      const m = E.footPlane(pl, p);
      if (!nearPt(E.reflectPlane(pl, q), p, 1e-9)) twice++;
      if (!nearPt(E.scaleV(E.addV(p, q), 0.5), m, 1e-9)) mid++;
      if (Math.abs(E.dot(n, m) + pl.d) > 1e-7) mid++;
      /* the join must be along the normal — nothing across it */
      const join = E.subV(q, p);
      if (E.lenV(join) > 1e-9 && E.lenV(E.cross(join, n)) > 1e-6) perp++;
    }
  }
  ok('reflecting twice in a plane gives the point back', twice === 0, `${twice} failed`);
  ok('the foot is the midpoint, and lies in the plane', mid === 0, `${mid} failed`);
  ok('the join always runs along the normal', perp === 0, `${perp} failed`);
}

console.log('\n— a half-turn about a line is NOT a reflection —');
for (const [ln, p, want] of [
  [{ A: E.V(0, 0, 0), u: E.V(0, 0, 1) }, E.V(4, 2, 3), E.V(-4, -2, 3)],
  [{ A: E.V(0, 0, 0), u: E.V(1, 0, 0) }, E.V(4, 2, 3), E.V(4, -2, -3)],
  [{ A: E.V(0, 0, 0), u: E.V(1, 1, 0) }, E.V(4, 2, 3), E.V(2, 4, -3)],
]) {
  const got = E.reflectLine3(ln, p);
  ok(`${E.ptText(p, true)} about ${E.ptText(ln.u, true)} → ${E.ptText(want, true)}`,
     nearPt(got, want, 1e-9), E.ptText(got, true));
}
{
  let twice = 0, mid = 0, perp = 0;
  for (const ln of LINES3) {
    for (const p of SAMPLE3) {
      const q = E.reflectLine3(ln, p);
      const m = E.footLine3(ln, p);
      if (!nearPt(E.reflectLine3(ln, q), p, 1e-9)) twice++;
      if (!nearPt(E.scaleV(E.addV(p, q), 0.5), m, 1e-9)) mid++;
      /* the foot really is the nearest point: P − M is across the line */
      if (Math.abs(E.dot(E.subV(p, m), E.normV(ln.u))) > 1e-7) perp++;
    }
  }
  ok('turning twice gives the point back', twice === 0, `${twice} failed`);
  ok('the foot is the midpoint of the join', mid === 0, `${mid} failed`);
  ok('and the join meets the line at right angles', perp === 0, `${perp} failed`);
}

/** The 3×3 matrix of a transform, read off the images of the three axes. */
const matrixOf = (f) => [E.V(1, 0, 0), E.V(0, 1, 0), E.V(0, 0, 1)].map(f);
const det = (m) => E.dot(m[0], E.cross(m[1], m[2]));
const trace = (m) => m[0].x + m[1].y + m[2].z;

console.log('\n— the determinant tells the two apart —');
for (const pl of PLANES.filter((p) => Math.abs(p.d) < 1e-9)) {
  const m = matrixOf((v) => E.reflectPlane(pl, v));
  ok(`the plane ${E.planeText(pl)} has determinant −1 and trace 1`,
     near(det(m), -1, 1e-9) && near(trace(m), 1, 1e-9),
     `det ${det(m).toFixed(6)}, trace ${trace(m).toFixed(6)}`);
}
for (const ln of LINES3.filter((l) => E.lenV(l.A) < 1e-9)) {
  const m = matrixOf((v) => E.reflectLine3(ln, v));
  ok(`the line along ${E.ptText(ln.u, true)} has determinant +1 and trace −1`,
     near(det(m), 1, 1e-9) && near(trace(m), -1, 1e-9),
     `det ${det(m).toFixed(6)}, trace ${trace(m).toFixed(6)}`);
}
ok('so a plane reverses one direction and a line reverses two — '
   + 'which is why only the plane is a mirror', true);

console.log('\n— writing a line in space, and reading it back —');
for (const ln of LINES3) {
  const back = E.parseLine3(E.lineVectorText(ln));
  ok(`"${E.lineVectorText(ln)}" reads back as the same line`,
     !back.error && E.sameLine3(back.line, ln), back.error || '');
}
for (const [A, u, want] of [
  [E.V(0, 0, -8), E.V(0, 0, 1), 'r = (0, 0, 0) + t(0, 0, 1)'],
  [E.V(0, 0, 7.5), E.V(0, 0, -3), 'r = (0, 0, 0) + t(0, 0, 1)'],
  [E.V(5, 5, 2), E.V(1, 1, 0), 'r = (0, 0, 2) + t(1, 1, 0)'],
  [E.V(-4, -4, -2), E.V(8, 8, 4), 'r = (0, 0, 0) + t(2, 2, 1)'],
  [E.V(1, -3, 0), E.V(2, 1, 4), 'r = (1, −3, 0) + t(2, 1, 4)'],
]) {
  ok(`however its two ends are dragged, the line is written "${want}"`,
     E.lineVectorText({ A, u }) === want, E.lineVectorText({ A, u }));
}
ok('a line along an axis is written as the two coordinates it pins',
   E.lineSymmetricText({ A: E.V(0, 0, -8), u: E.V(0, 0, 1) }) === 'x = 0, y = 0',
   E.lineSymmetricText({ A: E.V(0, 0, -8), u: E.V(0, 0, 1) }));
ok('and canonicalising never moves the line',
   [[E.V(0, 0, -8), E.V(0, 0, 1)], [E.V(5, 5, 2), E.V(1, 1, 0)],
    [E.V(1, -3, 0), E.V(2, 1, 4)], [E.V(-4, -4, -2), E.V(8, 8, 4)]]
     .every(([A, u]) => E.sameLine3(E.canonicalLine3({ A, u }), { A, u })));
ok('symmetric form is read too',
   E.sameLine3(E.parseLine3('(x-1)/2 = (y+3)/1 = z/4').line,
               { A: E.V(1, -3, 0), u: E.V(2, 1, 4) }));
ok('a zero direction is written out as the equation it is',
   E.lineSymmetricText({ A: E.V(0, 0, 2), u: E.V(1, 0, 0) }).includes('y = 0'));
for (const bad of ['nonsense', 'r = (1,2) + t(1,1,1)', '(x-1)/0 = y = z',
                   'r = (0,0,0) + t(0,0,0)']) {
  ok(`"${bad}" is refused`, !!E.parseLine3(bad).error);
}

console.log('\n— the camera —');
for (const [yaw, pitch] of [[0, 0], [38, 22], [137, -61], [270, 85], [-45, 0]]) {
  const c = E.makeCamera(yaw, pitch);
  const orth = [E.dot(c.right, c.up), E.dot(c.right, c.fwd), E.dot(c.up, c.fwd)]
    .every((v) => Math.abs(v) < 1e-12);
  const unit = [c.right, c.up, c.fwd].every((v) => near(E.lenV(v), 1, 1e-12));
  ok(`at yaw ${yaw}°, pitch ${pitch}° the basis is orthonormal`, orth && unit);
}
{
  /* an orthographic camera can shorten a length but must never stretch one —
     if it could, two equal distances on screen would mean nothing */
  let stretched = 0;
  const c = E.makeCamera(38, 22);
  for (const p of SAMPLE3) for (const q of SAMPLE3) {
    const a = E.project(c, p), b = E.project(c, q);
    const flat = Math.hypot(a.x - b.x, a.y - b.y);
    if (flat > E.lenV(E.subV(p, q)) + 1e-9) stretched++;
  }
  ok('no projected distance is ever longer than the real one', stretched === 0, `${stretched}`);
}

console.log('\n— clipping, so nothing is drawn outside the graph —');
for (const L of LINES) {
  const seg = E.clipLineToBox(L, 8);
  ok(`${E.lineText2(L)} is clipped to the ±8 square`,
     !!seg && seg.every((p) => E.onLine2(L, p)
       && Math.abs(p.x) <= 8 + 1e-7 && Math.abs(p.y) <= 8 + 1e-7));
}
ok('a line that misses the square is not drawn at all',
   E.clipLineToBox(E.parseLine2('y = 40').line, 8) === null);
for (const pl of PLANES) {
  const poly = E.planePolygon(pl, 8);
  const onPlane = poly.every((p) => Math.abs(E.dot(E.planeNormal(pl), p) + pl.d) < 1e-6);
  const inCube = poly.every((p) => ['x', 'y', 'z'].every((k) => Math.abs(p[k]) <= 8 + 1e-6));
  ok(`${E.planeText(pl)} cuts the box in a ${poly.length}-sided polygon, on the plane`,
     poly.length >= 3 && onPlane && inCube);
}
ok('a plane straight across the corner cuts a hexagon',
   E.planePolygon(E.parsePlane3('x + y + z = 0').plane, 8).length === 6);
ok('a plane that misses the box cuts nothing',
   E.planePolygon(E.parsePlane3('z = 40').plane, 8).length === 0);
for (const ln of LINES3) {
  const seg = E.clipLineToCube(ln, 8);
  ok(`the line along ${E.ptText(ln.u, true)} is clipped to the box`,
     !!seg && seg.every((p) => E.lenV(E.cross(E.subV(p, ln.A), ln.u)) < 1e-6
       && ['x', 'y', 'z'].every((k) => Math.abs(p[k]) <= 8 + 1e-6)));
}
ok('a line that misses the box is not drawn', E.clipLineToCube({ A: E.V(40, 0, 0), u: E.V(0, 0, 1) }, 8) === null);

console.log('\n— an axis is drawn as far as the drawing goes —');
{
  /* an axis through the middle of a 200 by 100 drawing, running right */
  const across = E.pathInBox(100, 50, 1, 0, 200, 100);
  ok('a path across the middle reaches both edges',
     near(across[0], -100) && near(across[1], 100), JSON.stringify(across));
  const up = E.pathInBox(100, 50, 0, -1, 200, 100);
  ok('and one straight up reaches the top and the bottom',
     near(up[0], -50) && near(up[1], 50), JSON.stringify(up));
  const diag = E.pathInBox(0, 0, 1, 1, 200, 100);
  ok('a diagonal stops at whichever edge comes first',
     near(diag[0], 0) && near(diag[1], 100), JSON.stringify(diag));

  /* the point of the whole thing: an origin far outside the drawing still
     gives back the stretch of the axis that crosses it */
  const far = E.pathInBox(-4000, 50, 1, 0, 200, 100);
  ok('an axis whose origin is far off screen is still drawn where it crosses',
     !!far && near(far[0], 4000) && near(far[1], 4200), JSON.stringify(far));
  ok('and every point of that stretch really is inside the drawing',
     [far[0], (far[0] + far[1]) / 2, far[1]].every((t) => {
       const x = -4000 + t;
       return x >= -1e-9 && x <= 200 + 1e-9;
     }));

  ok('a path that misses the drawing is not drawn',
     E.pathInBox(-50, 500, 1, 0, 200, 100) === null);
  ok('and one pointed straight at the camera, which has no length, is not either',
     E.pathInBox(100, 50, 0, 0, 200, 100) === null);
}

console.log('\n— the drawn mirror and the written mirror are the same mirror —');
{
  let s = createInitialState();
  ok('the lab starts on y = x', E.sameLine2(lineOf(s), E.parseLine2('y = x').line));
  for (const text of ['3x - 4y + 5 = 0', 'y = 2x + 1', 'x = -2', 'y = 3', 'y = -0.5x + 4']) {
    const typed = E.parseLine2(text).line;
    s = reducer(s, { type: 'line2', value: typed });
    ok(`typing "${text}" is the mirror the lab then has`,
       E.sameLine2(lineOf(s), typed), E.generalText2(lineOf(s)));
    ok(`  ...and it reads back as "${E.lineText2(typed)}"`,
       E.lineText2(lineOf(s)) === E.lineText2(typed));
  }
  /* dragging an end is the line through the dragged point and the far end —
     the scene works those two out from the window, the reducer just takes
     the line, so this is the very same call a drag makes */
  s = reducer(s, { type: 'line2', value: E.lineFromPoints2({ x: 0, y: 0 }, { x: 2, y: 4 }) });
  ok('dragging an end of the mirror writes the equation back',
     E.sameLine2(lineOf(s), E.parseLine2('y = 2x').line), E.lineText2(lineOf(s)));
  s = reducer(s, { type: 'shiftLine', dx: 0, dy: 3 });
  ok('sliding the mirror keeps its gradient and moves its intercept',
     near(E.slope2(lineOf(s)), 2, 1e-9) && near(E.intercept2(lineOf(s)), 3, 1e-9),
     E.lineText2(lineOf(s)));
  s = reducer(s, { type: 'shiftLine', dx: 1.5, dy: 0 });
  ok('and sliding it sideways is the same as sliding it down',
     near(E.slope2(lineOf(s)), 2, 1e-9) && near(E.intercept2(lineOf(s)), 0, 1e-9),
     E.lineText2(lineOf(s)));
  const before = lineOf(s);
  s = reducer(s, { type: 'line2', value: { a: 0, b: 0, c: 5 } });
  ok('a mirror with no direction at all is refused', E.sameLine2(lineOf(s), before));
}

console.log('\n— the reducer keeps the graph honest —');
{
  let s = createInitialState();
  s = reducer(s, { type: 'point', index: 0, value: { x: 999, y: -999 } });
  ok('a point cannot be put outside the lab entirely',
     s.pts2[0].x === LIMIT && s.pts2[0].y === -LIMIT, JSON.stringify(s.pts2[0]));
  s = reducer(s, { type: 'line2', value: E.parseLine2('3x - 4y + 5 = 0').line });
  s = reducer(s, { type: 'point', index: 0, value: { x: 6, y: 6 } });
  const wide = lineOf(s);
  s = reducer(s, { type: 'zoom', factor: 4 });
  s = reducer(s, { type: 'pan', dx: 250, dy: -80 });
  ok('travelling across the graph leaves the mirror exactly where it was',
     E.sameLine2(lineOf(s), wide), E.generalText2(lineOf(s)));
  ok('and leaves the point exactly where it was, however far away it now is',
     s.pts2[0].x === 6 && s.pts2[0].y === 6, JSON.stringify(s.pts2[0]));
  s = reducer(s, { type: 'resetView' });
  ok('and Reset view brings the window back without touching either',
     s.pts2[0].x === 6 && s.pts2[0].y === 6 && E.sameLine2(lineOf(s), wide)
     && s.centre2.x === 0 && s.centre2.y === 0 && s.range === DEFAULT_RANGE);
  s = reducer(s, { type: 'planeCoef', key: 'a', value: 0 });
  s = reducer(s, { type: 'planeCoef', key: 'b', value: 0 });
  s = reducer(s, { type: 'planeCoef', key: 'c', value: 0 });
  ok('a plane can never be given a normal of (0, 0, 0)',
     Math.hypot(s.plane.a, s.plane.b, s.plane.c) > 0, JSON.stringify(s.plane));
  s = reducer(s, { type: 'lnPoint', which: 'B', value: { ...s.lnA } });
  ok('the mirror line in space always keeps two distinct points',
     E.lenV(E.subV(s.lnA, s.lnB)) > 0.5);
  s = reducer(s, { type: 'orbit', yaw: 400, pitch: 200 });
  ok('the camera cannot be turned upside down', s.pitch === 85 && s.yaw === 40,
     `${s.yaw}, ${s.pitch}`);
  for (const name of Object.keys(E.PRESETS_2D)) {
    const t = reducer({ ...createInitialState(), dim: '2d' }, { type: 'preset', name });
    ok(`the "${E.PRESETS_2D[name].label}" set-up loads`,
       E.sameLine2(lineOf(t), E.tidyLine(E.PRESETS_2D[name].line))
       && t.object === E.PRESETS_2D[name].object);
  }
  for (const name of Object.keys(E.PRESETS_3D)) {
    const t = reducer({ ...createInitialState(), dim: '3d' }, { type: 'preset', name });
    const p = E.PRESETS_3D[name];
    ok(`the "${p.label}" set-up loads`,
       t.mirror3 === p.mirror
       && (p.mirror === 'plane' ? E.samePlane(t.plane, E.tidyPlane(p.plane))
                                : E.sameLine3(line3Of(t), { A: p.lnA, u: E.subV(p.lnB, p.lnA) })));
  }
}

console.log('\n— travelling across the graph, and putting the view back —');
{
  let s = createInitialState();
  ok('the lab opens at ±8, looking at the origin',
     s.range === DEFAULT_RANGE && s.centre2.x === 0 && s.centre2.y === 0);

  s = reducer(s, { type: 'pan', dx: 12.5, dy: -3 });
  ok('panning moves the window and nothing else',
     near(s.centre2.x, 12.5) && near(s.centre2.y, -3)
     && s.range === DEFAULT_RANGE && E.sameLine2(lineOf(s), lineOf(initialState)));

  /* zoom is unbounded for any purpose this lab has: eight orders of
     magnitude between the two ends, and it never gets stuck at either */
  let far = createInitialState();
  for (let i = 0; i < 400; i++) far = reducer(far, { type: 'zoom', factor: 1 / ZOOM_STEP });
  ok('zooming out runs to the far end and stops there', far.range === RANGE_MAX, far.range);
  for (let i = 0; i < 800; i++) far = reducer(far, { type: 'zoom', factor: ZOOM_STEP });
  ok('and zooming in runs all the way back', near(far.range, RANGE_MIN, 1e-12), far.range);
  ok('which is eight orders of magnitude of zoom',
     Math.log10(RANGE_MAX / RANGE_MIN) >= 7);

  /* zooming towards the pointer holds the point under it still */
  for (const [f, at] of [[2, { x: 4, y: 1 }], [1 / 3, { x: -7, y: 12 }], [1.4, { x: 0, y: 0 }]]) {
    const from = reducer(createInitialState(), { type: 'pan', dx: 3, dy: -2 });
    const to = reducer(from, { type: 'zoom', factor: f, at });
    /* the world point under the pointer must land on the same screen offset:
       (at − centre) / range is exactly that offset, in half-views */
    const wasX = (at.x - from.centre2.x) / from.range;
    const nowX = (at.x - to.centre2.x) / to.range;
    const wasY = (at.y - from.centre2.y) / from.range;
    const nowY = (at.y - to.centre2.y) / to.range;
    ok(`zooming ×${f} towards ${E.ptText(at)} holds that point still`,
       near(wasX, nowX, 1e-9) && near(wasY, nowY, 1e-9),
       `${wasX} vs ${nowX}, ${wasY} vs ${nowY}`);
  }
  ok('a zoom with no anchor keeps the middle of the view',
     (() => { const a = reducer(reducer(createInitialState(), { type: 'pan', dx: 5, dy: 5 }),
                                { type: 'zoom', factor: 2 });
              return a.centre2.x === 5 && a.centre2.y === 5; })());

  let s2 = reducer(createInitialState(), { type: 'pan', dx: 40, dy: 40 });
  s2 = reducer(s2, { type: 'zoom', factor: 9 });
  s2 = reducer(s2, { type: 'orbit', yaw: 200, pitch: -40 });
  s2 = reducer(s2, { type: 'point', index: 0, value: { x: 5, y: -3 } });
  s2 = reducer(s2, { type: 'resetView' });
  ok('Reset view puts the middle, the zoom and the rotation back',
     s2.range === DEFAULT_RANGE && s2.centre2.x === 0 && s2.centre2.y === 0
     && s2.yaw === initialState.yaw && s2.pitch === initialState.pitch);
  ok('but leaves the maths alone — it is a view control, not an undo',
     s2.pts2[0].x === 5 && s2.pts2[0].y === -3);

  /* in space it is the camera's target that moves */
  let s3 = reducer({ ...createInitialState(), dim: '3d' }, { type: 'pan', dx: 2, dy: -1, dz: 4 });
  ok('panning in space moves what the camera is looking at',
     s3.centre3.x === 2 && s3.centre3.y === -1 && s3.centre3.z === 4
     && s3.centre2.x === 0);
}

console.log('\n— the graph paper follows the zoom onto tidy numbers —');
{
  let bad = 0, seen = new Set();
  for (let r = RANGE_MIN; r < RANGE_MAX; r *= 1.17) {
    const st = E.niceStep(2 * r);
    const mantissa = st / 10 ** Math.floor(Math.log10(st) + 1e-9);
    if (![1, 2, 5].some((m) => Math.abs(mantissa - m) < 1e-9)) bad++;
    const squares = (2 * r) / st;
    if (squares < 7 || squares > 30) bad++;      /* never a wall of lines, never three */
    seen.add(mantissa.toFixed(0));
  }
  ok('every step is 1, 2 or 5 times a power of ten, at every zoom there is',
     bad === 0 && seen.size === 3, `${bad} wrong, mantissas ${[...seen].join(',')}`);
  for (const [step, want] of [[1, 0], [0.5, 1], [0.2, 1], [0.05, 2], [0.001, 3], [20, 0]]) {
    ok(`a grid of ${step} needs ${want} decimal${want === 1 ? '' : 's'}`,
       E.stepDecimals(step) === want, E.stepDecimals(step));
  }
  /* what a drag lands on follows the paper you are looking at */
  ok('snapping follows the grid step', snapTo(1.34, true, 0.5) === 1.5
     && snapTo(1.34, true, 1) === 1 && snapTo(137, true, 20) === 140);
  ok('and snapping off leaves the value where it fell',
     near(snapTo(1.3456789, false, 1), 1.3457, 1e-9), snapTo(1.3456789, false, 1));
}

console.log('\n— a wide graph shows more x than y, at the same scale —');
{
  const L = E.parseLine2('y = 0.5x + 1').line;
  const wide = E.clipLineToRect(L, 20, 8);
  const square = E.clipLineToRect(L, 8, 8);
  ok('the mirror is clipped to the window it is drawn in',
     wide.every((p) => E.onLine2(L, p) && Math.abs(p.x) <= 20 + 1e-7 && Math.abs(p.y) <= 8 + 1e-7)
     && square.every((p) => E.onLine2(L, p) && Math.abs(p.x) <= 8 + 1e-7));
  ok('a wide window shows a longer piece of it',
     Math.hypot(wide[1].x - wide[0].x, wide[1].y - wide[0].y)
       > Math.hypot(square[1].x - square[0].x, square[1].y - square[0].y));
  ok('a horizontal mirror runs the full width of a wide window',
     (() => { const seg = E.clipLineToRect(E.parseLine2('y = 2').line, 20, 8);
              /* the two ends come back in the line's own direction, which for
                 y = 2 points along −x, so compare the pair and not the order */
              const xs = seg.map((q) => q.x).sort((a, b) => a - b);
              return near(xs[0], -20) && near(xs[1], 20)
                     && seg.every((q) => near(q.y, 2)); })());
  ok('and one that misses the window is not drawn',
     E.clipLineToRect(E.parseLine2('y = 12').line, 20, 8) === null);
  /* and the window need not be centred on the origin any more */
  const away = E.clipLineToWindow(L, 40, 60, 20, 32);
  ok('a mirror is clipped to a window scrolled far from the origin',
     !!away && away.every((p) => E.onLine2(L, p)
       && p.x >= 40 - 1e-7 && p.x <= 60 + 1e-7 && p.y >= 20 - 1e-7 && p.y <= 32 + 1e-7),
     JSON.stringify(away));
  ok('and one the window has been scrolled past is not drawn',
     E.clipLineToWindow(L, 40, 60, -5, 5) === null);
}

console.log('\n— challenge mode borrows the graph and gives it back —');
{
  let mine = reducer(createInitialState(), { type: 'line2', value: E.parseLine2('y = 2x + 1').line });
  mine = reducer(mine, { type: 'point', index: 0, value: { x: -5, y: 3 } });
  let c = reducer(mine, { type: 'enterChallenge' });
  const task = newTask('2d');
  c = reducer(c, { type: 'loadTask', task });
  ok('the challenge takes the graph over, and masks the sheet', c.mode === 'challenge' && c.pending);
  ok('and a "find the mirror" task never starts on its own answer',
     task.type !== 'mirror' || !E.sameLine2(lineOf(c), task.line));
  c = reducer(c, { type: 'score', correct: true });
  ok('answering unmasks it and counts', !c.pending && c.score === 1 && c.attempts === 1);
  c = reducer(c, { type: 'leaveChallenge' });
  ok('leaving hands the visitor’s own set-up straight back',
     E.sameLine2(lineOf(c), E.parseLine2('y = 2x + 1').line)
     && c.pts2[0].x === -5 && c.pts2[0].y === 3 && c.mode === 'explore' && c.target === null);
  ok('but the score is kept', c.score === 1 && c.attempts === 1);
}

console.log('\n— every challenge is answerable —');
for (const dim of ['2d', '3d']) {
  const seen = {};
  let bad = 0;
  for (let i = 0; i < 1200; i++) {
    const t = newTask(dim);
    const key = t.type + (t.mirror ? `:${t.mirror}` : '');
    seen[key] = (seen[key] || 0) + 1;
    if (t.type === 'image') {
      const truth = t.dim === '3d'
        ? (t.mirror === 'plane'
            ? E.reflectPlane(t.plane, t.point)
            : E.reflectLine3({ A: t.lnA, u: E.subV(t.lnB, t.lnA) }, t.point))
        : E.reflect2(t.line, t.point);
      if (!nearPt(truth, t.answer, 1e-9)) bad++;              /* the stated answer is true */
      if (!checkImage(t, truth)) bad++;                        /* and marking accepts it */
      if (checkImage(t, { x: t.answer.x + 1, y: t.answer.y, z: t.answer.z })) bad++;
      const co = t.dim === '3d' ? ['x', 'y', 'z'] : ['x', 'y'];
      if (co.some((k) => !Number.isInteger(t.answer[k]) || Math.abs(t.answer[k]) > 8)) bad++;
      if (nearPt(t.point, t.answer, 1e-9)) bad++;              /* never already solved */
    } else {
      const mid = { x: (t.point.x + t.image.x) / 2, y: (t.point.y + t.image.y) / 2 };
      if (!E.onLine2(t.line, mid)) bad++;
      if (!nearPt(E.reflect2(t.line, t.point), t.image, 1e-9)) bad++;
      if (!checkMirror(t, E.lineText2(t.line)).ok) bad++;
      if (!checkMirror(t, E.generalText2(t.line).replace(' = 0', '')).ok) bad++;
      if (checkMirror(t, 'y = 99').ok) bad++;
      if (!checkMirror(t, 'nonsense').error) bad++;
    }
  }
  ok(`1200 ${dim} challenges are all sound (${JSON.stringify(seen)})`, bad === 0, `${bad} unsound`);
}
{
  /* the same mirror written three ways has to be marked the same three times */
  const t = { line: E.parseLine2('x + y = 4').line };
  const ways = ['x + y = 4', 'y = 4 - x', '2x + 2y - 8 = 0', 'y = -x + 4'];
  ok('a mirror is marked as a line, not as a string',
     ways.every((w) => checkMirror(t, w).ok));
}

console.log('\n— what the browser remembers —');
{
  let keep = reducer(createInitialState(), { type: 'line2', value: E.parseLine2('3x - 4y + 5 = 0').line });
  keep = reducer(keep, { type: 'object', value: 'triangle' });
  keep = reducer(keep, { type: 'point', index: 2, value: { x: -2, y: -5 } });
  keep = reducer(keep, { type: 'dim', value: '3d' });
  keep = reducer(keep, { type: 'plane', value: { a: 1, b: 1, c: 1, d: -3 } });
  keep = reducer(keep, { type: 'view', key: 'showCoords', value: false });
  keep = reducer(keep, { type: 'zoom', factor: 1 / 1.5 });
  keep = reducer(keep, { type: 'pan', dx: 6.25, dy: -4 });
  writeState(keep);
  const back = readState();
  ok('the mirror survives a reload',
     E.sameLine2(lineOf(back), E.parseLine2('3x - 4y + 5 = 0').line), E.generalText2(lineOf(back)));
  ok('so does the shape and its vertices',
     back.object === 'triangle' && back.pts2[2].x === -2 && back.pts2[2].y === -5);
  ok('so does the plane and the view switches',
     E.samePlane(back.plane, E.tidyPlane({ a: 1, b: 1, c: 1, d: -3 }))
     && back.showCoords === false && back.dim === '3d');
  /* the lab was switched to space before it was panned, so it is the camera's
     target that moved — which is exactly what should have been saved */
  ok('and so does where you had scrolled to, and how far in',
     near(back.range, 12) && near(back.centre3.x, 6.25) && near(back.centre3.y, -4)
     && back.centre2.x === 0,
     `${back.range}, ${JSON.stringify(back.centre3)}`);
}
{
  store.set('jahnavis-lab/reflection/v2', JSON.stringify({
    v: 2, dim: 'sideways', object: 'dodecahedron',
    pts2: [{ x: 900, y: 'banana' }], pts3: null,
    line2: { a: 0, b: 0, c: 4 },                          /* not a line at all */
    plane: { a: 0, b: 0, c: 0, d: 5 },                    /* not a plane either */
    lnA: { x: 1, y: 1, z: 1 }, lnB: { x: 1, y: 1, z: 1 },
    centre2: { x: 'over there', y: 2 }, centre3: null,
    yaw: 'north', pitch: 999, range: 1e12, snap: 'yes',
    score: { score: 9, attempts: 2 }, tab: 'challenge',
  }));
  const junk = readState();
  ok('a nonsense graph falls back to the flat one', junk.dim === '2d');
  ok('a nonsense shape falls back to a single point', junk.object === 'point');
  ok('a saved mirror with no direction is replaced by a real one',
     Math.hypot(lineOf(junk).a, lineOf(junk).b) > 0
     && E.sameLine2(lineOf(junk), initialState.line2));
  ok('a plane with no normal is replaced',
     Math.hypot(junk.plane.a, junk.plane.b, junk.plane.c) > 0);
  ok('a line in space with no length is replaced',
     E.lenV(E.subV(junk.lnA, junk.lnB)) > 0.5);
  ok('a corrupt vertex list is dropped whole',
     junk.pts2.length === initialState.pts2.length
     && junk.pts2.every((p) => isFinite(p.x) && isFinite(p.y)));
  ok('a reach beyond anything the lab can draw is pulled back into range',
     junk.range >= RANGE_MIN && junk.range <= RANGE_MAX, junk.range);
  ok('and a place to look at that is not a place falls back to the origin',
     junk.centre2.x === 0 && junk.centre2.y === 0 && junk.centre3.z === 0,
     JSON.stringify(junk.centre2));
  ok('a camera pointing nowhere is pulled back into range',
     junk.yaw === initialState.yaw && junk.pitch === 85, `${junk.yaw}, ${junk.pitch}`);
  ok('a score cannot exceed its attempts', junk.score <= junk.attempts,
     `${junk.score}/${junk.attempts}`);
  ok('and a challenge is never restored', junk.tab === 'explore');
  store.set('jahnavis-lab/reflection/v2', 'not json');
  ok('unparseable storage just starts fresh', readState() === null);
  store.set('jahnavis-lab/reflection/v2', '{"v":99}');
  ok('a version this lab does not know is ignored', readState() === null);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
