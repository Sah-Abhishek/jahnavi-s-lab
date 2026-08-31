/* ============================================================
   Light — the bench.

   A window on the bench rather than a frame around it: it has a
   place it is looking at and a reach, and both move freely. Drag
   the bench or scroll to travel along it, ctrl-scroll or pinch to
   zoom towards the pointer.

   Drawn in real pixels — the viewBox is the measured size of the
   box it is given — so a label asked for at 11px arrives at 11px.
   One scale serves both axes, always: an optical bench stretched
   sideways would put the angle of reflection out, and the whole
   lab rests on that angle being right. What a wide window buys is
   more bench, not a flatter one.

   THE POLE IS AT x = 0, AND STAYS THERE. That is the one decision
   the rest of the lab hangs off: the x axis of this drawing is the
   number line of the New Cartesian convention, so u is drawn to
   the left of zero because u really is negative, and "which side
   of the origin" and "what sign" stop being two different things
   a pupil has to keep in step.
   ============================================================ */
import { useCallback, useEffect, useRef } from 'react';
import { niceStep, stepDecimals, num, clamp } from './engine.js';
import { snapTo, BENCH_ASPECT } from './labState.js';
import BenchImaging from './BenchImaging';
import BenchRefraction from './BenchRefraction';
import BenchEye from './BenchEye';

const M = 14;              /* a hair of breathing room at the edges */
const MAX_LINES = 400;     /* however far out you go, the paper stays cheap to draw */

export default function Scene({ state: s, width, height, view, dispatch }) {
  const svgRef = useRef(null);
  const drag = useRef(null);

  const W = Math.max(width || 0, 240);
  const H = Math.max(height || 0, 200);
  const cx = view ? view.cx : W / 2;
  const cy = view ? view.cy : H / 2;
  const fitW = view ? view.fitW : W;
  const fitH = view ? view.fitH : H;

  /* a bench is a long thing, so it is framed as one — but with a single scale,
     so that every angle on the drawing is the angle the light really makes */
  const rangeY = s.range / BENCH_ASPECT;
  const k = Math.max(1e-6, Math.min((fitW / 2 - M) / s.range, (fitH / 2 - M) / rangeY));
  const O = s.centre;

  const X = useCallback((u) => cx + (u - O.x) * k, [cx, O.x, k]);
  const Y = useCallback((v) => cy - (v - O.y) * k, [cy, O.y, k]);
  const toWorldX = useCallback((px) => O.x + (px - cx) / k, [O.x, cx, k]);
  const toWorldY = useCallback((py) => O.y - (py - cy) / k, [O.y, cy, k]);

  const xLo = toWorldX(0), xHi = toWorldX(W);
  const yLo = toWorldY(H), yHi = toWorldY(0);

  const step = niceStep(2 * s.range);
  const dp = stepDecimals(step);
  const labelEvery = Math.max(1, Math.ceil(34 / (step * k)));

  /* ---------- pointer ---------- */
  const svgPoint = useCallback((evt) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  const toBench = useCallback((evt) => {
    const p = svgPoint(evt);
    return { x: toWorldX(p.x), y: toWorldY(p.y) };
  }, [svgPoint, toWorldX, toWorldY]);

  /* Claim the drag BEFORE anything that might throw. Pointer capture is a
     convenience — it keeps the drag alive when the pointer leaves the handle —
     but a browser that refuses it must not also be left starting a pan on the
     background underneath, which is what happens if stopPropagation never runs. */
  const startDrag = (e, what) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = what;
    svgRef.current.classList.add('dragging');
    try { svgRef.current.setPointerCapture(e.pointerId); } catch (err) { /* fine without it */ }
  };

  const snapV = (v) => snapTo(v, s.snap, step);
  const editable = s.mode !== 'challenge' || !s.pending;

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      const p = svgPoint(e);
      dispatch({ type: 'pan', dx: (d.sx - p.x) / k, dy: -(d.sy - p.y) / k });
      d.sx = p.x; d.sy = p.y;
      return;
    }
    if (!editable) return;
    const g = toBench(e);
    switch (d.kind) {
      case 'objectFoot': dispatch({ type: 'objectAt', value: snapV(g.x) }); break;
      case 'objectHead': dispatch({ type: 'objectH', value: snapV(g.y) }); break;
      /* C sits at 2f and a lens's near focus at −f, so each handle carries the
         factor that turns where it was dropped into the focal length it means.
         It is the MARKER that snaps to the graph paper, not the focal length:
         you are putting C on a grid line, and f is then half of wherever that
         is — which also stops C needing twice the travel of F to move at all. */
      case 'focus': dispatch({ type: 'focal', value: snapV(g.x) * (d.mult ?? 1) }); break;
      case 'rim': dispatch({ type: 'aperture', value: Math.abs(snapV(g.y)) }); break;
      case 'screen': dispatch({ type: 'screen', value: snapV(g.x) }); break;
      case 'incidence': {
        /* the angle the incoming ray makes with the axis, which is the normal */
        const a = Math.atan2(-g.y, -(g.x - (d.at || 0)));
        dispatch({ type: 'incidence', value: clamp(Math.abs(a) * 180 / Math.PI, 0, 89.5) });
        break;
      }
      case 'eyeBack': dispatch({ type: 'eye', key: 'retina', value: g.x }); break;
      case 'eyeObject': dispatch({ type: 'eye', key: 'object', value: Math.abs(g.x) }); break;
      default: break;
    }
  };

  const endDrag = (e) => {
    if (!drag.current) return;
    drag.current = null;
    svgRef.current.classList.remove('dragging', 'panning');
    try {
      if (svgRef.current.hasPointerCapture?.(e.pointerId)) {
        svgRef.current.releasePointerCapture(e.pointerId);
      }
    } catch (err) { /* nothing to release */ }
  };

  const startPan = (e) => {
    const p = svgPoint(e);
    drag.current = { kind: 'pan', sx: p.x, sy: p.y };
    svgRef.current.classList.add('panning');
    try { svgRef.current.setPointerCapture(e.pointerId); } catch (err) { /* fine without it */ }
  };

  /* ---------- the wheel belongs to the bench ----------
     React's own wheel listener is passive and cannot stop the page scrolling
     underneath, so this one is attached by hand. Plain scrolling runs ALONG
     the bench rather than up and down it: there is nothing above or below a
     bench worth arriving at, and drifting off it sideways is how you get lost. */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        dispatch({
          type: 'zoom',
          factor: Math.exp(-e.deltaY * 0.0022),
          at: { x: toWorldX(e.clientX - rect.left), y: toWorldY(e.clientY - rect.top) },
        });
        return;
      }
      const dx = (e.deltaX || 0) + (e.shiftKey ? 0 : e.deltaY);
      const dy = e.shiftKey ? -e.deltaY : 0;
      if (!dx && !dy) return;
      dispatch({ type: 'pan', dx: dx / k, dy: dy / k });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [k, toWorldX, toWorldY, dispatch]);

  /* ---------- keyboard ---------- */
  const nudge = (e, apply) => {
    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1 }[e.key];
    if (d === undefined) return;
    const vertical = e.key === 'ArrowUp' || e.key === 'ArrowDown';
    e.preventDefault();
    apply(d * (s.snap ? step : step / 4) * (e.shiftKey ? 5 : 1), vertical);
  };

  /* ---------- graph paper ---------- */
  const grid = [];
  {
    const first = Math.ceil(xLo / step) * step;
    let n = 0;
    for (let x = first; x <= xHi && n < MAX_LINES; x += step, n++) {
      const px = X(x);
      const major = Math.abs(Math.round(x / step) % labelEvery) < 1e-9;
      grid.push(<line key={`v${n}`} className={major ? 'grid-major' : 'grid-minor'}
                      x1={px} y1={0} x2={px} y2={H} />);
    }
    const firstY = Math.ceil(yLo / step) * step;
    n = 0;
    for (let y = firstY; y <= yHi && n < MAX_LINES; y += step, n++) {
      const py = Y(y);
      grid.push(<line key={`h${n}`} className="grid-minor across" x1={0} y1={py} x2={W} y2={py} />);
    }
  }

  /* the principal axis is drafted as a centre line, which is what it is */
  const axisY = clamp(Y(0), 46, H - 30);
  const nums = [];
  {
    const first = Math.ceil(xLo / (step * labelEvery)) * step * labelEvery;
    let n = 0;
    for (let x = first; x <= xHi && n < 200; x += step * labelEvery, n++) {
      if (Math.abs(x) < step * 1e-6) continue;
      nums.push(
        <text key={`n${n}`} className="ax-num" x={X(x)} y={axisY + 15} textAnchor="middle">
          {num(x, dp)}
        </text>,
      );
    }
  }

  const frame = {
    X, Y, toWorldX, toWorldY, k, step, dp, W, H, xLo, xHi, yLo, yHi,
    axisY, startDrag, nudge, snapV, editable, dispatch, state: s,
  };

  const Bench = s.bench === 'refract' ? BenchRefraction
    : s.bench === 'eye' ? BenchEye : BenchImaging;

  return (
    <svg id="scene" ref={svgRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H}
         className={`pannable${editable ? '' : ' locked'}`}
         style={{ '--u': 1 }}
         role="group" aria-label="The optical bench"
         onPointerDown={startPan} onPointerMove={onMove}
         onPointerUp={endDrag} onPointerCancel={endDrag}>
      <rect className="board" x={0} y={0} width={W} height={H} />
      <g className="paper">{grid}</g>

      <g className="principal">
        <line className="axis-line" x1={0} y1={axisY} x2={W} y2={axisY} />
        {/* named only where there is room for the name; on a phone the mirror
            itself is sitting where this would go */}
        {W > 720 && (
          <text className="ax-name" x={W - 12} y={axisY - 8} textAnchor="end">principal axis</text>
        )}
        {nums}
        <text className="ax-num origin" x={X(0)} y={axisY + 15} textAnchor="middle">0</text>
      </g>

      <Bench frame={frame} />
    </svg>
  );
}
