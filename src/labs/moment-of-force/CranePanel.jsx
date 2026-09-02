/* ============================================================
   Moment of Force — the real world.
   A guided walk through the one moment experiment everybody has
   already seen: the tower crane. Each step redresses the lab as a
   crane and sets the scene it is talking about, so the text and
   the picture always agree — every number in the prose is read
   live from the experiment, not written into it.
   ============================================================ */
import { useState } from 'react';
import { U, RL, getItems, getTotals, posDp, fmt, kgOf } from './engine';

/* Each step rebuilds the crane from the preset before its own change, so the
   story cannot be derailed by fiddling in between — fiddling is encouraged.
   setScene numbers masses from 1, so after the preset the counterweight is
   mass 1 and the load is mass 2. */
const STEPS = [
  {
    title: 'Meet the machine',
    apply: (d, s) => {
      d({ type: 'preset', name: 'crane' });
    },
    body: ({ u, counter, load, dp }) => (
      <>
        <p>The <strong>tower</strong> is the fulcrum, and the long lattice <strong>jib</strong> is
          the rod, marked 0 where it crosses the tower. On the short side sits
          the <strong>counterweight</strong>{counter && <> — {kgOf(counter.m)} {u.mass}, kept close in</>}.
          On the long side a <strong>trolley</strong> runs along the jib with the load on its
          hook{load && <> — {kgOf(load.m)} {u.mass}, far out</>}.</p>
        <p>A load&rsquo;s mark on the jib has a name on a building site: its
          <strong> working radius</strong>. Drag anything — it is still the same experiment.</p>
      </>
    ),
  },
  {
    title: 'No load: the counterweight wins',
    apply: (d) => {
      d({ type: 'preset', name: 'crane' });
      d({ type: 'massEnabled', id: 2, value: false });
    },
    body: ({ u, counter }) => (
      <>
        <p>The hook is empty — and the crane is <em>not</em> balanced at all. The
          counterweight&rsquo;s moment{counter && <> of{' '}
          <strong>{fmt(counter.moment)} {u.moment}</strong></>} has nothing to fight, so the jib
          tips backwards, towards the counterweight.</p>
        <p>A real tower is bolted stiff enough to lean on; our jib is free to swing so
          the unbalance shows. Notice what this means: a crane must stand the empty
          case <em>and</em> the loaded case. Balance is not one condition but two.</p>
      </>
    ),
  },
  {
    title: 'Pick up the load',
    apply: (d) => {
      d({ type: 'preset', name: 'crane' });
    },
    body: ({ u, counter, load, dp, t }) => (
      <>
        <p>Hook the load back on and the two moments meet in the middle
          {counter && load && <>:{' '}
            <strong>{kgOf(counter.m)} {u.mass}</strong> at {counter.d.toFixed(dp)} {u.len} against{' '}
            <strong>{kgOf(load.m)} {u.mass}</strong> at {load.d.toFixed(dp)} {u.len}</>}.</p>
        {counter && load && (
          <span className="given">
            anticlockwise&ensp;{fmt(counter.force)} × {counter.d.toFixed(dp)} = {fmt(counter.moment)} {u.moment}<br />
            clockwise&ensp;&ensp;&ensp;{fmt(load.force)} × {load.d.toFixed(dp)} = {fmt(load.moment)} {u.moment}
          </span>
        )}
        <p>Heavy and close balances light and far. It is the <em>moments</em> that match —
          never the masses.</p>
      </>
    ),
  },
  {
    title: 'Run the trolley out',
    apply: (d, s) => {
      d({ type: 'preset', name: 'crane' });
      d({ type: 'massPos', id: 2, value: 0.95 * RL(s) });
    },
    body: ({ u, load, t, dp }) => (
      <>
        <p>Nothing was added to the hook — the trolley only ran the same load further
          out{load && <>, to a radius of <strong>{load.d.toFixed(dp)} {u.len}</strong></>}. Its
          moment grew with the distance, the counterweight&rsquo;s did not, and over it
          goes{t && !t.balanced && <> — clockwise wins by{' '}
          <strong>{fmt(Math.abs(t.net))} {u.moment}</strong></>}.</p>
        <p>This is the whole danger of crane work: the driver&rsquo;s enemy is not the
          weight of the load but its <strong>radius</strong>.</p>
      </>
    ),
  },
  {
    title: 'The load chart',
    apply: (d, s) => {
      d({ type: 'preset', name: 'crane' });
      d({ type: 'massPos', id: 2, value: 0.95 * RL(s) });
      d({ type: 'massAuto', id: 2 });
    },
    body: ({ u, load, dp }) => (
      <>
        <p>In every crane cab hangs a card called the <strong>load chart</strong>: the further
          out the trolley, the less it may lift. The load is now on <strong>Auto</strong>, so
          the lab solves that chart live{load && <> — at a radius
          of {load.d.toFixed(dp)} {u.len} the biggest safe load
          is <strong>{kgOf(load.m)} {u.mass}</strong></>}.</p>
        <p><strong>Drag the load along the jib</strong> and read the chart off its mass:
          the product m × g × d never moves. A load chart is just M = F × d, read
          backwards.</p>
      </>
    ),
  },
  {
    title: 'Look up',
    apply: (d) => {
      d({ type: 'preset', name: 'crane' });
    },
    body: ({ u }) => (
      <>
        <p>Every crane on every skyline is holding this one equation, all day, in the
          wind. Things to try before you go:</p>
        <ul className="investigate">
          <li>Slide the <strong>tower</strong> and watch every radius re-number itself.</li>
          <li>Switch on <strong>Rod has weight</strong> — a real jib is tonnes of steel, and
            both halves of it turn the crane.</li>
          <li>Take the <strong>Challenge</strong> tab: you are the crane driver now.</li>
        </ul>
        <p className="micro">The site clothes belong to this tab — step over
          to <strong>Explore</strong> and the same experiment is back on the bench, every
          number unchanged.</p>
      </>
    ),
  },
];

export default function CranePanel({ state: s, dispatch }) {
  const [step, setStep] = useState(-1);        // -1: the invitation, before anything is touched
  const u = U(s);
  const dp = posDp(s);

  const goTo = (n) => {
    STEPS[n].apply(dispatch, s);
    setStep(n);
  };

  /* everything the step texts quote, read fresh from the experiment */
  const live = getItems(s).filter((it) => !it.isRod && it.active);
  const counter = live.filter((it) => it.x < s.fulcrum).sort((a, b) => a.x - b.x)[0];
  const load = live.filter((it) => it.x > s.fulcrum).sort((a, b) => b.x - a.x)[0];
  const t = getTotals(getItems(s));
  const ctx = { s, u, dp, counter, load, t };

  const cur = step >= 0 ? STEPS[step] : null;
  const last = step === STEPS.length - 1;

  return (
    <div className="card tabpanel crane-story">
      <h2 className="learn-title">The crane on the skyline</h2>
      <p className="story-lead">Next time you pass a building site, look up. The tower crane
        leaning over it is this experiment — built forty storeys up, left out in the rain,
        and balanced by nothing but <strong>moments</strong>.</p>

      <div className="task-box story-step">
        {cur ? (
          <>
            <span className="story-count">Step {step + 1} of {STEPS.length}</span>
            <h3>{cur.title}</h3>
            {cur.body(ctx)}
          </>
        ) : (
          <>
            <h3>Ready?</h3>
            <p>Press <strong>Build the crane</strong> and the rod, wedge and masses will put on
              their site clothes — same rod, same rule, better hard hat.</p>
          </>
        )}
      </div>

      <div className="task-actions">
        <button className="btn" disabled={step <= 0} onClick={() => goTo(step - 1)}>
          Back
        </button>
        <button className="btn primary" onClick={() => goTo(last ? 0 : step + 1)}>
          {step < 0 ? 'Build the crane' : last ? 'Start again' : 'Next'}
        </button>
        {cur && (
          <button className="btn ghost" title="Put the step's scene back the way it was set"
                  onClick={() => goTo(step)}>
            Reset this step
          </button>
        )}
      </div>
    </div>
  );
}
