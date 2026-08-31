/* ============================================================
   Light — the mirror bench and the lens bench, which are one bench.

   They share an object, a screen, a set of construction rays and a
   readout, and differ in the shape of the glyph at the origin and
   in one sign. Drawing them with the same code is not thrift: the
   fact that 1/v + 1/u = 1/f and 1/v − 1/u = 1/f are the same
   equation with the light going the other way is the thing most
   worth noticing, and separating them would hide it.

   The CONSTRUCTION rays bend at the plane through the pole, not at
   the curved surface. That is what the thin-element approximation
   says, and it has to be honoured: reflect them off the true arc
   and they would miss the point the formula puts the image at, so
   the picture would contradict the working beside it. The honest
   rays are the ones behind the "real rays" switch, and their
   failure to meet is the whole demonstration.
   ============================================================ */
import {
  mirrorImage, lensImage, constructionRays, constructionReach, fanRays, trace,
  mirrorBench, lensBench, faceX, maxSemi, num, V,
} from './engine.js';
import { mirrorKind, lensKind } from './labState.js';
import { Handle, Ray, Arrow, AxisMark, Screen, EdgeMarker } from './SceneParts';

const SEGS = 48;

/** The reflecting or refracting face, as a run of points rather than an SVG arc —
    no flags to get backwards, and it stays right at any zoom. */
function arcPoints(vx, R, semi, X, Y) {
  if (!R || !isFinite(R)) return [[X(vx), Y(-semi)], [X(vx), Y(semi)]];
  const pts = [];
  for (let i = 0; i <= SEGS; i++) {
    const y = -semi + (2 * semi * i) / SEGS;
    pts.push([X(faceX(vx, R, y)), Y(y)]);
  }
  return pts;
}
const path = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');

export default function BenchImaging({ frame }) {
  const { X, Y, k, W, H, xLo, xHi, yLo, yHi, axisY, startDrag, nudge, editable,
          dispatch, state: s } = frame;
  const mirror = s.bench === 'mirror';
  const b = mirror ? s.mirror : s.lens;
  const { f, u, h, semi } = b;
  const kind = mirror ? mirrorKind(f) : lensKind(f);
  const im = mirror ? mirrorImage(f, u, h) : lensImage(f, u, h);
  const box = { x0: xLo, x1: xHi, y0: yLo, y1: yHi };
  const view = s.view;
  /* While an answer is owed, the light stops at the element. Otherwise "is it
     real or virtual, and where?" is answered by looking at the picture, and the
     question was not worth asking. */
  const held = s.mode === 'challenge' && s.pending;

  /* ---------- the element ---------- */
  let glyph = null;
  let rimY = semi;
  if (mirror) {
    const R = f === 0 ? 0 : 2 * f;
    const pts = arcPoints(0, R, semi, X, Y);
    glyph = (
      <g className={`element mirror ${kind}`}>
        <path className="silver" d={path(pts)} />
        {/* the hatching on the back, which is how a mirror is drawn */}
        <path className="backing" d={path(pts)} />
      </g>
    );
  } else {
    const d = s.lens.thick;
    const eff = maxSemi(s.lens.R1, s.lens.R2, d, semi);
    rimY = eff;
    const front = arcPoints(-d / 2, s.lens.R1, eff, X, Y);
    const back = arcPoints(d / 2, s.lens.R2, eff, X, Y);
    const outline = [...front, ...back.slice().reverse()];
    /* a thin lens is drawn as the school symbol — a line with its arrowheads —
       because at a sane focal length the real body is thinner than the stroke */
    const tip = Math.min(11, Math.max(6, eff * k * 0.16));
    const yTop = Y(eff), yBot = Y(-eff), x0 = X(0);
    const conv = f > 0;
    glyph = (
      <g className={`element lens ${kind}`}>
        <path className="glass" d={`${path(outline)} Z`} />
        <line className="lens-line" x1={x0} y1={yTop} x2={x0} y2={yBot} />
        {[[yTop, 1], [yBot, -1]].map(([yy, sgn]) => (
          <path key={sgn} className="lens-tip"
                d={conv
                  ? `M ${x0 - tip * 0.6} ${yy + sgn * tip} L ${x0} ${yy} L ${x0 + tip * 0.6} ${yy + sgn * tip}`
                  : `M ${x0 - tip * 0.6} ${yy - sgn * tip} L ${x0} ${yy} L ${x0 + tip * 0.6} ${yy - sgn * tip}`} />
        ))}
      </g>
    );
  }

  /* ---------- the rays ---------- */
  const rays = [];
  const showConstruction = b.rays === 'construction' || b.rays === 'both';
  const showFan = b.rays === 'fan' || b.rays === 'both';

  /* How far up the element a construction ray reaches, and whether there is any
     glass there to reach. A ray that crosses the element plane outside the
     aperture never meets the glass at all, so it is not light and must not be
     drawn as light — it is the line you would draw with a ruler, and it is drawn
     as one. */
  const reach = constructionReach(mirror ? 'mirror' : 'lens', f, u, h);
  let anyMiss = false;

  if (showConstruction && isFinite(f)) {
    for (const r of constructionRays(mirror ? 'mirror' : 'lens', f, u, h, box)) {
      const misses = Math.abs(r.at.y) > semi + 1e-9;
      if (misses) anyMiss = true;
      const kind = misses ? 'construct' : 'real';
      rays.push(
        <g key={r.id} className={`cray ${r.id}${misses ? ' missed' : ''}`}>
          <Ray from={{ x: X(r.from.x), y: Y(r.from.y) }} to={{ x: X(r.at.x), y: Y(r.at.y) }}
               kind={kind} />
          {!held && (
            <Ray from={{ x: X(r.at.x), y: Y(r.at.y) }} to={{ x: X(r.to.x), y: Y(r.to.y) }}
                 kind={kind} />
          )}
          {!held && !im.real && view.virtual && (
            <Ray from={{ x: X(r.at.x), y: Y(r.at.y) }} to={{ x: X(r.back.x), y: Y(r.back.y) }}
                 kind="virtual" />
          )}
        </g>,
      );
    }
  }

  if (showFan) {
    /* the honest ones: they meet the real surface and obey the real law */
    const bench = mirror
      ? mirrorBench({ f, semi, halfX: Math.max(400, Math.abs(xLo) + Math.abs(xHi)),
                      halfY: Math.max(200, Math.abs(yLo) + Math.abs(yHi)) })
      : lensBench({ R1: s.lens.R1, R2: s.lens.R2, n: s.lens.n, thick: s.lens.thick, semi,
                    halfX: Math.max(400, Math.abs(xLo) + Math.abs(xHi)),
                    halfY: Math.max(200, Math.abs(yLo) + Math.abs(yHi)) });
    const from = V(u, h);
    fanRays(from, mirror ? semi : rimY, b.fanCount, bench.box).forEach((r, i) => {
      const p = trace(bench, { o: r.o, d: r.d });
      /* held back, a traced ray is drawn only as far as the glass it first meets */
      const keep = held ? p.vertices.slice(0, 2) : p.vertices;
      const pts = keep.map((q) => `${X(q.x)} ${Y(q.y)}`).join(' L ');
      rays.push(<path key={`fan${i}`} className="fan-ray" d={`M ${pts}`} />);
    });
  }

  /* ---------- the image ---------- */
  let image = null;
  /* An image far off the drawing is named at the edge, not drawn there: an arrow
     at x = 40 000 px is a bounding box the browser has to rasterise, and it will
     take its time about it. */
  const span = Math.max(1e-6, xHi - xLo);
  const drawable = (x) => isFinite(x) && x > xLo - span && x < xHi + span;
  const vOn = isFinite(im.v) && Math.abs(im.v) < 1e5;
  if (vOn && drawable(im.v) && !held) {
    image = (
      <Arrow x={X(im.v)} yTip={Y(im.hp)} yBase={Y(0)} k={k}
             kind={`image${im.real ? ' real' : ' virtual'}`}
             label={view.labels ? `image  ${num(im.v, 1)} cm` : null} />
    );
  }

  /* ---------- the screen, and how sharp it is there ---------- */
  let screen = null;
  if (b.showScreen) {
    const sx = b.screenX;
    const half = Math.max(Math.abs(h) * 1.9, semi * 1.4);
    let blur = null, sharp = false;
    if (vOn && im.real) {
      const spot = semi * Math.abs(sx - im.v) / Math.max(1e-6, Math.abs(im.v));
      blur = spot * k;
      sharp = spot < 0.15;
    }
    screen = (
      <Screen x={X(sx)} y0={Y(half)} y1={Y(-half)} blur={blur} sharp={sharp}
              label={vOn && im.real ? (sharp ? 'sharp' : 'blurred') : 'nothing to catch'}
              onDown={(e) => startDrag(e, { kind: 'screen' })} />
    );
  }

  /* ---------- what is off the drawing, and where it went ---------- */
  const markers = [];
  const offNote = (x, name, tag) => {
    if (x >= xLo && x <= xHi) return;
    const side = x > xHi ? 'right' : 'left';
    markers.push(
      <EdgeMarker key={name} x={side === 'right' ? W - 10 : 10} y={axisY - 40}
                  side={side} name={name} distance={tag}
                  onClick={() => dispatch({ type: 'fit' })} />,
    );
  };
  if (anyMiss && showConstruction && !held) {
    markers.push(
      <g key="miss" className="edge-marker miss-note">
        <rect x={W / 2 - 232} y={H - 42} width={464} height={30} rx={7} />
        <text x={W / 2} y={H - 22} textAnchor="middle">
          dashed = a construction line, not light — this one misses the glass
        </text>
      </g>,
    );
  }
  if (held) {
    markers.push(
      <g key="held" className="edge-marker held-note">
        <rect x={W / 2 - 180} y={axisY - 76} width={360} height={30} rx={7} />
        <text x={W / 2} y={axisY - 56} textAnchor="middle">
          the light stops here until you have answered
        </text>
      </g>,
    );
  } else if (!isFinite(im.v)) {
    markers.push(
      <g key="atF" className="edge-marker at-focus">
        <rect x={W / 2 - 150} y={axisY - 74} width={300} height={30} rx={7} />
        <text x={W / 2} y={axisY - 54} textAnchor="middle">
          the rays come out parallel — no image
        </text>
      </g>,
    );
  } else if (Math.abs(im.v) >= 1e5) {
    offNote(im.v > 0 ? xHi + 1 : xLo - 1, 'image', 'very nearly at infinity');
  } else {
    offNote(im.v, 'image', `${num(Math.abs(im.v) / 100, 2)} m`);
  }
  offNote(u, 'object', `${num(Math.abs(u), 0)} cm`);

  /* ---------- the marks on the axis, and what each one drags ----------
     Every named place on the axis is a handle, because "make the focal length
     35 cm" and "put the focus here" are the same instruction and a bench should
     take it either way. The multiplier is where the arithmetic lives: C sits at
     2f, so dragging it to x sets f = x/2, and a lens's near focus sits at −f. */
  const marks = mirror
    ? (f === 0 ? [] : [[f, 'F', 1], [2 * f, 'C', 0.5]])
    : [[f, 'F′', 1], [2 * f, '2F′', 0.5], [-f, 'F', -1], [-2 * f, '2F', -0.5]];

  return (
    <g className="bench imaging">
      {rays}
      {image}
      {glyph}

      {/* how tall this element would have to be to catch the whole construction */}
      {anyMiss && showConstruction && (
        <g className="reach-mark">
          {[1, -1].map((sgn) => (
            <line key={sgn} x1={X(0)} y1={Y(sgn * semi)} x2={X(0)} y2={Y(sgn * reach)} />
          ))}
          <text x={X(0) + 12} y={Y(-reach) + 17} textAnchor="start">
            the glass would have to reach here — {num(2 * reach, 0)} cm across
          </text>
        </g>
      )}
      {screen}

      {/* the object last, so the light it sends never draws over it */}
      {drawable(u) && (
        <Arrow x={X(u)} yTip={Y(h)} yBase={Y(0)} k={k} kind="object"
               label={view.labels ? `object  ${num(u, 1)} cm` : null} />
      )}

      {/* the named places on the axis */}
      <g className="marks">
        {marks.filter(([x]) => drawable(x))
          .map(([x, name]) => <AxisMark key={name} x={X(x)} y={axisY} name={name} />)}
        <AxisMark x={X(0)} y={axisY} name={mirror ? 'P' : 'O'} cls="pole" />
      </g>

      {/* what can be taken hold of */}
      {editable && (
        <g className="handles">
          <Handle x={X(u)} y={axisY} className="obj-foot"
                  label={`Object ${num(Math.abs(u), 1)} cm in front. Arrow keys slide it along the bench.`}
                  onDown={(e) => startDrag(e, { kind: 'objectFoot' })}
                  onKey={(e) => nudge(e, (d, vert) => !vert
                    && dispatch({ type: 'objectAt', value: u + d }))} />
          <Handle x={X(u)} y={Y(h)} className="obj-head"
                  label={`Object ${num(h, 1)} cm tall. Arrow keys make it taller or shorter.`}
                  onDown={(e) => startDrag(e, { kind: 'objectHead' })}
                  onKey={(e) => nudge(e, (d, vert) => vert
                    && dispatch({ type: 'objectH', value: h + d }))} />
          {isFinite(f) && f !== 0 && marks.filter(([x]) => drawable(x)).map(([x, name, mult]) => (
            <Handle key={name} x={X(x)} y={axisY} className="focus-h" r={6.5}
                    label={`${name} at ${num(x, 1)} cm. Drag it, or use the arrow keys, `
                      + `to change the focal length — now ${num(f, 1)} cm.`}
                    onDown={(e) => startDrag(e, { kind: 'focus', mult })}
                    onKey={(e) => nudge(e, (d, vert) => !vert
                      && dispatch({ type: 'focal', value: f + d * mult }))} />
          ))}
          <Handle x={X(0)} y={Y(rimY)} className="rim-h" r={6}
                  label={`The ${mirror ? 'mirror' : 'lens'} is ${num(2 * semi, 1)} cm across. `
                    + 'Arrow keys widen or narrow it.'}
                  onDown={(e) => startDrag(e, { kind: 'rim' })}
                  onKey={(e) => nudge(e, (d, vert) => vert
                    && dispatch({ type: 'aperture', value: semi + d }))} />
        </g>
      )}

      {markers}
    </g>
  );
}
