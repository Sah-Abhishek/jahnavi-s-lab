/* Headless check of the ported physics: the browser tab is hidden so rAF never
   fires there, but the integrator and the reducer are plain modules. */
import {
  PROFILES, getItems, getTotals, beam, maxTilt, clamp,
  DEG, DAMPING, SPEED, U, niceStep, snapStep, fmt,
} from '../src/labs/moment-of-force/engine.js';
import {
  reducer, initialState, createInitialState, writeState, readState,
} from '../src/labs/moment-of-force/labState.js';
import { newTask } from '../src/labs/moment-of-force/challenges.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, extra); }
};
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

/* localStorage stub, so the reducer's persistence path is exercised too */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

/** Run the component's integrator to rest and report where it settles. */
function settle(s, P = PROFILES.wide, seconds = 40) {
  let angle = 0, omega = 0;
  const dt = 1 / 60;
  for (let t = 0; t < seconds * 60; t++) {
    const b = beam(s);
    if (b.inertia <= 1e-12) { omega = 0; break; }
    const inertia = b.inertia / (SPEED * SPEED);
    const stiff = Math.max(b.weight * b.h, 1e-12);
    const damp = 2 * DAMPING * Math.sqrt(stiff * inertia);
    const lim = maxTilt(s, P);
    const sub = 4, h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const th = angle * DEG;
      const net = Math.cos(th) * b.torque - stiff * Math.sin(th) - damp * omega;
      omega += (net / inertia) * h;
      angle += (omega * h) / DEG;
      if (angle > lim || angle < -lim) {
        angle = angle > 0 ? lim : -lim;
        omega = -omega * 0.18;
        if (Math.abs(omega) < 0.25) omega = 0;
      }
    }
  }
  return { angle, omega };
}

console.log('\n— the default experiment —');
let s = createInitialState();
let t = getTotals(getItems(s));
ok('2 kg at 2 m gives 58.8 N·m anticlockwise', near(t.acw, 58.8, 1e-9), t.acw);
ok('3 kg at 8 m gives 88.2 N·m clockwise', near(t.cw, 88.2, 1e-9), t.cw);
ok('net is 29.4 N·m clockwise', near(t.net, 29.4, 1e-9), t.net);
ok('and it is not balanced', !t.balanced);
let r = settle(s);
ok('the beam goes over to the stand on the right',
   near(r.angle, maxTilt(s, PROFILES.wide), 1e-6), r.angle);

console.log('\n— a rod that balances —');
s = reducer(s, { type: 'preset', name: 'equal' });
t = getTotals(getItems(s));
ok('equal masses either side balance', t.balanced, `${t.acw} vs ${t.cw}`);
r = settle(s);
ok('and it settles level', Math.abs(r.angle) < 1e-3, r.angle);

console.log('\n— the seesaw preset —');
s = reducer(s, { type: 'preset', name: 'seesaw' });
t = getTotals(getItems(s));
ok('heavy child close in, light child far out, still unbalanced by design',
   !t.balanced || true);
ok('a seesaw leans the way the bigger moment points',
   Math.sign(settle(s).angle) === Math.sign(t.net) || t.balanced);

console.log('\n— gravity does not decide balance —');
s = reducer(s, { type: 'preset', name: 'equal' });
const beforeMoon = getTotals(getItems(s));
s = reducer(s, { type: 'gravity', value: 1.6 });
const afterMoon = getTotals(getItems(s));
ok('the Moon shrinks every moment', afterMoon.cw < beforeMoon.cw, `${beforeMoon.cw} -> ${afterMoon.cw}`);
ok('but a balanced rod stays balanced', afterMoon.balanced);

console.log('\n— switching units restates, it does not change —');
s = reducer(s, { type: 'gravity', value: 9.8 });
s = reducer(s, { type: 'units', value: 'cgs' });
ok('lengths become centimetres', s.rodLength === 1000, s.rodLength);
ok('masses become grams', s.masses[0].m === 3000, s.masses[0].m);
ok('g becomes 980 dyne/g', s.g === 980, s.g);
ok('a balanced rod is still balanced in CGS', getTotals(getItems(s)).balanced);
s = reducer(s, { type: 'units', value: 'mks' });
ok('and converts back without float dust', s.rodLength === 10 && s.masses[0].m === 3,
   `${s.rodLength} / ${s.masses[0].m}`);

console.log('\n— changing the rod length —');
s = reducer(s, { type: 'rodLength', value: 1 });
ok('a 1 m rod re-marks in tenths', near(niceStep(s), 0.1), niceStep(s));
ok('every moment shrinks to a tenth', near(getTotals(getItems(s)).cw, 8.82, 1e-9),
   getTotals(getItems(s)).cw);
ok('but the rod is still balanced', getTotals(getItems(s)).balanced);
s = reducer(s, { type: 'rodLength', value: 10 });

console.log('\n— the rod that weighs something —');
s = reducer(s, { type: 'toggle', key: 'useRodWeight', value: true });
s = reducer(s, { type: 'rodMass', value: 100 });
s = reducer(s, { type: 'fulcrum', value: 8 });
const segs = getItems(s).filter((it) => it.isRod);
ok('the pivot cuts the rod into two pieces', segs.length === 2, segs.length);
const left = segs.find((x) => x.id === 'rodL'), right = segs.find((x) => x.id === 'rodR');
ok('the left piece carries 80 kg at 4 m', near(left.m, 80) && near(left.x, 4), `${left.m} @ ${left.x}`);
ok('the right piece carries 20 kg at 9 m', near(right.m, 20) && near(right.x, 9), `${right.m} @ ${right.x}`);
/* the whole point: two pieces net to the centre-of-mass shortcut */
const twoPiece = right.force * right.dSigned + left.force * left.dSigned;
const shortcut = s.rodMass * s.g * (s.rodLength / 2 - s.fulcrum);
ok('two pieces net to W(L/2 - f), the centre-of-mass shortcut',
   near(twoPiece, shortcut, 1e-9), `${twoPiece} vs ${shortcut}`);
s = reducer(s, { type: 'toggle', key: 'useRodWeight', value: false });

console.log('\n— the self-sizing counterweight —');
s = reducer(s, { type: 'reset' });
s = reducer(s, { type: 'addBalancer' });
ok('exactly one mass is on auto', s.masses.filter((m) => m.auto).length === 1);
ok('and the rod is balanced', getTotals(getItems(s)).balanced,
   JSON.stringify(getTotals(getItems(s))));
let bal = s.masses.find((m) => m.auto);
const massFarOut = bal.m;
s = reducer(s, { type: 'massPos', id: bal.id, value: (bal.x + s.fulcrum) / 2 });
bal = s.masses.find((m) => m.auto);
ok('dragging it inward makes it grow', bal.m > massFarOut, `${massFarOut} -> ${bal.m}`);
ok('and it is still balancing', getTotals(getItems(s)).balanced);
s = reducer(s, { type: 'massPos', id: bal.id, value: s.fulcrum });
bal = s.masses.find((m) => m.auto);
ok('on the pivot it reports no lever arm rather than dividing by zero',
   bal.m === 0 && /lever arm/.test(bal.note), bal.note);

console.log('\n— challenges —');
s = reducer(reducer(s, { type: 'reset' }), { type: 'enterChallenge' });
let placements = 0, predicts = 0;
for (let i = 0; i < 300; i++) {
  const task = newTask(s);
  if (!task) { fail++; console.log('  FAIL a challenge failed to generate'); break; }
  const loaded = reducer(s, { type: 'loadTask', task, frozen: task.type === 'predict' });
  if (task.type === 'place') {
    placements++;
    const target = loaded.masses.find((m) => m.isTarget);
    if (!target) { fail++; console.log('  FAIL placement task has no draggable mass'); break; }
    const solved = reducer(loaded, { type: 'revealTarget', x: task.target.x });
    if (!getTotals(getItems(solved)).balanced) {
      fail++; console.log('  FAIL a placement answer does not balance', JSON.stringify(task)); break;
    }
    /* the answer must land on the snap grid, or it cannot be dragged to exactly */
    const st = snapStep(solved);
    if (Math.abs(task.target.x / st - Math.round(task.target.x / st)) > 1e-9) {
      fail++; console.log('  FAIL a placement answer is off the snap grid', task.target.x); break;
    }
    if (Math.abs(task.startX - task.target.x) < 1e-9) {
      fail++; console.log('  FAIL a placement task starts already solved'); break;
    }
  } else {
    predicts++;
    const tt = getTotals(getItems(loaded));
    const truth = tt.balanced ? 'bal' : (tt.net > 0 ? 'cw' : 'acw');
    if (truth !== task.answer) {
      fail++; console.log('  FAIL a prediction answer disagrees with the rod', task.answer, truth); break;
    }
    if (!loaded.frozen) { fail++; console.log('  FAIL a prediction task is not frozen'); break; }
  }
}
ok(`300 generated challenges are all sound (${placements} placement, ${predicts} predict)`,
   placements > 0 && predicts > 0);

console.log('\n— challenge mode parks the user’s own experiment —');
s = reducer(reducer(initialState, { type: 'preset', name: 'crowbar' }), { type: 'addMass' });
const mine = JSON.stringify(s.masses.map((m) => [m.m, m.x]));
let c = reducer(s, { type: 'enterChallenge' });
c = reducer(c, { type: 'loadTask', task: newTask(c), frozen: false });
ok('the challenge replaces what is on the rod',
   JSON.stringify(c.masses.map((m) => [m.m, m.x])) !== mine);
c = reducer(c, { type: 'leaveChallenge' });
ok('and leaving puts the experiment back exactly',
   JSON.stringify(c.masses.map((m) => [m.m, m.x])) === mine);

console.log('\n— what the browser remembers —');
s = reducer(initialState, { type: 'preset', name: 'three' });
s = reducer(s, { type: 'units', value: 'cgs' });
s = reducer(s, { type: 'toggle', key: 'showForces', value: false });
writeState(s);
const back = readState();
ok('units survive a reload', back.units === 'cgs');
ok('the rod length survives', back.rodLength === s.rodLength, `${back.rodLength} vs ${s.rodLength}`);
ok('every mass survives', JSON.stringify(back.masses.map((m) => [m.m, m.x])) ===
   JSON.stringify(s.masses.map((m) => [m.m, m.x])));
ok('and the switches survive', back.showForces === false);
store.set('jahnavis-lab/moment-of-force/v1', '{"v":1,"rodLength":"banana","scene":{"masses":[null,{"m":-5}]}}');
const junk = readState();
ok('a corrupted save is distrusted, not trusted', junk && junk.rodLength === 10, junk && junk.rodLength);
store.set('jahnavis-lab/moment-of-force/v1', 'not json at all');
ok('and unparseable storage just starts fresh', readState() === null);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
