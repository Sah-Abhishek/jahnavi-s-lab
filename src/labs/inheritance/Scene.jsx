/* ============================================================
   Inheritance — the apparatus.
   Two parents, the gametes they can make, and the Punnett square
   those gametes fill in. Click any allele to change it and the
   whole square follows.
   ============================================================ */
import {
  genesOf, genotypeText, punnett, phenotypeOrder, phenotype, phenotypeColours,
  genotypeParts, gameteParts, alleleParts, alleleText, parentLabel, captionFits,
} from './engine';

/* A superscript in SVG: raise the small tspan, then put the baseline back for
   whatever follows. The reset is scaled by the superscript's own size, because
   dy is measured in the em of the tspan it sits on. */
const SUP_RISE = 0.45, SUP_SCALE = 0.68;
const RESET = (SUP_RISE * SUP_SCALE).toFixed(2);

/** Allele symbols drawn as Xᵇ rather than X^b. */
function Sym({ parts }) {
  const out = [];
  let owed = false;
  parts.forEach((p, i) => {
    out.push(<tspan key={`b${i}`} dy={owed ? `${RESET}em` : undefined}>{p.base}</tspan>);
    owed = false;
    if (p.sup) {
      out.push(<tspan key={`s${i}`} className="sup" dy={`-${SUP_RISE}em`}>{p.sup}</tspan>);
      owed = true;
    }
  });
  return out;
}

/* ---------- one parent, with every allele a button ---------- */
function Parent({ s, P, which, x, dispatch }) {
  const genes = genesOf(s.study);
  const pairs = s[which];
  const ph = phenotype(genes, pairs);
  const label = parentLabel(s.study, which);
  const editable = s.mode !== 'challenge' || !s.frozen;
  const letters = [];
  pairs.forEach((pair, gi) => pair.forEach((allele, slot) => {
    letters.push({ allele, gi, slot, key: `${gi}-${slot}` });
  }));

  const w = P.parentW;
  const widest = Math.max(...letters.map((L) => alleleText(L.allele).length));
  const step = Math.min(20 + widest * 11, (w - 16) / Math.max(letters.length, 1));
  const startX = x + w / 2 - ((letters.length - 1) * step) / 2;

  return (
    <g className="parent-card">
      <rect className="parent-box" x={x} y={P.parentY} width={w} height={P.parentH} rx="7" />
      <text className="parent-name" x={x + 12} y={P.parentY + 16}>{label}</text>
      {letters.map((L, i) => (
        <g key={L.key} className={`allele${editable ? '' : ' locked'}`}
           tabIndex={editable ? 0 : -1} role="button"
           aria-label={`${label}, allele ${i + 1}: ${alleleText(L.allele)}. Activate to change it.`}
           onClick={() => editable && dispatch({ type: 'flipAllele', which, gene: L.gi, slot: L.slot })}
           onKeyDown={(e) => {
             if (!editable || (e.key !== 'Enter' && e.key !== ' ')) return;
             e.preventDefault();
             dispatch({ type: 'flipAllele', which, gene: L.gi, slot: L.slot });
           }}>
          <rect className="allele-hit" x={startX + i * step - step / 2 + 2} y={P.parentY + 22}
                width={step - 4} height={26} rx="4" />
          <text className="allele-text" x={startX + i * step} y={P.parentY + 41}
                textAnchor="middle"><Sym parts={[alleleParts(L.allele)]} /></text>
        </g>
      ))}
      <text className="parent-pheno" x={x + w / 2} y={P.parentY + P.parentH - 12}
            textAnchor="middle">{ph.adult}</text>
    </g>
  );
}

export default function Scene({ state: s, profile: P, unitsPerPx, dispatch }) {
  const genes = genesOf(s.study);
  const square = punnett(genes, s.p1, s.p2);
  const colours = phenotypeColours(genes);
  const order = phenotypeOrder(genes);
  const n = square.rows.length;
  const cell = P.squareSize / (n + 1);
  const sx = P.squareLeft, sy = P.squareTop;
  /* a phenotype caption only earns its place if it actually fits — "unaffected
     daughter" does not, in a cell that holds "round" comfortably */
  const u = parseFloat(unitsPerPx) || 1;
  const capFont = (P.name === 'compact' ? 8.5 : 9.5) * u;
  /* decided once for the whole square, so it is never half-captioned */
  const longestShort = square.cells.flat()
    .reduce((t, c) => (c.pheno.short.length > t.length ? c.pheno.short : t), '');
  const showCaptions = s.showPhenoLabels && cell >= 70 && captionFits(longestShort, cell, capFont);
  const counts = {};
  square.cells.forEach((row) => row.forEach((c) => {
    counts[c.pheno.key] = (counts[c.pheno.key] || 0) + 1;
  }));
  const p1Name = parentLabel(s.study, 'p1');
  const p2Name = parentLabel(s.study, 'p2');

  return (
    <svg id="scene" className={P.name === 'compact' ? 'compact' : undefined}
         viewBox={`0 0 ${P.W} ${P.H}`} style={{ '--u': unitsPerPx }}
         role="img"
         aria-label={`A Punnett square for ${genotypeText(genes, s.p1)} crossed with ${genotypeText(genes, s.p2)}`}>

      {/* the two parents, and the cross between them */}
      <Parent s={s} P={P} which="p1" x={P.p1X} dispatch={dispatch} />
      <text className="cross-sign" x={P.crossX} y={P.parentY + P.parentH / 2 + 7}
            textAnchor="middle">×</text>
      <Parent s={s} P={P} which="p2" x={P.p2X} dispatch={dispatch} />

      {/* which gametes each parent can make.
          Set above the square rather than rotated down its side: a rotated
          label would run off the left edge of the compact drawing. */}
      <text className="gamete-note" x={sx} y={sy - 26}>
        {P.name === 'compact' ? `→ ${p2Name}` : `across the top — ${p2Name}'s gametes`}
      </text>
      <text className="gamete-note" x={sx} y={sy - 11}>
        {P.name === 'compact' ? `↓ ${p1Name}` : `down the side — ${p1Name}'s gametes`}
      </text>

      {/* the square: corner, headers, then the cells they fill in */}
      <rect className="sq-corner" x={sx} y={sy} width={cell} height={cell} rx="4" />
      {square.cols.map((g, j) => (
        <g key={`c${j}`}>
          <rect className="sq-head" x={sx + (j + 1) * cell} y={sy} width={cell} height={cell} rx="4" />
          <text className="sq-head-text" x={sx + (j + 1.5) * cell} y={sy + cell / 2 + 5}
                textAnchor="middle"><Sym parts={gameteParts(g)} /></text>
        </g>
      ))}
      {square.rows.map((g, i) => (
        <g key={`r${i}`}>
          <rect className="sq-head" x={sx} y={sy + (i + 1) * cell} width={cell} height={cell} rx="4" />
          <text className="sq-head-text" x={sx + cell / 2} y={sy + (i + 1.5) * cell + 5}
                textAnchor="middle"><Sym parts={gameteParts(g)} /></text>
        </g>
      ))}

      {square.cells.map((row, i) => row.map((c, j) => {
        const cx = sx + (j + 1) * cell, cy = sy + (i + 1) * cell;
        const dimmed = s.highlight && s.highlight !== c.pheno.key;
        return (
          <g key={`${i}-${j}`} className={`sq-cell${dimmed ? ' dim' : ''}`}>
            <rect x={cx + 1.5} y={cy + 1.5} width={cell - 3} height={cell - 3} rx="4"
                  fill={s.frozen ? 'var(--surface-sunk)' : colours[c.pheno.key]}
                  className={s.frozen ? 'sq-hidden' : 'sq-fill'} />
            {s.frozen ? (
              <text className="sq-question" x={cx + cell / 2} y={cy + cell / 2 + 7}
                    textAnchor="middle">?</text>
            ) : (
              <>
                {s.showGenotypes && (
                  <text className="sq-genotype" x={cx + cell / 2}
                        y={cy + cell / 2 + (showCaptions ? -2 : 5)}
                        textAnchor="middle"><Sym parts={genotypeParts(genes, c.genotype)} /></text>
                )}
                {showCaptions && (
                  <text className="sq-pheno" x={cx + cell / 2}
                        y={cy + cell / 2 + (s.showGenotypes ? 16 : 5)}
                        textAnchor="middle">{c.pheno.short}</text>
                )}
              </>
            )}
          </g>
        );
      }))}

      {/* what each colour means, how many squares it fills, and the chance */}
      <text className="legend-head" x={P.legendX} y={sy + 4}>WHAT THE CHILDREN SHOW</text>
      {order.map((p, i) => {
        const y = sy + 22 + i * P.legendStep;
        const nCells = counts[p.key] || 0;
        const on = !s.highlight || s.highlight === p.key;
        const pct = square.total ? Math.round((nCells / square.total) * 1000) / 10 : 0;
        return (
          <g key={p.key} className={`legend-row${on ? '' : ' dim'}`} tabIndex={0} role="button"
             aria-label={`${p.label}: ${nCells} of ${square.total} squares, ${pct} per cent. Activate to pick it out.`}
             onClick={() => dispatch({ type: 'highlight', key: p.key })}
             onKeyDown={(e) => {
               if (e.key !== 'Enter' && e.key !== ' ') return;
               e.preventDefault();
               dispatch({ type: 'highlight', key: p.key });
             }}>
            <rect className="legend-hit" x={P.legendX - 6} y={y - 15}
                  width={P.legendW} height={P.legendStep - 2} rx="5" />
            <rect className="legend-swatch" x={P.legendX} y={y - 11} width={18} height={18} rx="3"
                  fill={p.colour} />
            <text className="legend-label" x={P.legendX + 27} y={y + 3}>{p.label}</text>
            {/* the compact drawing has no room for a name like "Unaffected daughter"
                AND its odds on the same line, so the odds go underneath */}
            {P.name === 'compact' ? (
              <text className="legend-count" x={P.legendX + 27} y={y + 15}>
                {s.frozen ? '?' : `${nCells} of ${square.total} · ${pct}%`}
              </text>
            ) : (
              <text className="legend-count" x={P.legendX + P.legendW - 18} y={y + 3}
                    textAnchor="end">
                {s.frozen ? '?' : `${nCells} of ${square.total} · ${pct}%`}
              </text>
            )}
          </g>
        );
      })}

      <text className="scene-caption" x={P.W / 2} y={P.capY} textAnchor="middle">
        {P.name === 'compact'
          ? 'Tap an allele to change it'
          : 'Every square is equally likely · click an allele to change it, or a colour to pick it out'}
      </text>
    </svg>
  );
}
