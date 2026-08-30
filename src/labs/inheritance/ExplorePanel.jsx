/* ============================================================
   Inheritance — the controls.
   Every change to the cross throws away the litter bred from the
   old one, so the offspring on the bench always belong to the
   parents above them.
   ============================================================ */
import { memo } from 'react';
import Listbox from '../../components/Listbox';
import {
  STUDIES, PRESETS, genesOf, parentGenotypes, phenotypeOf, pairKey,
  genotypeParts, alleleParts, parentLabel, isSexLinked,
} from './engine';

/** Genotypes written as Xᵇ rather than X^b. */
const Geno = ({ parts }) => parts.map((p, i) => (
  <span key={i}>{p.base}{p.sup ? <sup>{p.sup}</sup> : null}</span>
));

const BATCHES = [10, 100, 1000];

/* ---------- one parent's genotype, gene by gene ----------
   The options offered are the ones this parent could actually be: a mother
   never gets a Y, and a father never gets two X chromosomes. */
function ParentBlock({ s, which, dispatch, editable }) {
  const genes = genesOf(s.study);
  const label = parentLabel(s.study, which);
  return (
    <div className="parent-ctrl" data-parent={which}>
      <div className="parent-ctrl-head">
        <span className="arm-title">{label}</span>
        <span className="arm-period"><Geno parts={genotypeParts(genes, s[which])} /></span>
      </div>
      {genes.map((g, i) => {
        const options = parentGenotypes(g, which);
        return (
          <div key={g.id} className="gene-row">
            <span className="field-label">{g.trait}</span>
            <div className={`segmented n${options.length}`} role="radiogroup"
                 aria-label={`${label}, ${g.trait}`}>
              {options.map((pair) => {
                const key = pairKey(g, pair);
                const on = pairKey(g, s[which][i]) === key;
                return (
                  <button key={key} type="button" role="radio" aria-checked={on}
                          className={`seg${on ? ' active' : ''}`} disabled={!editable}
                          onClick={() => dispatch({ type: 'genotype', which, gene: i, value: key })}>
                    <span className="seg-name"><Geno parts={pair.map(alleleParts)} /></span>
                    <span className="seg-sub">{phenotypeOf(g, pair).adult}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExplorePanel({ state: s, dispatch, onBreed }) {
  const editable = s.mode !== 'challenge';
  const genes = genesOf(s.study);
  const sexLinked = isSexLinked(s.study);

  return (
    <div className="card tabpanel">
      <section className="ctrl-block">
        <div className="row-head"><span className="label" id="studyLabel">The cross</span></div>
        <Listbox label="The cross" labelId="studyLabel" value={s.study}
                 options={Object.values(STUDIES).map((st) => ({
                   value: st.id, name: st.name, sub: st.sub, num: st.group.split(' ')[0],
                 }))}
                 onChange={(v) => dispatch({ type: 'study', value: v })} />
        <p className="micro">
          {genes[0].organism} · {genes.map((g) => g.trait).join(' and ')}. Alleles:{' '}
          {genes.map((g) => g.alleles
            .map((a) => `${a.replace('^', '')} (${g.alleleName[a]})`).join(', ')).join('; ')}.
          {genes[0].mode === 'dominant' &&
            ' The capital letter is dominant: one copy is enough to show it.'}
          {genes[0].mode === 'incomplete' &&
            ' Neither allele gives way, so one of each makes something in between.'}
          {genes[0].mode === 'codominant' &&
            ' Both alleles show at once — not blended, but side by side.'}
          {genes[0].mode === 'multiple' &&
            ' Three alleles, not two. Iᴬ and Iᴮ are codominant with each other, and both are dominant to i.'}
          {genes[0].mode === 'x-linked' &&
            ' This gene sits on the X chromosome. A son has only one X, so a single recessive allele is enough to affect him — there is no second copy to hide behind.'}
        </p>
        {sexLinked && (
          <p className="micro warn-note">
            The two parents are no longer interchangeable: the mother has two X chromosomes,
            the father one X and a Y. The controls only offer each of them what they could be.
          </p>
        )}
      </section>

      <section className="ctrl-block">
        <ParentBlock s={s} which="p1" dispatch={dispatch} editable={editable} />
        <ParentBlock s={s} which="p2" dispatch={dispatch} editable={editable} />
        <p className="micro">You can also click the letters on the parents in the diagram —
          each one flips to the other allele.</p>
      </section>

      <section className="ctrl-block">
        <div className="row-head">
          <span className="label">Breed some offspring</span>
          {s.sample.n > 0 && <span className="bred-count">{s.sample.n} so far</span>}
        </div>
        <div className="breed-row">
          {BATCHES.map((n) => (
            <button key={n} className="btn" onClick={() => onBreed(n)}>+{n}</button>
          ))}
          <button className="btn ghost" disabled={!s.sample.n}
                  onClick={() => dispatch({ type: 'clearSample' })}>Clear</button>
        </div>
        <p className="micro">The square says what to <em>expect</em>. Each offspring is still
          a fresh throw of the dice, so ten of them rarely land on the ratio and a thousand
          almost always do. Watch the working out below as the number climbs.</p>
      </section>

      <section className="ctrl-block">
        <span className="label">Show</span>
        <div className="checks">
          <label className="chk">
            <input type="checkbox" checked={s.showGenotypes}
                   onChange={(e) => dispatch({ type: 'view', key: 'showGenotypes', value: e.target.checked })} />
            <span>Genotypes</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={s.showPhenoLabels}
                   onChange={(e) => dispatch({ type: 'view', key: 'showPhenoLabels', value: e.target.checked })} />
            <span>Phenotype names</span>
          </label>
        </div>
        {s.highlight && (
          <button className="btn tiny wide-tiny"
                  onClick={() => dispatch({ type: 'highlight', key: s.highlight })}>
            Stop picking out one phenotype
          </button>
        )}
      </section>

      <section className="ctrl-block">
        <span className="label">Ready-made crosses</span>
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
        <p className="micro">Your cross is kept in this browser, so it is still here next
          time. Nothing leaves your device. <strong>Reset</strong> clears it and starts fresh.</p>
      </section>
    </div>
  );
}

export default memo(ExplorePanel);
