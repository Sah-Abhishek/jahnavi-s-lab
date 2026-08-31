/* ============================================================
   Light
   An optical bench you can run along: mirrors, lenses, a prism,
   and an eye — with every ray traced rather than drawn from
   memory.

   The bench gets the whole page, the way the Reflection lab's
   graph does, because an optical bench is a long thing and the
   useful thing to give it is length. Everything else floats over
   it and can be put away.

   Nothing here moves on its own, so there is no animation loop:
   every ray on screen is a pure function of the state below it.
   What this component owns is the measured size of the bench —
   the scene is drawn in real pixels — and the saving of the set-up.
   ============================================================ */
import { useEffect, useReducer, useRef, useState } from 'react';
import FloatPanel from '../../components/FloatPanel';
import Scene from './Scene';
import CalcSheet, { StageHead } from './Readout';
import ExplorePanel from './ExplorePanel';
import ChallengePanel from './ChallengePanel';
import LearnPanel from './LearnPanel';
import { num } from './engine.js';
import {
  reducer, createInitialState, writeState, RANGE_MIN, RANGE_MAX, ZOOM_STEP,
} from './labState.js';
import './lab.css';

const TABS = [
  { id: 'explore', name: 'Explore' },
  { id: 'challenge', name: 'Challenge' },
  { id: 'learn', name: 'Learn' },
];

const HINTS = {
  mirror: <>
    <span className="kbd">Drag</span> the object, the rim, or the{' '}
    <span className="kbd">F</span> / <span className="kbd">C</span> marks to set the focal
    length ·{' '}
    <span className="kbd">Drag</span> the bench or <span className="kbd">scroll</span> to
    move along it · <span className="kbd">Ctrl</span>+<span className="kbd">scroll</span> to zoom
  </>,
  lens: <>
    <span className="kbd">Drag</span> the object, or any of{' '}
    <span className="kbd">F</span> <span className="kbd">2F</span>{' '}
    <span className="kbd">F′</span> <span className="kbd">2F′</span> to set the focal
    length ·{' '}
    <span className="kbd">Drag</span> the bench or <span className="kbd">scroll</span> to move
    along it · <span className="kbd">Ctrl</span>+<span className="kbd">scroll</span> to zoom
  </>,
  refract: <>
    <span className="kbd">Drag</span> the incoming ray to change the angle ·{' '}
    <span className="kbd">Drag</span> the bench or <span className="kbd">scroll</span> to move
    about · <span className="kbd">Ctrl</span>+<span className="kbd">scroll</span> to zoom
  </>,
  eye: <>
    <span className="kbd">Drag</span> the object, or the back of the eye ·{' '}
    <span className="kbd">Drag</span> the bench or <span className="kbd">scroll</span> to move
    about · <span className="kbd">Ctrl</span>+<span className="kbd">scroll</span> to zoom
  </>,
};

export default function OpticsLab() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [size, setSize] = useState({ w: 0, h: 0, panelR: 0, panelB: 0 });
  const [immersive, setImmersive] = useState(false);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const sheetRef = useRef(null);
  const rootRef = useRef(null);
  const live = useRef(state);
  live.current = state;

  /* ---------- the bench is drawn at the size it is actually given ----------
     Both panels are measured, not just the one on the right. A bench is a
     horizontal strip through the middle of the box, so a panel brought up from
     the bottom sits on top of the apparatus rather than beside it — which the
     graph in the Reflection lab never had to worry about. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      /* A panel pinned to the right takes width; anything else is pinned to the
         bottom and takes height. The bench runs through the middle of the box,
         so a panel sitting over that middle has to be counted or the apparatus
         ends up underneath it — which a graph, having no preferred line, never
         had to worry about. */
      const takes = (node) => {
        const p = node && node.getBoundingClientRect();
        if (!p || p.width <= 0 || p.height <= 0) return { w: 0, h: 0 };
        return p.left > r.left + r.width / 2
          ? { w: Math.round(r.right - p.left) + 12, h: 0 }
          : { w: 0, h: Math.round(r.bottom - p.top) + 12 };
      };
      const a = takes(panelRef.current), b = takes(sheetRef.current);
      const panelR = Math.max(a.w, b.w);
      const panelB = Math.max(a.h, b.h);
      setSize((old) => (Math.abs(old.w - r.width) < 1 && Math.abs(old.h - r.height) < 1
        && old.panelR === panelR && old.panelB === panelB
        ? old
        : { w: Math.round(r.width), h: Math.round(r.height), panelR, panelB }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (panelRef.current) ro.observe(panelRef.current);
    if (sheetRef.current) ro.observe(sheetRef.current);
    return () => ro.disconnect();
  }, [state.showPanel, state.showSheet]);

  /* ---------- the whole screen, when the bench wants it ---------- */
  const toggleImmersive = () => {
    const next = !immersive;
    setImmersive(next);
    /* going properly fullscreen is a bonus — the fixed layout below stands on
       its own if the browser refuses, so a rejection is nothing to report */
    try {
      if (next) rootRef.current?.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } catch (e) { /* no fullscreen here; the fixed layout is enough */ }
  };

  useEffect(() => {
    if (!immersive) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setImmersive(false); };
    const onFsChange = () => { if (!document.fullscreenElement) setImmersive(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [immersive]);

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

  const panel = (key, value) => dispatch({ type: 'panel', key, value });
  const zoom = (factor) => dispatch({ type: 'zoom', factor });

  /* the part of the bench no panel is sitting over */
  const view = {
    cx: (size.w - size.panelR) / 2,
    cy: (size.h - size.panelB) / 2,
    fitW: Math.max(size.w - size.panelR, 220),
    fitH: Math.max(size.h - size.panelB, 160),
  };

  return (
    <div className={`lab-layout full-bleed optics-lab${immersive ? ' immersive' : ''}`}
         ref={rootRef}>
      <section className="card stage-card">
        <StageHead state={state} />

        <div className="scene-wrap" ref={wrapRef}>
          {size.w > 0 && (
            <Scene state={state} width={size.w} height={size.h} view={view} dispatch={dispatch} />
          )}

          <div className="graph-tools" role="toolbar" aria-label="The view">
            <div className="tool-group">
              <button type="button" className="tool" title="Zoom in" aria-label="Zoom in"
                      disabled={state.range <= RANGE_MIN * 1.0001}
                      onClick={() => zoom(ZOOM_STEP)}>+</button>
              <span className="zoom-read" aria-live="polite">±{num(state.range, 1)} cm</span>
              <button type="button" className="tool" title="Zoom out" aria-label="Zoom out"
                      disabled={state.range >= RANGE_MAX * 0.9999}
                      onClick={() => zoom(1 / ZOOM_STEP)}>−</button>
            </div>
            <button type="button" className="tool wide-tool"
                    title="Frame the object, the element, its foci and the image"
                    onClick={() => dispatch({ type: 'fit' })}>
              ⤢ Fit the bench
            </button>
            <button type="button" className="tool wide-tool"
                    title="Back to the pole, at the zoom it started with"
                    onClick={() => dispatch({ type: 'resetView' })}>
              ↺ Reset
            </button>
            <button type="button" className={`tool wide-tool${immersive ? ' on' : ''}`}
                    aria-pressed={immersive}
                    title={immersive ? 'Back to the page' : 'Give the bench the whole screen'}
                    onClick={toggleImmersive}>
              {immersive ? '⤡ Exit full screen' : '⛶ Full screen'}
            </button>
            <div className="tool-group">
              <button type="button" className={`tool wide-tool${state.showPanel ? ' on' : ''}`}
                      aria-pressed={state.showPanel}
                      onClick={() => panel('showPanel', !state.showPanel)}>
                Controls
              </button>
              <button type="button" className={`tool wide-tool${state.showSheet ? ' on' : ''}`}
                      aria-pressed={state.showSheet}
                      onClick={() => panel('showSheet', !state.showSheet)}>
                Working out
              </button>
            </div>
          </div>

          {/* kept mounted, so a challenge in progress survives being put away */}
          <FloatPanel where="right" title="Controls" hidden={!state.showPanel} innerRef={panelRef}
                      onClose={() => panel('showPanel', false)}
                      head={(
                        <div className="tabs" role="tablist">
                          {TABS.map((t) => (
                            <button key={t.id} role="tab" aria-selected={state.tab === t.id}
                                    className={`tab${state.tab === t.id ? ' active' : ''}`}
                                    onClick={() => dispatch({ type: 'tab', value: t.id })}>
                              {t.name}
                            </button>
                          ))}
                        </div>
                      )}>
            {state.tab === 'explore' && <ExplorePanel state={state} dispatch={dispatch} />}
            {state.tab === 'challenge' && <ChallengePanel state={state} dispatch={dispatch} />}
            {state.tab === 'learn' && <LearnPanel />}
          </FloatPanel>

          <FloatPanel where="left" title="Working out" hidden={!state.showSheet}
                      innerRef={sheetRef} onClose={() => panel('showSheet', false)}>
            <CalcSheet state={state} dispatch={dispatch}
                       masked={state.mode === 'challenge' && state.pending} />
          </FloatPanel>
        </div>

        <p className="hint">{HINTS[state.bench]}</p>
      </section>
    </div>
  );
}
