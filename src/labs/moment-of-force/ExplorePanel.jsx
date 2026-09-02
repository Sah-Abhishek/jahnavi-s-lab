/* ============================================================
   Moment of Force — the controls.
   Every control writes through the reducer, so the auto-balancer
   is re-solved no matter which one the user touched.
   ============================================================ */
import Stepper from '../../components/Stepper';
import Listbox from '../../components/Listbox';
import {
  UNITS, GRAVITIES, PRESETS, MAX_MASSES,
  U, RL, LEN_MIN, LEN_MAX, MASS_MIN, MASS_MAX,
  niceStep, snapStep, posDp, toDp, relOf, absOf, fmt, kgOf,
} from './engine';

/* ---------- one mass's row: colour, weight, auto/on/off, then its two fields ---------- */
function MassRow({ s, mass, index, editable, dispatch }) {
  const u = U(s);
  const dp = posDp(s);
  const on = mass.enabled !== false;

  return (
    <div className={`mass-row${on ? '' : ' idle'}${mass.auto ? ' auto' : ''}`}>
      <span className="dot" style={{ background: mass.color }} />
      <span className="row-title">
        Mass {index + 1}
        <span className="newtons">= {fmt(mass.m * s.g)} {u.force}</span>
        {mass.auto && mass.note && <span className="auto-note">{mass.note}</span>}
      </span>
      {editable && (
        <span className="row-btns">
          <button className={`toggle auto-btn${mass.auto ? ' on' : ''}`}
                  aria-pressed={!!mass.auto}
                  title={mass.auto ? 'Stop balancing — keep this mass where it is'
                                   : 'Let this mass size itself to balance the rod'}
                  onClick={() => dispatch({ type: 'massAuto', id: mass.id })}>Auto</button>
          <button className={`toggle${on ? ' on' : ''}`} aria-pressed={on}
                  title={on ? 'Switch this mass off — it stays on the rod but stops counting'
                            : 'Switch this mass back on'}
                  onClick={() => dispatch({ type: 'massEnabled', id: mass.id, value: !on })}>
            {on ? 'On' : 'Off'}
          </button>
          <button className="del" title="Remove this mass"
                  aria-label={`Remove mass ${index + 1}`}
                  onClick={() => dispatch({ type: 'removeMass', id: mass.id })}>✕</button>
        </span>
      )}
      <div className="fields">
        <Stepper mini
                 value={mass.m}
                 min={mass.auto ? 0 : MASS_MIN(s)} max={MASS_MAX(s)}
                 step={(mass.m >= 50 * u.M ? 5 : 0.5) * u.M}
                 unit={u.mass} less="Lighter" more="Heavier"
                 disabled={!editable || !!mass.auto}   /* a balancer is solved for, not typed */
                 format={(v) => (mass.auto ? kgOf(v) : String(v))}
                 onChange={(v) => dispatch({ type: 'massValue', id: mass.id, value: v })} />
        {/* the mark the rod carries under this mass: 0 at the pivot, - to the left */}
        <Stepper mini
                 value={toDp(s, relOf(s, mass.x))}
                 min={toDp(s, -s.fulcrum)} max={toDp(s, RL(s) - s.fulcrum)}
                 step={snapStep(s)}
                 unit={u.len} less="Move left" more="Move right"
                 disabled={!editable}
                 format={(v) => v.toFixed(dp)}
                 onChange={(v) => dispatch({ type: 'massPos', id: mass.id, value: absOf(s, v) })} />
      </div>
    </div>
  );
}

export default function ExplorePanel({ state: s, dispatch }) {
  const u = U(s);
  const dp = posDp(s);
  const editable = s.mode !== 'challenge';
  const full = s.masses.length >= MAX_MASSES;

  const set = (key, value) => dispatch({ type: 'toggle', key, value });

  return (
    <div className="card tabpanel">

      <section className="ctrl-block">
        <div className="row-head"><span className="label">Unit system</span></div>
        <div className="segmented" role="radiogroup" aria-label="Unit system">
          {Object.entries(UNITS).map(([key, def]) => (
            <button key={key} type="button" role="radio"
                    className={`seg${s.units === key ? ' active' : ''}`}
                    aria-checked={s.units === key}
                    onClick={() => dispatch({ type: 'units', value: key })}>
              <span className="seg-name">{def.name}</span>
              <span className="seg-sub">
                {key === 'mks' ? 'm · kg · N' : 'cm · g · dyne'}
              </span>
            </button>
          ))}
        </div>
        <p className="micro">Switching converts the whole experiment — the same physics,
          written in different units. CGS moments run to millions of dyne·centimetres, so
          large numbers are shown in standard form.</p>
      </section>

      <section className="ctrl-block">
        <div className="row-head"><label htmlFor="lengthInput">Length of the rod</label></div>
        <Stepper id="lengthInput"
                 value={RL(s)} min={LEN_MIN(s)} max={LEN_MAX(s)}
                 step={(RL(s) >= 20 * u.L ? 1 : (RL(s) >= 5 * u.L ? 0.5 : 0.1)) * u.L}
                 unit={RL(s) === 1 ? u.lenOne : u.lenWord}
                 less="Shorter rod" more="Longer rod" disabled={!editable}
                 onChange={(v) => dispatch({ type: 'rodLength', value: v })} />
        <div className="chips">
          {[1, 2, 5, 10].map((n) => {
            const v = n * u.L;
            return (
              <button key={n} className={`chip${Math.abs(v - RL(s)) < 1e-9 ? ' active' : ''}`}
                      disabled={!editable}
                      onClick={() => dispatch({ type: 'rodLength', value: v })}>
                {v} {u.len}
              </button>
            );
          })}
        </div>
        <p className="micro">Type any length from {kgOf(LEN_MIN(s))} to {kgOf(LEN_MAX(s))} {u.len},
          or pick one. The rod is drawn the same size whatever you choose — only
          its <strong>markings</strong> change. Every mass keeps its distance from the pivot in
          proportion, so moments scale but a balanced rod stays balanced.</p>
      </section>

      <section className="ctrl-block">
        <div className="row-head">
          <label htmlFor="fulcrumInput">Fulcrum position</label>
          <span className="head-note">from the left-hand end</span>
        </div>
        <Stepper id="fulcrumInput"
                 value={s.fulcrum} min={0} max={RL(s)} step={snapStep(s)} unit={u.len}
                 less="Move pivot left" more="Move pivot right" disabled={!editable}
                 format={(v) => v.toFixed(dp)}
                 onChange={(v) => dispatch({ type: 'fulcrum', value: v })} />
        <input type="range" min={0} max={RL(s)} step={niceStep(s) / 20}
               value={s.fulcrum} disabled={!editable}
               aria-label="Fulcrum position"
               onChange={(e) => dispatch({ type: 'fulcrum', value: parseFloat(e.target.value) })} />
        <div className="range-legend"><span>left end</span><span>centre</span><span>right end</span></div>
        <p className="micro">The pivot is the rod's <strong>zero</strong>. Slide it and the
          markings slide with it, so the number under a mass is always its distance from the
          pivot — negative to the left, positive to the right.</p>
      </section>

      <section className="ctrl-block">
        <div className="row-head">
          <span className="label">Masses on the rod</span>
          <span className="head-btns">
            <button className="btn tiny" disabled={full || !editable}
                    onClick={() => dispatch({ type: 'addMass' })}>+ Add mass</button>
            <button className="btn tiny"
                    disabled={full || !editable || s.masses.some((m) => m.auto)}
                    title="Add a counterweight that sizes itself to balance the rod"
                    onClick={() => dispatch({ type: 'addBalancer' })}>+ Balancer</button>
          </span>
        </div>
        <div className="mass-list">
          {s.masses.length
            ? s.masses.map((m, i) => (
                <MassRow key={m.id} s={s} mass={m} index={i}
                         editable={editable && !m.locked} dispatch={dispatch} />
              ))
            : <p className="micro">No masses yet — press “Add mass”.</p>}
        </div>
        <p className="micro">A <strong>balancer</strong> keeps its position but solves for its
          own mass, so the rod stays level however you move the others — drag it inward and it
          must grow, outward and it shrinks. Press <strong>Auto</strong> on any mass to hand it
          the job.</p>
        <p className="micro">Type any mass from {kgOf(MASS_MIN(s))} to {kgOf(MASS_MAX(s))} {u.mass},
          and any mark on the rod — from {(-s.fulcrum).toFixed(dp)} to{' '}
          {(RL(s) - s.fulcrum).toFixed(dp)} {u.len}. Switch a mass <strong>off</strong> to lift it
          clear without losing it — its moment stops counting, but it keeps its place so you can
          switch it back on.</p>
      </section>

      <section className="ctrl-block">
        <span className="label">Show on the diagram</span>
        <div className="checks">
          <label className="chk">
            <input type="checkbox" checked={s.showForces}
                   onChange={(e) => set('showForces', e.target.checked)} />
            <span>Force arrows</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={s.showDistances}
                   onChange={(e) => set('showDistances', e.target.checked)} />
            <span>Distances</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={s.snap}
                   onChange={(e) => set('snap', e.target.checked)} />
            <span>Snap to {snapStep(s).toFixed(dp)} {u.len}</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={s.useRodWeight}
                   onChange={(e) => set('useRodWeight', e.target.checked)} />
            <span>Rod has weight</span>
          </label>
        </div>
        {s.useRodWeight && (
          <div className="sub-ctrl">
            <div className="row-head"><label htmlFor="rodMassInput">Mass of the rod</label></div>
            <Stepper id="rodMassInput"
                     value={s.rodMass} min={0} max={MASS_MAX(s)}
                     step={(s.rodMass >= 50 * u.M ? 5 : 0.5) * u.M} unit={u.mass}
                     less="Lighter rod" more="Heavier rod" disabled={!editable}
                     onChange={(v) => dispatch({ type: 'rodMass', value: v })} />
            <input type="range" min={0} max={Math.max(10 * u.M, s.rodMass)} step={0.5 * u.M}
                   value={s.rodMass} disabled={!editable} aria-label="Mass of the rod"
                   onChange={(e) => dispatch({ type: 'rodMass', value: parseFloat(e.target.value) })} />
            <p className="micro">The pivot cuts the rod in two. Each part gets the share of the
              mass that matches its share of the length, and its weight acts at the middle
              of <em>that part</em> — so the rod turns the beam <strong>both ways at once</strong>,
              and both columns show a real calculation.</p>
          </div>
        )}
      </section>

      <section className="ctrl-block">
        <div className="row-head"><span className="label" id="gravLabel">Gravity</span></div>
        <Listbox label="Gravity" labelId="gravLabel" value={s.g}
                 options={u.g.map((v, i) => ({
                   value: v, name: GRAVITIES[i].name, sub: GRAVITIES[i].sub,
                   num: `${v} ${u.field}`,
                 }))}
                 onChange={(v) => dispatch({ type: 'gravity', value: v })} />
        <p className="micro">Try the Moon: every moment shrinks, but a balanced
          rod <em>stays</em> balanced. Why?</p>
      </section>

      <section className="ctrl-block">
        <span className="label">Ready-made set-ups</span>
        <div className="presets">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} className="btn preset"
                    onClick={() => dispatch({ type: 'preset', name: key })}>{p.label}</button>
          ))}
        </div>
        <button className="btn ghost wide"
                onClick={() => dispatch({ type: 'reset' })}>Reset the lab</button>
        <p className="micro">Your set-up — rod, masses, pivot, gravity and all the switches — is
          kept in this browser, so it is still here next time. Nothing leaves your
          device. <strong>Reset</strong> clears it and starts fresh.</p>
      </section>
    </div>
  );
}
