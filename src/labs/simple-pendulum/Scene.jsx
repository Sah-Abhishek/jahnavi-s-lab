/* ============================================================
   Simple Pendulum — the apparatus.
   A bob on a string, hung from a beam, with a protractor at the
   pivot and a ruler down the side. Everything is drawn from the
   live angle, so the picture is the simulation rather than an
   illustration of it.
   ============================================================ */
import { useCallback, useRef } from 'react';
import {
  DEG, AMP_MAX, clamp, fmt, tidy,
  layout, pivots, bobRadius, decimalsOf, tension, restoring,
} from './engine';

/** A circular arc as a sampled path: easier to reason about than SVG's
    arc flags, and identical on screen. Angles are measured from straight
    down, positive to the right. */
function arcPath(cx, cy, r, from, to, n = 36) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const th = from + ((to - from) * i) / n;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.sin(th)).toFixed(2)} ${(cy + r * Math.cos(th)).toFixed(2)}`;
  }
  return d;
}

/** An arrow from a point, along a unit direction.
    The label sits past the head and off to one side. Velocity and the
    restoring force both lie along the tangent, so they are given opposite
    sides — otherwise their labels land on top of each other every time the
    bob swings back towards the middle. */
function Arrow({ x, y, ux, uy, len, cls, label, labelSide = 1 }) {
  const ex = x + ux * len, ey = y + uy * len;
  const bx = x + ux * (len - 9), by = y + uy * (len - 9);
  const px = -uy, py = ux;                       // perpendicular, for the head
  const lx = ex + ux * 10 + px * 12 * labelSide;
  const ly = ey + uy * 10 + py * 12 * labelSide + 4;
  return (
    <g className={cls}>
      <line x1={x} y1={y} x2={bx} y2={by} strokeWidth="2.2" strokeLinecap="round" />
      <polygon points={`${ex},${ey} ${bx + px * 5},${by + py * 5} ${bx - px * 5},${by - py * 5}`} />
      {label && (
        <text className="arrow-label" x={lx} y={ly}
              textAnchor={ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle'}>
          {label}
        </text>
      )}
    </g>
  );
}

/* ---------- one pendulum: protractor, string, bob and overlays ---------- */
function Pendulum({ s, P, which, cfg, arm, px, pxPerM, labelled, figures, onGrab, onNudge }) {
  const Lpx = cfg.length * pxPerM;
  const th = arm.theta;
  const amp = cfg.amplitude * DEG;
  const bx = px + Lpx * Math.sin(th);
  const by = P.beamY + Lpx * Math.cos(th);
  const r = bobRadius(P, cfg.mass);
  const R = P.protractor;

  /* unit vectors at the bob: along the string away from the pivot, and
     along the direction of travel */
  const rx = Math.sin(th), ry = Math.cos(th);
  const tx = Math.cos(th), ty = -Math.sin(th);

  const v = cfg.length * arm.omega;
  const Tn = tension(cfg.mass, s.g, cfg.length, th, arm.omega);
  const W = cfg.mass * s.g;
  const Fr = restoring(cfg.mass, s.g, th);
  /* arrows are scaled against the bob's own weight, so the tension visibly
     grows past it at the bottom of a big swing */
  const fLen = (F) => clamp((F / W) * P.arrowMax * 0.72, 15, P.arrowMax * 1.7);

  const degTicks = [];
  for (let d = -75; d <= 75; d += 15) {
    const a = d * DEG;
    const major = d % 30 === 0;
    const r0 = R - (major ? 8 : 5);
    degTicks.push(
      <line key={d} className="pend-prot-tick" x1={px + r0 * Math.sin(a)} y1={P.beamY + r0 * Math.cos(a)}
            x2={px + R * Math.sin(a)} y2={P.beamY + R * Math.cos(a)}
            strokeWidth={major ? 1.2 : 0.9} opacity={major ? 0.8 : 0.45} />
    );
    /* two protractors' worth of numerals is more clutter than information —
       with both hanging, the live readings below carry the angles */
    if (major && d !== 0 && labelled) {
      degTicks.push(
        <text key={`l${d}`} className="pend-prot-label"
              x={px + (R + 11) * Math.sin(a)} y={P.beamY + (R + 11) * Math.cos(a) + 3}
              textAnchor="middle">{Math.abs(d)}</text>
      );
    }
  }

  return (
    <g className={`pend pend-${which}`} style={{ '--arm': `var(--pend-${which})` }}>
      {/* the protractor, and the vertical the angle is measured from */}
      <path className="pend-prot-arc" d={arcPath(px, P.beamY, R, -80 * DEG, 80 * DEG)} fill="none" />
      {degTicks}
      <line className="pend-rest" x1={px} y1={P.beamY} x2={px} y2={P.beamY + Lpx + 14}
            strokeWidth="1.1" strokeDasharray="5 4" />

      {/* the arc the bob was released to sweep */}
      {s.showSwing && (
        <>
          <path className="pend-swing" d={arcPath(px, P.beamY, Lpx, -amp, amp)} fill="none"
                strokeWidth="1.4" strokeDasharray="6 4" />
          {[-amp, amp].map((a, i) => (
            <line key={i} className="pend-swing-end"
                  x1={px + (Lpx - 7) * Math.sin(a)} y1={P.beamY + (Lpx - 7) * Math.cos(a)}
                  x2={px + (Lpx + 7) * Math.sin(a)} y2={P.beamY + (Lpx + 7) * Math.cos(a)}
                  strokeWidth="1.6" />
          ))}
        </>
      )}

      {/* the angle now */}
      <path className="pend-angle" d={arcPath(px, P.beamY, R * 0.62, 0, th)} fill="none"
            strokeWidth="2" />
      <text className="pend-angle-label"
            x={px + (R + 34) * Math.sin(th / 2) + (th >= 0 ? 9 : -9)}
            y={P.beamY + (R + 34) * Math.cos(th / 2) + 4}
            textAnchor={th >= 0 ? 'start' : 'end'}>
        {fmt(Math.abs(th / DEG), 1)}°
      </text>

      <line className="pend-string" x1={px} y1={P.beamY} x2={bx} y2={by} strokeWidth="1.8" />
      <circle className="pend-pivot" cx={px} cy={P.beamY} r="3.6" strokeWidth="2" />

      {/* overlays sit under the bob so the bob is always grabbable */}
      {s.showVelocity && Math.abs(v) > 0.05 && (
        <Arrow x={bx} y={by} ux={tx * Math.sign(v)} uy={ty * Math.sign(v)}
               len={clamp(Math.abs(v) * P.arrowK * 8, 16, P.arrowMax * 1.4)}
               cls="pend-vel" label={figures ? `v = ${fmt(Math.abs(v))} m/s` : null} labelSide={1} />
      )}
      {s.showForces && (
        <>
          <Arrow x={bx} y={by} ux={-rx} uy={-ry} len={fLen(Tn)} cls="pend-tension"
                 label={figures ? `T = ${fmt(Tn, 1)} N` : null} />
          <Arrow x={bx} y={by} ux={0} uy={1} len={fLen(W)} cls="pend-weight"
                 label={figures ? `mg = ${fmt(W, 1)} N` : null} labelSide={1} />
          {Math.abs(Fr) > 1e-3 && (
            <Arrow x={bx} y={by} ux={-tx * Math.sign(th)} uy={-ty * Math.sign(th)}
                   len={fLen(Math.abs(Fr))} cls="pend-restore"
                   label={figures ? `mg sin θ = ${fmt(Math.abs(Fr), 1)} N` : null} labelSide={-1} />
          )}
        </>
      )}

      <g className="pend-bob-grp" tabIndex={0} role="button"
         aria-label={`${tidy(cfg.mass)} kilogram bob on a ${tidy(cfg.length)} metre string, ` +
                     `released from ${tidy(cfg.amplitude)} degrees`}
         onPointerDown={(e) => onGrab(e, which)}
         onKeyDown={(e) => onNudge(e, which)}>
        <circle className="pend-hit" cx={bx} cy={by} r={Math.max(r + 12, 22)} fill="none"
                pointerEvents="all" />
        <circle className="pend-bob" cx={bx} cy={by} r={r} strokeWidth="2"
                filter="url(#pendShadow)" />
        {!s.showForces && (
          <text className="pend-bob-cap" x={bx} y={by + r + 14} textAnchor="middle"
                pointerEvents="none">{tidy(cfg.mass)} kg</text>
        )}
      </g>
    </g>
  );
}

export default function Scene({ state: s, profile: P, motion, unitsPerPx, onGrab, onDrag, onRelease, dispatch }) {
  const svgRef = useRef(null);
  const drag = useRef(null);

  const { frame, pxPerM, step } = layout(P, s);
  const [xa, xb] = pivots(P, s.compare);
  const arms = s.compare ? ['a', 'b'] : ['a'];
  const xOf = { a: xa, b: xb };

  const svgPoint = useCallback((evt) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  /** Where the pointer is, as an angle from the vertical at that pivot. */
  const pointerAngle = (evt, which) => {
    const p = svgPoint(evt);
    const a = Math.atan2(p.x - xOf[which], Math.max(p.y - P.beamY, 1));
    return clamp(a / DEG, -AMP_MAX, AMP_MAX);
  };

  const grab = (e, which) => {
    if (s.mode === 'challenge' && s.frozen) return;
    drag.current = which;
    onGrab(which);
    svgRef.current.setPointerCapture(e.pointerId);
    svgRef.current.classList.add('dragging');
    e.preventDefault();
  };

  const move = (e) => {
    if (!drag.current) return;
    onDrag(drag.current, pointerAngle(e, drag.current) * DEG);
  };

  const end = (e) => {
    if (!drag.current) return;
    const which = drag.current;
    drag.current = null;
    svgRef.current.classList.remove('dragging');
    if (svgRef.current.hasPointerCapture?.(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    onRelease(which);
  };

  const nudge = (e, which) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const by = (e.shiftKey ? 5 : 1) * (e.key === 'ArrowRight' ? 1 : -1);
    dispatch({ type: 'arm', which, key: 'amplitude', value: s[which].amplitude + by });
  };

  /* ---------- the ruler down the side ---------- */
  const dp = decimalsOf(step);
  const ticks = [];
  for (let v = step; v <= frame + 1e-9; v += step) {
    const y = P.beamY + v * pxPerM;
    ticks.push(
      <g key={v.toFixed(4)}>
        <line className="pend-ruler-tick" x1={P.rulerX} y1={y} x2={P.rulerX + 8} y2={y}
              strokeWidth="1.2" />
        <text className="pend-ruler-label" x={P.rulerX + 12} y={y + 3.5}>{v.toFixed(dp)}</text>
      </g>
    );
  }

  /* ---------- graph paper, its major lines on the ruler's marks ---------- */
  const cell = step * pxPerM;
  const q = cell / 4;
  const minorD = `M${q} 0V${cell}M${2 * q} 0V${cell}M${3 * q} 0V${cell}` +
                 `M0 ${q}H${cell}M0 ${2 * q}H${cell}M0 ${3 * q}H${cell}`;

  /* ---------- the beam the whole thing hangs from ---------- */
  const beamX0 = Math.min(xa, xb ?? xa) - 96;
  const beamX1 = Math.max(xa, xb ?? xa) + 96;
  const hatch = [];
  for (let x = beamX0 + 4; x < beamX1; x += 12) {
    hatch.push(
      <line key={x.toFixed(1)} className="ground-hatch" x1={x} y1={P.beamY - 9}
            x2={x - 7} y2={P.beamY - 16} strokeWidth="1" opacity="0.32" />
    );
  }

  const arm3 = arms.map((which) => ({ which, cfg: s[which], arm: motion[which] }));

  return (
    <svg ref={svgRef} id="scene" className={P.name === 'compact' ? 'compact' : undefined}
         viewBox={`0 0 ${P.W} ${P.H}`} style={{ '--u': unitsPerPx }}
         role="img"
         aria-label="A bob hanging on a string from a beam, swinging past a protractor"
         onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <defs>
        <pattern id="pendGrid" patternUnits="userSpaceOnUse"
                 x={P.rulerX} y={P.beamY} width={cell} height={cell}>
          <path className="grid-minor" d={minorD} fill="none" />
          <path className="grid-major" d={`M0 0V${cell}M0 0H${cell}`} fill="none" />
        </pattern>
        <filter id="pendShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#141c26" floodOpacity="0.22" />
        </filter>
      </defs>

      <rect x="0" y="0" width="100%" height="100%" fill="url(#pendGrid)" />

      {/* the support */}
      <line className="ground-line" x1={beamX0} y1={P.beamY - 9} x2={beamX1} y2={P.beamY - 9}
            strokeWidth="1.5" opacity="0.5" />
      {hatch}
      <rect className="pend-beam" x={beamX0} y={P.beamY - 9} width={beamX1 - beamX0} height="9" rx="1.5" />

      {/* the ruler: what "length" means here */}
      <line className="pend-ruler" x1={P.rulerX} y1={P.beamY} x2={P.rulerX} y2={P.beamY + frame * pxPerM}
            strokeWidth="1.4" />
      {ticks}
      <text className="pend-ruler-head" x={P.rulerX} y={P.beamY - 14}>metres</text>

      {arm3.map(({ which, cfg, arm }) => (
        <Pendulum key={which} s={s} P={P} which={which} cfg={cfg} arm={arm}
                  px={xOf[which]} pxPerM={pxPerM} labelled={!s.compare}
                  figures={!(P.name === 'compact' && s.compare)}
                  onGrab={grab} onNudge={nudge} />
      ))}

      {s.compare && arm3.map(({ which }) => (
        <text key={`n${which}`} className={`pend-name pend-name-${which}`}
              x={xOf[which]} y={P.beamY - 20} textAnchor="middle">
          {which.toUpperCase()}
        </text>
      ))}

      <text className="scene-caption" x={P.W / 2} y={P.capY} textAnchor="middle">
        {P.name === 'compact'
          ? 'Length is measured to the centre of the bob'
          : 'Length is measured from the pivot to the centre of the bob · the angle is taken from the vertical'}
      </text>
    </svg>
  );
}
