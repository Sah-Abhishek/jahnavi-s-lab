/* ============================================================
   Inheritance Lab
   Two parents, the Punnett square their gametes fill in, and a
   litter you can actually breed from it — so the ratio the square
   predicts always has real offspring to answer to.

   Nothing here animates, so there is no clock: the only thing
   React should not own is the measured width that picks the
   drawing's geometry.
   ============================================================ */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Scene from './Scene';
import Readout, { StageHead } from './Readout';
import ExplorePanel from './ExplorePanel';
import ChallengePanel from './ChallengePanel';
import LearnPanel from './LearnPanel';
import { reducer, createInitialState, writeState } from './labState';
import { PROFILES, genesOf, breed } from './engine';
import './lab.css';

const TABS = [
  { id: 'explore', name: 'Explore' },
  { id: 'challenge', name: 'Challenge' },
  { id: 'learn', name: 'Learn' },
];

/* below this width the wide drawing's furniture is too small to touch or read */
const COMPACT_BELOW = 760;

export default function InheritanceLab() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [profile, setProfile] = useState(PROFILES.wide);
  const [unitsPerPx, setUnitsPerPx] = useState('1');

  const wrapRef = useRef(null);
  const live = useRef(state);
  live.current = state;

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

  /* Breeding happens here rather than in the reducer, so a reducer invoked
     twice over in development can never quietly breed the litter twice. */
  const onBreed = useCallback((n) => {
    const s = live.current;
    const litter = breed(genesOf(s.study), s.p1, s.p2, n);
    dispatch({ type: 'bred', counts: litter.counts, order: litter.order, n });
  }, []);

  /* ---------- the set-up is kept in this browser, and nowhere else ---------- */
  useEffect(() => {
    const t = setTimeout(() => writeState(state), 250);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    const flush = () => writeState(live.current);
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
          <Scene state={state} profile={profile} unitsPerPx={unitsPerPx} dispatch={dispatch} />
        </div>
        <p className="hint">
          <span className="kbd">Click</span> an allele on either parent to change it ·{' '}
          <span className="kbd">Click</span> a colour in the key to pick it out
        </p>
      </section>

      <Readout state={state} />

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
        {state.tab === 'explore' && (
          <ExplorePanel state={state} dispatch={dispatch} onBreed={onBreed} />
        )}
        {state.tab === 'challenge' && <ChallengePanel state={state} dispatch={dispatch} />}
        {state.tab === 'learn' && <LearnPanel />}
      </aside>
    </div>
  );
}
