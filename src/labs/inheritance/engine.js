/* ============================================================
   Inheritance — the genetics, with no DOM in sight.

   A genotype is an array of gene pairs: one pair per gene, each
   pair a two-element array of allele SYMBOLS. Symbols may carry a
   superscript after a caret — 'X^b', 'I^A' — so the model covers
   more than two alleles and more than one chromosome:

       Rr            [['R','r']]
       RrYy          [['R','r'],['Y','y']]
       Xᴮ Xᵇ         [['X^B','X^b']]        a carrier mother
       Xᵇ Y          [['X^b','Y']]          an affected son
       Iᴬ i          [['I^A','i']]          blood group A

   Because symbols can be more than one character, genotypes are
   keyed as 'R/r' and 'X^B/Y' rather than by position — nothing
   downstream has to guess where one allele ends and the next
   begins.
   ============================================================ */

/* ---------- the two drawings ----------
   A phone that scales a 900-unit drawing down to 360 px renders 10-unit type at
   4 px. So the scene keeps two geometries and picks one from its measured width:
   the compact one is a smaller drawing whose type is proportionally larger. */
export const PROFILES = {
  wide: {
    name: 'wide',
    W: 900, H: 515,
    parentY: 20, parentH: 74, parentW: 210,
    p1X: 190, crossX: 450, p2X: 500,
    squareTop: 142, squareLeft: 150, squareSize: 338,
    legendX: 532, legendW: 336, legendStep: 30,
    capY: 502,
  },
  compact: {
    name: 'compact',
    W: 520, H: 420,
    parentY: 10, parentH: 72, parentW: 152,
    p1X: 50, crossX: 260, p2X: 318,
    squareTop: 118, squareLeft: 20, squareSize: 248,
    legendX: 288, legendW: 218, legendStep: 33,
    capY: 408,
  },
};

/* Chosen so white lettering inside a coloured cell clears 4.5:1, and the
   phenotypes stay tellable apart for the commonest kinds of colour blindness. */
const INK = {
  blue: '#3272be', amber: '#a06a17', olive: '#5e7f28', rose: '#b94a85',
  brick: '#c8452e', rust: '#b65c1d', slate: '#6b7887', teal: '#11828d',
  violet: '#7a55cc',
};

/** 'X^b' → { base:'X', sup:'b' }, 'R' → { base:'R', sup:'' }. */
export function alleleParts(symbol) {
  const i = symbol.indexOf('^');
  return i < 0 ? { base: symbol, sup: '' } : { base: symbol.slice(0, i), sup: symbol.slice(i + 1) };
}
/** The same symbol as flat text, for places that cannot set a superscript. */
export const alleleText = (symbol) => symbol.replace('^', '');

/* ---------- little builders for the commonest phenotype maps ----------
   `short` is the name used when a ratio is written out in words — "3 round : 1
   wrinkled" — where the full label would be too long to read as a ratio. */
const P = (key, label, colour, short, adult) => ({
  key, label, colour,
  short: short || label.toLowerCase(),
  /* `label` describes a CHILD of the cross ("Carrier daughter"). The same
     genotype in a parent needs saying differently — the parent card already
     says which parent it is. */
  adult: adult || label,
});

/** One allele hides the other: two of the three genotypes look alike. */
function dominance(a, b, shown, hidden) {
  return { [`${a}/${a}`]: shown, [`${a}/${b}`]: shown, [`${b}/${b}`]: hidden };
}
/** Neither hides the other, so every genotype looks different. */
function threeWay(a, b, first, middle, last) {
  return { [`${a}/${a}`]: first, [`${a}/${b}`]: middle, [`${b}/${b}`]: last };
}

/* ============================================================
   THE GENES ON THE SHELF
   `alleles` is in normal-form order: the allele written first when
   a genotype is set down on paper. For sex-linked genes the Y is
   listed last, so it is always written second.
   ============================================================ */
export const GENES = {
  peaShape: {
    id: 'peaShape', trait: 'Seed shape', organism: 'Pea plant', mode: 'dominant',
    alleles: ['R', 'r'],
    alleleName: { R: 'round', r: 'wrinkled' },
    pheno: dominance('R', 'r', P('round', 'Round', INK.blue), P('wrinkled', 'Wrinkled', INK.rust)),
  },
  peaColour: {
    id: 'peaColour', trait: 'Seed colour', organism: 'Pea plant', mode: 'dominant',
    alleles: ['Y', 'y'],
    alleleName: { Y: 'yellow', y: 'green' },
    pheno: dominance('Y', 'y', P('yellow', 'Yellow', INK.amber), P('green', 'Green', INK.olive)),
  },
  snapdragon: {
    id: 'snapdragon', trait: 'Flower colour', organism: 'Snapdragon', mode: 'incomplete',
    alleles: ['R', 'W'],
    alleleName: { R: 'red', W: 'white' },
    pheno: threeWay('R', 'W', P('red', 'Red', INK.brick), P('pink', 'Pink', INK.rose),
                    P('white', 'White', INK.slate)),
  },
  cattle: {
    id: 'cattle', trait: 'Coat colour', organism: 'Shorthorn cattle', mode: 'codominant',
    alleles: ['R', 'W'],
    alleleName: { R: 'red', W: 'white' },
    pheno: threeWay('R', 'W', P('red', 'Red', INK.brick), P('roan', 'Roan', INK.rust),
                    P('white', 'White', INK.slate)),
  },

  /* ---------- human, on an ordinary chromosome ---------- */
  cystic: {
    id: 'cystic', trait: 'Cystic fibrosis', organism: 'Human', mode: 'dominant',
    alleles: ['F', 'f'],
    alleleName: { F: 'working', f: 'faulty' },
    carrierNote: 'A carrier is perfectly healthy and has no way of knowing without a test.',
    pheno: {
      'F/F': P('clear', 'Unaffected', INK.blue, 'unaffected'),
      'F/f': P('carrier', 'Healthy carrier', INK.teal, 'carrier'),
      'f/f': P('affected', 'Has cystic fibrosis', INK.brick, 'affected'),
    },
  },
  huntington: {
    id: 'huntington', trait: "Huntington's disease", organism: 'Human', mode: 'dominant',
    alleles: ['H', 'h'],
    alleleName: { H: 'faulty (dominant)', h: 'working' },
    pheno: dominance('H', 'h', P('affected', "Develops Huntington's", INK.brick, 'affected'),
                     P('clear', 'Unaffected', INK.blue, 'unaffected')),
  },
  blood: {
    id: 'blood', trait: 'ABO blood group', organism: 'Human', mode: 'multiple',
    alleles: ['I^A', 'I^B', 'i'],
    alleleName: { 'I^A': 'A antigen', 'I^B': 'B antigen', i: 'neither' },
    pheno: {
      'I^A/I^A': P('A', 'Group A', INK.brick, 'group A'),
      'I^A/I^B': P('AB', 'Group AB', INK.violet, 'group AB'),
      'I^A/i': P('A', 'Group A', INK.brick, 'group A'),
      'I^B/I^B': P('B', 'Group B', INK.blue, 'group B'),
      'I^B/i': P('B', 'Group B', INK.blue, 'group B'),
      'i/i': P('O', 'Group O', INK.slate, 'group O'),
    },
  },

  /* ---------- human, on the X chromosome ----------
     A son has only one X, so a single recessive allele is enough to affect him:
     there is no second copy to hide behind. A daughter needs two. That one
     asymmetry is the whole of sex linkage. */
  colourBlind: {
    id: 'colourBlind', trait: 'Red–green colour blindness', organism: 'Human',
    mode: 'x-linked', sexLinked: true,
    alleles: ['X^B', 'X^b', 'Y'],
    /* daughters together, then sons — the way the result is always quoted */
    phenoOrder: ['girl-clear', 'girl-carrier', 'girl-affected', 'boy-clear', 'boy-affected'],
    alleleName: { 'X^B': 'normal vision', 'X^b': 'colour-blind', Y: 'no copy of the gene' },
    pheno: {
      'X^B/X^B': P('girl-clear', 'Unaffected daughter', INK.blue, 'unaffected daughter', 'Unaffected'),
      'X^B/X^b': P('girl-carrier', 'Carrier daughter', INK.teal, 'carrier daughter', 'Carrier'),
      'X^b/X^b': P('girl-affected', 'Colour-blind daughter', INK.rose, 'colour-blind daughter', 'Colour-blind'),
      'X^B/Y': P('boy-clear', 'Unaffected son', INK.olive, 'unaffected son', 'Unaffected'),
      'X^b/Y': P('boy-affected', 'Colour-blind son', INK.brick, 'colour-blind son', 'Colour-blind'),
    },
  },
  haemophilia: {
    id: 'haemophilia', trait: 'Haemophilia', organism: 'Human',
    mode: 'x-linked', sexLinked: true,
    alleles: ['X^H', 'X^h', 'Y'],
    phenoOrder: ['girl-clear', 'girl-carrier', 'girl-affected', 'boy-clear', 'boy-affected'],
    alleleName: { 'X^H': 'clots normally', 'X^h': 'haemophilia', Y: 'no copy of the gene' },
    pheno: {
      'X^H/X^H': P('girl-clear', 'Unaffected daughter', INK.blue, 'unaffected daughter', 'Unaffected'),
      'X^H/X^h': P('girl-carrier', 'Carrier daughter', INK.teal, 'carrier daughter', 'Carrier'),
      'X^h/X^h': P('girl-affected', 'Haemophiliac daughter', INK.rose, 'haemophiliac daughter', 'Haemophiliac'),
      'X^H/Y': P('boy-clear', 'Unaffected son', INK.olive, 'unaffected son', 'Unaffected'),
      'X^h/Y': P('boy-affected', 'Haemophiliac son', INK.brick, 'haemophiliac son', 'Haemophiliac'),
    },
  },
};

/** A cross the lab knows how to set up: one or two genes at a time. */
export const STUDIES = {
  'pea-shape': {
    id: 'pea-shape', group: 'Classic crosses', name: 'Pea: seed shape',
    sub: 'one gene, ordinary dominance', genes: ['peaShape'],
    open: ['R/r', 'R/r'],
  },
  'pea-colour': {
    id: 'pea-colour', group: 'Classic crosses', name: 'Pea: seed colour',
    sub: 'one gene, ordinary dominance', genes: ['peaColour'],
    open: ['Y/y', 'Y/y'],
  },
  'pea-both': {
    id: 'pea-both', group: 'Classic crosses', name: 'Pea: shape and colour',
    sub: "two genes — Mendel's own cross", genes: ['peaShape', 'peaColour'],
    open: ['R/r+Y/y', 'R/r+Y/y'],
  },
  snapdragon: {
    id: 'snapdragon', group: 'Classic crosses', name: 'Snapdragon: flower colour',
    sub: 'incomplete dominance', genes: ['snapdragon'],
    open: ['R/W', 'R/W'],
  },
  cattle: {
    id: 'cattle', group: 'Classic crosses', name: 'Cattle: coat colour',
    sub: 'codominance', genes: ['cattle'],
    open: ['R/W', 'R/W'],
  },
  cystic: {
    id: 'cystic', group: 'Human inheritance', name: 'Human: cystic fibrosis',
    sub: 'recessive — two carriers', genes: ['cystic'],
    open: ['F/f', 'F/f'],
  },
  huntington: {
    id: 'huntington', group: 'Human inheritance', name: "Human: Huntington's disease",
    sub: 'dominant — one copy is enough', genes: ['huntington'],
    open: ['H/h', 'h/h'],
  },
  blood: {
    id: 'blood', group: 'Human inheritance', name: 'Human: ABO blood group',
    sub: 'three alleles, two of them codominant', genes: ['blood'],
    open: ['I^A/i', 'I^B/i'],
  },
  colourBlind: {
    id: 'colourBlind', group: 'Sex-linked conditions', name: 'Human: colour blindness',
    sub: 'X-linked recessive', genes: ['colourBlind'],
    open: ['X^B/X^b', 'X^B/Y'],
  },
  haemophilia: {
    id: 'haemophilia', group: 'Sex-linked conditions', name: 'Human: haemophilia',
    sub: 'X-linked recessive', genes: ['haemophilia'],
    open: ['X^H/X^h', 'X^H/Y'],
  },
};

export const genesOf = (studyId) =>
  (STUDIES[studyId] || STUDIES['pea-shape']).genes.map((g) => GENES[g]);

/** A study is sex-linked if any of its genes sits on the X. */
export const isSexLinked = (studyId) => genesOf(studyId).some((g) => g.sexLinked);

/* four hues for a two-gene cross, where the traits have no colour of their own */
const PAIR_PALETTE = [INK.blue, INK.olive, INK.amber, INK.rose];

/** Will a caption of this many characters sit inside a cell of this size?
    A rough advance width is enough — the question is only ever "obviously yes"
    or "obviously no", and getting it wrong the safe way just hides a label the
    key already carries. */
export const CAPTION_ADVANCE = 0.52;
export const captionFits = (text, cellSize, fontUnits) =>
  text.length * fontUnits * CAPTION_ADVANCE <= cellSize - 6;

/* ============================================================
   GENOTYPES
   ============================================================ */

/** Normal form: the allele that comes first in the gene's own order is written
    first, so Rr and rR are the same genotype and always print as 'Rr'. */
export function normalisePair(gene, pair) {
  const [a, b] = pair;
  return gene.alleles.indexOf(a) <= gene.alleles.indexOf(b) ? [a, b] : [b, a];
}
export const normalise = (genes, genotype) =>
  genes.map((g, i) => normalisePair(g, genotype[i]));

/** How one gene's pair is keyed: 'R/r', 'X^B/Y', 'I^A/i'. */
export const pairKey = (gene, pair) => normalisePair(gene, pair).join('/');
/** How a whole genotype is keyed: 'R/r+Y/y'. Unambiguous whatever the symbols. */
export const genotypeKey = (genes, genotype) =>
  genes.map((g, i) => pairKey(g, genotype[i])).join('+');

/** The same genotype as flat text, for aria labels and plain contexts. */
export const pairText = (gene, pair) =>
  normalisePair(gene, pair).map(alleleText).join('');
export const genotypeText = (genes, genotype) =>
  genes.map((g, i) => pairText(g, genotype[i])).join('');

/** And broken into pieces, so a superscript can actually be set. */
export const genotypeParts = (genes, genotype) =>
  genes.flatMap((g, i) => normalisePair(g, genotype[i]).map(alleleParts));

/** 'R/r+Y/y' back into pairs. Returns null if it does not fit the genes on the
    bench, so nothing malformed can reach the tallies. */
export function parseGenotype(genes, key) {
  if (typeof key !== 'string' || !key) return null;
  const parts = key.split('+');
  if (parts.length !== genes.length) return null;
  const out = [];
  for (let i = 0; i < genes.length; i++) {
    const alleles = parts[i].split('/');
    if (alleles.length !== 2) return null;
    if (!alleles.every((a) => genes[i].alleles.includes(a))) return null;
    const pair = normalisePair(genes[i], alleles);
    if (!genes[i].pheno[pair.join('/')]) return null;   /* e.g. a YY 'genotype' */
    out.push(pair);
  }
  return out;
}

/** Every genotype this gene can actually be — combinations, not permutations,
    and only those the gene admits (there is no such person as YY). */
export function genotypesOf(gene) {
  const out = [];
  for (let i = 0; i < gene.alleles.length; i++) {
    for (let j = i; j < gene.alleles.length; j++) {
      const pair = [gene.alleles[i], gene.alleles[j]];
      if (gene.pheno[pair.join('/')]) out.push(pair);
    }
  }
  return out;
}

/** What a parent in this role may be. For a sex-linked gene the two parents are
    not interchangeable: the mother has two X chromosomes, the father one and a Y. */
export function parentGenotypes(gene, role) {
  const all = genotypesOf(gene);
  if (!gene.sexLinked) return all;
  const hasY = (pair) => pair.includes('Y');
  return all.filter((pair) => (role === 'p2' ? hasY(pair) : !hasY(pair)));
}

/** The cross a study opens on — the one that shows its point best. */
export function openingCross(studyId) {
  const study = STUDIES[studyId] || STUDIES['pea-shape'];
  const genes = study.genes.map((g) => GENES[g]);
  const read = (key, role) =>
    parseGenotype(genes, key) || parentGenotypes(genes[0], role).slice(0, 1).map((p) => p);
  return { p1: read(study.open[0], 'p1'), p2: read(study.open[1], 'p2') };
}

/** What each parent is called. Sex linkage makes the two roles different people. */
export const parentLabel = (studyId, role) =>
  (isSexLinked(studyId)
    ? (role === 'p1' ? 'Mother' : 'Father')
    : (role === 'p1' ? 'Parent 1' : 'Parent 2'));

/* ============================================================
   PHENOTYPE
   ============================================================ */

/* Every layer above guards against a pair that could not exist — a mother with
   a Y, two fathers crossed — so this should never be reached. It is here so that
   a bug upstream shows as one odd-looking cell rather than a blank page. */
const IMPOSSIBLE = { key: 'impossible', label: 'Cannot happen', short: 'impossible', colour: '#6b7887' };

/** What one gene shows. Under ordinary dominance the homozygous dominant and
    the heterozygote share a phenotype — which is exactly why a recessive trait
    can skip a generation and come back. */
export const phenotypeOf = (gene, pair) => gene.pheno[pairKey(gene, pair)] || IMPOSSIBLE;

/** What the whole organism shows: one entry per gene, plus a joint key. */
export function phenotype(genes, genotype) {
  const parts = genes.map((g, i) => phenotypeOf(g, genotype[i]));
  return {
    key: parts.map((p) => p.key).join('+'),
    label: parts.map((p) => p.label).join(', '),
    short: parts.map((p) => p.short).join(', '),
    adult: parts.map((p) => p.adult).join(', '),
    parts,
  };
}

/** Every phenotype this cross can show, in the order the classic ratios are
    quoted in — dominant-most first, which for a sex-linked gene means the
    daughters before the sons. */
export function phenotypeOrder(genes) {
  const out = [];
  const walk = (i, acc) => {
    if (i === genes.length) {
      const ph = phenotype(genes, acc);
      if (!out.some((p) => p.key === ph.key)) out.push(ph);
      return;
    }
    genotypesOf(genes[i]).forEach((pair) => walk(i + 1, acc.concat([pair])));
  };
  walk(0, []);
  /* a gene may say how its phenotypes should be quoted; otherwise they come out
     in the order the genotypes were walked, which is dominant-first already */
  const wanted = genes.length === 1 && genes[0].phenoOrder;
  if (wanted) out.sort((a, b) => wanted.indexOf(a.key) - wanted.indexOf(b.key));
  return out.map((ph, i) => ({
    ...ph,
    colour: genes.length === 1 ? ph.parts[0].colour : PAIR_PALETTE[i % PAIR_PALETTE.length],
  }));
}

/** The colour a cell is painted, looked up by joint phenotype key. */
export function phenotypeColours(genes) {
  const map = {};
  phenotypeOrder(genes).forEach((p) => { map[p.key] = p.colour; });
  return map;
}

/* ============================================================
   GAMETES AND THE SQUARE
   ============================================================ */

/** Each gamete gets one allele from each pair, and the genes assort
    independently — so a parent with g heterozygous genes makes 2^g kinds.
    Repeats are kept, because a homozygote really does make the same gamete
    twice as often, and that is what makes the square's cells equally likely.
    A gamete is an array of symbols, one per gene. */
export function gametes(genes, genotype) {
  let out = [[]];
  genotype.forEach((pair) => {
    const next = [];
    out.forEach((sofar) => pair.forEach((allele) => next.push(sofar.concat([allele]))));
    out = next;
  });
  return out;
}
export const gameteText = (gamete) => gamete.map(alleleText).join('');
export const gameteParts = (gamete) => gamete.map(alleleParts);
export const gameteKey = (gamete) => gamete.join('+');

/** Two gametes meeting: one allele from each, per gene. */
export const fuse = (genes, g1, g2) =>
  genes.map((g, i) => normalisePair(g, [g1[i], g2[i]]));

/** The Punnett square: one parent's gametes down the side, the other's across
    the top, and every cell equally likely. */
export function punnett(genes, p1, p2) {
  const rows = gametes(genes, p1);
  const cols = gametes(genes, p2);
  const cells = rows.map((r) => cols.map((c) => {
    const genotype = fuse(genes, r, c);
    return {
      genotype,
      key: genotypeKey(genes, genotype),
      text: genotypeText(genes, genotype),
      parts: genotypeParts(genes, genotype),
      pheno: phenotype(genes, genotype),
    };
  }));
  return { rows, cols, cells, total: rows.length * cols.length };
}

/* ============================================================
   RATIOS AND CHANCES
   ============================================================ */

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function tally(square, pick) {
  const counts = new Map();
  square.cells.forEach((row) => row.forEach((cell) => {
    const k = pick(cell);
    counts.set(k, (counts.get(k) || 0) + 1);
  }));
  return counts;
}

/** Counts reduced to their simplest whole-number ratio. */
export function simplify(values) {
  const positive = values.filter((v) => v > 0);
  if (!positive.length) return values.map(() => 0);
  const d = positive.reduce((a, b) => gcd(a, b));
  return values.map((v) => v / d);
}

export const ratioText = (values) => {
  const s = simplify(values);
  return s.length === 1 ? 'all alike' : s.join(' : ');
};

/** A chance, in the three forms a pupil is asked for: the simplified fraction,
    "n in m", and a percentage. */
export function chance(count, total) {
  if (!total || count <= 0) {
    return { num: 0, den: 1, pct: 0, inText: 'never', fraction: '0', percent: '0%' };
  }
  const d = gcd(count, total) || 1;
  const num = count / d, den = total / d;
  const pct = (count / total) * 100;
  return {
    num, den, pct,
    inText: den === 1 ? 'every one' : `${num} in ${den}`,
    fraction: den === 1 ? '1' : `${num}/${den}`,
    percent: `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%`,
  };
}

/** Genotypic ratio, in dominant-first order. */
export function genotypeRatio(genes, square) {
  const counts = tally(square, (c) => c.key);
  const order = [];
  const walk = (i, acc) => {
    if (i === genes.length) { order.push(acc); return; }
    genotypesOf(genes[i]).forEach((pair) => walk(i + 1, acc.concat([pair])));
  };
  walk(0, []);
  const rows = order
    .map((genotype) => ({
      key: genotypeKey(genes, genotype),
      label: genotypeText(genes, genotype),
      parts: genotypeParts(genes, genotype),
      phenoKey: phenotype(genes, genotype).key,
    }))
    .filter((r) => counts.has(r.key))
    .map((r) => ({ ...r, count: counts.get(r.key), chance: chance(counts.get(r.key), square.total) }));
  return { rows, total: square.total, text: ratioText(rows.map((r) => r.count)) };
}

/** Phenotypic ratio, in the order the classic ratios are quoted. */
export function phenotypeRatio(genes, square) {
  const counts = tally(square, (c) => c.pheno.key);
  const rows = phenotypeOrder(genes)
    .filter((p) => counts.has(p.key))
    .map((p) => ({
      key: p.key, label: p.label, short: p.short, colour: p.colour,
      count: counts.get(p.key), chance: chance(counts.get(p.key), square.total),
    }));
  return { rows, total: square.total, text: ratioText(rows.map((r) => r.count)) };
}

/* ============================================================
   BREEDING
   The square gives the chance; breeding gives what actually
   happened. The two are never quite the same, and the gap is
   the point.
   ============================================================ */

/** One offspring: a gamete drawn at random from each parent. Passing an rng in
    keeps this testable — the same seed always gives the same family. */
export function breedOne(genes, p1, p2, rng = Math.random) {
  const a = gametes(genes, p1), b = gametes(genes, p2);
  const g1 = a[Math.floor(rng() * a.length)];
  const g2 = b[Math.floor(rng() * b.length)];
  return genotypeKey(genes, fuse(genes, g1, g2));
}

/** Breed n offspring, tallied by genotype. */
export function breed(genes, p1, p2, n, rng = Math.random) {
  const counts = {};
  const order = [];
  for (let i = 0; i < n; i++) {
    const k = breedOne(genes, p1, p2, rng);
    counts[k] = (counts[k] || 0) + 1;
    order.push(k);
  }
  return { counts, order, n };
}

/** A small, fast, seedable generator — mulberry32. Tests need repeatable runs. */
export function seeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- how well the family matches the square ----------
   The standard test a biology class would run: add up (observed − expected)²
   ÷ expected across the classes. A small total means the difference is the
   sort of thing chance produces all the time. */
export function chiSquared(observed, expected) {
  let x = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] <= 0) continue;
    const d = observed[i] - expected[i];
    x += (d * d) / expected[i];
  }
  return x;
}

/* 5% critical values — the usual line a school lab draws. */
export const CHI_CRITICAL = [3.84, 5.99, 7.81, 9.49, 11.07, 12.59, 14.07];
export const chiCritical = (df) =>
  CHI_CRITICAL[Math.min(Math.max(df, 1), CHI_CRITICAL.length) - 1];

/** Observed genotype counts folded into phenotype counts. */
export function observedPhenotypes(genes, counts) {
  const byKey = {};
  Object.entries(counts).forEach(([key, n]) => {
    const genotype = parseGenotype(genes, key);
    if (!genotype) return;
    const k = phenotype(genes, genotype).key;
    byKey[k] = (byKey[k] || 0) + n;
  });
  return byKey;
}

/* ============================================================
   READY-MADE CROSSES
   Each one exists to settle a single question.
   ============================================================ */
export const PRESETS = {
  f1: {
    label: 'Pure-bred parents', ask: 'Where does the wrinkled allele go?',
    study: 'pea-shape', p1: 'R/R', p2: 'r/r',
  },
  f2: {
    label: "Mendel's F₂ cross", ask: 'The famous 3 : 1',
    study: 'pea-shape', p1: 'R/r', p2: 'R/r',
  },
  testCross: {
    label: 'Test cross', ask: 'Is this round pea pure-bred or not?',
    study: 'pea-shape', p1: 'R/r', p2: 'r/r',
  },
  dihybrid: {
    label: 'Two genes at once', ask: 'Where does 9 : 3 : 3 : 1 come from?',
    study: 'pea-both', p1: 'R/r+Y/y', p2: 'R/r+Y/y',
  },
  snapdragon: {
    label: 'Red × white snapdragons', ask: 'What colour are the offspring?',
    study: 'snapdragon', p1: 'R/R', p2: 'W/W',
  },
  roan: {
    label: 'Roan × roan cattle', ask: 'Do two roans breed true?',
    study: 'cattle', p1: 'R/W', p2: 'R/W',
  },
  carriers: {
    label: 'Two healthy carriers', ask: 'Cystic fibrosis out of nowhere?',
    study: 'cystic', p1: 'F/f', p2: 'F/f',
  },
  huntington: {
    label: 'One affected parent', ask: "Huntington's — what are the odds?",
    study: 'huntington', p1: 'H/h', p2: 'h/h',
  },
  bloodAB: {
    label: 'Group AB × group O', ask: 'Can two parents have no child like either?',
    study: 'blood', p1: 'I^A/I^B', p2: 'i/i',
  },
  carrierMother: {
    label: 'Carrier mother, normal father', ask: 'Why is it nearly always the sons?',
    study: 'colourBlind', p1: 'X^B/X^b', p2: 'X^B/Y',
  },
  affectedFather: {
    label: 'Haemophiliac father', ask: 'Can he pass it to his sons?',
    study: 'haemophilia', p1: 'X^H/X^H', p2: 'X^h/Y',
  },
};
