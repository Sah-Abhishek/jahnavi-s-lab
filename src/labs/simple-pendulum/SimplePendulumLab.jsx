/* ============================================================
   Simple Pendulum Lab
   A bob on a string, obeying θ'' = −(g/L) sin θ, timed by the lab
   itself so the textbook formula always has something to answer to.

   React owns the apparatus; this component owns the two things
   React should not re-render for — the integration, which runs on
   requestAnimationFrame at a fixed physics step, and the measured
   width that picks the drawing's geometry.
   ============================================================ */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Scene from './Scene';
import Readout, { StageHead } from './Readout';
import ExplorePanel from './ExplorePanel';
import ChallengePanel from './ChallengePanel';
import LearnPanel from './LearnPanel';
import { reducer, createInitialState, writeState } from './labState';
import { PROFILES, PHYS_STEP, DAMP_RATE, DEG, clamp, rk4 } from './engine';
import './lab.css';

const TABS = [
  { id: 'explore', name: 'Explore' },
  { id: 'challenge', name: 'Challenge' },
  { id: 'learn', name: 'Learn' },
];

/* below this width the wide drawing's furniture is too small to touch or read */
const COMPACT_BELOW = 760;

/** A bob at the top of its swing, with the clock not yet started. */
const freshArm = (amplitudeDeg) => ({
  theta: amplitudeDeg * DEG,
  omega: 0,
  first: null,      // when it first passed through the bottom going right
  lastCross: 0,
  count: 0,         // whole periods since then
  elapsed: 0,
  period: null,     // the most recent single period
});

const snapshot = (arm) => ({
  theta: arm.theta, omega: arm.omega, count: arm.count,
  elapsed: arm.elapsed, period: arm.period,
});

export default function SimplePendulumLab() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [profile, setProfile] = useState(PROFILES.wide);
  const [unitsPerPx, setUnitsPerPx] = useState('1');
  const [motion, setMotion] = useState(() => ({
    a: snapshot(freshArm(state.a.amplitude)),
    b: snapshot(freshArm(state.b.amplitude)),
  }));

  const wrapRef = useRef(null);
  /* the loop reads these instead of closing over a render's values, so it
     never has to be torn down and rebuilt as the apparatus changes */
  const live = useRef({
    state, profile, acc: 0, t: 0, dragging: null,
    arms: { a: freshArm(state.a.amplitude), b: freshArm(state.b.amplitude) },
  });
  live.current.state = state;
  live.current.profile = profile;

  /* ---------- the drawing picks its geometry from its measured width ---------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      const wanted = (!w || w >= COMPACT_BELOW) ? PROFILES.wide : PROFILES.compact;
      setProfile(wanted);
      /* drawing units per CSS pixel: lets the stylesheet size labels in real px */
      setUnitsPerPx((w ? wanted.W / w : 1).toFixed(4));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- any change to the apparatus releases the bob again ---------- */
  useEffect(() => {
    const L = live.current;
    L.arms.a = freshArm(L.state.a.amplitude);
    L.arms.b = freshArm(L.state.b.amplitude);
    L.t = 0;
    L.acc = 0;
    setMotion({ a: snapshot(L.arms.a), b: snapshot(L.arms.b) });
  }, [state.epoch]);

  /* ---------- the swing ---------- */
  useEffect(() => {
    let raf = 0, lastFrame = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const L = live.current;
      const s = L.state;
      let dt = lastFrame ? (now - lastFrame) / 1000 : 0;
      lastFrame = now;
      dt = clamp(dt, 0, 0.05);            /* a backgrounded tab must not leap */

      if (s.running && !s.frozen && dt > 0) {
        const b = s.damping ? DAMP_RATE : 0;
        const which = s.compare ? ['a', 'b'] : ['a'];
        L.acc += dt;
        /* a fixed step keeps a short pendulum, which swings three times a
           second, as accurate as a long one */
        let guard = 0;
        while (L.acc >= PHYS_STEP && guard++ < 600) {
          L.acc -= PHYS_STEP;
          L.t += PHYS_STEP;
          for (const k of which) {
            if (L.dragging === k) continue;
            const arm = L.arms[k];
            const before = arm.theta;
            const [th, om] = rk4(arm.theta, arm.omega, s.g, s[k].length, b, PHYS_STEP);
            arm.theta = th;
            arm.omega = om;
            /* the clock ticks each time the bob passes the bottom going the
               same way — one whole period apart, interpolated for precision */
            if (before < 0 && th >= 0) {
              const frac = -before / (th - before);
              const at = L.t - PHYS_STEP + frac * PHYS_STEP;
              if (arm.first === null) {
                arm.first = at;
              } else {
                arm.count += 1;
                arm.elapsed = at - arm.first;
                arm.period = at - arm.lastCross;
              }
              arm.lastCross = at;
            }
          }
        }
      }
      setMotion({ a: snapshot(L.arms.a), b: snapshot(L.arms.b) });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------- dragging a bob aside ---------- */
  const onGrab = useCallback((which) => {
    const L = live.current;
    L.dragging = which;
    L.arms[which].omega = 0;
  }, []);

  const onDrag = useCallback((which, theta) => {
    const L = live.current;
    L.arms[which].theta = theta;
    L.arms[which].omega = 0;
    setMotion({ a: snapshot(L.arms.a), b: snapshot(L.arms.b) });
  }, []);

  /* Letting go sets the release angle, which bumps the epoch and starts the
     clock again from the top — exactly what happens at a real bench. */
  const onRelease = useCallback((which) => {
    const L = live.current;
    L.dragging = null;
    const deg = Math.abs(L.arms[which].theta / DEG);
    dispatch({ type: 'release', which, amplitude: Math.max(1, Math.round(deg)) });
  }, []);

  /* ---------- the set-up is kept in this browser, and nowhere else ---------- */
  useEffect(() => {
    const t = setTimeout(() => writeState(state), 250);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    const flush = () => writeState(live.current.state);
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, []);

  return (
    <div className="lab-layout">
      <section className="card stage-card">
        <StageHead state={state} motion={motion} />
        <div className="scene-wrap" ref={wrapRef}>
          <Scene state={state} profile={profile} motion={motion} unitsPerPx={unitsPerPx}
                 onGrab={onGrab} onDrag={onDrag} onRelease={onRelease} dispatch={dispatch} />
        </div>
        <p className="hint">
          <span className="kbd">Drag</span> a bob aside and let go ·{' '}
          <span className="kbd">Tab</span> then <span className="kbd">← →</span> also works
        </p>
      </section>

      <Readout state={state} motion={motion} />

      <aside className="side-col">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={state.tab === t.id}
                    className={`tab${state.tab === t.id ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'tab', value: t.id })}>
              {t.name}
            </button>
          ))}
        </div>
        {state.tab === 'explore' && <ExplorePanel state={state} dispatch={dispatch} />}
        {state.tab === 'challenge' && <ChallengePanel state={state} dispatch={dispatch} />}
        {state.tab === 'learn' && <LearnPanel />}
      </aside>
    </div>
  );
}
