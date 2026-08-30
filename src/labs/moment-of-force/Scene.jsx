/* ============================================================
   Moment of Force — the apparatus.
   A rod on a movable wedge, with masses hung from it. The rod is
   drawn once at zero tilt and rotated about the pivot; everything
   that hangs from it is placed through toWorld(), so a mass stays
   upright while its anchor point rides the tilt.
   ============================================================ */
import { useCallback, useRef } from 'react';
import {
  DIVS, U, RL, ppm, pivotX, toWorld, getItems,
  niceStep, snapStep, posDp, tickDp, snapPos, fmt, kgOf, clamp,
} from './engine';

/* ---------- one force arrow, pointing down ---------- */
function DownArrow({ x, yTop, len, color, cls, label }) {
  const yEnd = yTop + len;
  const lineProps = cls ? { className: `${cls}-line` } : { stroke: color };
  const headProps = cls ? { className: `${cls}-head` } : { fill: color };
  const labProps = cls
    ? { className: `arrow-label ${cls}-label` }
    : { className: 'arrow-label', fill: color };
  return (
    <>
      <line {...lineProps} x1={x} y1={yTop} x2={x} y2={yEnd - 8}
            strokeWidth="2.2" strokeLinecap="round" />
      <polygon {...headProps}
               points={`${x},${yEnd} ${x - 5},${yEnd - 8.5} ${x + 5},${yEnd - 8.5}`} />
      {label && <text {...labProps} x={x + 8} y={yTop + len / 2 + 4}>{label}</text>}
    </>
  );
}

/* ---------- the rod's own weight, shown as two pieces ---------- */
function RodSegment({ s, P, it, rad }) {
  const p = toWorld(s, P, it.x, 0, rad);
  const len = Math.min(P.arrowMax, 16 + it.force * P.arrowK);
  const a = toWorld(s, P, it.from, P.ROD_H + 5, rad);
  const b = toWorld(s, P, it.to, P.ROD_H + 5, rad);
  return (
    <g>
      <line className="seg-span" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
            strokeWidth="3" strokeLinecap="round" />
      <circle className="rod-cog" cx={p[0]} cy={p[1]} r="5.5" strokeWidth="2" />
      <circle className="rod-cog-dot" cx={p[0]} cy={p[1]} r="1.8" />
      {s.showForces && (
        <DownArrow x={p[0]} yTop={p[1] + 10} len={len} cls="rodw"
                   label={`${fmt(it.force)} ${U(s).force}`} />
      )}
      <text className="rod-cog-label" x={p[0]}
            y={p[1] + 10 + (s.showForces ? len : 0) + 14} textAnchor="middle">
        {it.short}
      </text>
    </g>
  );
}

/* ---------- a hanging mass: block, hanger, caption, force arrow ---------- */
function HangingMass({ s, P, it, rad, onGrab, onNudge }) {
  const anchor = toWorld(s, P, it.x, P.ROD_H, rad);
  const size = P.boxMin + P.boxSpan * Math.sqrt(clamp(it.m, 0, 25) / 10);
  const top = anchor[1] + P.hang;
  const cx = anchor[0];
  const fs = Math.max(9.5, size * 0.31);
  const hitW = Math.max(size + P.hitPad, P.hitPad * 2);
  const dp = posDp(s);

  return (
    <g className={`mass-grp${it.locked ? ' locked' : ''}${it.active ? '' : ' off'}`}
       tabIndex={0} role="button"
       aria-label={`${it.m} ${U(s).mass} mass at ${it.x.toFixed(dp)} ${U(s).lenWord}` +
                   (it.active ? '' : ', switched off')}
       onPointerDown={(e) => onGrab(e, it)}
       onKeyDown={(e) => onNudge(e, it)}>
      {/* a generous invisible target, so a fingertip can grab it */}
      <rect className="hit" x={cx - hitW / 2} y={anchor[1] - 6} width={hitW}
            height={top + size + 16 - anchor[1]} fill="none" pointerEvents="all" />
      <line className="hanger" x1={cx} y1={anchor[1]} x2={cx} y2={top} strokeWidth="1.6" />
      <circle className="hook" cx={cx} cy={anchor[1]} r="3.5" />
      <rect className={`mbox${it.locked ? ' fixed' : ''}${it.active ? '' : ' idle'}${it.auto ? ' auto' : ''}`}
            x={cx - size / 2} y={top} width={size} height={size} rx="3"
            fill={it.color} strokeWidth="2" filter="url(#softShadow)" />
      <text className="mbox-label" x={cx} y={top + size / 2 + fs * 0.36}
            textAnchor="middle" fontSize={fs.toFixed(1)} fontWeight="500"
            pointerEvents="none">{it.m}</text>
      <text className="mass-cap" x={cx} y={top + size + 13} textAnchor="middle"
            pointerEvents="none">
        {kgOf(it.m)} {U(s).mass}{it.active ? '' : ' · off'}{it.auto ? ' · auto' : ''}
      </text>
      {s.showForces && it.active && (
        <DownArrow x={cx} yTop={top + size + 18}
                   len={Math.min(P.arrowMax, 16 + it.force * P.arrowK)}
                   color={it.color} label={`${fmt(it.force)} ${U(s).force}`} />
      )}
    </g>
  );
}

export default function Scene({ state: s, profile: P, angle, unitsPerPx, dispatch }) {
  const svgRef = useRef(null);
  const drag = useRef(null);

  const rad = (angle * Math.PI) / 180;
  const px = pivotX(s, P);
  const items = getItems(s);
  const dp = posDp(s);
  const step = niceStep(s);
  const scale = ppm(s, P);
  const editable = s.mode !== 'challenge';

  /* ---------- pointer ---------- */
  const svgPoint = useCallback((evt) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  /** Project the pointer onto the tilted rod and read off its position. */
  const pointerToRodPos = useCallback((evt) => {
    const p = svgPoint(evt);
    const d = ((p.x - pivotX(s, P)) * Math.cos(rad) + (p.y - P.ROD_Y) * Math.sin(rad)) / ppm(s, P);
    return clamp(s.fulcrum + d, 0, RL(s));
  }, [s, P, rad, svgPoint]);

  const startDrag = (e, kind, id) => {
    drag.current = { kind, id };
    svgRef.current.setPointerCapture(e.pointerId);
    svgRef.current.classList.add('dragging');
    e.preventDefault();
  };

  const grabMass = (e, it) => {
    if (it.locked) return;
    startDrag(e, 'mass', it.id);
  };

  const grabFulcrum = (e) => {
    if (!editable) return;
    startDrag(e, 'fulcrum');
  };

  const onMove = (e) => {
    if (!drag.current) return;
    if (drag.current.kind === 'mass') {
      dispatch({ type: 'massPos', id: drag.current.id, value: snapPos(s, pointerToRodPos(e)) });
    } else {
      const p = svgPoint(e);
      dispatch({ type: 'fulcrum', value: clamp(snapPos(s, (p.x - P.X0) / scale), 0, RL(s)) });
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

  /* ---------- keyboard ---------- */
  const nudge = (e, it) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (it && it.locked) return;
    /* always the coarse grid, snap or not: arrow keys are for stepping, not nudging */
    const delta = snapStep(s) * (e.shiftKey ? 4 : 1) * (e.key === 'ArrowRight' ? 1 : -1);
    e.preventDefault();
    if (it) dispatch({ type: 'massPos', id: it.id, value: clamp(it.x + delta, 0, RL(s)) });
    else if (editable) dispatch({ type: 'fulcrum', value: clamp(s.fulcrum + delta, 0, RL(s)) });
  };

  /* ---------- the rod's numbered marks ---------- */
  const ticks = [];
  const half = step / 2;
  let lastLabel = -Infinity;
  for (let i = 0; i * half <= RL(s) + 1e-9; i++) {
    const v = i * half;
    const x = P.X0 + v * scale;
    const major = i % 2 === 0;
    ticks.push(
      <line key={`t${i}`} className="tick" x1={x} y1={P.ROD_Y - P.ROD_H} x2={x}
            y2={P.ROD_Y - P.ROD_H + (major ? 7 : 4)}
            strokeWidth={major ? 1.3 : 1} opacity={major ? 0.85 : 0.45} />
    );
    if (major) {
      ticks.push(
        <text key={`l${i}`} className="tick-label" x={x} y={P.ROD_Y - P.ROD_H - 5}
              textAnchor="middle">{v.toFixed(tickDp(s))}</text>
      );
      lastLabel = v;
    }
  }
  /* a custom length rarely ends on a mark, so label the far end too */
  if (RL(s) - lastLabel > step * 0.35) {
    const x = P.X0 + RL(s) * scale;
    ticks.push(
      <line key="tend" className="tick" x1={x} y1={P.ROD_Y - P.ROD_H} x2={x}
            y2={P.ROD_Y - P.ROD_H + 7} strokeWidth="1.3" opacity="0.85" />,
      <text key="lend" className="tick-label" x={x} y={P.ROD_Y - P.ROD_H - 5}
            textAnchor="middle">{RL(s).toFixed(dp)}</text>
    );
  }

  /* ---------- graph paper, with its major lines on the rod's marks ---------- */
  const cell = step * scale;
  const q = cell / 4;
  const minorD = `M${q} 0V${cell}M${2 * q} 0V${cell}M${3 * q} 0V${cell}` +
                 `M0 ${q}H${cell}M0 ${2 * q}H${cell}M0 ${3 * q}H${cell}`;

  /* ---------- the wedge and its bench ---------- */
  const half2 = P.name === 'compact' ? 20 : 26;
  const base = P.PLATE;
  const bw = half2 * 2.7;
  const hatches = [];
  for (let x = px - bw + 4; x < px + bw; x += 11) {
    hatches.push(
      <line key={`h${x.toFixed(1)}`} className="ground-hatch" x1={x} y1={base + 10}
            x2={x - 6} y2={base + 16} strokeWidth="1" opacity="0.3" />
    );
  }

  const totalW = items.reduce((sum, it) => sum + (it.active ? it.force : 0), 0);

  return (
    <svg ref={svgRef} id="scene" className={P.name === 'compact' ? 'compact' : undefined}
         viewBox={`0 0 ${P.W} ${P.H}`} style={{ '--u': unitsPerPx }}
         role="img"
         aria-label="A rod resting on a triangular fulcrum with masses hanging from it"
         onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <defs>
        <linearGradient id="rodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbe1e9" />
          <stop offset="45%" stopColor="#9aa6b6" />
          <stop offset="55%" stopColor="#7f8b9c" />
          <stop offset="100%" stopColor="#dbe1e9" />
        </linearGradient>
        <linearGradient id="fulcrumGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a5a93" />
          <stop offset="55%" stopColor="#2e4a7d" />
          <stop offset="100%" stopColor="#233c69" />
        </linearGradient>
        <pattern id="grid" patternUnits="userSpaceOnUse"
                 x={P.X0} y={P.ROD_Y - 2 * cell} width={cell} height={cell}>
          <path className="grid-minor" d={minorD} fill="none" />
          <path className="grid-major" d={`M0 0V${cell}M0 0H${cell}`} fill="none" />
        </pattern>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#141c26" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />

      {/* the compact drawing is only ~400 px wide, so the long caption would be
          cut off at both ends — say the same thing in fewer words */}
      <text className="scene-caption" x={P.W / 2} y={P.capY} textAnchor="middle">
        {P.name === 'compact'
          ? `Rod length ${RL(s)} ${U(s).len} — measured from the pivot`
          : `Rod length ${RL(s)} ${U(s).len} — every distance that counts is measured from the pivot.`}
      </text>

      {/* the fulcrum: wedge, plate, bench, pin */}
      <g className={`fulcrum-grp${editable ? '' : ' locked'}`} tabIndex={0} role="slider"
         aria-label="Fulcrum position" aria-valuenow={Number(s.fulcrum.toFixed(dp))}
         aria-valuemin={0} aria-valuemax={RL(s)}
         onPointerDown={grabFulcrum} onKeyDown={(e) => nudge(e, null)}>
        <polygon className="fwedge" filter="url(#softShadow)"
                 points={`${px},${P.ROD_Y + P.ROD_H - 1} ${px - half2},${base} ${px + half2},${base}`} />
        <rect className="fplate" x={px - half2 * 1.7} y={base} width={half2 * 3.4} height="10" rx="2" />
        {/* a short bench under the stand, so far-out masses never cross a ground line */}
        <line className="ground-line" x1={px - bw} y1={base + 10} x2={px + bw} y2={base + 10}
              strokeWidth="1.5" opacity="0.45" />
        {hatches}
        <circle className="fpin" cx={px} cy={P.ROD_Y} r={P.name === 'compact' ? 3.5 : 4.5}
                strokeWidth="2" />
        <text className="pivot-label" x={px} y={base + 32} textAnchor="middle">
          PIVOT {s.fulcrum.toFixed(dp)} {U(s).len}
        </text>
      </g>

      {/* the rod: drawn level, then rotated about the pivot */}
      <g transform={`rotate(${angle.toFixed(3)} ${px} ${P.ROD_Y})`}>
        <rect className="rod-face" x={P.X0} y={P.ROD_Y - P.ROD_H}
              width={DIVS * P.DIV} height={P.ROD_H * 2} rx="3" strokeWidth="1"
              filter="url(#softShadow)" />
        {ticks}
      </g>

      {/* distance markers, drawn parallel to the tilted rod */}
      {s.showDistances && items.map((it) => {
        if (!it.active || it.d < 0.12) return null;
        const a = toWorld(s, P, s.fulcrum, -P.dim, rad);
        const b = toWorld(s, P, it.x, -P.dim, rad);
        const c = it.dir > 0 ? 'cw' : 'acw';
        const tick = (p, k) => (
          <line key={k} className={`dim-tick ${c}`} x1={p[0]} y1={p[1] - 4.5}
                x2={p[0]} y2={p[1] + 4.5} strokeWidth="1.4" />
        );
        return (
          <g key={`d${it.id}`}>
            <line className={`dim-line ${c}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                  strokeWidth="1.4" strokeDasharray="5 3" />
            {tick(a, 'a')}{tick(b, 'b')}
            <text className={`dim-label ${c}`} x={(a[0] + b[0]) / 2} y={(a[1] + b[1]) / 2 - 7}
                  textAnchor="middle">{it.d.toFixed(dp)} {U(s).len}</text>
          </g>
        );
      })}

      {/* the upward reaction the stand pushes back with */}
      {s.showForces && totalW > 0 && (() => {
        const yTail = P.ROD_Y + P.reactTail, yHead = P.ROD_Y + 16;
        return (
          <g>
            <line className="reaction-line" x1={px} y1={yTail} x2={px} y2={yHead + 8}
                  strokeWidth="2.2" strokeLinecap="round" />
            <polygon className="reaction-head"
                     points={`${px},${yHead} ${px - 5},${yHead + 8.5} ${px + 5},${yHead + 8.5}`} />
            <text className="reaction-label arrow-label" x={px + 9} y={yTail - 18}>
              R = {fmt(totalW)} {U(s).force}
            </text>
          </g>
        );
      })()}

      {/* everything that hangs from the rod */}
      {items.map((it) => (it.isRod
        ? <RodSegment key={it.id} s={s} P={P} it={it} rad={rad} />
        : <HangingMass key={it.id} s={s} P={P} it={it} rad={rad}
                       onGrab={grabMass} onNudge={nudge} />))}
    </svg>
  );
}
