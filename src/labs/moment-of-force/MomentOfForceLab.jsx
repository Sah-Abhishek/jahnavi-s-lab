/* ============================================================
   Moment of Force Lab
   A rod on a movable fulcrum with hanging masses. Everything is
   measured from the fulcrum:  moment = F x d

   React owns the experiment; this component owns the two things
   React should not re-render for — the beam's swing, which runs
   on requestAnimationFrame, and the measured width that picks
   the drawing's geometry.
   ============================================================ */
import { useEffect, useReducer, useRef, useState } from 'react';
import Scene from './Scene';
import CalcTable, { StageHead } from './CalcTable';
import ExplorePanel from './ExplorePanel';
import ChallengePanel from './ChallengePanel';
import LearnPanel from './LearnPanel';
import CranePanel from './CranePanel';
import { reducer, createInitialState, writeState } from './labState';
import { PROFILES, beam, maxTilt, clamp, DEG, DAMPING, SPEED } from './engine';
import './lab.css';

const TABS = [
  { id: 'explore', name: 'Explore' },
  { id: 'challenge', name: 'Challenge' },
  { id: 'world', name: 'Real world' },
  { id: 'learn', name: 'Learn' },
];

/* below this width the wide drawing's furniture is too small to touch or read */
const COMPACT_BELOW = 760;

export default function MomentOfForceLab() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [profile, setProfile] = useState(PROFILES.wide);
  const [unitsPerPx, setUnitsPerPx] = useState('1');
  const [angle, setAngle] = useState(0);

  const wrapRef = useRef(null);
  /* the animation loop reads these instead of closing over a render's values,
     so it never has to be torn down and rebuilt as the experiment changes */
  const live = useRef({ state, profile, angle: 0, omega: 0 });
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

  /* ---------- a rebuilt experiment starts from level ---------- */
  useEffect(() => {
    live.current.angle = 0;
    live.current.omega = 0;
    setAngle(0);
  }, [state.epoch]);

  /* ---------- the beam: a lightly damped swing towards its resting tilt ---------- */
  useEffect(() => {
    let raf = 0, lastFrame = 0;
    const step = (now) => {
      raf = requestAnimationFrame(step);
      const L = live.current;
      const s = L.state;
      let dt = lastFrame ? (now - lastFrame) / 1000 : 0;
      lastFrame = now;
      dt = clamp(dt, 0, 0.05);                 /* a backgrounded tab must not leap */
      const before = L.angle;

      if (s.frozen) {                          /* held level while a prediction is due */
        L.omega = 0;
        L.angle = Math.abs(L.angle) > 1e-3 ? L.angle * 0.72 : 0;
      } else if (dt > 0) {
        const b = beam(s);
        if (b.inertia > 1e-12) {
          const inertia = b.inertia / (SPEED * SPEED);
          const stiff = Math.max(b.weight * b.h, 1e-12);
          const damp = 2 * DAMPING * Math.sqrt(stiff * inertia);
          const lim = maxTilt(s, L.profile);
          const sub = 4, h = dt / sub;
          for (let i = 0; i < sub; i++) {
            const th = L.angle * DEG;
            const net = Math.cos(th) * b.torque - stiff * Math.sin(th) - damp * L.omega;
            L.omega += (net / inertia) * h;
            L.angle += (L.omega * h) / DEG;
            if (L.angle > lim || L.angle < -lim) {      /* met the stand */
              L.angle = L.angle > 0 ? lim : -lim;
              L.omega = -L.omega * 0.18;
              if (Math.abs(L.omega) < 0.25) L.omega = 0;
            }
          }
        } else { L.omega = 0; }
      }

      /* only wake React when the picture would actually differ */
      if (Math.abs(L.angle - before) > 0.002) setAngle(L.angle);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------- the set-up is kept in this browser, and nowhere else ---------- */
  useEffect(() => {
    const t = setTimeout(() => writeState(state), 250);
    return () => clearTimeout(t);
  }, [state]);

  /* a debounced write may still be pending when the tab goes away — flush it */
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
        <StageHead state={state} />
        <div className="scene-wrap" ref={wrapRef}>
          <Scene state={state} profile={profile} angle={angle}
                 unitsPerPx={unitsPerPx} dispatch={dispatch} />
        </div>
        <p className="hint">
          <span className="kbd">Drag</span> a hanging mass along the rod ·{' '}
          <span className="kbd">Drag</span> the blue wedge to move the pivot ·{' '}
          <span className="kbd">Tab</span> then <span className="kbd">← →</span> also works
        </p>
      </section>

      <CalcTable state={state} />

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
        {state.tab === 'world' && <CranePanel state={state} dispatch={dispatch} />}
        {state.tab === 'learn' && <LearnPanel state={state} />}
      </aside>
    </div>
  );
}
