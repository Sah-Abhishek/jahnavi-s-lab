/* ============================================================
   Light — the controls.

   The bench chooser sits at the top and the view switches at the
   bottom; the middle changes with the bench. Every quantity that
   is a length or an angle can also be dragged on the bench itself,
   so these are the second way to reach everything, not the only one.
   ============================================================ */
import { memo } from 'react';
import Stepper from '../../components/Stepper';
import Listbox from '../../components/Listbox';
import {
  MATERIALS, num, signed, dioptres, lensMaker, minDeviation, constructionReach, rad, deg,
} from './engine.js';
import {
  BENCHES, mirrorKind, lensKind, F_MIN, F_MAX, U_MIN, U_MAX, H_MAX, SEMI_MIN, SEMI_MAX,
  FAN_MIN, FAN_MAX, A_MIN, A_MAX, I_MAX, SLAB_MIN, SLAB_MAX, RETINA_MIN, RETINA_MAX,
  FAR_MIN, FAR_MAX, NEAR_MIN, NEAR_MAX, OBJ_MIN, OBJ_MAX, eyeDefect
} from './labState.js';

const Field = ({ label, id, children }) => (
  <>
    <label className="field-label" htmlFor={id}>{label}</label>
    {children}
  </>
);

const Seg = ({ options, value, onChange, cls = '' }) => (
  <div className={`segmented ${cls}`} role="group">
    {options.map((o) => (
      <button key={o.id} type="button" className={`seg${value === o.id ? ' active' : ''}`}
              aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
        <span className="seg-name">{o.name}</span>
        {o.sub && <span className="seg-sub">{o.sub}</span>}
      </button>
    ))}
  </div>
);

const RAY_MODES = [
  { id: 'construction', name: 'Construction', sub: 'the ones you draw' },
  { id: 'fan', name: 'A real fan', sub: 'traced honestly' },
  { id: 'both', name: 'Both', sub: 'and mind the gap' },
];

/* ---------------- mirrors and lenses ---------------- */
function ImagingControls({ s, dispatch }) {
  const mirror = s.bench === 'mirror';
  const b = mirror ? s.mirror : s.lens;
  const { f, u, h, semi } = b;
  const kind = mirror ? mirrorKind(f) : lensKind(f);
  const setF = (v) => dispatch({ type: 'focal', value: v });
  const mag = Math.abs(f) || 20;

  const SIX = [
    ['far away', -6 * mag], ['beyond C', -3 * mag], ['at C', -2 * mag],
    ['between C and F', -1.5 * mag], ['at F', -mag], ['inside F', -0.6 * mag],
  ];

  return (
    <>
      <div className="ctrl-block">
        <p className="row-head">The {mirror ? 'mirror' : 'lens'}</p>
        <Seg value={kind}
             options={mirror
               ? [{ id: 'concave', name: 'Concave', sub: 'f is negative' },
                  { id: 'convex', name: 'Convex', sub: 'f is positive' },
                  { id: 'plane', name: 'Plane', sub: 'no focus at all' }]
               : [{ id: 'convex', name: 'Convex', sub: 'converging, f > 0' },
                  { id: 'concave', name: 'Concave', sub: 'diverging, f < 0' }]}
             cls={mirror ? 'n3' : 'n2'}
             onChange={(id) => {
               if (id === 'plane') return setF(0);
               const m = Math.abs(f) || 20;
               setF(id === 'concave' ? (mirror ? -m : -m) : (mirror ? m : m));
             }} />

        {!(mirror && f === 0) && (
          <>
            <Field label={`Focal length  f = ${num(f, 1)} cm`} id="f-cm">
              <Stepper id="f-cm" mini value={f} min={-F_MAX} max={F_MAX} step={1} unit="cm"
                       less="Shorter focal length" more="Longer focal length"
                       format={(v) => v.toFixed(1)} onChange={setF} />
            </Field>
            <input type="range" min={F_MIN} max={80} step={0.5} value={Math.min(Math.abs(f), 80)}
                   aria-label="Focal length"
                   onChange={(e) => setF(Math.sign(f || 1) * parseFloat(e.target.value))} />
            <p className="micro">
              {mirror
                ? <>R = 2f = {num(2 * f, 1)} cm — the centre of curvature</>
                : <>P = {signed(dioptres(f), 2)} D</>}
            </p>
          </>
        )}
      </div>

      <div className="ctrl-block">
        <p className="row-head">The object</p>
        <Field label={`Distance in front  u = ${num(u, 1)} cm`} id="u-cm">
          <Stepper id="u-cm" mini value={Math.abs(u)} min={U_MIN} max={U_MAX} step={1} unit="cm"
                   less="Closer" more="Further away" format={(v) => v.toFixed(1)}
                   onChange={(v) => dispatch({ type: 'objectAt', value: v })} />
        </Field>
        <input type="range" min={U_MIN} max={150} step={0.5} value={Math.min(Math.abs(u), 150)}
               aria-label="Object distance"
               onChange={(e) => dispatch({ type: 'objectAt', value: parseFloat(e.target.value) })} />
        <Field label={`Height  h = ${num(h, 1)} cm`} id="h-cm">
          <Stepper id="h-cm" mini value={h} min={-H_MAX} max={H_MAX} step={0.5} unit="cm"
                   less="Shorter" more="Taller" format={(v) => v.toFixed(1)}
                   onChange={(v) => dispatch({ type: 'objectH', value: v })} />
        </Field>

        <p className="row-head spaced">Put it…</p>
        <div className="presets">
          {SIX.map(([name, at]) => (
            <button key={name} type="button" className="btn tiny preset"
                    onClick={() => dispatch({ type: 'objectAt', value: at })}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="ctrl-block">
        <p className="row-head">The rays</p>
        <Seg options={RAY_MODES} value={b.rays} cls="n3"
             onChange={(id) => dispatch({ type: 'rays', value: id })} />
        {(b.rays === 'fan' || b.rays === 'both') && (
          <>
            <Field label={`How many in the fan: ${b.fanCount}`} id="fan-n">
              <Stepper id="fan-n" mini value={b.fanCount} min={FAN_MIN} max={FAN_MAX} step={2}
                       less="Fewer rays" more="More rays" format={(v) => String(Math.round(v))}
                       onChange={(v) => dispatch({ type: 'fanCount', value: v })} />
            </Field>
            <p className="micro">
              These are traced off the real surface. Widen the {mirror ? 'mirror' : 'lens'} below and
              watch them stop meeting at a point — that is spherical aberration, and it is the
              reason the formula is only ever an approximation.
            </p>
          </>
        )}
        <Field label={`How wide it is: ${num(2 * semi, 1)} cm across`} id="semi">
          <Stepper id="semi" mini value={semi} min={SEMI_MIN} max={SEMI_MAX} step={0.5} unit="cm"
                   less="Narrower" more="Wider" format={(v) => v.toFixed(1)}
                   onChange={(v) => dispatch({ type: 'aperture', value: v })} />
        </Field>
        <input type="range" min={SEMI_MIN} max={SEMI_MAX} step={0.25} value={semi}
               aria-label="Aperture"
               onChange={(e) => dispatch({ type: 'aperture', value: parseFloat(e.target.value) })} />
        {(() => {
          const reach = constructionReach(mirror ? 'mirror' : 'lens', f, u, h);
          if (!isFinite(reach) || reach <= semi + 1e-9 || b.rays === 'fan') return null;
          return (
            <>
              <p className="micro">
                Two of the construction rays cross the {mirror ? 'mirror' : 'lens'} plane further
                out than there is any glass, so they are drawn as construction lines rather than
                as light. The image forms all the same — a small {mirror ? 'mirror' : 'lens'} makes
                a whole image, only a fainter one.
              </p>
              <button type="button" className="btn tiny wide"
                      disabled={reach > SEMI_MAX}
                      onClick={() => dispatch({ type: 'aperture', value: reach })}>
                {reach > SEMI_MAX
                  ? `it would need to be ${num(2 * reach, 0)} cm across — too big for this bench`
                  : `Widen it to ${num(2 * reach, 1)} cm, and they become real rays`}
              </button>
            </>
          );
        })()}
      </div>

      <div className="ctrl-block">
        <label className="chk">
          <input type="checkbox" checked={b.showScreen}
                 onChange={(e) => dispatch({ type: 'screen', show: e.target.checked })} />
          <span>Put a screen on the bench</span>
        </label>
        {b.showScreen && (
          <>
            <Field label={`Screen at ${num(b.screenX, 1)} cm`} id="screen-x">
              <Stepper id="screen-x" mini value={b.screenX} min={-U_MAX} max={U_MAX} step={1}
                       unit="cm" less="Move it left" more="Move it right"
                       format={(v) => v.toFixed(1)}
                       onChange={(v) => dispatch({ type: 'screen', value: v })} />
            </Field>
            <p className="micro">
              A real image is sharp at exactly one place. A virtual one cannot be caught here at
              all — there is no light where it appears to be.
            </p>
          </>
        )}
      </div>

      {!mirror && (
        <div className="ctrl-block">
          <label className="chk">
            <input type="checkbox" checked={s.lens.maker}
                   onChange={(e) => dispatch({ type: 'maker', value: e.target.checked })} />
            <span>Grind the lens myself</span>
          </label>
          {s.lens.maker && (
            <>
              <p className="micro">1/f = (n − 1)(1/R₁ − 1/R₂)</p>
              <div className="co-grid three">
                {[['R1', 'R₁'], ['R2', 'R₂']].map(([key, name]) => (
                  <div className="co-cell" key={key}>
                    <span className="co-name">{name}</span>
                    <Stepper mini value={s.lens[key]} min={-200} max={200} step={1} unit="cm"
                             less={`Smaller ${name}`} more={`Larger ${name}`}
                             format={(v) => v.toFixed(0)}
                             onChange={(v) => dispatch({ type: 'makerPart', key, value: v })} />
                  </div>
                ))}
                <div className="co-cell">
                  <span className="co-name">n</span>
                  <Stepper mini value={s.lens.n} min={1.05} max={3} step={0.01}
                           less="Less dense" more="More dense" format={(v) => v.toFixed(2)}
                           onChange={(v) => dispatch({ type: 'makerPart', key: 'n', value: v })} />
                </div>
              </div>
              <p className="micro">
                That grinding gives <b>f = {num(lensMaker(s.lens.n, s.lens.R1, s.lens.R2,
                  s.lens.thick).f, 2)} cm</b>{' '}
                ({signed(dioptres(lensMaker(s.lens.n, s.lens.R1, s.lens.R2, s.lens.thick).f), 2)} D).
              </p>
              <button type="button" className="btn tiny wide"
                      onClick={() => dispatch({
                        type: 'focal',
                        value: lensMaker(s.lens.n, s.lens.R1, s.lens.R2, s.lens.thick).f,
                      })}>
                Use this lens
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------- refraction ---------------- */
function RefractionControls({ s, dispatch }) {
  const r = s.refract;
  const md = minDeviation(rad(r.A), r.nPrism);
  const matOpts = MATERIALS.map((m) => ({ ...m, value: m.n, num: String(m.n) }));
  return (
    <>
      <div className="ctrl-block">
        <p className="row-head">The apparatus</p>
        <Seg cls="n3" value={r.piece}
             options={[
               { id: 'interface', name: 'A surface', sub: 'Snell, and TIR' },
               { id: 'slab', name: 'A slab', sub: 'shifted sideways' },
               { id: 'prism', name: 'A prism', sub: 'deviation' },
             ]}
             onChange={(id) => dispatch({ type: 'piece', value: id })} />
      </div>

      <div className="ctrl-block">
        <Field label={`Angle of incidence  i = ${num(r.i, 1)}°`} id="inc">
          <Stepper id="inc" mini value={r.i} min={0} max={I_MAX} step={1} unit="°"
                   less="Towards the normal" more="Towards grazing"
                   format={(v) => v.toFixed(1)}
                   onChange={(v) => dispatch({ type: 'incidence', value: v })} />
        </Field>
        <input type="range" min={0} max={I_MAX} step={0.5} value={r.i} aria-label="Angle of incidence"
               onChange={(e) => dispatch({ type: 'incidence', value: parseFloat(e.target.value) })} />
        {r.piece === 'prism' && md && (
          <button type="button" className="btn tiny wide"
                  onClick={() => dispatch({ type: 'incidence', value: deg(md.i1) })}>
            Swing it to minimum deviation ({num(deg(md.i1), 1)}°)
          </button>
        )}
      </div>

      {r.piece === 'interface' && (
        <div className="ctrl-block">
          <p className="row-head">The two media</p>
          <Listbox label="Light starts in" labelId="n1lb" value={r.n1} options={matOpts}
                   onChange={(v) => dispatch({ type: 'index', key: 'n1', value: v })} />
          <Listbox label="and goes into" labelId="n2lb" value={r.n2} options={matOpts}
                   onChange={(v) => dispatch({ type: 'index', key: 'n2', value: v })} />
          <button type="button" className="btn tiny wide"
                  onClick={() => {
                    dispatch({ type: 'index', key: 'n1', value: r.n2 });
                    dispatch({ type: 'index', key: 'n2', value: r.n1 });
                  }}>
            Send it the other way
          </button>
          <p className="micro">
            Going from dense to rare there is a critical angle. Going the other way there is not,
            at any angle whatever — which is worth checking rather than believing.
          </p>
        </div>
      )}

      {r.piece === 'slab' && (
        <div className="ctrl-block">
          <Field label={`Thickness  t = ${num(r.thickness, 1)} cm`} id="slabt">
            <Stepper id="slabt" mini value={r.thickness} min={SLAB_MIN} max={SLAB_MAX} step={0.5}
                     unit="cm" less="Thinner" more="Thicker" format={(v) => v.toFixed(1)}
                     onChange={(v) => dispatch({ type: 'slabT', value: v })} />
          </Field>
          <Listbox label="Made of" labelId="nslb" value={r.nSlab} options={matOpts}
                   onChange={(v) => dispatch({ type: 'index', key: 'nSlab', value: v })} />
        </div>
      )}

      {r.piece === 'prism' && (
        <div className="ctrl-block">
          <Field label={`Angle of the prism  A = ${num(r.A, 0)}°`} id="prismA">
            <Stepper id="prismA" mini value={r.A} min={A_MIN} max={A_MAX} step={1} unit="°"
                     less="Narrower prism" more="Wider prism" format={(v) => v.toFixed(0)}
                     onChange={(v) => dispatch({ type: 'prismA', value: v })} />
          </Field>
          <input type="range" min={A_MIN} max={A_MAX} step={1} value={r.A} aria-label="Prism angle"
                 onChange={(e) => dispatch({ type: 'prismA', value: parseFloat(e.target.value) })} />
          <Listbox label="Made of" labelId="nplb" value={r.nPrism} options={matOpts}
                   onChange={(v) => dispatch({ type: 'index', key: 'nPrism', value: v })} />
          <label className="chk spaced">
            <input type="checkbox" checked={r.white}
                   onChange={(e) => dispatch({ type: 'white', value: e.target.checked })} />
            <span>Send white light through it</span>
          </label>
          {r.white && (
            <p className="micro">
              Seven colours, each with its own refractive index from Cauchy’s relation. Violet is
              slowed most, so it is bent most — which is the whole of dispersion, and the rainbow.
            </p>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------- the eye ---------------- */
function EyeControls({ s, dispatch }) {
  const e = s.eye;
  const defect = eyeDefect(e);
  return (
    <>
      <div className="ctrl-block">
        <p className="row-head">Whose eye</p>
        <Seg cls="n3" value={e.defect}
             options={[
               { id: 'normal', name: 'Normal', sub: '25 cm to ∞' },
               { id: 'myopia', name: 'Short-sighted', sub: 'myopia' },
               { id: 'hypermetropia', name: 'Long-sighted', sub: 'hypermetropia' },
             ]}
             onChange={(id) => dispatch({ type: 'defect', value: id })} />
        {defect === 'myopia' && (
          <Field label={`Far point  ${num(e.far, 0)} cm`} id="farp">
            <Stepper id="farp" mini value={e.far} min={FAR_MIN} max={FAR_MAX} step={5} unit="cm"
                     less="Worse" more="Better" format={(v) => v.toFixed(0)}
                     onChange={(v) => dispatch({ type: 'eye', key: 'far', value: v })} />
          </Field>
        )}
        {defect === 'hypermetropia' && (
          <Field label={`Near point  ${num(e.near, 0)} cm`} id="nearp">
            <Stepper id="nearp" mini value={e.near} min={NEAR_MIN} max={NEAR_MAX} step={5} unit="cm"
                     less="Better" more="Worse" format={(v) => v.toFixed(0)}
                     onChange={(v) => dispatch({ type: 'eye', key: 'near', value: v })} />
          </Field>
        )}
        {defect !== 'normal' && (
          <label className="chk spaced">
            <input type="checkbox" checked={e.wearing}
                   onChange={(ev) => dispatch({ type: 'wearing', value: ev.target.checked })} />
            <span>Put the spectacles on</span>
          </label>
        )}
      </div>

      <div className="ctrl-block">
        <p className="row-head">What it is looking at</p>
        <label className="chk">
          <input type="checkbox" checked={e.objectFar}
                 onChange={(ev) => dispatch({ type: 'objectFar', value: ev.target.checked })} />
          <span>Something very far away</span>
        </label>
        {!e.objectFar && (
          <>
            <Field label={`Distance  ${num(e.object, 0)} cm`} id="eobj">
              <Stepper id="eobj" mini value={e.object} min={OBJ_MIN} max={OBJ_MAX} step={1}
                       unit="cm" less="Closer" more="Further" format={(v) => v.toFixed(0)}
                       onChange={(v) => dispatch({ type: 'eye', key: 'object', value: v })} />
            </Field>
            <input type="range" min={OBJ_MIN} max={200} step={1} value={Math.min(e.object, 200)}
                   aria-label="Object distance"
                   onChange={(ev) => dispatch({ type: 'eye', key: 'object', value: parseFloat(ev.target.value) })} />
          </>
        )}
      </div>

      <div className="ctrl-block">
        <Field label={`Lens to retina  ${num(e.retina, 2)} cm`} id="ret">
          <Stepper id="ret" mini value={e.retina} min={RETINA_MIN} max={RETINA_MAX} step={0.05}
                   unit="cm" less="Shorter eye" more="Longer eye" format={(v) => v.toFixed(2)}
                   onChange={(v) => dispatch({ type: 'eye', key: 'retina', value: v })} />
        </Field>
        <p className="micro">
          This is the one distance an eye cannot change. Everything else about seeing follows
          from that: the image distance is fixed, so the <em>focal length</em> has to move instead.
        </p>
      </div>
    </>
  );
}

/* ---------------- the panel itself ---------------- */
function ExplorePanel({ state: s, dispatch }) {
  const Controls = s.bench === 'refract' ? RefractionControls
    : s.bench === 'eye' ? EyeControls : ImagingControls;
  const view = s.view;
  const toggle = (key, label) => (
    <label className="chk" key={key}>
      <input type="checkbox" checked={view[key]}
             onChange={(e) => dispatch({ type: 'view', key, value: e.target.checked })} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="card tabpanel">
      <div className="ctrl-block">
        <p className="row-head">The bench</p>
        <div className="segmented bench-grid" role="group">
          {BENCHES.map((b) => (
            <button key={b.id} type="button"
                    className={`seg${s.bench === b.id ? ' active' : ''}`}
                    aria-pressed={s.bench === b.id}
                    onClick={() => dispatch({ type: 'bench', value: b.id })}>
              <span className="seg-name">{b.name}</span>
              <span className="seg-sub">{b.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <Controls s={s} dispatch={dispatch} />

      <div className="ctrl-block">
        <p className="row-head">Show</p>
        <div className="checks">
          {toggle('labels', 'Labels on the bench')}
          {toggle('virtual', 'Virtual rays, dashed')}
          {toggle('normals', 'The normal')}
          {toggle('angles', 'The angles')}
        </div>
        <label className="chk spaced">
          <input type="checkbox" checked={s.snap}
                 onChange={(e) => dispatch({ type: 'snap', value: e.target.checked })} />
          <span>Snap to the graph paper</span>
        </label>
        <button type="button" className="btn tiny wide spaced"
                onClick={() => dispatch({ type: 'reset' })}>
          Start this bench again
        </button>
        <p className="micro">
          Everything you set up stays in this browser and nowhere else. There is no account and
          nothing leaves the device.
        </p>
      </div>
    </div>
  );
}

export default memo(ExplorePanel);
