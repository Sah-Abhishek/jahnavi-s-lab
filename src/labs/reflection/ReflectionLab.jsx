/* ============================================================
   Reflection Lab
   A point — or a shape — held up to a mirror you can either
   write down or draw, in the plane and in space.

   The graph gets the whole page. Everything else floats over it
   in panels that can be put away, because on a graph the useful
   thing is room: a wide window on the plane shows more of it,
   and a big one is easier to drag things about on.

   There is no simulation here and nothing moving on its own, so
   unlike the other labs this one needs no animation loop: every
   image on screen is a pure function of the state below it. What
   the component does own is the measured size of the graph — the
   scenes are drawn in real pixels — and the saving of the set-up.
   ============================================================ */
import { useEffect, useReducer, useRef, useState } from 'react';
import Scene from './Scene';
import Scene3D from './Scene3D';
import CalcSheet, { StageHead } from './Readout';
import { num } from './engine';
import ExplorePanel from './ExplorePanel';
import ChallengePanel from './ChallengePanel';
import LearnPanel from './LearnPanel';
import {
  reducer, createInitialState, writeState, RANGE_MIN, RANGE_MAX, ZOOM_STEP,
} from './labState';
import './lab.css';

const TABS = [
  { id: 'explore', name: 'Explore' },
  { id: 'challenge', name: 'Challenge' },
  { id: 'learn', name: 'Learn' },
];

/* ---------- a panel that floats over the graph ---------- */
function FloatPanel({ where, title, onClose, hidden, head, innerRef, children }) {
  return (
    <aside className={`float-panel ${where}`} hidden={hidden} aria-label={title} ref={innerRef}>
      <header className="float-head">
        {head || <span className="float-title">{title}</span>}
        <button type="button" className="float-close" onClick={onClose}
                aria-label={`Put the ${title.toLowerCase()} away`} title="Put away">
          ✕
        </button>
      </header>
      <div className="float-body">{children}</div>
    </aside>
  );
}

export default function ReflectionLab() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [size, setSize] = useState({ w: 0, h: 0, panel: 0 });
  const [immersive, setImmersive] = useState(false);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const rootRef = useRef(null);
  const live = useRef(state);
  live.current = state;

  /* ---------- the graph is drawn at the size it is actually given ----------
     The controls panel is measured too, because the drawing centres itself on
     the part of the box no panel is over: with a panel open and the drawing
     still centred on the whole box, the space opposite it would go to waste. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const p = panelRef.current;
      const pr = p ? p.getBoundingClientRect() : null;
      /* a panel brought up from the bottom on a narrow screen takes no width */
      const panel = pr && pr.width > 0 && pr.height > 0 && pr.left > r.left + r.width / 2
        ? Math.round(r.right - pr.left) + 12
        : 0;
      setSize((old) => (Math.abs(old.w - r.width) < 1 && Math.abs(old.h - r.height) < 1
        && old.panel === panel
        ? old
        : { w: Math.round(r.width), h: Math.round(r.height), panel }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (panelRef.current) ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, [state.showPanel]);

  /* ---------- the whole screen, when the graph wants it ---------- */
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
    /* Escape leaves browser fullscreen on its own, so follow it back out */
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

  const three = state.dim === '3d';
  const panel = (key, value) => dispatch({ type: 'panel', key, value });
  const zoom = (factor) => dispatch({ type: 'zoom', factor });

  /* the part of the drawing no panel is sitting over */
  const view = {
    cx: (size.w - size.panel) / 2,
    cy: size.h / 2,
    fitW: Math.max(size.w - size.panel, 200),
    fitH: size.h,
  };

  return (
    <div className={`lab-layout refl-lab${immersive ? ' immersive' : ''}`} ref={rootRef}>
      <section className="card stage-card">
        <StageHead state={state} />

        <div className="scene-wrap" ref={wrapRef}>
          {size.w > 0 && (three
            ? <Scene3D state={state} width={size.w} height={size.h} view={view}
                       dispatch={dispatch} />
            : <Scene state={state} width={size.w} height={size.h} view={view}
                     dispatch={dispatch} />)}

          {/* ---------- the view controls, over the graph ---------- */}
          <div className="graph-tools" role="toolbar" aria-label="The view">
            <div className="tool-group">
              <button type="button" className="tool" title="Zoom in"
                      aria-label="Zoom in" disabled={state.range <= RANGE_MIN * 1.0001}
                      onClick={() => zoom(ZOOM_STEP)}>+</button>
              <span className="zoom-read" aria-live="polite">±{num(state.range, 3)}</span>
              <button type="button" className="tool" title="Zoom out"
                      aria-label="Zoom out" disabled={state.range >= RANGE_MAX * 0.9999}
                      onClick={() => zoom(1 / ZOOM_STEP)}>−</button>
            </div>
            <button type="button" className="tool wide-tool"
                    title={three
                      ? 'Back to the middle, at the zoom and rotation it started with'
                      : 'Back to the origin, at the zoom it started with'}
                    onClick={() => dispatch({ type: 'resetView' })}>
              ↺ Reset view
            </button>
            <button type="button" className={`tool wide-tool${immersive ? ' on' : ''}`}
                    aria-pressed={immersive}
                    title={immersive ? 'Back to the page' : 'Give the graph the whole screen'}
                    onClick={toggleImmersive}>
              {immersive ? '⤡ Exit full screen' : '⤢ Full screen'}
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

          {/* ---------- the controls, kept mounted so a challenge in progress
                        survives being put away ---------- */}
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
                      onClose={() => panel('showSheet', false)}>
            <CalcSheet state={state} masked={state.mode === 'challenge' && state.pending} />
          </FloatPanel>
        </div>

        <p className="hint">
          {three ? (
            <>
              <span className="kbd">Drag</span> to turn the scene ·{' '}
              <span className="kbd">Shift</span>+<span className="kbd">drag</span> or{' '}
              <span className="kbd">scroll</span> to move about ·{' '}
              <span className="kbd">Pinch</span> or <span className="kbd">Ctrl</span>+
              <span className="kbd">scroll</span> to zoom ·{' '}
              <span className="kbd">Drag</span> a point to move it
            </>
          ) : (
            <>
              <span className="kbd">Drag</span> the paper or <span className="kbd">scroll</span>{' '}
              to move about · <span className="kbd">Pinch</span> or{' '}
              <span className="kbd">Ctrl</span>+<span className="kbd">scroll</span> to zoom ·{' '}
              <span className="kbd">Drag</span> the point, either end of the mirror, or the
              mirror itself
            </>
          )}
        </p>
      </section>
    </div>
  );
}
