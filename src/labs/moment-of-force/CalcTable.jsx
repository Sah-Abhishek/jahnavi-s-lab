/* ============================================================
   Moment of Force — the working out.
   Every row is the arithmetic a pupil would write on paper:
   mass -> weight -> distance -> moment, then the two columns
   totalled and compared. While a prediction is pending the whole
   card is masked, so the answer cannot be read off the table.
   ============================================================ */
import { U, getItems, getTotals, posDp, fmt, kgOf } from './engine';

/** One reading of the experiment, shared by the status pill and the table. */
function readout(s) {
  const items = getItems(s).slice().sort((a, b) => a.x - b.x);
  const t = getTotals(items);
  const dp = posDp(s);
  const u = U(s);
  const live = items.filter((it) => it.active).length;

  let pillClass = '', pillText, verdict, verdictOk = false;
  if (s.frozen) {
    pillClass = 'wait';
    pillText = 'Make your prediction';
  } else if (t.balanced) {
    pillText = live ? 'Balanced' : 'Nothing on the rod';
    verdictOk = true;
    verdict = live
      ? <>The rod is in <strong>equilibrium</strong>: total anticlockwise = total
          clockwise = {fmt(t.cw)} {u.moment}.</>
      : <>Hang a mass on the rod, or switch one back on, and watch what happens.</>;
  } else if (t.net > 0) {
    pillClass = 'cw';
    pillText = 'Tipping right ↻';
    verdict = <>Clockwise wins by <strong>{fmt(t.net)} {u.moment}</strong>, so the right-hand
      side goes down. Move a mass, switch one off, or slide the pivot right.</>;
  } else {
    pillClass = 'acw';
    pillText = 'Tipping left ↺';
    verdict = <>Anticlockwise wins by <strong>{fmt(-t.net)} {u.moment}</strong>, so the left-hand
      side goes down. Move a mass, switch one off, or slide the pivot left.</>;
  }
  return { items, t, dp, u, pillClass, pillText, verdict, verdictOk };
}

/** The verdict, above the diagram — the same numbers the table works out below. */
export function StageHead({ state: s }) {
  const { t, u, pillClass, pillText } = readout(s);
  return (
    <div className="stage-head">
      <div className={`pill ${pillClass}`}>{pillText}</div>
      <div className="net-readout">
        <span>Out of balance by</span>
        <strong>{fmt(Math.abs(t.net))} {u.moment}</strong>
      </div>
    </div>
  );
}

export default function CalcTable({ state: s }) {
  const { items, t, dp, u, verdict, verdictOk } = readout(s);
  const term = (it) => `${fmt(it.force)} × ${it.d.toFixed(dp)}`;
  const acwTerms = items.filter((it) => it.dir < 0).map(term);
  const cwTerms = items.filter((it) => it.dir > 0).map(term);

  return (
    <section className={`card sheet-card calc-card${s.frozen ? ' masked' : ''}`}>
      <div className="mask-note">Predict first — the working appears once you answer</div>
      <div className="sheet-inner">
        <h2>Working out
          <span className="sub">moment = force × perpendicular distance from the pivot</span>
        </h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Object</th><th>Mass</th><th>Weight F = m g</th>
                <th>Distance d</th><th>Turning effect</th><th>Moment F × d</th>
              </tr>
            </thead>
            <tbody>
              {!items.length ? (
                <tr className="empty-row">
                  <td colSpan={6}>No masses on the rod — add one to begin.</td>
                </tr>
              ) : items.map((it) => {
                const tag = !it.active ? <span className="dir-tag idle">switched off</span>
                  : it.dir > 0 ? <span className="dir-tag cw">clockwise ↻</span>
                  : it.dir < 0 ? <span className="dir-tag acw">anticlockwise ↺</span>
                  : <span className="dir-tag none">on the pivot</span>;
                const col = it.dir > 0 ? 'var(--cw)' : it.dir < 0 ? 'var(--acw)' : 'var(--ink-faint)';
                return (
                  <tr key={it.id} className={it.active ? undefined : 'idle'}>
                    <td className="obj">
                      <span className="swatch" style={{ background: it.color }} />
                      {it.isRod ? it.label : `${kgOf(it.m)} ${u.mass} mass`}
                    </td>
                    <td data-label="Mass">{kgOf(it.m)} {u.mass}</td>
                    <td data-label="Weight F = m g">
                      <span className="calc-exp">{kgOf(it.m)} × {s.g} =</span>{' '}
                      <b>{fmt(it.force)} {u.force}</b>
                    </td>
                    <td data-label="Distance d">{it.d.toFixed(dp)} {u.len}</td>
                    <td data-label="Turning effect">{tag}</td>
                    <td className="moment" data-label="Moment F × d" style={{ color: col }}>
                      {it.active
                        ? <><span className="calc-exp">{term(it)} =</span>{' '}
                            <b>{fmt(it.moment)} {u.moment}</b></>
                        : <span className="calc-exp">counts as 0</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* the sum each side, written out the way it would be on paper */}
        <div className="sums">
          <div className="sum acw">
            <span className="sum-label">Total anticlockwise ↺</span>
            <code className="expr">
              {acwTerms.length ? acwTerms.join('  +  ') : 'nothing turning this way'}
            </code>
            <strong>= {fmt(t.acw)} {u.moment}</strong>
          </div>
          <div className="cmp">{t.balanced ? '=' : (t.cw > t.acw ? '<' : '>')}</div>
          <div className="sum cw">
            <span className="sum-label">Total clockwise ↻</span>
            <code className="expr">
              {cwTerms.length ? cwTerms.join('  +  ') : 'nothing turning this way'}
            </code>
            <strong>= {fmt(t.cw)} {u.moment}</strong>
          </div>
        </div>
        <p className="sums-note">
          Forces in {u.forceLong}, distances in {u.lenLong} measured from the pivot.
        </p>

        {!s.frozen && (
          <p className={`verdict${verdictOk ? ' ok' : ''}`}>{verdict}</p>
        )}
    </div>
    </section>
  );
}
