/* ============================================================
   Reflection — the view into space.

   An orthographic camera the visitor swings by dragging the
   background. Orthographic on purpose: no perspective means no
   foreshortening, so two equal lengths stay equal on screen —
   which is the one thing this drawing has to be trusted about.

   The mirror plane is drawn as the polygon where it actually
   cuts the axes box, so a tilted plane shows up as the hexagon
   it really is. Points on the camera's side of it are drawn
   after it and points behind it before, so the glass reads as
   glass and you can tell which side of the mirror you are on.
   ============================================================ */
import { useCallback, useEffect, useRef } from 'react';
import {
  V, addV, subV, scaleV, dot, lenV, normV,
  makeCamera, project, planePolygon, clipLineToCube, planeNormal,
  reflectPlane, footPlane, reflectLine3, footLine3,
  planeText, lineVectorText, vertexLabels, num, clamp, niceStep, stepDecimals, pathInBox,
} from './engine';
import { line3Of, snapTo, ZOOM_STEP, LIMIT } from './labState';

const PAD = 34;

export default function Scene3D({ state: s, width, height, view, dispatch }) {
  const svgRef = useRef(null);
  const drag = useRef(null);

  /* measured in real pixels, so the view fills whatever box it is given and
     a label asked for in 11px arrives at 11px */
  const W = Math.max(width || 0, 240);
  const H = Math.max(height || 0, 240);
  /* centred on, and scaled to, the part of the box no panel is sitting over */
  const CX = view ? view.cx : W / 2;
  const CY = view ? view.cy : H / 2;
  const fitW = view ? view.fitW : W;
  const fitH = view ? view.fitH : H;
  const R = s.range;
  /* the ticks along the axes, and the step a dragged point lands on, both
     follow the zoom onto tidy numbers */
  const axisStep = niceStep(2 * R, 8);
  const gridStep = niceStep(2 * R);
  const cam = makeCamera(s.yaw, s.pitch);
  const usingPlane = s.mirror3 === 'plane';
  const ln = line3Of(s);

  /* ---------- a scale that always fits the axes box, however it is turned ---------- */
  const corners = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    corners.push(project(cam, V(sx * R, sy * R, sz * R)));
  }
  /* Fit the box's ACTUAL projected shape rather than the square around it.
     Turned to most angles a cube projects wider than it is tall, so measuring
     the two directions separately puts that width to use instead of leaving
     it empty at the sides — and the smaller of the two scales still governs,
     so the whole box always fits and nothing is stretched. */
  const reachX = Math.max(...corners.map((p) => Math.abs(p.x)), 1e-6);
  const reachY = Math.max(...corners.map((p) => Math.abs(p.y)), 1e-6);
  const k = Math.min((fitW / 2 - PAD) / reachX, (fitH / 2 - PAD) / reachY);

  /* the camera looks at centre3 and turns about it, so panning moves what the
     view is pointed at rather than sliding a finished picture about */
  const O = s.centre3;
  const P2 = useCallback((v) => {
    const p = project(cam, subV(v, O));
    return { x: CX + p.x * k, y: CY + p.y * k, depth: p.depth };
  }, [cam, O, CX, CY, k]);

  const labels = vertexLabels(s.object);
  const pts = s.pts3.slice(0, labels.length);
  const images = pts.map((p) => (usingPlane ? reflectPlane(s.plane, p) : reflectLine3(ln, p)));
  const feet = pts.map((p) => (usingPlane ? footPlane(s.plane, p) : footLine3(ln, p)));
  const editable = s.mode !== 'challenge';

  /* ---------- pointer ---------- */
  const svgPoint = useCallback((evt) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  const startDrag = (e, what) => {
    drag.current = what;
    svgRef.current.setPointerCapture(e.pointerId);
    svgRef.current.classList.add('dragging');
    e.preventDefault();
    e.stopPropagation();
  };

  const grabPoint = (e, what, from) => {
    const at = svgPoint(e);
    startDrag(e, { ...what, sx: at.x, sy: at.y, from: { ...from } });
  };

  /** A point dragged in space moves in the flat sheet facing the camera —
      the one plane in which the pointer says everything and nothing is
      guessed about depth. */
  const moved = (e, d) => {
    const at = svgPoint(e);
    const world = addV(d.from,
      addV(scaleV(cam.right, (at.x - d.sx) / k), scaleV(cam.up, -(at.y - d.sy) / k)));
    const snap = (v) => clamp(snapTo(v, s.snap, gridStep), -LIMIT, LIMIT);
    return { x: snap(world.x), y: snap(world.y), z: snap(world.z) };
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'orbit') {
      const at = svgPoint(e);
      dispatch({
        type: 'orbit',
        yaw: d.yaw0 - (at.x - d.sx) * 0.45,
        pitch: d.pitch0 + (at.y - d.sy) * 0.45,
      });
    } else if (d.kind === 'vertex') {
      dispatch({ type: 'point', index: d.index, value: moved(e, d) });
    } else if (d.kind === 'ln') {
      dispatch({ type: 'lnPoint', which: d.which, value: moved(e, d) });
    } else if (d.kind === 'pan') {
      const at = svgPoint(e);
      const shift = addV(scaleV(cam.right, -(at.x - d.sx) / k),
                         scaleV(cam.up, (at.y - d.sy) / k));
      dispatch({ type: 'pan', dx: shift.x, dy: shift.y, dz: shift.z });
      d.sx = at.x; d.sy = at.y;
    }
  };

  const endDrag = (e) => {
    if (!drag.current) return;
    drag.current = null;
    svgRef.current.classList.remove('dragging');
    if (svgRef.current.hasPointerCapture?.(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  /* plain drag turns the scene; holding shift slides it, the way it does in
     every other three-dimensional view a pupil is likely to have met */
  const startOrbit = (e) => {
    const at = svgPoint(e);
    startDrag(e, e.shiftKey
      ? { kind: 'pan', sx: at.x, sy: at.y }
      : { kind: 'orbit', sx: at.x, sy: at.y, yaw0: s.yaw, pitch0: s.pitch });
  };

  /* ---------- keyboard ---------- */
  const nudge3 = (e, cur, apply) => {
    const d = { ArrowLeft: 'x-', ArrowRight: 'x+', ArrowUp: 'y+', ArrowDown: 'y-',
                PageUp: 'z+', PageDown: 'z-' }[e.key];
    if (!d) return;
    e.preventDefault();
    const axis = d[0], sgn = d[1] === '+' ? 1 : -1;
    const stepSize = s.snap ? gridStep : gridStep / 4;
    apply({ ...cur, [axis]: clamp(cur[axis] + sgn * stepSize, -LIMIT, LIMIT) });
  };

  const orbitKeys = (e) => {
    if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
      e.preventDefault();
      dispatch({ type: 'zoom', factor: (e.key === '-' || e.key === '_') ? 1 / ZOOM_STEP : ZOOM_STEP });
      return;
    }
    if (e.key === '0') { e.preventDefault(); dispatch({ type: 'resetView' }); return; }
    const turn = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
    if (!turn) return;
    e.preventDefault();
    dispatch({ type: 'orbit', yaw: s.yaw + turn[0], pitch: s.pitch + turn[1] });
  };

  /* ---------- the wheel belongs to the view ----------
     React attaches its own wheel listener passively, which cannot stop the
     page scrolling underneath, so this one is attached by hand. Scrolling
     slides the scene and never moves the page behind it, and the ctrl+wheel
     a trackpad pinch sends zooms the scene rather than the whole website. */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        dispatch({ type: 'zoom', factor: Math.exp(-e.deltaY * 0.0022) });
        return;
      }
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;
      if (!dx && !dy) return;
      const shift = addV(scaleV(cam.right, dx / k), scaleV(cam.up, dy / k));
      dispatch({ type: 'pan', dx: shift.x, dy: shift.y, dz: shift.z });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [cam, k, dispatch]);

  /* ---------- the axes box ---------- */
  const cubeEdges = [];
  const corner = (i) => V((i & 1 ? 1 : -1) * R, (i & 2 ? 1 : -1) * R, (i & 4 ? 1 : -1) * R);
  for (let i = 0; i < 8; i++) {
    for (const bit of [1, 2, 4]) {
      const j = i | bit;
      if (j === i) continue;
      const a = P2(corner(i)), b = P2(corner(j));
      cubeEdges.push(<line key={`e${i}-${j}`} className="cube-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />);
    }
  }

  const AXES = [
    { key: 'x', dir: V(1, 0, 0) },
    { key: 'y', dir: V(0, 1, 0) },
    { key: 'z', dir: V(0, 0, 1) },
  ];

  /** How far along an axis you can travel before it leaves the drawing.
      An axis through the origin lands on screen at a point that moves in a
      straight line as you walk along it, so this is a one-dimensional clip. */
  const axisOnScreen = (dir) => {
    const d = project(cam, dir);
    const o = P2(V(0, 0, 0));
    return pathInBox(o.x, o.y, d.x * k, d.y * k, W, H);
  };

  /* ---------- the mirror ---------- */
  let mirrorNode = null;
  let normalNode = null;
  if (usingPlane) {
    const poly = planePolygon(s.plane, R);
    if (poly.length >= 3) {
      const flat = poly.map(P2);
      mirrorNode = (
        <g className="mirror3">
          <polygon className="plane-face" points={flat.map((p) => `${p.x},${p.y}`).join(' ')} />
          <polygon className="plane-edge" points={flat.map((p) => `${p.x},${p.y}`).join(' ')} />
        </g>
      );
      if (s.showNormal) {
        const n = planeNormal(s.plane);
        /* out in the body of the plane rather than at the origin's foot: for a
           plane like z = 0 the normal IS the z-axis, and an arrow drawn along
           an axis reads as part of the axes rather than as the plane's own */
        const mid = scaleV(poly.reduce(addV, V(0, 0, 0)), 1 / poly.length);
        const base = addV(mid, scaleV(subV(poly[0], mid), 0.5));
        const tip = addV(base, scaleV(normV(n), R * 0.42));
        const a = P2(base), b = P2(tip);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        normalNode = (
          <g className="normal3">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <polygon points={[
              `${b.x},${b.y}`,
              `${b.x - 9 * Math.cos(ang - 0.4)},${b.y - 9 * Math.sin(ang - 0.4)}`,
              `${b.x - 9 * Math.cos(ang + 0.4)},${b.y - 9 * Math.sin(ang + 0.4)}`,
            ].join(' ')} />
            <text className="normal-label" x={b.x + 9} y={b.y - 4}>n</text>
          </g>
        );
      }
    }
  } else {
    const seg = clipLineToCube(ln, R);
    if (seg) {
      const a = P2(seg[0]), b = P2(seg[1]);
      mirrorNode = (
        <g className="mirror3">
          <line className="axis-line" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        </g>
      );
    }
  }

  const mirrorOffscreen = !mirrorNode;

  /* ---------- has the view been flown right out of the scene? ----------
     The axes all pass through the origin, so far enough from it none of them
     crosses the drawing and neither does anything else: a blank screen with
     no way of telling which way is back. */
  const axisSpans = AXES.map(({ dir }) => axisOnScreen(dir));
  const onScreen = (q) => q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H;
  /* the corners projected for the FIT are measured from the world origin, so
     they say nothing about where the camera is now pointed — these are the
     eight corners as actually drawn */
  const boxCorners = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    boxCorners.push(P2(V(sx * R, sy * R, sz * R)));
  }
  const nothingInView = !axisSpans.some(Boolean)
    && !boxCorners.some(onScreen)
    && !pts.some((q) => onScreen(P2(q)))
    && !images.some((q) => onScreen(P2(q)));

  /** Which side of the glass a point is on, from where the camera stands. */
  const inFront = (p) => {
    if (!usingPlane) return true;
    const n = planeNormal(s.plane);
    const here = dot(n, p) + s.plane.d;
    return here * dot(n, cam.fwd) >= 0;
  };

  /* ---------- the construction ---------- */
  const construction = pts.map((p, i) => {
    const q = images[i], f = feet[i];
    if (lenV(subV(q, p)) < 1e-7) return null;
    const a = P2(p), b = P2(q), m = P2(f);
    return (
      <g key={`c${i}`} className="perp">
        <line className="join" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <rect className="foot-mark" x={m.x - 4} y={m.y - 4} width="8" height="8"
              transform={`rotate(45 ${m.x} ${m.y})`} />
      </g>
    );
  });

  const marker = (p, i, kind) => {
    const a = P2(p);
    const tag = kind === 'img' ? `${labels[i]}′` : labels[i];
    return (
      <g key={`${kind}${i}`}
         className={`vtx ${kind}${kind === 'obj' && editable ? ' grabbable' : ''}`}
         {...(kind === 'obj' && editable ? {
           tabIndex: 0,
           role: 'button',
           'aria-label': `${labels[i]} at ${num(p.x)}, ${num(p.y)}, ${num(p.z)}.`
             + ' Arrow keys and Page Up or Down move it.',
           onPointerDown: (e) => grabPoint(e, { kind: 'vertex', index: i }, p),
           onKeyDown: (e) => nudge3(e, p, (v) => dispatch({ type: 'point', index: i, value: v })),
         } : {})}>
        {kind === 'img'
          ? <rect x={a.x - 5.5} y={a.y - 5.5} width="11" height="11" rx="1.5" />
          : <circle cx={a.x} cy={a.y} r="6" />}
        {s.showCoords && (
          <text className="vtx-label" x={a.x + 10} y={a.y - 8}>
            {tag} ({num(p.x, 3)}, {num(p.y, 3)}, {num(p.z, 3)})
          </text>
        )}
      </g>
    );
  };

  const shape = (list, cls) => (list.length > 2
    ? <polygon className={`shape ${cls}`} points={list.map((p) => { const a = P2(p); return `${a.x},${a.y}`; }).join(' ')} />
    : null);

  const behind = [], front = [];
  pts.forEach((p, i) => (inFront(p) ? front : behind).push(marker(p, i, 'obj')));
  images.forEach((q, i) => (inFront(q) ? front : behind).push(marker(q, i, 'img')));

  return (
    <svg ref={svgRef} id="scene" viewBox={`0 0 ${W} ${H}`} width={W} height={H}
         role="img"
         aria-label={`A three-dimensional view reaching ±${num(R, 3)}, centred on `
           + `(${num(O.x, 2)}, ${num(O.y, 2)}, ${num(O.z, 2)}). The mirror is `
           + (usingPlane ? `the plane ${planeText(s.plane)}` : `the line ${lineVectorText(ln)}`)
           + `. The object is at `
           + pts.map((p, i) => `${labels[i]} (${num(p.x)}, ${num(p.y)}, ${num(p.z)})`).join(', ')}
         tabIndex={0}
         onKeyDown={orbitKeys}
         onPointerDown={startOrbit} onPointerMove={onMove}
         onPointerUp={endDrag} onPointerCancel={endDrag}>

      <rect className="board3" x="0" y="0" width={W} height={H} />
      {cubeEdges}

      {/* ---------- the three axes ----------
          Drawn as far as the drawing goes, not merely as far as the axes box:
          scroll away from the middle and the box is soon out of sight, and an
          axis that stopped with it would leave nothing at all to steer by. */}
      {AXES.map(({ key, dir }, ai) => {
        const seen = axisSpans[ai];
        if (!seen) return null;
        const [t0, t1] = seen;
        const a = P2(scaleV(dir, t0)), b = P2(scaleV(dir, t1));
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        /* along the axis on screen, and across it, for hanging numbers off */
        const nx = -Math.sin(ang), ny = Math.cos(ang);

        /* the box's own step, coarsened if the view has been scrolled so far
           that keeping it would turn the axis into a solid rule of dots */
        const st = Math.max(axisStep, niceStep(t1 - t0, 30));
        const dp = stepDecimals(st);
        const marks = [];
        const first = Math.ceil(t0 / st);
        const last = Math.floor(t1 / st);
        const pxPerStep = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(last - first, 1);
        const every = Math.max(1, Math.ceil(84 / Math.max(pxPerStep, 1)));
        if (last - first < 400) {
          for (let i = first; i <= last; i++) {
            const v = i * st;
            if (Math.abs(v) < st * 1e-6) continue;
            const t = P2(scaleV(dir, v));
            marks.push(
              <circle key={`t${i}`} className="ax-tick" cx={t.x} cy={t.y} r="1.8" />,
            );
            if (i % every === 0) {
              marks.push(
                <text key={`n${i}`} className="ax-num"
                      x={t.x + nx * 11} y={t.y + ny * 11 + 3.5} textAnchor="middle">
                  {num(v, dp + 2)}
                </text>,
              );
            }
          }
        }
        return (
          <g key={key} className={`axis3 ax-${key}`}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            {marks}
            <polygon points={[
              `${b.x},${b.y}`,
              `${b.x - 8 * Math.cos(ang - 0.4)},${b.y - 8 * Math.sin(ang - 0.4)}`,
              `${b.x - 8 * Math.cos(ang + 0.4)},${b.y - 8 * Math.sin(ang + 0.4)}`,
            ].join(' ')} />
            <text className="ax-name" x={b.x - 13 * Math.cos(ang) + nx * 12}
                  y={b.y - 13 * Math.sin(ang) + ny * 12 + 4} textAnchor="middle">{key}</text>
          </g>
        );
      })}

      {/* the mirror can be left where the view is not looking, and a mirror
          that is simply absent looks like a fault */}
      {mirrorOffscreen && !nothingInView && (
        <g className="offscreen-note" transform={`translate(${CX} ${CY + fitH / 2 - 34})`}>
          <rect x="-206" y="-15" width="412" height="30" rx="7" />
          <text x="0" y="5" textAnchor="middle">
            {usingPlane ? planeText(s.plane) : 'the mirror line'} is off screen —
            {' '}scroll, or press Reset view
          </text>
        </g>
      )}

      {/* flown right out of the scene: no axis crosses the view and nor does
          anything else, so there is nothing left to steer back by */}
      {nothingInView && (
        <g className="offscreen-note" transform={`translate(${CX} ${CY})`}>
          <rect x="-196" y="-16" width="392" height="32" rx="7" />
          <text x="0" y="5" textAnchor="middle">
            Nothing here — press Reset view to come back
          </text>
        </g>
      )}

      {behind}
      {mirrorNode}
      {normalNode}
      {construction}
      {shape(images, 'img')}
      {shape(pts, 'obj')}
      {front}

      {/* the ends of the mirror line, which can be taken hold of */}
      {!usingPlane && editable && ['A', 'B'].map((which) => {
        const p = which === 'A' ? s.lnA : s.lnB;
        const a = P2(p);
        return (
          <g key={which} className="handle grabbable" tabIndex={0} role="button"
             aria-label={`${which === 'A' ? 'First' : 'Second'} point on the mirror line,`
               + ` at ${num(p.x)}, ${num(p.y)}, ${num(p.z)}.`}
             onPointerDown={(e) => grabPoint(e, { kind: 'ln', which }, p)}
             onKeyDown={(e) => nudge3(e, p, (v) => dispatch({ type: 'lnPoint', which, value: v }))}>
            <circle cx={a.x} cy={a.y} r="7" />
          </g>
        );
      })}
    </svg>
  );
}
