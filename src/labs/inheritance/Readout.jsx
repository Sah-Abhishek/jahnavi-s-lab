/* ============================================================
   Inheritance — the working out.
   The square gives what to expect, in the three forms a pupil is
   asked for: the genotypic ratio, the phenotypic ratio, and the
   chance of each outcome. Breeding gives what actually turned up.
   The gap between them is not a mistake in either — it is what
   chance does to small numbers, and it shrinks in a way you can
   watch.
   ============================================================ */
import {
  genesOf, punnett, genotypeRatio, phenotypeRatio, phenotypeOrder,
  phenotypeColours, observedPhenotypes, chiSquared, chiCritical, simplify,
  genotypeParts, isSexLinked, STUDIES,
} from './engine';

/** Genotypes written as Xᵇ rather than X^b. */
function Geno({ parts }) {
  return parts.map((p, i) => (
    <span key={i}>{p.base}{p.sup ? <sup>{p.sup}</sup> : null}</span>
  ));
}

/** The verdict, above the apparatus. */
export function StageHead({ state: s }) {
  const genes = genesOf(s.study);
  const square = punnett(genes, s.p1, s.p2);
  const ratio = phenotypeRatio(genes, square);
  return (
    <div className="stage-head">
      <div className={`pill ${s.frozen ? 'wait' : ''}`}>
        {s.frozen ? 'Make your prediction' : (
          <>
            <Geno parts={genotypeParts(genes, s.p1)} />
            {' × '}
            <Geno parts={genotypeParts(genes, s.p2)} />
          </>
        )}
      </div>
      <div className="net-readout">
        <span>Phenotypic ratio</span>
        <strong>{s.frozen ? '—' : ratio.text}</strong>
      </div>
    </div>
  );
}

/** The family drawn out one child at a time, so a ratio stops being arithmetic
    and starts being a handful of actual offspring. */
function DotGrid({ order, colours, highlight }) {
  if (!order.length) return null;
  return (
    <div className="dot-grid" aria-hidden="true">
      {order.map((key, i) => (
        <span key={i}
              className={`dot${highlight && highlight !== colours.keyOf[key] ? ' dim' : ''}`}
              style={{ background: colours.byGenotype[key] || 'var(--rule)' }} />
      ))}
    </div>
  );
}

/** One of the two figures being held up against each other. */
function SumBox({ label, tint, expr, value, foot }) {
  return (
    <div className={`sum tint-${tint}`}>
      <span className="sum-label">{label}</span>
      <code className="expr">{expr}</code>
      <strong>{value}</strong>
      {foot && <span className="sum-foot">{foot}</span>}
    </div>
  );
}

export default function Readout({ state: s }) {
  const genes = genesOf(s.study);
  const square = punnett(genes, s.p1, s.p2);
  const gRatio = genotypeRatio(genes, square);
  const pRatio = phenotypeRatio(genes, square);
  const colours = phenotypeColours(genes);
  const order = phenotypeOrder(genes);
  const sexLinked = isSexLinked(s.study);
  const child = sexLinked || STUDIES[s.study].group === 'Human inheritance' ? 'children' : 'offspring';

  /* the observed family, folded from genotypes into what you would actually see */
  const seen = observedPhenotypes(genes, s.sample.counts);
  const n = s.sample.n;
  const rows = pRatio.rows.map((r) => ({
    ...r,
    expected: (r.count / square.total) * n,
    observed: seen[r.key] || 0,
  }));
  /* every phenotype the cross could show, so an absent class still gets a row */
  const missing = order.filter((p) => !pRatio.rows.some((r) => r.key === p.key));

  const chi = n > 0 ? chiSquared(rows.map((r) => r.observed), rows.map((r) => r.expected)) : null;
  const df = Math.max(rows.length - 1, 1);
  const crit = chiCritical(df);

  /* a genotype key → colour map, for the dot grid */
  const byGenotype = {};
  const keyOf = {};
  square.cells.forEach((row) => row.forEach((c) => {
    byGenotype[c.key] = colours[c.pheno.key];
    keyOf[c.key] = c.pheno.key;
  }));

  const observedText = n > 0
    ? simplify(rows.map((r) => Math.round((r.observed / n) * 1000))).join(' : ')
    : null;

  return (
    <section className={`card sheet-card cross-card${s.frozen ? ' masked' : ''}`}>
      <div className="mask-note">Predict first — the working appears once you answer</div>
      <div className="sheet-inner">
        <h2>Working out
          <span className="sub">every square is one equally likely way the gametes could meet</span>
        </h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Phenotype</th><th>Genotypes</th><th>Squares</th><th>Chance</th>
                <th>Expected in {n || '—'}</th><th>Actually bred</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const gts = gRatio.rows.filter((g) => g.phenoKey === r.key);
                return (
                  <tr key={r.key}>
                    <td className="obj">
                      <span className="swatch" style={{ background: r.colour }} />
                      {r.label}
                    </td>
                    <td data-label="Genotypes">
                      {gts.map((g, i) => (
                        <span key={g.key}>
                          {i > 0 ? ' · ' : ''}{g.count} <Geno parts={g.parts} />
                        </span>
                      ))}
                    </td>
                    <td data-label="Squares">{r.count} of {square.total}</td>
                    <td className="chance" data-label="Chance">
                      <b>{r.chance.inText}</b>{' '}
                      <span className="calc-exp">· {r.chance.percent}</span>
                    </td>
                    <td data-label="Expected">{n ? r.expected.toFixed(1) : '—'}</td>
                    <td className="bred" data-label="Actually bred">
                      {n ? <b>{r.observed}</b> : <span className="calc-exp">none bred yet</span>}
                    </td>
                  </tr>
                );
              })}
              {missing.map((p) => (
                <tr key={p.key} className="idle">
                  <td className="obj">
                    <span className="swatch" style={{ background: p.colour }} />
                    {p.label}
                  </td>
                  <td colSpan={5}>
                    <span className="calc-exp">
                      impossible from this cross — no square gives that genotype
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* the two ratios, named the way an exam names them */}
        <div className="ratios">
          <div className="ratio-block">
            <span className="working-head">Genotypic ratio</span>
            <div className="ratio-line">
              {gRatio.rows.map((g, i) => (
                <span key={g.key} className="ratio-term">
                  {i > 0 && <em>:</em>}
                  <b>{g.count}</b> <Geno parts={g.parts} />
                </span>
              ))}
            </div>
            <strong className="ratio-total">{gRatio.text}</strong>
          </div>
          <div className="ratio-block">
            <span className="working-head">Phenotypic ratio</span>
            <div className="ratio-line">
              {pRatio.rows.map((p, i) => (
                <span key={p.key} className="ratio-term">
                  {i > 0 && <em>:</em>}
                  <b>{p.count}</b>{' '}
                  <span className="ratio-pheno" style={{ color: p.colour }}>{p.short}</span>
                </span>
              ))}
            </div>
            <strong className="ratio-total">{pRatio.text}</strong>
          </div>
        </div>
        <p className="working-note">
          The two are not the same list.{' '}
          {gRatio.rows.length === pRatio.rows.length
            ? 'Here they happen to match, because every genotype looks different — nothing is hidden.'
            : `Here ${gRatio.rows.length} genotypes collapse into ${pRatio.rows.length} appearances, ` +
              'because a dominant allele hides whatever it is paired with — which is the whole ' +
              'reason a trait can vanish for a generation and come back.'}
        </p>

        {/* the same thing said as odds, which is how it is usually asked */}
        <div className="chances">
          <span className="working-head">The chances for each child</span>
          <ul>
            {rows.map((r) => (
              <li key={r.key}>
                <span className="swatch" style={{ background: r.colour }} />
                <span className="chance-odds">{r.chance.inText}</span>
                <span className="chance-pct">{r.chance.percent}</span>
                <span className="chance-frac">{r.chance.fraction}</span>
                <span className="chance-what">{r.label.toLowerCase()}</span>
              </li>
            ))}
          </ul>
          <p className="working-note">
            Every child is a fresh throw. A 1 in 4 chance does not mean one child in every four —
            all four could come out the same way, and sometimes do.
          </p>
        </div>

        {n > 0 && (
          <div className="litter">
            <span className="working-head">
              {n} {child} bred, showing {Math.min(n, s.sample.order.length)}
            </span>
            <DotGrid order={s.sample.order} highlight={s.highlight}
                     colours={{ byGenotype, keyOf }} />
            <p className="working-note">
              Expected <strong>{pRatio.text}</strong>, bred <strong>{observedText}</strong> out
              of {n}. Chi-squared measures whether that difference is the sort of thing chance
              produces: χ² = <strong>{chi.toFixed(2)}</strong> against {crit} for {df} degree
              {df > 1 ? 's' : ''} of freedom, so the difference{' '}
              {chi <= crit
                ? 'is well within what chance explains'
                : 'is bigger than chance comfortably explains — breed more and watch it settle'}.
            </p>
          </div>
        )}

        <div className="sums">
          <SumBox label="The square predicts" tint="expected"
                  expr={pRatio.rows.map((p) => p.short).join(' : ')}
                  value={pRatio.text}
                  foot={`out of ${square.total} equally likely squares`} />
          <div className="cmp">{n > 0 ? (chi <= crit ? '≈' : '≠') : '?'}</div>
          <SumBox label={`The ${child} gave`} tint="bred"
                  expr={n > 0 ? rows.map((r) => r.observed).join(' : ') : 'none bred yet'}
                  value={observedText || '—'}
                  foot={n > 0 ? `from ${n} ${child}` : 'press Breed to start'} />
        </div>
        <p className="sums-note">
          Breed ten and the ratio is anyone's guess. Breed a thousand and it can hardly
          be anything else.
        </p>
      </div>
    </section>
  );
}
