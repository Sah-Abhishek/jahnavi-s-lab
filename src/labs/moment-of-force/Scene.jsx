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
  niceStep, snapStep, posDp, tickDp, snapPos, snapOnRod, relOf, absOf, fmtRel, sayRel,
  fmt, kgOf, clamp,
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

  return (
    <g className={`mass-grp${it.locked ? ' locked' : ''}${it.active ? '' : ' off'}`}
       tabIndex={0} role="button"
       aria-label={`${it.m} ${U(s).mass} mass, ${sayRel(s, it.dSigned)}` +
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
            pointerEvents="none">{kgOf(it.m)}</text>
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
  const crane = s.tab === 'world';             // the Real world tab dresses it as a tower crane
  const compact = P.name === 'compact';

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
      dispatch({ type: 'massPos', id: drag.current.id, value: snapOnRod(s, pointerToRodPos(e)) });
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
    const st = snapStep(s);
    const delta = st * (e.shiftKey ? 4 : 1) * (e.key === 'ArrowRight' ? 1 : -1);
    e.preventDefault();
    if (it) {
      /* step along the marks the rod carries, so a stepped mass lands on one */
      const rel = Math.round((relOf(s, it.x) + delta) / st) * st;
      dispatch({ type: 'massPos', id: it.id, value: clamp(absOf(s, rel), 0, RL(s)) });
    } else if (editable) {
      dispatch({ type: 'fulcrum', value: clamp(s.fulcrum + delta, 0, RL(s)) });
    }
  };

  /* ---------- the rod's numbered marks, counted from the pivot ----------
     The pivot carries the zero, so the marks are laid out from it and travel
     with it: the left-hand end of the rod reads -fulcrum, the right-hand end
     reads (length - fulcrum), and a mass's mark IS its distance from the pivot. */
  const ticks = [];
  const half = step / 2;
  const leftEnd = -s.fulcrum, rightEnd = RL(s) - s.fulcrum;
  const mark = (key, x, major, label, zero) => {
    ticks.push(
      <line key={`t${key}`} className={`tick${zero ? ' zero' : ''}`}
            x1={x} y1={P.ROD_Y - P.ROD_H} x2={x}
            y2={P.ROD_Y - P.ROD_H + (major ? 7 : 4)}
            strokeWidth={zero ? 1.8 : (major ? 1.3 : 1)}
            opacity={zero ? 1 : (major ? 0.85 : 0.45)} />
    );
    if (label !== undefined) {
      ticks.push(
        <text key={`l${key}`} className={`tick-label${zero ? ' zero' : ''}`}
              x={x} y={P.ROD_Y - P.ROD_H - 5} textAnchor="middle">{label}</text>
      );
    }
  };

  let firstLabel = Infinity, lastLabel = -Infinity;
  for (let k = Math.ceil(leftEnd / half - 1e-9); k * half <= rightEnd + 1e-9; k++) {
    const rel = k * half;
    const major = k % 2 === 0;
    mark(String(k), px + rel * scale, major,
         major ? fmtRel(s, rel, tickDp(s)) : undefined, k === 0);
    if (major) {
      firstLabel = Math.min(firstLabel, rel);
      lastLabel = Math.max(lastLabel, rel);
    }
  }
  /* Neither end of the rod need land on a mark now that the pivot sets them out, so
     each end is numbered too — but an end reading is a long one ("-2.35" beside "-2"),
     so it is only drawn where it stands clear of the last numbered mark. The compact
     drawing sets its type proportionally larger, and needs most of a step. */
  const endRoom = step * (P.name === 'compact' ? 0.9 : 0.55);
  if (firstLabel - leftEnd > endRoom) {
    mark('L', px + leftEnd * scale, true, fmtRel(s, leftEnd, dp));
  }
  if (rightEnd - lastLabel > endRoom) {
    mark('R', px + rightEnd * scale, true, fmtRel(s, rightEnd, dp));
  }

  /* ---------- graph paper, with its major lines on the rod's marks ---------- */
  const cell = step * scale;
  const q = cell / 4;
  const minorD = `M${q} 0V${cell}M${2 * q} 0V${cell}M${3 * q} 0V${cell}` +
                 `M0 ${q}H${cell}M0 ${2 * q}H${cell}M0 ${3 * q}H${cell}`;

  /* ---------- the stand: a wedge on a bench, or a lattice tower on a roof ---------- */
  const half2 = compact ? 20 : 26;
  const base = P.PLATE;
  const bw = half2 * 2.7;
  const hatches = [];
  if (!crane) {
    for (let x = px - bw + 4; x < px + bw; x += 11) {
      hatches.push(
        <line key={`h${x.toFixed(1)}`} className="ground-hatch" x1={x} y1={base + 10}
              x2={x - 6} y2={base + 16} strokeWidth="1" opacity="0.3" />
      );
    }
  }

  /* The crane's furniture. The physics never changes with the costume: the tower IS
     the fulcrum, the jib IS the rod, and a trolley-and-hook is a hanging mass. */
  const towerTop = P.ROD_Y + P.ROD_H + 3;
  const tw = compact ? 9 : 13;                 // half-width of the tower
  const towerWeb = [];
  const bldgWins = [];
  if (crane) {
    const bay = compact ? 18 : 25;             // one X of cross-bracing per bay
    for (let y = towerTop + 2; y + bay <= base + 12.5; y += bay) {
      towerWeb.push(
        <line key={`wa${y}`} className="tower-web" x1={px - tw} y1={y}
              x2={px + tw} y2={y + bay} strokeWidth="1.1" />,
        <line key={`wb${y}`} className="tower-web" x1={px + tw} y1={y}
              x2={px - tw} y2={y + bay} strokeWidth="1.1" />,
        <line key={`wh${y}`} className="tower-web" x1={px - tw} y1={y}
              x2={px + tw} y2={y} strokeWidth="1.1" />
      );
    }
    /* the building under it — a parapet's breadth of blank wall, then windows */
    const wStep = compact ? 15 : 17;
    for (let y = base + 42; y + 10 < P.H - 4; y += wStep) {
      for (let x = px - bw + 9; x + 8 <= px + bw - 9; x += wStep) {
        bldgWins.push(
          <rect key={`bw${x.toFixed(0)}-${y.toFixed(0)}`} className="bldg-win"
                x={x} y={y} width="8" height="10" rx="1" />
        );
      }
    }
  }

  /* the jib: the same rod, dressed as lattice steelwork (a flat-top crane,
     conveniently, has no apex or tie bars to argue with the tilt) */
  const jib = [];
  const trolleys = [];
  if (crane) {
    const topY = P.ROD_Y - P.ROD_H, botY = P.ROD_Y + P.ROD_H;
    const x0 = P.X0, x1 = P.X0 + DIVS * P.DIV;
    const panel = P.DIV / 2;
    jib.push(
      <line key="jt" className="jib-chord" x1={x0} y1={topY} x2={x1} y2={topY}
            strokeWidth={compact ? 2.2 : 2.6} strokeLinecap="round" />,
      <line key="jb" className="jib-chord" x1={x0} y1={botY} x2={x1} y2={botY}
            strokeWidth={compact ? 2.2 : 2.6} strokeLinecap="round" />
    );
    for (let i = 0; i * panel <= DIVS * P.DIV + 0.5; i++) {
      const x = x0 + i * panel;
      jib.push(<line key={`jv${i}`} className="jib-web" x1={x} y1={topY} x2={x} y2={botY}
                     strokeWidth="1" />);
      if (x + panel <= x1 + 0.5) {
        jib.push(<line key={`jd${i}`} className="jib-web"
                       x1={x} y1={i % 2 ? topY : botY}
                       x2={x + panel} y2={i % 2 ? botY : topY} strokeWidth="1" />);
      }
    }
    /* one trolley per hanging load, riding the bottom chord — drawn inside the
       rotated group so it stays on the jib however far the beam leans */
    items.forEach((it) => {
      if (it.isRod) return;
      trolleys.push(
        <rect key={`trl${it.id}`} className="trolley"
              x={P.X0 + it.x * scale - (compact ? 6 : 8)} y={P.ROD_Y + P.ROD_H - 3}
              width={compact ? 12 : 16} height={compact ? 6 : 7} rx="1.5" />
      );
    });
  }

  const totalW = items.reduce((sum, it) => sum + (it.active ? it.force : 0), 0);

  return (
    <svg ref={svgRef} id="scene" className={P.name === 'compact' ? 'compact' : undefined}
         viewBox={`0 0 ${P.W} ${P.H}`} style={{ '--u': unitsPerPx }}
         role="img"
         aria-label={crane
           ? 'A tower crane: a lattice jib balanced on a tower, with loads hanging from trolleys'
           : 'A rod resting on a triangular fulcrum with masses hanging from it'}
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
                 x={px} y={P.ROD_Y - 2 * cell} width={cell} height={cell}>
          <path className="grid-minor" d={minorD} fill="none" />
          <path className="grid-major" d={`M0 0V${cell}M0 0H${cell}`} fill="none" />
        </pattern>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#141c26" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />

      {/* faint neighbours on the skyline, so the crane reads as up on a roof */}
      {crane && (
        <g aria-hidden="true">
          <rect className="skyline" x={P.W * 0.06} y={base + 52} width={P.W * 0.1} height={P.H} />
          <rect className="skyline" x={P.W * 0.19} y={base + 84} width={P.W * 0.07} height={P.H} />
          <rect className="skyline" x={P.W * 0.82} y={base + 66} width={P.W * 0.12} height={P.H} />
        </g>
      )}

      {/* the fulcrum: a wedge on its bench, or a crane tower on a rooftop */}
      <g className={`fulcrum-grp${editable ? '' : ' locked'}`} tabIndex={0} role="slider"
         aria-label={crane
           ? 'Tower position along the jib, from its left-hand end'
           : 'Fulcrum position along the rod, from its left-hand end'}
         aria-valuenow={Number(s.fulcrum.toFixed(dp))}
         aria-valuemin={0} aria-valuemax={RL(s)}
         onPointerDown={grabFulcrum} onKeyDown={(e) => nudge(e, null)}>
        {crane ? (
          <>
            {/* the building the crane stands on, windows and all */}
            <rect className="bldg" x={px - bw} y={base + 10} width={bw * 2}
                  height={P.H - base - 10} strokeWidth="1.2" />
            <line className="ground-line" x1={px - bw} y1={base + 10} x2={px + bw} y2={base + 10}
                  strokeWidth="1.5" opacity="0.8" />
            {bldgWins}
            {/* the lattice tower, its base, slewing ring and the driver's cab */}
            <line className="tower-chord" x1={px - tw} y1={towerTop} x2={px - tw} y2={base + 12}
                  strokeWidth="2.4" />
            <line className="tower-chord" x1={px + tw} y1={towerTop} x2={px + tw} y2={base + 12}
                  strokeWidth="2.4" />
            {towerWeb}
            <rect className="fplate" x={px - tw - 6} y={base + 5} width={(tw + 6) * 2} height="7" rx="2" />
            <rect className="slew" x={px - tw - 5} y={towerTop - 5} width={(tw + 5) * 2} height="5" rx="1.5" />
            <rect className="cab" x={px + tw + 1} y={towerTop + 2} width={compact ? 12 : 16}
                  height={compact ? 11 : 14} rx="2" filter="url(#softShadow)" />
            <rect className="cab-glass" x={px + tw + 3} y={towerTop + 4} width={compact ? 7 : 10}
                  height={compact ? 5 : 7} rx="1" />
          </>
        ) : (
          <>
            <polygon className="fwedge" filter="url(#softShadow)"
                     points={`${px},${P.ROD_Y + P.ROD_H - 1} ${px - half2},${base} ${px + half2},${base}`} />
            <rect className="fplate" x={px - half2 * 1.7} y={base} width={half2 * 3.4} height="10" rx="2" />
            {/* a short bench under the stand, so far-out masses never cross a ground line */}
            <line className="ground-line" x1={px - bw} y1={base + 10} x2={px + bw} y2={base + 10}
                  strokeWidth="1.5" opacity="0.45" />
            {hatches}
          </>
        )}
        <circle className="fpin" cx={px} cy={P.ROD_Y} r={compact ? 3.5 : 4.5}
                strokeWidth="2" />
        <text className="pivot-label" x={px} y={base + 32} textAnchor="middle">
          {crane ? 'TOWER' : 'PIVOT'} · 0 {U(s).len}
        </text>
      </g>

      {/* the rod: drawn level, then rotated about the pivot */}
      <g transform={`rotate(${angle.toFixed(3)} ${px} ${P.ROD_Y})`}>
        {crane ? jib : (
          <rect className="rod-face" x={P.X0} y={P.ROD_Y - P.ROD_H}
                width={DIVS * P.DIV} height={P.ROD_H * 2} rx="3" strokeWidth="1"
                filter="url(#softShadow)" />
        )}
        {ticks}
        {trolleys}
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

      {/* drawn last, and haloed in the paper colour, so neither a far-out mass
          nor the crane's building can stand in front of it; the compact drawing
          is only ~400 px wide, so it says the same thing in fewer words */}
      <text className="scene-caption" x={P.W / 2} y={P.capY} textAnchor="middle">
        {compact
          ? `${crane ? 'Jib' : 'Rod'} length ${RL(s)} ${U(s).len} — marked 0 at the ${crane ? 'tower' : 'pivot'}`
          : crane
            ? `Jib length ${RL(s)} ${U(s).len} — marked 0 at the tower, so a load's mark is its working radius.`
            : `Rod length ${RL(s)} ${U(s).len} — the rod is marked 0 at the pivot, so every mark is ` +
              'already a distance from it.'}
      </text>
    </svg>
  );
}
