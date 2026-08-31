/* ============================================================
   Light — the pieces every bench draws with.

   Kept apart from the benches themselves so that an arrow, a ray
   and a handle look and behave the same whether they belong to a
   mirror, a lens or an eye.
   ============================================================ */

/** Something you can take hold of: a fat invisible target over a small visible mark. */
export function Handle({ x, y, label, onDown, onKey, className = '', r = 7 }) {
  return (
    <g className={`handle ${className}`} tabIndex={0} role="button" aria-label={label}
       onPointerDown={onDown} onKeyDown={onKey}>
      {/* the target is bigger than the mark: a fingertip is about 9 mm across and
          a focal marker sits right on the axis, with a label just above it */}
      <circle className="grab" cx={x} cy={y} r={Math.max(15, r * 2.4)} fill="transparent" />
      <circle className="knob" cx={x} cy={y} r={r} />
    </g>
  );
}

/** A ray, or a piece of one. Dashed when it is only where the light seems to come from. */
export function Ray({ from, to, kind = 'real', cls = '', width }) {
  if (!from || !to) return null;
  return (
    <line className={`ray ${kind} ${cls}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          strokeWidth={width} />
  );
}

/** The object, or its image: an arrow standing on the axis. */
export function Arrow({ x, yTip, yBase, kind, label, k }) {
  const up = yTip < yBase;
  const head = Math.max(4, Math.min(9, Math.abs(yTip - yBase) * 0.34));
  return (
    <g className={`arrow ${kind}`}>
      <line x1={x} y1={yBase} x2={x} y2={yTip} />
      <path d={`M ${x - head * 0.62} ${yTip + (up ? head : -head)} L ${x} ${yTip} L ${x + head * 0.62} ${yTip + (up ? head : -head)} Z`} />
      {label && (
        <text className="arrow-tag" x={x} y={yTip + (up ? -9 : 15)} textAnchor="middle">{label}</text>
      )}
    </g>
  );
}

/** A named place on the axis — F, C, 2F, the pole. */
export function AxisMark({ x, y, name, cls = '' }) {
  return (
    <g className={`ax-mark ${cls}`}>
      <line x1={x} y1={y - 6} x2={x} y2={y + 6} />
      <text x={x} y={y - 11} textAnchor="middle">{name}</text>
    </g>
  );
}

/** The little arc that says "this angle here", with its size written on it. */
export function AngleArc({ cx, cy, from, to, r = 26, label, cls = '' }) {
  const p = (a) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  let d = to - from;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const large = Math.abs(d) > Math.PI ? 1 : 0;
  const sweep = d > 0 ? 1 : 0;
  const mid = from + d / 2;
  return (
    <g className={`angle-arc ${cls}`}>
      <path d={`M ${p(from)} A ${r} ${r} 0 ${large} ${sweep} ${p(to)}`} />
      {label && (
        <text x={cx + (r + 13) * Math.cos(mid)} y={cy + (r + 13) * Math.sin(mid) + 4}
              textAnchor="middle">{label}</text>
      )}
    </g>
  );
}

/** A screen, or a retina: something the light stops at. */
export function Screen({ x, y0, y1, blur, sharp, onDown, label }) {
  return (
    <g className="screen-g">
      <line className="screen" x1={x} y1={y0} x2={x} y2={y1} />
      <line className="screen-grab" x1={x} y1={y0} x2={x} y2={y1} onPointerDown={onDown} />
      {blur !== null && blur !== undefined && (
        <circle className={`blur-spot${sharp ? ' sharp' : ''}`} cx={x} cy={(y0 + y1) / 2}
                r={Math.max(1.2, blur)} />
      )}
      {label && <text className="screen-tag" x={x} y={y0 - 8} textAnchor="middle">{label}</text>}
    </g>
  );
}

/** When something worth seeing is off the drawing, say where it went. */
export function EdgeMarker({ x, y, side, name, distance, onClick }) {
  const dir = side === 'right' ? 1 : -1;
  return (
    <g className="edge-marker" onClick={onClick} role="button" tabIndex={0}
       aria-label={`${name} is off the drawing, ${distance}`}>
      <rect x={x - (side === 'right' ? 152 : 8)} y={y - 13} width={160} height={26} rx={6} />
      <text x={x - (side === 'right' ? 144 : 0)} y={y + 4}
            textAnchor={side === 'right' ? 'start' : 'start'}>
        {side === 'left' ? '◂ ' : ''}{name} {distance}{side === 'right' ? ' ▸' : ''}
      </text>
    </g>
  );
}
