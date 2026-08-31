/* ============================================================
   Reflection — the flat graph.

   A window on the plane rather than a frame around it. It has a
   centre it is looking at and a reach, and both move freely: drag
   the background or scroll to travel, pinch or ctrl-scroll to
   zoom, and neither can run out. The graph paper is regenerated
   for wherever you have arrived, on squares of 1, 2 or 5 times a
   power of ten, so the squares are always a number you can count
   in however far in or out you have gone.

   The drawing is measured in real pixels: its viewBox is exactly
   the size of the box it is given, so one unit of the drawing is
   one pixel on the screen and a label asked for in 11px arrives
   at 11px on every display. The scale is set by the shorter side,
   so a unit across is a unit up — a reflection that quietly
   stretched a shape would be a lie — and a wide screen simply
   shows more of x.

   The mirror is stored as the line itself. The two ends you can
   take hold of are worked out here, from where that line crosses
   the window, so they are always somewhere you can reach.
   ============================================================ */
import { useCallback, useEffect, useRef } from 'react';
import {
  reflect2, foot2, signedDist2, lineFromPoints2, clipLineToWindow,
  lineText2, niceStep, stepDecimals, vertexLabels, num, clamp,
} from './engine';
import { lineOf, snapTo } from './labState';

const M = 10;              /* a hair of breathing room at the edges */
const HANDLE_INSET = 46;   /* px: how far inside the window the grab handles sit */
const MAX_LINES = 400;     /* however far out you go, the paper stays cheap to draw */

export default function Scene({ state: s, width, height, view, dispatch }) {
  const svgRef = useRef(null);
  const drag = useRef(null);

  const W = Math.max(width || 0, 240);
  const H = Math.max(height || 0, 240);
  /* The drawing spans the whole box, but it is CENTRED on — and scaled to —
     only the part of it no panel is sitting over. Otherwise opening a panel
     would push the middle off to one side and strand the space opposite. */
  const cx = view ? view.cx : W / 2;
  const cy = view ? view.cy : H / 2;
  const fitW = view ? view.fitW : W;
  const fitH = view ? view.fitH : H;
  /* the shorter side decides the scale, so the reach always fits both ways */
  const k = (Math.min(fitW, fitH) / 2 - M) / s.range;
  const O = s.centre2;

  const X = useCallback((u) => cx + (u - O.x) * k, [cx, O.x, k]);
  const Y = useCallback((v) => cy - (v - O.y) * k, [cy, O.y, k]);
  const toWorldX = useCallback((px) => O.x + (px - cx) / k, [O.x, cx, k]);
  const toWorldY = useCallback((py) => O.y - (py - cy) / k, [O.y, cy, k]);

  /* what is actually on screen, in the graph's own numbers */
  const xLo = toWorldX(0), xHi = toWorldX(W);
  const yLo = toWorldY(H), yHi = toWorldY(0);

  const line = lineOf(s);
  const labels = vertexLabels(s.object);
  const pts = s.pts2.slice(0, labels.length);
  const images = pts.map((p) => reflect2(line, p));
  const feet = pts.map((p) => foot2(line, p));
  const editable = s.mode !== 'challenge';
  /* A challenge takes the graph over — but the "find the mirror" task is
     answered BY dragging the mirror, so that one alone stays live. */
  const mirrorLive = editable || s.target !== null;

  const span = clipLineToWindow(line, xLo, xHi, yLo, yHi);
  /* the ends are pulled in from the very edge, so a handle is never half
     off the drawing and always has something to be grabbed by */
  const inset = HANDLE_INSET / k;
  const grip = clipLineToWindow(line, xLo + inset, xHi - inset, yLo + inset, yHi - inset);

  /* ---------- graph paper ---------- */
  const step = niceStep(2 * s.range);
  const dp = stepDecimals(step);
  const labelEvery = Math.max(1, Math.ceil(30 / (step * k)));

  /* ---------- pointer ---------- */
  const svgPoint = useCallback((evt) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  const toGraph = useCallback((evt) => {
    const p = svgPoint(evt);
    return { x: toWorldX(p.x), y: toWorldY(p.y) };
  }, [svgPoint, toWorldX, toWorldY]);

  const startDrag = (e, what) => {
    drag.current = what;
    svgRef.current.setPointerCapture(e.pointerId);
    svgRef.current.classList.add('dragging');
    e.preventDefault();
    e.stopPropagation();
  };

  /* a dragged thing lands on the graph paper you can see */
  const snapV = (v) => snapTo(v, s.snap, step);

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const g = toGraph(e);
    if (d.kind === 'vertex') {
      dispatch({ type: 'point', index: d.index, value: { x: snapV(g.x), y: snapV(g.y) } });
    } else if (d.kind === 'handle') {
      /* the far end is held where it was when the drag began: letting it
         slide along the window edge as the line turns feels like the graph
         fighting back */
      const next = lineFromPoints2({ x: snapV(g.x), y: snapV(g.y) }, d.pivot);
      if (next) dispatch({ type: 'line2', value: next });
    } else if (d.kind === 'line') {
      const wantX = snapTo(d.originX + (g.x - d.grabX), s.snap, step);
      const wantY = snapTo(d.originY + (g.y - d.grabY), s.snap, step);
      const dx = wantX - d.lastX, dy = wantY - d.lastY;
      if (dx || dy) {
        d.lastX = wantX; d.lastY = wantY;
        dispatch({ type: 'shiftLine', dx, dy });
      }
    } else if (d.kind === 'pan') {
      /* the point taken hold of stays under the pointer, so the graph moves
         with the hand rather than away from it */
      const p = svgPoint(e);
      dispatch({
        type: 'pan',
        dx: (d.sx - p.x) / k,
        dy: -(d.sy - p.y) / k,
      });
      d.sx = p.x; d.sy = p.y;
    }
  };

  const endDrag = (e) => {
    if (!drag.current) return;
    drag.current = null;
    svgRef.current.classList.remove('dragging', 'panning');
    if (svgRef.current.hasPointerCapture?.(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const startPan = (e) => {
    const p = svgPoint(e);
    drag.current = { kind: 'pan', sx: p.x, sy: p.y };
    svgRef.current.setPointerCapture(e.pointerId);
    svgRef.current.classList.add('panning');
  };

  /* ---------- the wheel belongs to the graph ----------
     React attaches its own wheel listener passively, which cannot stop the
     page scrolling underneath, so this one is attached by hand. The graph is
     a canvas you travel across, so it claims the wheel outright: scrolling
     moves about it and never moves the page behind it, and the ctrl+wheel a
     trackpad pinch sends zooms the graph rather than the whole website. */
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
          at: {
            x: toWorldX(e.clientX - rect.left),
            y: toWorldY(e.clientY - rect.top),
          },
        });
        return;
      }
      /* shift turns a one-wheel mouse sideways, the way it does everywhere else */
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;
      if (!dx && !dy) return;
      dispatch({ type: 'pan', dx: dx / k, dy: -dy / k });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [k, toWorldX, toWorldY, dispatch]);

  /* ---------- keyboard ---------- */
  const arrow = (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!d) return null;
    e.preventDefault();
    const size = (s.snap ? step : step / 4) * (e.shiftKey ? 5 : 1);
    return { dx: d[0] * size, dy: d[1] * size };
  };

  const nudgeVertex = (e, i) => {
    const d = arrow(e);
    if (!d) return;
    const p = pts[i];
    dispatch({ type: 'point', index: i, value: { x: snapV(p.x + d.dx), y: snapV(p.y + d.dy) } });
  };

  const nudgeHandle = (e, which) => {
    const d = arrow(e);
    if (!d || !mirrorLive || !grip) return;
    const moved = which === 0 ? grip[0] : grip[1];
    const pivot = which === 0 ? grip[1] : grip[0];
    const next = lineFromPoints2({ x: moved.x + d.dx, y: moved.y + d.dy }, pivot);
    if (next) dispatch({ type: 'line2', value: next });
  };

  const nudgeLine = (e) => {
    const d = arrow(e);
    if (!d || !mirrorLive) return;
    dispatch({ type: 'shiftLine', dx: d.dx, dy: d.dy });
  };

  /* ---------- the paper, drawn for wherever we have arrived ---------- */
  const gridLines = [];
  const ticks = [];
  const first = Math.ceil(xLo / step);
  const last = Math.floor(xHi / step);
  const firstY = Math.ceil(yLo / step);
  const lastY = Math.floor(yHi / step);

  /* The numbers stay against their axis while it is on screen and pin
     themselves to the edge once it has been scrolled away — kept clear of the
     view controls in the top-left corner, which they would otherwise hide
     behind the moment the x-axis went off the top. */
  const axisY = clamp(Y(0), 52, H - 26);
  const axisX = clamp(X(0), 4, W - 4);
  const yLabelsLeft = X(0) < 34;
  const labY = axisY + 15;

  if (last - first < MAX_LINES) {
    for (let i = first; i <= last; i++) {
      const v = i * step;
      const major = Math.abs(v % (step * 5)) < step * 1e-6;
      gridLines.push(
        <line key={`gv${i}`} className={major ? 'grid-major' : 'grid-minor'}
              x1={X(v)} y1={0} x2={X(v)} y2={H} />,
      );
      if (i % labelEvery === 0 && Math.abs(v) > step * 1e-6) {
        ticks.push(
          <text key={`tx${i}`} className="ax-num" x={X(v)} y={labY} textAnchor="middle">
            {num(v, dp + 2)}
          </text>,
        );
      }
    }
  }
  if (lastY - firstY < MAX_LINES) {
    for (let i = firstY; i <= lastY; i++) {
      const v = i * step;
      const major = Math.abs(v % (step * 5)) < step * 1e-6;
      gridLines.push(
        <line key={`gh${i}`} className={major ? 'grid-major' : 'grid-minor'}
              x1={0} y1={Y(v)} x2={W} y2={Y(v)} />,
      );
      if (i % labelEvery === 0 && Math.abs(v) > step * 1e-6) {
        ticks.push(
          <text key={`ty${i}`} className="ax-num"
                x={yLabelsLeft ? axisX + 7 : axisX - 7} y={Y(v) + 4}
                textAnchor={yLabelsLeft ? 'start' : 'end'}>
            {num(v, dp + 2)}
          </text>,
        );
      }
    }
  }

  const poly = (list) => list.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ');
  const closed = pts.length > 2;

  return (
    <svg ref={svgRef} id="scene" className="pannable" viewBox={`0 0 ${W} ${H}`}
         width={W} height={H}
         role="img"
         aria-label={`A graph reaching ±${num(s.range, 3)} about `
           + `(${num(O.x, 2)}, ${num(O.y, 2)}), with the mirror ${lineText2(line)} and the`
           + ` object at ${pts.map((p, i) => `${labels[i]} (${num(p.x)}, ${num(p.y)})`).join(', ')}`}
         onPointerDown={startPan}
         onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>

      <rect className="board" x="0" y="0" width={W} height={H} />
      {gridLines}

      {/* the axes, drawn right across the window wherever they have got to */}
      <line className="axis" x1={0} y1={Y(0)} x2={W} y2={Y(0)} />
      <line className="axis" x1={X(0)} y1={0} x2={X(0)} y2={H} />
      <text className="ax-name" x={W - 12} y={axisY - 8} textAnchor="end">x</text>
      <text className="ax-name" x={axisX + 10} y={16}>y</text>
      {Math.abs(X(0)) < W && Math.abs(Y(0)) < H && (
        <text className="ax-num" x={axisX - 7} y={labY} textAnchor="end">0</text>
      )}
      {ticks}

      {/* ---------- the mirror ---------- */}
      {span && (
        <g className={`mirror${mirrorLive ? '' : ' locked'}`}>
          <line className="mirror-line" x1={X(span[0].x)} y1={Y(span[0].y)}
                x2={X(span[1].x)} y2={Y(span[1].y)} />
          <line className="mirror-grab" x1={X(span[0].x)} y1={Y(span[0].y)}
                x2={X(span[1].x)} y2={Y(span[1].y)}
                tabIndex={mirrorLive ? 0 : -1} role="button"
                aria-label={`Mirror line ${lineText2(line)}. Arrow keys slide it.`}
                onPointerDown={(e) => {
                  if (!mirrorLive) return;
                  const g = toGraph(e);
                  startDrag(e, {
                    kind: 'line', grabX: g.x, grabY: g.y,
                    originX: 0, originY: 0, lastX: 0, lastY: 0,
                  });
                }}
                onKeyDown={nudgeLine} />
          <text className="mirror-eq"
                x={X((span[0].x + span[1].x) / 2)} y={Y((span[0].y + span[1].y) / 2) - 10}
                textAnchor="middle">{lineText2(line)}</text>
        </g>
      )}

      {/* a mirror can be left somewhere the window is not looking; one that is
          simply absent looks like a fault */}
      {!span && (
        <g className="offscreen-note" transform={`translate(${cx} ${cy + fitH / 2 - 34})`}>
          <rect x="-206" y="-15" width="412" height="30" rx="7" />
          <text x="0" y="5" textAnchor="middle">
            {lineText2(line)} is off screen — scroll, or press Reset view
          </text>
        </g>
      )}

      {/* ---------- the construction, one perpendicular per vertex ---------- */}
      {s.showPerp && pts.map((p, i) => {
        const f = feet[i], q = images[i];
        if (Math.hypot(q.x - p.x, q.y - p.y) < 1e-7) return null;
        const half = Math.abs(signedDist2(line, p));
        /* two short strokes across the join, one on each side of the foot:
           the drawing's way of saying "these two lengths are equal" */
        const ux = (f.x - p.x) / (half || 1), uy = (f.y - p.y) / (half || 1);
        const tick = (tx, ty, key) => (
          <line key={key} className="eq-tick"
                x1={X(tx) - uy * 5} y1={Y(ty) - ux * 5}
                x2={X(tx) + uy * 5} y2={Y(ty) + ux * 5} />
        );
        return (
          <g key={`perp${i}`} className="perp">
            <line className="join" x1={X(p.x)} y1={Y(p.y)} x2={X(q.x)} y2={Y(q.y)} />
            <rect className="foot-mark" x={X(f.x) - 4} y={Y(f.y) - 4} width="8" height="8"
                  transform={`rotate(45 ${X(f.x)} ${Y(f.y)})`} />
            {s.showDistance && half * k > 26 && (
              <>
                {tick((p.x + f.x) / 2, (p.y + f.y) / 2, 'a')}
                {tick((q.x + f.x) / 2, (q.y + f.y) / 2, 'b')}
                <text className="dist-label" x={X((p.x + f.x) / 2) - uy * 12}
                      y={Y((p.y + f.y) / 2) - ux * 12 + 4} textAnchor="middle">
                  {num(half, dp + 2)}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* ---------- the image ---------- */}
      {closed && <polygon className="shape img" points={poly(images)} />}
      {images.map((q, i) => (
        <g key={`img${i}`} className="vtx img">
          <rect x={X(q.x) - 5.5} y={Y(q.y) - 5.5} width="11" height="11" rx="1.5" />
          {s.showCoords && (
            <text className="vtx-label" x={X(q.x) + 10} y={Y(q.y) - 8}>
              {labels[i]}′ ({num(q.x, 3)}, {num(q.y, 3)})
            </text>
          )}
        </g>
      ))}

      {/* ---------- the object, drawn last so it is never hidden ---------- */}
      {closed && <polygon className="shape obj" points={poly(pts)} />}
      {pts.map((p, i) => (
        <g key={`obj${i}`} className={`vtx obj${editable ? ' grabbable' : ''}`}
           {...(editable ? {
             tabIndex: 0,
             role: 'button',
             'aria-label': `${labels[i]} at ${num(p.x)}, ${num(p.y)}. Arrow keys move it.`,
             onPointerDown: (e) => startDrag(e, { kind: 'vertex', index: i }),
             onKeyDown: (e) => nudgeVertex(e, i),
           } : {})}>
          <circle cx={X(p.x)} cy={Y(p.y)} r="6" />
          {s.showCoords && (
            <text className="vtx-label" x={X(p.x) + 10} y={Y(p.y) - 8}>
              {labels[i]} ({num(p.x, 3)}, {num(p.y, 3)})
            </text>
          )}
        </g>
      ))}

      {/* ---------- where a challenge wants the image to land ---------- */}
      {s.target && (
        <g className="target">
          <circle className="target-ring" cx={X(s.target.x)} cy={Y(s.target.y)} r="11" />
          <circle className="target-dot" cx={X(s.target.x)} cy={Y(s.target.y)} r="2.5" />
          <text className="target-label" x={X(s.target.x) + 15} y={Y(s.target.y) + 4}>
            land here
          </text>
        </g>
      )}

      {/* ---------- the two ends of the mirror, on top of everything ---------- */}
      {mirrorLive && grip && grip.map((h, i) => (
        <g key={i} className="handle grabbable" tabIndex={0} role="button"
           aria-label={`${i === 0 ? 'First' : 'Second'} end of the mirror,`
             + ` at ${num(h.x, 2)}, ${num(h.y, 2)}. Arrow keys turn the mirror about the other end.`}
           onPointerDown={(e) => startDrag(e, { kind: 'handle', pivot: grip[1 - i] })}
           onKeyDown={(e) => nudgeHandle(e, i)}>
          <circle cx={X(h.x)} cy={Y(h.y)} r="7" />
        </g>
      ))}
    </svg>
  );
}
