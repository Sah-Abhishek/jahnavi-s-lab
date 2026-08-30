/* ============================================================
   Simple Pendulum — the controls.
   Changing the apparatus releases the bob again from the top, so
   what is on screen always matches what the panel says. Mass is
   the exception, and deliberately so.
   ============================================================ */
import { memo } from 'react';
import Stepper from '../../components/Stepper';
import Listbox from '../../components/Listbox';
import {
  GRAVITIES, PRESETS, COLOURS,
  LEN_MIN, LEN_MAX, MASS_MIN, MASS_MAX, AMP_MIN, AMP_MAX,
  smallAnglePeriod, fmt, tidy,
} from './engine';

/* ---------- one pendulum's three numbers ---------- */
function ArmBlock({ s, which, dispatch, editable, title }) {
  const cfg = s[which];
  const set = (key, value) => dispatch({ type: 'arm', which, key, value });
  return (
    <div className="arm-block" data-arm={which}>
      <div className="arm-head">
        <span className="dot" style={{ background: COLOURS[which] }} />
        <span className="arm-title">{title}</span>
        <span className="arm-period">T = {fmt(smallAnglePeriod(cfg.length, s.g), 2)} s</span>
      </div>

      <label className="field-label" htmlFor={`len-${which}`}>Length of the string</label>
      <Stepper id={`len-${which}`} mini
               value={cfg.length} min={LEN_MIN} max={LEN_MAX}
               step={cfg.length >= 2 ? 0.1 : 0.05} unit="m"
               less="Shorter string" more="Longer string" disabled={!editable}
               format={(v) => v.toFixed(2)}
               onChange={(v) => set('length', v)} />
      <input type="range" min={LEN_MIN} max={3} step={0.05} value={Math.min(cfg.length, 3)}
             disabled={!editable} aria-label="Length of the string"
             onChange={(e) => set('length', parseFloat(e.target.value))} />

      <label className="field-label" htmlFor={`mass-${which}`}>Mass of the bob</label>
      <Stepper id={`mass-${which}`} mini
               value={cfg.mass} min={MASS_MIN} max={MASS_MAX}
               step={cfg.mass >= 5 ? 1 : 0.5} unit="kg"
               less="Lighter bob" more="Heavier bob" disabled={!editable}
               format={(v) => tidy(v)}
               onChange={(v) => set('mass', v)} />

      <label className="field-label" htmlFor={`amp-${which}`}>Released from</label>
      <Stepper id={`amp-${which}`} mini
               value={cfg.amplitude} min={AMP_MIN} max={AMP_MAX} step={1} unit="°"
               less="Smaller swing" more="Bigger swing" disabled={!editable}
               format={(v) => tidy(v)}
               onChange={(v) => set('amplitude', v)} />
      <input type="range" min={AMP_MIN} max={AMP_MAX} step={1} value={cfg.amplitude}
             disabled={!editable} aria-label="Angle the bob is released from"
             onChange={(e) => set('amplitude', parseFloat(e.target.value))} />
    </div>
  );
}

function ExplorePanel({ state: s, dispatch }) {
  const editable = s.mode !== 'challenge';
  const view = (key, value) => dispatch({ type: 'view', key, value });

  return (
    <div className="card tabpanel">
      <section className="ctrl-block">
        <div className="row-head"><span className="label">The swing</span></div>
        <div className="run-row">
          <button className={`btn ${s.running ? '' : 'primary'}`}
                  onClick={() => dispatch({ type: 'running', value: !s.running })}>
            {s.running ? '❚❚  Pause' : '▶  Start'}
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'restart' })}>
            ↺  Release again
          </button>
        </div>
        <p className="micro">Pausing stops the clock too. <strong>Release again</strong> drops the
          bob from the top and starts the timing afresh.</p>
      </section>

      <section className="ctrl-block">
        <label className="chk big">
          <input type="checkbox" checked={s.compare} disabled={!editable}
                 onChange={(e) => dispatch({ type: 'compare', value: e.target.checked })} />
          <span>Hang a second pendulum beside it</span>
        </label>
        <p className="micro">Two at once is the only way to settle an argument about which is
          faster — released together, any difference shows within a swing or two.</p>
      </section>

      <section className="ctrl-block">
        <ArmBlock s={s} which="a" dispatch={dispatch} editable={editable}
                  title={s.compare ? 'Pendulum A' : 'The pendulum'} />
        {s.compare && (
          <ArmBlock s={s} which="b" dispatch={dispatch} editable={editable} title="Pendulum B" />
        )}
      </section>

      <section className="ctrl-block">
        <div className="row-head"><span className="label" id="pendGrav">Gravity</span></div>
        <Listbox label="Gravity" labelId="pendGrav" value={s.g}
                 options={GRAVITIES.map((o) => ({ ...o, num: `${o.value} N/kg` }))}
                 onChange={(v) => dispatch({ type: 'gravity', value: v })} />
        <p className="micro">A pendulum is a gravity meter. Take this one to the Moon and it slows
          to two and a half times its Earth period — which is how gravity was first mapped
          across the world, one clock at a time.</p>
      </section>

      <section className="ctrl-block">
        <span className="label">Show</span>
        <div className="checks">
          <label className="chk">
            <input type="checkbox" checked={s.showSwing}
                   onChange={(e) => view('showSwing', e.target.checked)} />
            <span>Swing arc</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={s.showVelocity}
                   onChange={(e) => view('showVelocity', e.target.checked)} />
            <span>Velocity</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={s.showForces}
                   onChange={(e) => view('showForces', e.target.checked)} />
            <span>Forces</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={s.showEnergy}
                   onChange={(e) => view('showEnergy', e.target.checked)} />
            <span>Energy</span>
          </label>
        </div>
        <p className="micro">The first three draw on the apparatus. <strong>Energy</strong> adds
          a live meter to the working out below, where the height and the motion trade back and
          forth without the total ever changing.</p>
        <label className="chk spaced">
          <input type="checkbox" checked={s.damping} disabled={!editable}
                 onChange={(e) => dispatch({ type: 'damping', value: e.target.checked })} />
          <span>Air resistance</span>
        </label>
        <p className="micro">With the air switched on the swing dies away — but watch the timing.
          The bob covers less ground and moves more slowly in exactly the same proportion, so
          it keeps almost perfect time all the way down. That is why a pendulum could be
          trusted as a clock.</p>
      </section>

      <section className="ctrl-block">
        <span className="label">Ready-made set-ups</span>
        <div className="presets">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} className="btn preset" title={p.ask}
                    onClick={() => dispatch({ type: 'preset', name: key })}>
              {p.label}
              <span className="preset-ask">{p.ask}</span>
            </button>
          ))}
        </div>
        <button className="btn ghost wide" onClick={() => dispatch({ type: 'reset' })}>
          Reset the lab
        </button>
        <p className="micro">Your set-up is kept in this browser, so it is still here next time.
          Nothing leaves your device. <strong>Reset</strong> clears it and starts fresh.</p>
      </section>
    </div>
  );
}

/* the swing repaints every frame; the controls have no reason to */
export default memo(ExplorePanel);
