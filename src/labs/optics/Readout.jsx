/* ============================================================
   Light — the working out.

   Set out the way it would be written by hand: the formula, then
   the numbers put into it, then the answer, then what the answer
   means in words.

   Every signed number is glossed. The New Cartesian convention is
   where marks are actually lost, and "v = −24 cm" teaches nobody
   anything on its own — "24 cm in front of the mirror, so it is
   real and you could catch it on a screen" does.
   ============================================================ */
import {
  mirrorImage, lensImage, dioptres, criticalAngle, lateralShift, prismDeviation,
  minDeviation, muFromPrism, apparentDepth, snellAngle, num, signed, deg, rad
} from './engine.js';
import {
  mirrorKind, lensKind, eyeRelaxed, eyeRange, eyeSpec, eyeDefect, eyeNeeds, ACCOM
} from './labState.js';
import PositionsTable from './PositionsTable';
import { ConjugateGraph, DeviationGraph } from './InsetGraph';

/* ---------- the little pieces the sheet is built from ---------- */
const Row = ({ q, sym, val, mean }) => (
  <tr>
    <td data-label="Quantity" className="obj">{q}</td>
    <td data-label="Symbol"><i>{sym}</i></td>
    <td data-label="Value"><b>{val}</b></td>
    <td data-label="What the sign means">{mean}</td>
  </tr>
);
const Work = ({ children }) => <dl className="owork-list">{children}</dl>;
const Step = ({ name, children }) => (
  <div className="owork-row"><dt>{name}</dt><dd>{children}</dd></div>
);

const front = (v) => `${num(Math.abs(v), 2)} cm in front`;
/* Where an image is depends on what put it there. A mirror sends the light back
   the way it came, so a real image is in FRONT of it; a lens sends it onward, so
   a real image is on the FAR side. Same sign convention, opposite scenery. */
const where = (v, mirror) => {
  const d = `${num(Math.abs(v), 2)} cm`;
  if (mirror) return v < 0 ? `${d} in front of the mirror` : `${d} behind the mirror`;
  return v > 0 ? `${d} beyond the lens` : `${d} on the near side, with the object`;
};

/* ============================================================
   the status bar
   ============================================================ */
export function StageHead({ state: s }) {
  let left = '', right = '', tone = 'idle';
  /* While an answer is owed, this bar is the one thing on screen that could
     simply tell the visitor what it is. So it does not. */
  if (s.mode === 'challenge' && s.pending) {
    return (
      <div className="stage-head">
        <span className="pill wait">a challenge</span>
        <span className="net-readout">answer it in the panel, and the reading comes back</span>
      </div>
    );
  }
  if (s.bench === 'mirror' || s.bench === 'lens') {
    const mirror = s.bench === 'mirror';
    const b = mirror ? s.mirror : s.lens;
    const im = mirror ? mirrorImage(b.f, b.u, b.h) : lensImage(b.f, b.u, b.h);
    const kindName = mirror ? mirrorKind(b.f) : lensKind(b.f);
    left = `${kindName} ${mirror ? 'mirror' : 'lens'}`;
    if (!isFinite(im.v)) { right = 'no image — the rays leave parallel'; tone = 'wait'; }
    else {
      right = `${im.real ? 'real' : 'virtual'}, ${im.erect ? 'erect' : 'inverted'}, `
            + `${Math.abs(im.m) > 1.0001 ? 'magnified' : Math.abs(im.m) < 0.9999 ? 'diminished' : 'same size'}`;
      tone = im.real ? 'acw' : 'cw';
    }
  } else if (s.bench === 'refract') {
    const r = s.refract;
    if (r.piece === 'interface') {
      const rr = snellAngle(rad(r.i), r.n1, r.n2);
      const C = criticalAngle(r.n1, r.n2);
      left = `${num(r.n1, 3)} → ${num(r.n2, 3)}`;
      if (rr === null) { right = 'total internal reflection'; tone = 'cw'; }
      else { right = `i = ${num(r.i, 1)}°, r = ${num(deg(rr), 1)}°`; tone = 'acw'; }
      if (C !== null && rr !== null) left += ` · critical angle ${num(deg(C), 1)}°`;
    } else if (r.piece === 'slab') {
      left = `${num(r.thickness, 1)} cm slab, n = ${num(r.nSlab, 3)}`;
      right = `shifted ${num(lateralShift(r.thickness, rad(r.i), r.nSlab), 2)} cm sideways`;
      tone = 'acw';
    } else {
      const p = prismDeviation(rad(r.A), r.nPrism, rad(r.i));
      const md = minDeviation(rad(r.A), r.nPrism);
      left = `${num(r.A, 0)}° prism, n = ${num(r.nPrism, 3)}`;
      if (!p || p.tir) { right = 'nothing gets out of the second face'; tone = 'cw'; }
      else {
        right = `deviation ${num(deg(p.D), 2)}°`;
        tone = md && Math.abs(p.D - md.D) < 0.002 ? 'level' : 'acw';
        if (md && Math.abs(p.D - md.D) < 0.002) right += ' — the least there is';
      }
    }
  } else {
    const e = s.eye;
    const d = eyeDefect(e);
    const rng = eyeRange(e);
    left = d === 'normal' ? 'a normal eye' : d === 'myopia' ? 'short-sighted' : 'long-sighted';
    right = `near point ${num(rng.near, 0)} cm · `
          + (isFinite(rng.far) ? (rng.far > 0 ? `far point ${num(rng.far, 0)} cm` : 'far point behind the eye')
            : 'far point at infinity');
    tone = d === 'normal' ? 'level' : 'cw';
  }
  return (
    <div className="stage-head">
      <span className={`pill ${tone}`}>{left}</span>
      <span className="net-readout">{right}</span>
    </div>
  );
}

/* ============================================================
   the sheet
   ============================================================ */
function ImagingSheet({ s, dispatch }) {
  const mirror = s.bench === 'mirror';
  const b = mirror ? s.mirror : s.lens;
  const { f, u, h } = b;
  const im = mirror ? mirrorImage(f, u, h) : lensImage(f, u, h);
  const kindName = mirror ? mirrorKind(f) : lensKind(f);
  const plane = mirror && f === 0;
  const runaway = !isFinite(im.v);

  return (
    <>
      <h2>The working out <span className="sub">{kindName} {mirror ? 'mirror' : 'lens'}</span></h2>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Quantity</th><th>Symbol</th><th>Value</th><th>What the sign means</th></tr>
          </thead>
          <tbody>
            <Row q="Object distance" sym="u" val={`${num(u, 2)} cm`}
                 mean={`${front(u)} — where the light comes from, so it is negative`} />
            <Row q="Focal length" sym="f" val={plane ? 'infinite' : `${num(f, 2)} cm`}
                 mean={plane ? 'a flat mirror has no focus'
                   : f < 0 ? 'the focus is in front, so this is concave'
                     : mirror ? 'the focus is behind, so this is convex'
                       : 'the focus is on the far side, so this converges'} />
            {mirror && !plane && (
              <Row q="Radius of curvature" sym="R = 2f" val={`${num(2 * f, 2)} cm`}
                   mean={`the centre of curvature is ${front(2 * f)}`} />
            )}
            {!mirror && (
              <Row q="Power" sym="P = 1/f" val={`${signed(dioptres(f), 2)} D`}
                   mean={f > 0 ? 'positive, so it converges' : 'negative, so it diverges'} />
            )}
            <Row q="Image distance" sym="v" val={runaway ? '∞' : `${num(im.v, 2)} cm`}
                 mean={runaway ? 'the rays leave parallel — there is no image to place'
                   : im.real ? `${where(im.v, mirror)} — real, and a screen will catch it`
                     : `${where(im.v, mirror)} — virtual, and no screen will`} />
            <Row q="Object height" sym="h" val={`${num(h, 2)} cm`}
                 mean={h > 0 ? 'above the axis' : 'below the axis'} />
            <Row q="Image height" sym="h′" val={runaway ? '—' : `${num(im.hp, 2)} cm`}
                 mean={runaway ? '—' : im.hp * h > 0 ? 'the same side of the axis, so erect'
                   : 'the other side of the axis, so inverted'} />
            <Row q="Magnification" sym={mirror ? 'm = −v/u' : 'm = v/u'}
                 val={runaway ? '—' : num(im.m, 3)}
                 mean={runaway ? '—' : `${im.m > 0 ? 'positive, so erect' : 'negative, so inverted'}`
                   + `, and ${Math.abs(im.m) > 1.0001 ? `${num(Math.abs(im.m), 2)} times as tall`
                     : Math.abs(im.m) < 0.9999 ? `only ${num(Math.abs(im.m), 2)} times as tall` : 'the same size'}`} />
          </tbody>
        </table>
      </div>

      <div className="owork">
        <p className="owork-head">Step by step</p>
        <Work>
          <Step name="the formula">
            <code>{mirror ? '1/v + 1/u = 1/f' : '1/v − 1/u = 1/f'}</code>
          </Step>
          {plane ? (
            <Step name="a flat mirror">
              <code>v = −u = {num(-u, 2)} cm</code> — as far behind as the object is in front
            </Step>
          ) : (
            <>
              <Step name="put the numbers in">
                <code>1/v {mirror ? '+' : '−'} 1/({num(u, 2)}) = 1/({num(f, 2)})</code>
              </Step>
              <Step name="rearrange">
                <code>1/v = 1/({num(f, 2)}) {mirror ? '−' : '+'} 1/({num(u, 2)})
                  {runaway ? ' = 0' : ` = ${num(1 / im.v, 5)}`}</code>
              </Step>
              <Step name="so">
                <code>v = {runaway ? '∞' : `${num(im.v, 2)} cm`}</code>
              </Step>
            </>
          )}
          {!runaway && (
            <>
              <Step name="magnification">
                <code>m = {mirror ? '−v/u' : 'v/u'} = {mirror ? '−' : ''}({num(im.v, 2)})/({num(u, 2)}) = {num(im.m, 3)}</code>
              </Step>
              <Step name="image height">
                <code>h′ = m h = {num(im.m, 3)} × {num(h, 2)} = {num(im.hp, 2)} cm</code>
              </Step>
            </>
          )}
          {!mirror && (
            <Step name="power">
              <code>P = 100/f = 100/({num(f, 2)}) = {signed(dioptres(f), 2)} D</code>
            </Step>
          )}
        </Work>
      </div>

      {!runaway && (
        <div className="sums">
          <div className="sum tint-a">
            <span className="label">from the distances</span>
            <b>{mirror ? 'm = −v/u' : 'm = v/u'}</b>
            <span className="val">{num(im.m, 3)}</span>
          </div>
          <div className="cmp">=</div>
          <div className="sum tint-b">
            <span className="label">from the heights</span>
            <b>m = h′/h</b>
            <span className="val">{num(im.hp / h, 3)}</span>
          </div>
        </div>
      )}
      <p className="sums-note">
        Two roads to the same number. They have to agree — that is what magnification
        <em> is</em>.
      </p>

      <div className={`verdict ${runaway ? 'warn' : im.real ? 'ok' : 'warn'}`}>
        {runaway
          ? <>The object is exactly at the focus, so the reflected rays leave <strong>parallel</strong> and
            never meet. There is no image anywhere.</>
          : <>The image is <strong>{im.real ? 'real' : 'virtual'}</strong>,{' '}
            <strong>{im.erect ? 'erect' : 'inverted'}</strong>, {' '}
            <strong>{Math.abs(im.m) > 1.0001 ? 'magnified' : Math.abs(im.m) < 0.9999 ? 'diminished' : 'the same size'}</strong>,
            and forms {where(im.v, mirror)}.</>}
      </div>

      {!plane && (
        <>
          <p className="owork-head spaced">The six standard positions, worked out</p>
          <PositionsTable f={f} u={u} mirror={mirror}
                          onGo={(at) => dispatch({ type: 'objectAt', value: at })} />

          <ConjugateGraph f={f} u={u} v={im.v} mirror={mirror}
                          readings={b.readings}
                          onLog={() => dispatch({ type: 'logReading', u, v: im.v })}
                          onClear={() => dispatch({ type: 'clearReadings' })} />
        </>
      )}
    </>
  );
}

function RefractionSheet({ s, dispatch }) {
  const r = s.refract;
  const i = rad(r.i);
  if (r.piece === 'interface') {
    const rr = snellAngle(i, r.n1, r.n2);
    const C = criticalAngle(r.n1, r.n2);
    return (
      <>
        <h2>The working out <span className="sub">one flat boundary</span></h2>
        <div className="owork">
          <Work>
            <Step name="Snell’s law"><code>n₁ sin i = n₂ sin r</code></Step>
            <Step name="put the numbers in">
              <code>{num(r.n1, 3)} × sin {num(r.i, 1)}° = {num(r.n2, 3)} × sin r</code>
            </Step>
            <Step name="so">
              {rr === null
                ? <code>sin r would have to be more than 1 — there is no such angle</code>
                : <code>r = {num(deg(rr), 2)}°</code>}
            </Step>
            {C !== null && (
              <Step name="the critical angle">
                <code>sin C = n₂/n₁ = {num(r.n2 / r.n1, 4)} → C = {num(deg(C), 2)}°</code>
              </Step>
            )}
            <Step name="apparent depth">
              <code>real ÷ apparent = n₂/n₁ = {num(r.n2 / r.n1, 3)}</code> — a coin 8 cm down
              looks {num(apparentDepth(8, r.n2 / r.n1), 2)} cm down
            </Step>
          </Work>
        </div>
        <div className={`verdict ${rr === null ? 'warn' : 'ok'}`}>
          {rr === null
            ? <>Past the critical angle of <strong>{num(deg(C), 2)}°</strong>, none of the light gets
              out: it is all turned back inside. That is <strong>total internal reflection</strong>.</>
            : r.n2 > r.n1
              ? <>Going into the denser medium, the light bends <strong>towards</strong> the normal —
                from {num(r.i, 1)}° down to {num(deg(rr), 1)}°.</>
              : <>Going into the rarer medium, the light bends <strong>away from</strong> the normal —
                from {num(r.i, 1)}° out to {num(deg(rr), 1)}°.</>}
        </div>
      </>
    );
  }
  if (r.piece === 'slab') {
    const rr = snellAngle(i, 1, r.nSlab);
    const d = lateralShift(r.thickness, i, r.nSlab);
    return (
      <>
        <h2>The working out <span className="sub">a parallel-sided slab</span></h2>
        <div className="owork">
          <Work>
            <Step name="into the glass"><code>sin {num(r.i, 1)}° = {num(r.nSlab, 3)} sin r → r = {num(deg(rr), 2)}°</code></Step>
            <Step name="out of the glass"><code>the second face undoes the first exactly</code></Step>
            <Step name="the sideways shift">
              <code>d = t sin(i − r) / cos r = {num(r.thickness, 1)} × sin({num(r.i - deg(rr), 2)}°) / cos({num(deg(rr), 2)}°)</code>
            </Step>
            <Step name="so"><code>d = {num(d, 3)} cm</code></Step>
          </Work>
        </div>
        <div className="verdict ok">
          The ray comes out <strong>exactly parallel</strong> to the way it went in — the glass
          does not turn it, it only <strong>moves it sideways</strong>, by {num(d, 2)} cm.
        </div>
      </>
    );
  }
  const A = rad(r.A);
  const p = prismDeviation(A, r.nPrism, i);
  const md = minDeviation(A, r.nPrism);
  const atMin = p && !p.tir && md && Math.abs(p.D - md.D) < 0.002;
  return (
    <>
      <h2>The working out <span className="sub">a {num(r.A, 0)}° prism</span></h2>
      <div className="owork">
        <Work>
          <Step name="into the first face">
            <code>sin {num(r.i, 1)}° = {num(r.nPrism, 3)} sin r₁ → r₁ = {p ? num(deg(p.r1), 2) : '—'}°</code>
          </Step>
          <Step name="across to the second">
            <code>r₂ = A − r₁ = {num(r.A, 0)}° − {p ? num(deg(p.r1), 2) : '—'}° = {p ? num(deg(p.r2), 2) : '—'}°</code>
          </Step>
          <Step name="out of the second face">
            {p && !p.tir
              ? <code>{num(r.nPrism, 3)} sin r₂ = sin i₂ → i₂ = {num(deg(p.i2), 2)}°</code>
              : <code>n sin r₂ &gt; 1 — the light cannot get out at all</code>}
          </Step>
          {p && !p.tir && (
            <Step name="the deviation">
              <code>D = i₁ + i₂ − A = {num(r.i, 1)}° + {num(deg(p.i2), 2)}° − {num(r.A, 0)}° = {num(deg(p.D), 2)}°</code>
            </Step>
          )}
          {md && (
            <>
              <Step name="the least it can be">
                <code>at the minimum r₁ = r₂ = A/2, so sin i = n sin(A/2) → i = {num(deg(md.i1), 2)}°</code>
              </Step>
              <Step name="and there">
                <code>D_min = 2i − A = {num(deg(md.D), 2)}°</code>
              </Step>
              <Step name="which measures n">
                <code>n = sin((A + D_min)/2) / sin(A/2) = {num(muFromPrism(A, md.D), 4)}</code>
              </Step>
            </>
          )}
        </Work>
      </div>
      <div className={`verdict ${p && !p.tir ? (atMin ? 'ok' : '') : 'warn'}`}>
        {!p || p.tir
          ? <>At this angle the light strikes the second face past its critical angle and is
            turned back inside. Swing the ray round until it can get out.</>
          : atMin
            ? <>This is the <strong>angle of minimum deviation</strong>. The path through the prism
              has gone symmetric — r₁ = r₂ = A/2 — and that symmetry is what makes it a minimum.</>
            : <>The prism bends the light through <strong>{num(deg(p.D), 2)}°</strong>. Swing the ray
              towards {num(deg(md.i1), 1)}° and watch the deviation fall to {num(deg(md.D), 2)}°,
              and no further.</>}
      </div>

      <DeviationGraph A={r.A} n={r.nPrism} i={r.i} />
    </>
  );
}

function EyeSheet({ s, dispatch }) {
  const e = s.eye;
  const defect = eyeDefect(e);
  const rng = eyeRange(e);
  const spec = eyeSpec(e);
  const dObj = e.objectFar ? Infinity : e.object;
  const needs = eyeNeeds(e, dObj);
  const available = eyeRelaxed(e) + (e.wearing ? spec : 0);
  return (
    <>
      <h2>The working out <span className="sub">the eye, and its spectacles</span></h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Quantity</th><th>Symbol</th><th>Value</th><th>What it means</th></tr>
          </thead>
          <tbody>
            <Row q="Lens to retina" sym="v" val={`${num(e.retina, 2)} cm`}
                 mean="fixed — this is the one distance the eye cannot change" />
            <Row q="Object distance" sym="u"
                 val={isFinite(dObj) ? `${num(-dObj, 0)} cm` : '−∞'}
                 mean={isFinite(dObj) ? `${num(dObj, 0)} cm in front` : 'very far away'} />
            <Row q="Power needed" sym="P = 1/v − 1/u" val={`${num(needs, 2)} D`}
                 mean="what it takes to land this object on the retina" />
            <Row q="Power available" sym="" val={`${num(available, 2)} – ${num(available + ACCOM, 2)} D`}
                 mean={`relaxed to fully accommodated${e.wearing ? ', with the spectacle on' : ''}`} />
            <Row q="Near point" sym="" val={`${num(rng.near, 1)} cm`}
                 mean={rng.near > 25.5 ? 'further out than it should be' : 'as close as it can focus'} />
            <Row q="Far point" sym=""
                 val={isFinite(rng.far) ? (rng.far > 0 ? `${num(rng.far, 1)} cm` : `${num(-rng.far, 1)} cm behind`) : '∞'}
                 mean={isFinite(rng.far) && rng.far > 0 ? 'nearer than it should be' : 'as it should be'} />
          </tbody>
        </table>
      </div>
      <div className="owork">
        <Work>
          {defect === 'myopia' && (
            <>
              <Step name="the trouble">
                <code>the far point has come in to {num(rng.far, 0)} cm</code> — anything beyond it
                focuses in front of the retina
              </Step>
              <Step name="what the lens must do">
                <code>take an object at infinity and put its image at the far point</code>
              </Step>
              <Step name="so"><code>f = −{num(rng.far, 0)} cm, P = −100/{num(rng.far, 0)} = {num(spec, 2)} D</code></Step>
              <Step name="a diverging lens"><code>concave — it spreads the light before the eye gets it</code></Step>
            </>
          )}
          {defect === 'hypermetropia' && (
            <>
              <Step name="the trouble">
                <code>the near point has gone out to {num(rng.near, 0)} cm</code> — anything closer
                would focus behind the retina
              </Step>
              <Step name="what the lens must do">
                <code>take an object at 25 cm and put its image at the near point</code>
              </Step>
              <Step name="so">
                <code>P = 100/25 − 100/{num(rng.near, 0)} = 4 − {num(100 / rng.near, 2)} = {num(spec, 2)} D</code>
              </Step>
              <Step name="a converging lens"><code>convex — it does some of the bending for the eye</code></Step>
            </>
          )}
          {defect === 'normal' && (
            <Step name="nothing to correct">
              <code>near point 25 cm, far point infinity — this eye needs 0 D</code>
            </Step>
          )}
        </Work>
      </div>
      <div className={`verdict ${defect === 'normal' ? 'ok' : e.wearing ? 'ok' : 'warn'}`}>
        {defect === 'normal'
          ? <>A normal eye: 40 D relaxed, 44 D straining — <strong>four dioptres</strong> of
            accommodation, and that range is exactly what puts the near point at 25 cm.</>
          : e.wearing
            ? <>With the <strong>{num(spec, 2)} D</strong> lens on, the near point is back at 25 cm and
              the far point back at infinity. The eye is doing the same work as before — the
              spectacle has moved the range, not widened it.</>
            : <>This eye needs a <strong>{num(spec, 2)} D</strong>{' '}
              <strong>{spec < 0 ? 'concave' : 'convex'}</strong> lens. Put the spectacles on and
              watch the blur collapse.</>}
      </div>
    </>
  );
}

export default function CalcSheet({ state: s, dispatch, masked }) {
  const Sheet = s.bench === 'refract' ? RefractionSheet : s.bench === 'eye' ? EyeSheet : ImagingSheet;
  return (
    <section className={`card sheet-card optics-card${masked ? ' masked' : ''}`}>
      <div className="mask-note">Answer first — the working appears once you have</div>
      <div className="sheet-inner">
        <Sheet s={s} dispatch={dispatch} />
      </div>
    </section>
  );
}
