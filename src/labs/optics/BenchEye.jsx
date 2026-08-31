/* ============================================================
   Light — the eye.

   The one place in the whole of optics where v is fixed and f is
   not. Every other bench moves the image about; the retina cannot
   move, so the eye changes its own power instead, and that is what
   accommodation is. Draw it that way and myopia and hypermetropia
   stop being two words to memorise and become the same picture
   with the focus landing short of the screen or beyond it.
   ============================================================ */
import { num } from './engine.js';
import { eyeRelaxed, eyeRange, eyeSpec, eyeDefect, eyeNeeds, ACCOM } from './labState.js';
import { Handle, Arrow, Screen } from './SceneParts';

export default function BenchEye({ frame }) {
  const { X, Y, k, W, H, axisY, startDrag, nudge, editable, dispatch, state: s } = frame;
  const e = s.eye;
  const defect = eyeDefect(e);
  const spec = eyeSpec(e);
  const range = eyeRange(e);
  const dObj = e.objectFar ? Infinity : e.object;

  /* what this eye can actually muster, and what the job needs */
  const needs = eyeNeeds(e, dObj);
  const available = eyeRelaxed(e) + (e.wearing ? spec : 0);
  const power = Math.min(Math.max(needs, available), available + ACCOM);
  const straining = needs > available + ACCOM + 1e-9;
  const slack = needs < available - 1e-9;
  const used = straining || slack ? (straining ? available + ACCOM : available) : needs;

  /* where the image actually lands, with the power the eye can manage */
  const fEye = 100 / used;
  const u = -(isFinite(dObj) ? dObj : 1e7);
  const v = fEye * u / (u + fEye);
  const onRetina = Math.abs(v - e.retina) < 0.005;
  const semi = 1.15;
  const blur = Math.abs(semi * (e.retina - v) / Math.max(1e-6, v)) * k;

  const eyeTop = Y(semi * 1.5), eyeBot = Y(-semi * 1.5);
  const objH = 3.2;

  return (
    <g className="bench eye">
      {/* the eyeball */}
      <g className="eyeball">
        <ellipse className="globe" cx={X(e.retina / 2)} cy={Y(0)}
                 rx={Math.abs(X(e.retina) - X(0)) / 2 + 3} ry={Math.abs(eyeTop - eyeBot) / 2} />
        <line className="eye-lens" x1={X(0)} y1={Y(semi)} x2={X(0)} y2={Y(-semi)} />
        <path className="cornea"
              d={`M ${X(0)} ${Y(semi)} Q ${X(-0.55)} ${Y(0)} ${X(0)} ${Y(-semi)}`} />
      </g>

      {/* the spectacle, when it is being worn */}
      {e.wearing && Math.abs(spec) > 1e-9 && (
        <g className={`spectacle ${spec < 0 ? 'concave' : 'convex'}`}>
          <line x1={X(-2.4)} y1={Y(semi * 1.35)} x2={X(-2.4)} y2={Y(-semi * 1.35)} />
          <text className="spec-tag" x={X(-2.4)} y={Y(semi * 1.35) - 8} textAnchor="middle">
            {num(spec, 2)} D
          </text>
        </g>
      )}

      {/* the object, and the light it sends. Almost always it is off the left of
          the drawing — an eye is small and the world is not — so it says so. */}
      {isFinite(dObj) && X(-dObj) > 6 ? (
        <Arrow x={X(-dObj)} yTip={Y(objH)} yBase={Y(0)} k={k} kind="object"
               label={s.view.labels ? `${num(dObj, 0)} cm away` : null} />
      ) : (
        <g className="far-object">
          <text className="far-tag" x={16} y={axisY - 30}>
            ◂ {isFinite(dObj) ? `the object, ${num(dObj, 0)} cm away` : 'from very far away'}
          </text>
        </g>
      )}

      {/* Three rays, bent by the thin eye lens and drawn as far as the retina and
          no further — because the retina is where they stop. Drawing them to the
          retina rather than through it is the whole demonstration: when the eye
          is focused they arrive at one point, and when it is not you can see the
          three of them land in three different places. */}
      <g className="eye-rays">
        {[-0.9, -0.45, 0, 0.45, 0.9].map((frac) => {
          const yIn = semi * frac;
          const x0 = isFinite(dObj) ? -dObj : frame.xLo - 2;
          const y0 = isFinite(dObj) ? objH : yIn;
          /* the thin lens sends every ray from the object tip through the image point */
          const yImg = isFinite(v) ? (objH * v / u) : 0;
          const t = isFinite(v) && Math.abs(v) > 1e-6 ? e.retina / v : 1;
          const yHit = yIn + (yImg - yIn) * t;
          return (
            <g key={frac}>
              <line className="light-ray" x1={X(x0)} y1={Y(y0)} x2={X(0)} y2={Y(yIn)} />
              <line className="light-ray" x1={X(0)} y1={Y(yIn)}
                    x2={X(e.retina)} y2={Y(yHit)} />
            </g>
          );
        })}
        {/* where they actually meet, which is not always where the retina is */}
        {isFinite(v) && Math.abs(v - e.retina) > 0.004 && (
          <g className="focus-miss">
            <circle cx={X(v)} cy={Y(objH * v / u)} r={3} />
            <text x={X(v)} y={Y(objH * v / u) - 10} textAnchor="middle">
              {v < e.retina ? 'focuses short' : 'focuses long'}
            </text>
          </g>
        )}
      </g>

      {/* the retina, and how sharp the picture on it is */}
      <Screen x={X(e.retina)} y0={eyeTop} y1={eyeBot}
              blur={onRetina ? 1.5 : blur} sharp={onRetina}
              label={onRetina ? 'sharp' : 'blurred'}
              onDown={(e2) => startDrag(e2, { kind: 'eyeBack' })} />

      {/* what is wrong, and what it needs, said plainly — along the bottom, where
          the view toolbar is not already sitting */}
      <g className="eye-note">
        <text className="note-line" x={14} y={H - 34}>
          {defect === 'normal' ? 'A normal eye'
            : defect === 'myopia' ? 'Short-sighted (myopia)'
              : 'Long-sighted (hypermetropia)'}
          {' · '}near point {num(range.near, 0)} cm
          {' · '}far point {isFinite(range.far)
            ? (range.far > 0 ? `${num(range.far, 0)} cm` : `${num(-range.far, 0)} cm behind`)
            : 'infinity'}
        </text>
        <text className="note-line second" x={14} y={H - 15}>
          {straining ? 'too close — the eye cannot bend the light enough'
            : slack ? 'the eye is relaxed as far as it goes'
              : `accommodating: ${num(used, 2)} D of the ${num(available, 2)}–${num(available + ACCOM, 2)} D it has`}
        </text>
      </g>

      {editable && isFinite(dObj) && (
        <g className="handles">
          <Handle x={X(-dObj)} y={axisY} className="obj-foot"
                  label={`Object ${num(dObj, 0)} cm from the eye. Arrow keys move it.`}
                  onDown={(ev) => startDrag(ev, { kind: 'eyeObject' })}
                  onKey={(ev) => nudge(ev, (dd) => dispatch({ type: 'eye', key: 'object', value: e.object - dd }))} />
        </g>
      )}
    </g>
  );
}
