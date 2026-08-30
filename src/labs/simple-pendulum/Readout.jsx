/* ============================================================
   Simple Pendulum — the working out.
   The lab times its own swings, so the formula always has
   something to be checked against. When the two disagree it is
   the formula that is wrong, and the panel says why.
   ============================================================ */
import {
  DEG, COLOURS, smallAnglePeriod, truePeriod, amplitudeError,
  kinetic, potential, fmt, tidy,
} from './engine';

/** The period the lab has actually measured: total time ÷ swings counted,
    which is how it would be done at the bench, and for the same reason. */
export const measuredOf = (arm) => (arm && arm.count > 0 ? arm.elapsed / arm.count : null);

function readout(s, motion) {
  const arms = (s.compare ? ['a', 'b'] : ['a']).map((which) => {
    const cfg = s[which];
    const arm = motion[which];
    const amp = cfg.amplitude * DEG;
    return {
      which, cfg, arm,
      formula: smallAnglePeriod(cfg.length, s.g),
      exact: truePeriod(cfg.length, s.g, amp),
      error: amplitudeError(cfg.length, s.g, amp),
      measured: measuredOf(arm),
    };
  });
  return arms;
}

/* ---------- where the energy is at this instant ----------
   The bar is scaled to the energy the bob was released with, so the two
   colours trade places while the swing holds its size — and the whole bar
   visibly shortens once the air is taking energy out. */
function EnergyPanel({ s, rows }) {
  return (
    <div className="energy-panel">
      <span className="working-head">Energy, right now</span>
      {rows.map(({ which, cfg, arm }) => {
        const ke = kinetic(cfg.mass, cfg.length, arm.omega);
        const pe = potential(cfg.mass, s.g, cfg.length, arm.theta);
        const e0 = Math.max(potential(cfg.mass, s.g, cfg.length, cfg.amplitude * DEG), 1e-9);
        const pct = (v) => `${Math.max(0, Math.min(100, (v / e0) * 100)).toFixed(2)}%`;
        return (
          <div key={which} className="energy-row">
            {rows.length > 1 && <span className="energy-name">{which.toUpperCase()}</span>}
            <div className="energy-track">
              <div className="energy-pe" style={{ width: pct(pe) }} />
              <div className="energy-ke" style={{ width: pct(ke) }} />
            </div>
            <span className="energy-figures">
              <b className="pe">{fmt(pe, 2)} J</b> of height ·{' '}
              <b className="ke">{fmt(ke, 2)} J</b> of motion ·{' '}
              {fmt(pe + ke, 2)} J in all
            </span>
          </div>
        );
      })}
      <p className="working-note">
        The total is what the bob was given when it was let go, and it never changes —
        until you switch the air on, and then you can watch it leave.
      </p>
    </div>
  );
}

/** One of the two figures being held up against each other. */
function SumBox({ label, tint, expr, value, foot }) {
  return (
    <div className={`sum tint-${tint}`}>
      <span className="sum-label">{label}</span>
      <code className="expr">{expr}</code>
      <strong>{value != null ? `${fmt(value, 3)} s` : '—'}</strong>
      {foot && <span className="sum-foot">{foot}</span>}
    </div>
  );
}

/** The verdict, above the apparatus. */
export function StageHead({ state: s, motion }) {
  const rows = readout(s, motion);
  const shown = rows[0];
  let cls = '', text;
  if (s.frozen) { cls = 'wait'; text = 'Make your prediction'; }
  else if (!s.running) { cls = 'idle'; text = 'Paused'; }
  else { text = s.compare ? 'Both swinging' : 'Swinging'; }

  return (
    <div className="stage-head">
      <div className={`pill ${cls}`}>{text}</div>
      <div className="net-readout">
        <span>{s.compare ? 'A · measured period' : 'Measured period'}</span>
        <strong>
          {shown.measured ? `${fmt(shown.measured, 3)} s` : '— timing…'}
        </strong>
      </div>
    </div>
  );
}

export default function Readout({ state: s, motion }) {
  const rows = readout(s, motion);
  const one = rows[0];
  const two = rows[1];

  /* Single pendulum: the question is "does the formula tell the truth?"
     Two pendulums: the question is "which of these is faster?" — so the
     comparator shows whichever pair the visitor is actually asking about. */
  /* until a whole swing has been timed there is nothing to report but the
     prediction — so say which of the two is on show */
  const armBox = (r, tint) => ({
    label: `Pendulum ${r.which.toUpperCase()}`,
    tint,
    expr: `L = ${tidy(r.cfg.length)} m · m = ${tidy(r.cfg.mass)} kg`,
    value: r.measured ?? r.exact,
    pending: !r.measured,
    foot: r.measured
      ? `timed over ${r.arm.count} swing${r.arm.count > 1 ? 's' : ''}`
      : 'predicted — still timing',
  });

  const pair = s.compare && two
    ? [armBox(one, 'a'), armBox(two, 'b')]
    : [
        { label: 'Formula says', tint: 'formula', expr: `2π √(${tidy(one.cfg.length)} ÷ ${s.g})`,
          value: one.formula, pending: false, foot: 'assumes a small swing' },
        { label: 'The clock says', tint: 'measured',
          expr: one.arm.count ? `${fmt(one.arm.elapsed, 2)} s ÷ ${one.arm.count} swing${one.arm.count > 1 ? 's' : ''}`
                              : 'still timing the first swing',
          value: one.measured, pending: !one.measured,
          foot: one.measured ? 'what the pendulum actually did' : null },
      ];

  const cmp = (() => {
    if (pair.some((p) => p.pending)) return '?';
    const [x, y] = pair.map((p) => p.value);
    return Math.abs(x - y) / Math.max(x, y) < 0.005 ? '=' : (x < y ? '<' : '>');
  })();

  /* ---------- what to say about it ---------- */
  let verdict, tone = '';
  if (s.compare && two) {
    const same = Math.abs(one.cfg.length - two.cfg.length) < 1e-9;
    const heavier = one.cfg.mass > two.cfg.mass ? 'A' : 'B';
    if (same) {
      tone = 'ok';
      verdict = (
        <>Same length, so <strong>the same period</strong> — {fmt(one.exact, 2)} s each — even
          though {heavier} is {fmt(Math.max(one.cfg.mass, two.cfg.mass) / Math.min(one.cfg.mass, two.cfg.mass), 1)}×
          heavier. Mass does not appear in the formula, and the bench agrees.</>
      );
    } else {
      const slow = one.exact > two.exact ? one : two;
      const fast = one.exact > two.exact ? two : one;
      const ratioL = slow.cfg.length / fast.cfg.length;
      const ratioT = slow.exact / fast.exact;
      verdict = (
        <>{slow.which.toUpperCase()} is the slower one. Its string
          is <strong>{fmt(ratioL, 2)}×</strong> longer, and its period
          is <strong>{fmt(ratioT, 2)}×</strong> longer — the square root of {fmt(ratioL, 2)}.
          Quadruple the length and you only double the time.</>
      );
    }
  } else if (!one.measured) {
    verdict = <>Let it swing. The clock needs one complete period before it can disagree
      with the formula.</>;
  } else if (one.error < 0.5) {
    tone = 'ok';
    verdict = (
      <>At {tidy(one.cfg.amplitude)}° the swing is small enough that the formula holds:
        {' '}{fmt(one.formula, 3)} s predicted against {fmt(one.measured, 3)} s
        measured{s.damping ? ', with the air slowly taking the swing down' : ''}.</>
    );
  } else if (one.error < 2) {
    verdict = (
      <>The gap is opening. At {tidy(one.cfg.amplitude)}° the real swing
        is <strong>{fmt(one.error, 1)}% slower</strong> than 2π√(L/g) — small, but the clock
        can see it: {fmt(one.measured, 3)} s against {fmt(one.formula, 3)} s predicted. Widen
        the swing and watch the gap grow.</>
    );
  } else {
    tone = 'warn';
    verdict = (
      <>The formula has stopped telling the truth. At {tidy(one.cfg.amplitude)}° the real swing
        is <strong>{fmt(one.error, 1)}% slower</strong> than 2π√(L/g) claims, because that
        formula quietly replaces sin θ with θ — fine for a small swing, not for this one. The
        exact period is <strong>{fmt(one.exact, 3)} s</strong>, which is what the clock
        read.</>
    );
  }

  /* the arithmetic, set out the way it would be written */
  const L = one.cfg.length, g = s.g;
  const ratio = L / g;
  const root = Math.sqrt(ratio);

  return (
    <section className={`card sheet-card pend-card${s.frozen ? ' masked' : ''}`}>
      <div className="mask-note">Predict first — the working appears once you answer</div>
      <div className="sheet-inner">
        <h2>Working out
          <span className="sub">the period depends on length and gravity — and on nothing else</span>
        </h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pendulum</th><th>Length L</th><th>Mass m</th><th>Swing θ₀</th>
                <th>T = 2π√(L/g)</th><th>Measured T</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.which}>
                  <td className="obj">
                    <span className="swatch" style={{ background: COLOURS[r.which] }} />
                    {s.compare ? `Pendulum ${r.which.toUpperCase()}` : 'The pendulum'}
                  </td>
                  <td data-label="Length L">{tidy(r.cfg.length)} m</td>
                  <td data-label="Mass m">{tidy(r.cfg.mass)} kg</td>
                  <td data-label="Swing θ₀">{tidy(r.cfg.amplitude)}°</td>
                  <td data-label="T = 2π√(L/g)"><b>{fmt(r.formula, 3)} s</b></td>
                  <td className="measured" data-label="Measured T">
                    {r.measured
                      ? <><b>{fmt(r.measured, 3)} s</b>{' '}
                          <span className="calc-exp">
                            ({r.arm.count} swing{r.arm.count > 1 ? 's' : ''})
                          </span></>
                      : <span className="calc-exp">timing…</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="working">
          <span className="working-head">The prediction, step by step</span>
          <code>
            T = 2π √(L ÷ g){'\n'}
            {'  '}= 2π √({tidy(L)} m ÷ {g} N/kg){'\n'}
            {'  '}= 2π √({fmt(ratio, 4)} s²){'\n'}
            {'  '}= 2π × {fmt(root, 4)} s{'\n'}
            {'  '}= {fmt(one.formula, 3)} s
          </code>
          <p className="working-note">
            Notice what never enters the sum: the mass of the bob. Change it while the
            pendulum is swinging and the timing does not flinch.
          </p>
        </div>

        {s.showEnergy && <EnergyPanel s={s} rows={rows} />}

        <div className="sums">
          <SumBox {...pair[0]} />
          <div className="cmp">{cmp}</div>
          <SumBox {...pair[1]} />
        </div>
        <p className="sums-note">
          Periods in seconds, measured over whole swings — the way a stopwatch would.
        </p>

        <p className={`verdict${tone ? ` ${tone}` : ''}`}>{verdict}</p>
      </div>
    </section>
  );
}
