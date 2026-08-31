/* ============================================================
   Light — the refraction bench.

   Three apparatus on one bench: a single flat boundary, a block of
   glass, and a prism. All three are drawn by tracing, never by
   formula, so the critical angle is not a special case anybody had
   to write — it is simply where Snell's law stops having an answer,
   and the tracer turns the light round of its own accord.

   The boundary stands upright and its normal lies along the bench,
   which is the textbook diagram turned through a right angle. It
   keeps every bench in the lab on one axis, and it means the angle
   of incidence is measured from the same line the mirror bench
   measures its distances along.
   ============================================================ */
import {
  interfaceBench, slabBench, prismBench, trace, SPECTRUM, criticalAngle, rad, deg, num, V,
  sub, mul
} from './engine.js';
import { Handle, AngleArc } from './SceneParts';

const LEAD = 34;                    /* cm of ray drawn before it arrives */

export default function BenchRefraction({ frame }) {
  const { X, Y, W, H, xLo, xHi, yLo, yHi, axisY, startDrag, nudge, editable,
          dispatch, state: s } = frame;
  const r = s.refract;
  const view = s.view;
  const i = rad(r.i);
  const halfX = Math.max(90, Math.abs(xLo) + Math.abs(xHi));
  const halfY = Math.max(70, Math.abs(yLo) + Math.abs(yHi));

  /* the incoming direction: i is measured from the normal, and the normal is the axis */
  const d = V(Math.cos(i), -Math.sin(i));

  let bench, aim, shape = null, nGlass = 1.5;
  if (r.piece === 'interface') {
    bench = interfaceBench({ n1: r.n1, n2: r.n2, halfX, halfY });
    aim = V(0, 0);
    nGlass = r.n2;
    shape = (
      <g className="medium-split">
        <rect className="medium far" x={X(0)} y={0} width={Math.max(0, W - X(0))} height={H} />
        <line className="face" x1={X(0)} y1={0} x2={X(0)} y2={H} />
      </g>
    );
  } else if (r.piece === 'slab') {
    bench = slabBench({ thickness: r.thickness, n: r.nSlab, height: 2 * halfY,
                        halfX, halfY, disperse: r.white });
    aim = V(-r.thickness / 2, 0);
    nGlass = r.nSlab;
    const p = bench.poly;
    shape = (
      <polygon className="glass-body"
               points={p.map((q) => `${X(q.x)},${Y(q.y)}`).join(' ')} />
    );
  } else {
    bench = prismBench({ A: r.A, n: r.nPrism, side: 22, halfX, halfY, disperse: r.white });
    const a = rad(r.A);
    aim = V(-11 * Math.sin(a / 2) / 2, bench.apex.y - 11 * Math.cos(a / 2) / 2);
    nGlass = r.nPrism;
    shape = (
      <polygon className="glass-body prism"
               points={bench.poly.map((q) => `${X(q.x)},${Y(q.y)}`).join(' ')} />
    );
  }

  /* for a prism the ray must arrive square to the FACE, not to the bench */
  let dIn = d;
  if (r.piece === 'prism') {
    const a = rad(r.A);
    const nInto = V(Math.cos(-a / 2), Math.sin(-a / 2));
    dIn = V(nInto.x * Math.cos(i) - nInto.y * Math.sin(i),
            nInto.x * Math.sin(i) + nInto.y * Math.cos(i));
  }
  const start = sub(aim, mul(dIn, LEAD));

  /* ---------- the light ---------- */
  const colours = r.white ? SPECTRUM : [{ name: 'light', wl: 589.3, cls: 'mono' }];
  const paths = colours.map((c) => {
    const p = trace(bench, { o: start, d: dIn, wl: c.wl,
                             medium: bench.startMedium || 1 });
    return { c, p };
  });
  const main = paths[paths.length - 1].p;
  /* the rays may stay — reading a length off a drawing is honest work — but the
     numbers beside them are the answer written out, so those go */
  const held = s.mode === 'challenge' && s.pending;
  const firstEvent = main.events[0];
  const tir = main.events.some((e) => e.kind === 'tir');

  /* ---------- what the readout will want, drawn on the bench ---------- */
  const C = criticalAngle(r.piece === 'interface' ? r.n1 : nGlass,
                          r.piece === 'interface' ? r.n2 : 1);

  return (
    <g className="bench refraction">
      {shape}

      {/* the normal, where the light lands */}
      {view.normals && firstEvent && (
        <line className="normal" x1={X(firstEvent.at.x) - 60} y1={Y(firstEvent.at.y)}
              x2={X(firstEvent.at.x) + 60} y2={Y(firstEvent.at.y)}
              transform={r.piece === 'prism'
                ? `rotate(${-deg(Math.atan2(firstEvent.n.y, firstEvent.n.x))} ${X(firstEvent.at.x)} ${Y(firstEvent.at.y)})`
                : undefined} />
      )}

      {paths.map(({ c, p }) => (
        <path key={c.name} className={`light-ray ${c.cls || ''}`}
              d={`M ${p.vertices.map((q) => `${X(q.x)} ${Y(q.y)}`).join(' L ')}`} />
      ))}

      {/* the angles, said out loud */}
      {view.angles && !held && firstEvent && (() => {
        const at = { x: X(firstEvent.at.x), y: Y(firstEvent.at.y) };
        const nAng = Math.atan2(-firstEvent.n.y, firstEvent.n.x);
        const inAng = Math.atan2(-(-dIn.y), -dIn.x);
        const out = firstEvent.dOut;
        const outAng = Math.atan2(-out.y, out.x);
        return (
          <g className="angles">
            <AngleArc cx={at.x} cy={at.y} from={nAng} to={inAng} r={34}
                      label={`i = ${num(deg(firstEvent.i), 1)}°`} cls="in" />
            {firstEvent.kind === 'refract' && (
              <AngleArc cx={at.x} cy={at.y} from={nAng + Math.PI} to={outAng} r={44}
                        label={`r = ${num(deg(firstEvent.r), 1)}°`} cls="out" />
            )}
          </g>
        );
      })()}

      {/* what has happened, in words, where it happened */}
      {tir && (
        <g className="edge-marker tir-note">
          <rect x={W / 2 - 168} y={H - 42} width={336} height={30} rx={7} />
          <text x={W / 2} y={H - 22} textAnchor="middle">
            past the critical angle ({num(deg(C), 1)}°) — none of it gets out
          </text>
        </g>
      )}

      {editable && (
        <g className="handles">
          <Handle x={X(start.x)} y={Y(start.y)} className="ray-h"
                  label={`Light arriving at ${num(r.i, 1)}° to the normal. `
                    + 'Arrow keys swing it.'}
                  onDown={(e) => startDrag(e, { kind: 'incidence', at: aim.x })}
                  onKey={(e) => nudge(e, (dd) => dispatch({ type: 'incidence', value: r.i + dd }))} />
        </g>
      )}
    </g>
  );
}
