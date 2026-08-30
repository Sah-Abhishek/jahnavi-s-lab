import * as E from '../src/labs/simple-pendulum/engine.js';
import { reducer, initialState, writeState, readState, createInitialState } from '../src/labs/simple-pendulum/labState.js';
import { newTask, lengthForPeriod, TUNE_TOLERANCE } from '../src/labs/simple-pendulum/challenges.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, extra); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

/** Exactly the loop the lab runs: fixed-step RK4, with the same interpolated
    zero-crossing clock. If this agrees with the elliptic integral, the lab's
    "measured" column is measuring something real. */
function run(L, g, ampDeg, { damping = 0, seconds = 60 } = {}) {
  let theta = ampDeg * E.DEG, omega = 0, t = 0;
  let first = null, lastCross = 0, count = 0, elapsed = 0, period = null;
  let maxE = -Infinity, minE = Infinity;
  const m = 2;
  const steps = Math.round(seconds / E.PHYS_STEP);
  for (let i = 0; i < steps; i++) {
    const before = theta;
    [theta, omega] = E.rk4(theta, omega, g, L, damping, E.PHYS_STEP);
    t += E.PHYS_STEP;
    const en = E.kinetic(m, L, omega) + E.potential(m, g, L, theta);
    maxE = Math.max(maxE, en); minE = Math.min(minE, en);
    if (before < 0 && theta >= 0) {
      const at = t - E.PHYS_STEP + (-before / (theta - before)) * E.PHYS_STEP;
      if (first === null) first = at;
      else { count++; elapsed = at - first; period = at - lastCross; }
      lastCross = at;
    }
  }
  return { measured: count ? elapsed / count : null, period, count,
           amplitudeNow: Math.abs(theta), drift: (maxE - minE) / maxE };
}

console.log('\n— the textbook formula —');
ok('T = 2π√(L/g) for 1 m on Earth is 2.006 s',
   near(E.smallAnglePeriod(1, 9.81), 2.006064, 1e-5), E.smallAnglePeriod(1, 9.81));
ok('the seconds pendulum is 0.994 m',
   near(lengthForPeriod(2, 9.81), 0.9940, 5e-4), lengthForPeriod(2, 9.81));
ok('length and period invert exactly',
   near(E.smallAnglePeriod(lengthForPeriod(1.37, 9.81), 9.81), 1.37, 1e-9));

console.log('\n— the exact period, against known values —');
for (const [deg, want] of [[15, 0.4300], [45, 3.9973], [90, 18.0340]]) {
  const got = E.amplitudeError(1, 9.81, deg * E.DEG);
  ok(`at ${deg}° the formula is ${want}% fast`, near(got, want, 0.002), got.toFixed(4));
}

console.log('\n— the simulation agrees with the mathematics —');
for (const [L, amp] of [[1, 5], [1, 20], [1, 45], [0.25, 30], [2.5, 70], [0.4, 80]]) {
  const want = E.truePeriod(L, 9.81, amp * E.DEG);
  const got = run(L, 9.81, amp, { seconds: 40 }).measured;
  ok(`L=${L} m at ${amp}°: clock ${got.toFixed(5)} s vs theory ${want.toFixed(5)} s`,
     near(got, want, 2e-4), `off by ${((got - want) * 1000).toFixed(3)} ms`);
}

console.log('\n— energy is conserved by the integrator —');
const long = run(1, 9.81, 60, { seconds: 120 });
ok('energy drifts less than a thousandth over 120 s', long.drift < 1e-3, long.drift.toExponential(2));

console.log('\n— the two headline results —');
const heavy = run(1, 9.81, 20), light = run(1, 9.81, 20);
ok('mass is not in the equation of motion at all',
   heavy.measured === light.measured);
const short = run(0.5, 9.81, 8).measured, four = run(2, 9.81, 8).measured;
ok('four times the length gives twice the period',
   near(four / short, 2, 2e-3), (four / short).toFixed(5));
const moon = run(1, 1.62, 8).measured, earth = run(1, 9.81, 8).measured;
ok('on the Moon it is √(9.81/1.62) = 2.46× slower',
   near(moon / earth, Math.sqrt(9.81 / 1.62), 2e-3), (moon / earth).toFixed(4));

console.log('\n— air resistance —');
const damped = run(1.5, 9.81, 40, { damping: E.DAMP_RATE, seconds: 40 });
const free = run(1.5, 9.81, 40, { seconds: 40 });
ok('the swing dies away', damped.amplitudeNow < 0.25 * 40 * E.DEG,
   (damped.amplitudeNow / E.DEG).toFixed(2) + '°');
ok('but it keeps very nearly the same time',
   near(damped.measured, free.measured, 0.05 * free.measured),
   `${damped.measured.toFixed(3)} vs ${free.measured.toFixed(3)}`);

console.log('\n— the drawing scale —');
ok('a 1 m pendulum gets a 1 m frame', E.niceFrame(1) === 1);
ok('a 1.2 m pendulum gets a 1.5 m frame', E.niceFrame(1.2) === 1.5);
ok('a 6 m pendulum gets a 7 m frame', E.niceFrame(6) === 7);
const lay = E.layout(E.PROFILES.wide, { compare: false, a: { length: 1, amplitude: 20 } });
ok('the pendulum fits inside the drawing',
   lay.pxPerM * 1 <= E.PROFILES.wide.drop + 1e-6, lay.pxPerM);
const layC = E.layout(E.PROFILES.wide,
  { compare: true, a: { length: 2, amplitude: 80 }, b: { length: 0.5, amplitude: 80 } });
ok('and a wide swing fits sideways in compare mode',
   layC.pxPerM * 2 * Math.sin(80 * E.DEG) <= E.PROFILES.wide.compare.half + 1e-6);

console.log('\n— the reducer —');
let s = createInitialState();
const e0 = s.epoch;
s = reducer(s, { type: 'arm', which: 'a', key: 'mass', value: 9 });
ok('changing the mass does NOT restart the swing', s.epoch === e0 && s.a.mass === 9);
s = reducer(s, { type: 'arm', which: 'a', key: 'length', value: 2 });
ok('changing the length does restart it', s.epoch === e0 + 1 && s.a.length === 2);
s = reducer(s, { type: 'view', key: 'showForces', value: true });
ok('a view switch never disturbs the swing', s.epoch === e0 + 1 && s.showForces);
s = reducer(s, { type: 'arm', which: 'a', key: 'amplitude', value: 400 });
ok('an impossible release angle is clamped to 85°', s.a.amplitude === 85, s.a.amplitude);
s = reducer(s, { type: 'arm', which: 'a', key: 'length', value: -3 });
ok('a negative length is clamped', s.a.length === E.LEN_MIN, s.a.length);
s = reducer(s, { type: 'preset', name: 'mass' });
ok('the mass preset hangs two equal strings',
   s.compare && s.a.length === s.b.length && s.a.mass !== s.b.mass);

console.log('\n— challenge mode parks the visitor’s own apparatus —');
let mine = reducer(createInitialState(), { type: 'arm', which: 'a', key: 'length', value: 1.75 });
let c = reducer(mine, { type: 'enterChallenge' });
c = reducer(c, { type: 'loadTask', task: newTask(9.81), frozen: false });
ok('the challenge takes the apparatus over', c.a.length !== 1.75 || c.mode === 'challenge');
c = reducer(c, { type: 'leaveChallenge' });
ok('and leaving hands it straight back', c.a.length === 1.75 && c.mode === 'explore');

console.log('\n— challenges are sound —');
let predicts = 0, tunes = 0, bad = 0, sameCase = 0;
for (let i = 0; i < 400; i++) {
  const t = newTask(9.81);
  if (!t) { bad++; continue; }
  if (t.type === 'predict') {
    predicts++;
    const Ta = E.smallAnglePeriod(t.a.length, t.g), Tb = E.smallAnglePeriod(t.b.length, t.g);
    const truth = near(Ta, Tb, 1e-12) ? 'same' : (Ta < Tb ? 'a' : 'b');
    if (truth !== t.answer) bad++;
    if (t.answer === 'same') { sameCase++; if (t.a.mass === t.b.mass) bad++; }
  } else {
    tunes++;
    if (!near(lengthForPeriod(t.period, t.g), t.target, 1e-9)) bad++;
    if (Math.abs(t.a.length - t.target) <= TUNE_TOLERANCE) bad++;   // starts solved
  }
}
ok(`400 challenges are all answerable (${predicts} predict, ${tunes} tune, ${sameCase} "same period")`,
   bad === 0 && predicts > 0 && tunes > 0, `${bad} unsound`);

console.log('\n— what the browser remembers —');
let keep = reducer(createInitialState(), { type: 'compare', value: true });
keep = reducer(keep, { type: 'arm', which: 'b', key: 'length', value: 2.4 });
keep = reducer(keep, { type: 'gravity', value: 1.62 });
keep = reducer(keep, { type: 'view', key: 'showEnergy', value: true });
writeState(keep);
const back = readState();
ok('gravity survives a reload', back.g === 1.62);
ok('both pendulums survive', back.compare && back.b.length === 2.4);
ok('the view switches survive', back.showEnergy === true);
store.set('jahnavis-lab/simple-pendulum/v1',
  '{"v":1,"g":"banana","a":{"length":-9,"mass":null},"score":{"score":5,"attempts":1}}');
const junk = readState();
/* the contract is that nothing invalid ever reaches the lab: a number out of
   range is pulled back into it, and anything that is not a number is replaced */
ok('a nonsense gravity falls back to Earth', junk.g === 9.81, junk.g);
ok('an out-of-range length is pulled back into range',
   junk.a.length >= E.LEN_MIN && junk.a.length <= E.LEN_MAX, junk.a.length);
ok('a non-numeric mass falls back to the default',
   junk.a.mass === initialState.a.mass, junk.a.mass);
ok('and a score cannot exceed its attempts', junk.score <= junk.attempts,
   `${junk.score}/${junk.attempts}`);
store.set('jahnavis-lab/simple-pendulum/v1', 'not json');
ok('unparseable storage just starts fresh', readState() === null);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
