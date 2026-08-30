/* ============================================================
   Inheritance — headless checks.
   The genetics is pure, so all of it can be checked without a
   browser: symbols and keys, gametes, squares, ratios, chances,
   the sampler, chi-squared, the reducer, and everything the
   browser is allowed to remember.

   Sex linkage gets its own section, because that is where the
   model stops being symmetrical and starts being able to produce
   a person who could not exist.
   ============================================================ */
import * as E from '../src/labs/inheritance/engine.js';
import {
  reducer, initialState, createInitialState, writeState, readState,
  defaultParents, allowedFor, SHOWN_MAX,
} from '../src/labs/inheritance/labState.js';
import {
  newTask, outcomeVector, sameOutcome, describeOutcome, allGenotypes, outcomeCatalogue,
} from '../src/labs/inheritance/challenges.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, extra); }
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const STORE = 'jahnavis-lab/inheritance/v2';
const store = new Map();
const realStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.localStorage = realStorage;

const G = (study) => E.genesOf(study);
const gt = (study, key) => E.parseGenotype(G(study), key);
const cross = (study, a, b) => E.punnett(G(study), gt(study, a), gt(study, b));
const pheno = (study, a, b) => E.phenotypeRatio(G(study), cross(study, a, b));
const geno = (study, a, b) => E.genotypeRatio(G(study), cross(study, a, b));
const SEX_LINKED = Object.keys(E.STUDIES).filter((k) => E.isSexLinked(k));
const ONE_GENE = Object.keys(E.STUDIES).filter((k) => E.STUDIES[k].genes.length === 1);

/* ============================================================ */
console.log('\n— allele symbols —');
ok("'X^b' splits into X with a raised b", eq(E.alleleParts('X^b'), { base: 'X', sup: 'b' }));
ok("'R' has no superscript", eq(E.alleleParts('R'), { base: 'R', sup: '' }));
ok("'I^A' splits into I with a raised A", eq(E.alleleParts('I^A'), { base: 'I', sup: 'A' }));
ok('flat text drops the caret', E.alleleText('X^b') === 'Xb' && E.alleleText('r') === 'r');

console.log('\n— reading and writing genotypes —');
ok("'r/R' is written back as 'R/r'", eq(gt('pea-shape', 'r/R'), [['R', 'r']]));
ok("'W/R' is written back as 'R/W'", eq(gt('snapdragon', 'W/R'), [['R', 'W']]));
ok('a two-gene genotype splits into two pairs',
   eq(gt('pea-both', 'R/r+Y/y'), [['R', 'r'], ['Y', 'y']]));
ok('an out-of-order two-gene genotype is tidied',
   eq(gt('pea-both', 'r/R+y/Y'), [['R', 'r'], ['Y', 'y']]));
ok('the Y is always written second', eq(gt('colourBlind', 'Y/X^b'), [['X^b', 'Y']]));
ok('a blood genotype keeps its order', eq(gt('blood', 'i/I^A'), [['I^A', 'i']]));
ok('the wrong number of genes is refused', gt('pea-both', 'R/r') === null);
ok('an allele from another gene is refused', gt('pea-shape', 'R/Y') === null);
ok('nonsense is refused', gt('pea-shape', 'Z/Z') === null);
ok('a genotype with no separator is refused', gt('pea-shape', 'Rr') === null);
ok('an empty string is refused', gt('pea-shape', '') === null);
ok('a non-string is refused', E.parseGenotype(G('pea-shape'), 42) === null);
ok('a null is refused', E.parseGenotype(G('pea-shape'), null) === null);
ok('YY is refused — there is no such person', gt('colourBlind', 'Y/Y') === null);
ok('keys round-trip', E.genotypeKey(G('pea-both'), gt('pea-both', 'r/R+y/Y')) === 'R/r+Y/y');
ok('flat text round-trips', E.genotypeText(G('pea-both'), gt('pea-both', 'R/r+Y/y')) === 'RrYy');
ok('a sex-linked genotype reads as XBXb',
   E.genotypeText(G('colourBlind'), gt('colourBlind', 'X^B/X^b')) === 'XBXb');
ok('and breaks into pieces a superscript can be set on',
   eq(E.genotypeParts(G('colourBlind'), gt('colourBlind', 'X^b/Y')),
      [{ base: 'X', sup: 'b' }, { base: 'Y', sup: '' }]));

console.log('\n— which genotypes exist, and who can have them —');
ok('a two-allele gene has three genotypes', E.genotypesOf(E.GENES.peaShape).length === 3);
ok('three alleles give six genotypes', E.genotypesOf(E.GENES.blood).length === 6);
ok('an X-linked gene has five, not six — YY is left out',
   E.genotypesOf(E.GENES.colourBlind).length === 5);
ok('an ordinary gene offers both parents the same choices',
   E.parentGenotypes(E.GENES.peaShape, 'p1').length === 3 &&
   E.parentGenotypes(E.GENES.peaShape, 'p2').length === 3);
ok('a mother is offered three genotypes, none with a Y',
   E.parentGenotypes(E.GENES.colourBlind, 'p1').length === 3 &&
   E.parentGenotypes(E.GENES.colourBlind, 'p1').every((p) => !p.includes('Y')));
ok('a father is offered two, each with exactly one Y',
   E.parentGenotypes(E.GENES.colourBlind, 'p2').length === 2 &&
   E.parentGenotypes(E.GENES.colourBlind, 'p2').every((p) => p.filter((a) => a === 'Y').length === 1));
ok('the parents are called Mother and Father when the gene is sex-linked',
   E.parentLabel('colourBlind', 'p1') === 'Mother' && E.parentLabel('colourBlind', 'p2') === 'Father');
ok('and Parent 1 and Parent 2 when it is not',
   E.parentLabel('pea-shape', 'p1') === 'Parent 1' && E.parentLabel('pea-shape', 'p2') === 'Parent 2');

console.log('\n— what a genotype shows —');
const shape = E.GENES.peaShape;
ok('under dominance RR and Rr look the same',
   E.phenotypeOf(shape, ['R', 'R']).key === E.phenotypeOf(shape, ['R', 'r']).key);
ok('and rr looks different',
   E.phenotypeOf(shape, ['r', 'r']).key !== E.phenotypeOf(shape, ['R', 'r']).key);
ok('with incomplete dominance all three look different',
   new Set([['R', 'R'], ['R', 'W'], ['W', 'W']]
     .map((p) => E.phenotypeOf(E.GENES.snapdragon, p).key)).size === 3);
ok('the snapdragon heterozygote is pink',
   E.phenotypeOf(E.GENES.snapdragon, ['R', 'W']).label === 'Pink');
ok('the cattle heterozygote is roan',
   E.phenotypeOf(E.GENES.cattle, ['R', 'W']).label === 'Roan');
ok('IᴬIᴮ is group AB', E.phenotypeOf(E.GENES.blood, ['I^A', 'I^B']).label === 'Group AB');
ok('IᴬIᴬ and IᴬI are both group A',
   E.phenotypeOf(E.GENES.blood, ['I^A', 'I^A']).key === E.phenotypeOf(E.GENES.blood, ['I^A', 'i']).key);
ok('ii is group O', E.phenotypeOf(E.GENES.blood, ['i', 'i']).label === 'Group O');
ok('a carrier daughter is unaffected but not clear',
   E.phenotypeOf(E.GENES.colourBlind, ['X^B', 'X^b']).key === 'girl-carrier');
ok('one faulty allele is enough to affect a son',
   E.phenotypeOf(E.GENES.colourBlind, ['X^b', 'Y']).key === 'boy-affected');
ok('but not enough to affect a daughter',
   E.phenotypeOf(E.GENES.colourBlind, ['X^B', 'X^b']).key !== 'girl-affected');
ok('sex-linked phenotypes are quoted daughters first, then sons',
   eq(E.phenotypeOrder(G('colourBlind')).map((p) => p.key),
      ['girl-clear', 'girl-carrier', 'girl-affected', 'boy-clear', 'boy-affected']));
let shortsOk = true;
Object.keys(E.STUDIES).forEach((id) => {
  E.phenotypeOrder(G(id)).forEach((p) => {
    if (!p.short || !p.label || !p.adult) shortsOk = false;
  });
});
ok('every phenotype has a full name, a short one for ratios, and an adult one', shortsOk);
/* the label describes a child; a parent with the same genotype is not a daughter */
ok('a parent is never described as somebody\'s daughter',
   E.phenotypeOf(E.GENES.colourBlind, ['X^B', 'X^b']).adult === 'Carrier' &&
   E.phenotypeOf(E.GENES.colourBlind, ['X^B', 'Y']).adult === 'Unaffected' &&
   E.phenotypeOf(E.GENES.haemophilia, ['X^h', 'Y']).adult === 'Haemophiliac');
ok('while the child form still names the child',
   E.phenotypeOf(E.GENES.colourBlind, ['X^B', 'X^b']).label === 'Carrier daughter');
ok('and an ordinary trait just keeps its own name',
   E.phenotypeOf(E.GENES.peaShape, ['R', 'r']).adult === 'Round' &&
   E.phenotypeOf(E.GENES.cystic, ['F', 'f']).adult === 'Healthy carrier' &&
   E.phenotypeOf(E.GENES.blood, ['I^A', 'i']).adult === 'Group A');

console.log('\n— gametes —');
ok('Rr makes R and r',
   eq(E.gametes(G('pea-shape'), gt('pea-shape', 'R/r')), [['R'], ['r']]));
ok('RR makes R twice — it really is twice as likely',
   eq(E.gametes(G('pea-shape'), gt('pea-shape', 'R/R')), [['R'], ['R']]));
ok('RrYy makes four kinds, assorting independently',
   eq(E.gametes(G('pea-both'), gt('pea-both', 'R/r+Y/y')).map(E.gameteText),
      ['RY', 'Ry', 'rY', 'ry']));
ok('RRYy makes two kinds, each twice',
   eq(E.gametes(G('pea-both'), gt('pea-both', 'R/R+Y/y')).map(E.gameteText),
      ['RY', 'Ry', 'RY', 'Ry']));
ok('a carrier mother makes an Xᴮ egg and an Xᵇ egg',
   eq(E.gametes(G('colourBlind'), gt('colourBlind', 'X^B/X^b')).map(E.gameteText), ['XB', 'Xb']));
ok('a father makes an X sperm and a Y sperm — which decides the sex',
   eq(E.gametes(G('colourBlind'), gt('colourBlind', 'X^b/Y')).map(E.gameteText), ['Xb', 'Y']));
ok('a parent always makes 2^(number of genes) gametes',
   E.gametes(G('pea-shape'), gt('pea-shape', 'R/r')).length === 2 &&
   E.gametes(G('pea-both'), gt('pea-both', 'R/r+Y/y')).length === 4 &&
   E.gametes(G('blood'), gt('blood', 'I^A/i')).length === 2);

console.log('\n— the classic squares —');
const CASES = [
  ['pea-shape', 'R/r', 'R/r', '1 : 2 : 1', '3 : 1', ['Round', 'Wrinkled']],
  ['pea-shape', 'R/R', 'r/r', 'all alike', 'all alike', ['Round']],
  ['pea-shape', 'R/r', 'r/r', '1 : 1', '1 : 1', ['Round', 'Wrinkled']],
  ['pea-shape', 'R/R', 'R/r', '1 : 1', 'all alike', ['Round']],
  ['pea-shape', 'r/r', 'r/r', 'all alike', 'all alike', ['Wrinkled']],
  ['snapdragon', 'R/R', 'W/W', 'all alike', 'all alike', ['Pink']],
  ['snapdragon', 'R/W', 'R/W', '1 : 2 : 1', '1 : 2 : 1', ['Red', 'Pink', 'White']],
  ['cattle', 'R/W', 'R/W', '1 : 2 : 1', '1 : 2 : 1', ['Red', 'Roan', 'White']],
  ['pea-both', 'R/r+Y/y', 'R/r+Y/y', '1 : 2 : 1 : 2 : 4 : 2 : 1 : 2 : 1', '9 : 3 : 3 : 1',
    ['Round, Yellow', 'Round, Green', 'Wrinkled, Yellow', 'Wrinkled, Green']],
  ['pea-both', 'R/r+Y/y', 'r/r+y/y', '1 : 1 : 1 : 1', '1 : 1 : 1 : 1',
    ['Round, Yellow', 'Round, Green', 'Wrinkled, Yellow', 'Wrinkled, Green']],
  /* human, autosomal */
  ['cystic', 'F/f', 'F/f', '1 : 2 : 1', '1 : 2 : 1',
    ['Unaffected', 'Healthy carrier', 'Has cystic fibrosis']],
  ['cystic', 'F/f', 'F/F', '1 : 1', '1 : 1', ['Unaffected', 'Healthy carrier']],
  ['huntington', 'H/h', 'h/h', '1 : 1', '1 : 1', ["Develops Huntington's", 'Unaffected']],
  ['huntington', 'H/h', 'H/h', '1 : 2 : 1', '3 : 1', ["Develops Huntington's", 'Unaffected']],
  /* blood: three alleles */
  ['blood', 'I^A/I^B', 'i/i', '1 : 1', '1 : 1', ['Group A', 'Group B']],
  ['blood', 'I^A/i', 'I^B/i', '1 : 1 : 1 : 1', '1 : 1 : 1 : 1',
    ['Group A', 'Group AB', 'Group B', 'Group O']],
  ['blood', 'i/i', 'i/i', 'all alike', 'all alike', ['Group O']],
  ['blood', 'I^A/I^A', 'i/i', 'all alike', 'all alike', ['Group A']],
  /* sex-linked */
  ['colourBlind', 'X^B/X^b', 'X^B/Y', '1 : 1 : 1 : 1', '1 : 1 : 1 : 1',
    ['Unaffected daughter', 'Carrier daughter', 'Unaffected son', 'Colour-blind son']],
  ['colourBlind', 'X^B/X^b', 'X^b/Y', '1 : 1 : 1 : 1', '1 : 1 : 1 : 1',
    ['Carrier daughter', 'Colour-blind daughter', 'Unaffected son', 'Colour-blind son']],
  ['colourBlind', 'X^B/X^B', 'X^b/Y', '1 : 1', '1 : 1',
    ['Carrier daughter', 'Unaffected son']],
  ['colourBlind', 'X^b/X^b', 'X^B/Y', '1 : 1', '1 : 1',
    ['Carrier daughter', 'Colour-blind son']],
  ['haemophilia', 'X^H/X^H', 'X^h/Y', '1 : 1', '1 : 1',
    ['Carrier daughter', 'Unaffected son']],
  ['haemophilia', 'X^H/X^h', 'X^h/Y', '1 : 1 : 1 : 1', '1 : 1 : 1 : 1',
    ['Carrier daughter', 'Haemophiliac daughter', 'Unaffected son', 'Haemophiliac son']],
];
CASES.forEach(([study, a, b, gr, pr, labels]) => {
  const g = geno(study, a, b), p = pheno(study, a, b);
  ok(`${study}: ${a} × ${b} → genotypic ${gr}`, g.text === gr, g.text);
  ok(`${study}: ${a} × ${b} → phenotypic ${pr}`, p.text === pr, p.text);
  ok(`${study}: ${a} × ${b} → ${labels.join(' / ')}`,
     eq(p.rows.map((r) => r.label), labels), p.rows.map((r) => r.label).join(' / '));
});
ok('Rr × Rr really is RR, Rr, Rr, rr',
   eq(cross('pea-shape', 'R/r', 'R/r').cells.flat().map((c) => c.text), ['RR', 'Rr', 'Rr', 'rr']));
ok('9 : 3 : 3 : 1 is (3 : 1) twice over',
   eq(pheno('pea-both', 'R/r+Y/y', 'R/r+Y/y').rows.map((r) => r.count), [9, 3, 3, 1]));

console.log('\n— what sex linkage must never allow —');
let ylaws = { yy: 0, sonsHalf: 0, sonXFromMother: 0, crosses: 0 };
SEX_LINKED.forEach((study) => {
  const genes = G(study);
  const gene = genes[0];
  E.parentGenotypes(gene, 'p1').forEach((mum) => {
    E.parentGenotypes(gene, 'p2').forEach((dad) => {
      ylaws.crosses++;
      const sq = E.punnett(genes, [mum], [dad]);
      const cells = sq.cells.flat();
      if (cells.some((c) => c.genotype[0].filter((a) => a === 'Y').length > 1)) ylaws.yy++;
      const sons = cells.filter((c) => c.genotype[0].includes('Y'));
      if (sons.length !== cells.length / 2) ylaws.sonsHalf++;
      /* a son's single X can only have come from his mother */
      if (!sons.every((c) => mum.includes(c.genotype[0].find((a) => a !== 'Y')))) {
        ylaws.sonXFromMother++;
      }
    });
  });
});
ok(`no cross in ${ylaws.crosses} produces a YY 'person'`, ylaws.yy === 0);
ok('exactly half of every sex-linked square is sons', ylaws.sonsHalf === 0);
ok("every son's X comes from his mother, never his father", ylaws.sonXFromMother === 0);

/* the two results the whole topic turns on */
const affectedSons = (study, mum, dad) =>
  pheno(study, mum, dad).rows.filter((r) => r.key === 'boy-affected').reduce((t, r) => t + r.count, 0);
const affectedDaughters = (study, mum, dad) =>
  pheno(study, mum, dad).rows.filter((r) => r.key === 'girl-affected').reduce((t, r) => t + r.count, 0);
ok('an affected father cannot give it to a son — the mother has to carry it',
   affectedSons('haemophilia', 'X^H/X^H', 'X^h/Y') === 0 &&
   affectedSons('haemophilia', 'X^H/X^h', 'X^h/Y') > 0);
ok('but every one of his daughters carries it',
   pheno('haemophilia', 'X^H/X^H', 'X^h/Y').rows
     .filter((r) => r.key.startsWith('girl')).every((r) => r.key === 'girl-carrier'));
ok('a carrier mother and an unaffected father have no affected daughters',
   affectedDaughters('colourBlind', 'X^B/X^b', 'X^B/Y') === 0);
ok('an affected daughter needs a faulty allele from BOTH parents',
   affectedDaughters('colourBlind', 'X^B/X^b', 'X^b/Y') > 0 &&
   affectedDaughters('colourBlind', 'X^b/X^b', 'X^B/Y') === 0);
ok('a pair that could not exist reports itself rather than crashing the page',
   E.phenotypeOf(E.GENES.colourBlind, ['Y', 'Y']).key === 'impossible');
ok('and no legal cross ever reaches that state',
   SEX_LINKED.every((study) => allGenotypes(study, 'p1').every((mum) =>
     allGenotypes(study, 'p2').every((dad) =>
       E.punnett(G(study), mum, dad).cells.flat()
         .every((c) => c.pheno.key !== 'impossible')))));
ok('a colour-blind mother gives it to every son whatever the father is',
   E.parentGenotypes(E.GENES.colourBlind, 'p2').every((dad) => {
     const r = E.phenotypeRatio(G('colourBlind'),
       E.punnett(G('colourBlind'), [['X^b', 'X^b']], [dad]));
     const sons = r.rows.filter((x) => x.key.startsWith('boy'));
     return sons.length === 1 && sons[0].key === 'boy-affected';
   }));

console.log('\n— what three alleles allow —');
ok('two group O parents can only have group O children',
   pheno('blood', 'i/i', 'i/i').rows.every((r) => r.key === 'O'));
ok('an AB parent can never have a group O child',
   E.parentGenotypes(E.GENES.blood, 'p2').every((other) =>
     !E.phenotypeRatio(G('blood'), E.punnett(G('blood'), [['I^A', 'I^B']], [other]))
       .rows.some((r) => r.key === 'O')));
ok('AB × O gives children like neither parent',
   pheno('blood', 'I^A/I^B', 'i/i').rows.map((r) => r.key).join() === 'A,B');
ok('two group A parents can have a group O child, if both carry i',
   pheno('blood', 'I^A/i', 'I^A/i').rows.some((r) => r.key === 'O'));

console.log('\n— every cross the lab can set up —');
let checked = 0, broken = 0;
Object.keys(E.STUDIES).forEach((study) => {
  const genes = G(study);
  const order = E.phenotypeOrder(genes);
  const p1s = allGenotypes(study, 'p1'), p2s = allGenotypes(study, 'p2');
  const expectTotal = Math.pow(Math.pow(2, genes.length), 2);
  p1s.forEach((p1) => p2s.forEach((p2) => {
    checked++;
    const sq = E.punnett(genes, p1, p2);
    const g = E.genotypeRatio(genes, sq), p = E.phenotypeRatio(genes, sq);
    const sumG = g.rows.reduce((t, r) => t + r.count, 0);
    const sumP = p.rows.reduce((t, r) => t + r.count, 0);
    const chances = p.rows.reduce((t, r) => t + r.count / sq.total, 0);
    const cellsOk = sq.cells.flat().every((c) =>
      E.parseGenotype(genes, c.key) && order.some((o) => o.key === c.pheno.key));
    const pctOk = p.rows.every((r) => near(r.chance.pct, (r.count / sq.total) * 100, 1e-9));
    if (sq.total !== expectTotal || sumG !== sq.total || sumP !== sq.total ||
        !near(chances, 1, 1e-12) || !cellsOk || !pctOk) broken++;
  }));
});
ok(`all ${checked} possible crosses are internally consistent`, broken === 0, `${broken} broken`);
ok('that is every legal parent pairing in the lab', checked === 6 * 9 + 81 + 36 + 2 * 6, checked);

/* a square must mean the same cross whichever parent is written first — but only
   where the two parents are interchangeable at all */
let mirrorBad = 0;
Object.keys(E.STUDIES).filter((k) => !E.isSexLinked(k)).forEach((study) => {
  const genes = G(study);
  const all = allGenotypes(study, 'p1');
  all.forEach((a) => all.forEach((b) => {
    if (E.phenotypeRatio(genes, E.punnett(genes, a, b)).text !==
        E.phenotypeRatio(genes, E.punnett(genes, b, a)).text) mirrorBad++;
  }));
});
ok('and reads the same either way round when the parents are interchangeable', mirrorBad === 0);

console.log('\n— ratios and chances —');
ok('9:3:3:1 is already simplest', eq(E.simplify([9, 3, 3, 1]), [9, 3, 3, 1]));
ok('2:2 becomes 1:1', eq(E.simplify([2, 2]), [1, 1]));
ok('6:4:2 becomes 3:2:1', eq(E.simplify([6, 4, 2]), [3, 2, 1]));
ok('zeros are carried along', eq(E.simplify([4, 0]), [1, 0]));
ok('all zeros stay zero', eq(E.simplify([0, 0]), [0, 0]));
ok('a single class reads "all alike"', E.ratioText([4]) === 'all alike');
const q = E.chance(1, 4);
ok('1 of 4 squares is "1 in 4"', q.inText === '1 in 4' && q.fraction === '1/4' && q.percent === '25%');
const q3 = E.chance(3, 4);
ok('3 of 4 is "3 in 4" and 75%', q3.inText === '3 in 4' && q3.percent === '75%');
const q9 = E.chance(9, 16);
ok('9 of 16 does not get reduced away', q9.inText === '9 in 16' && q9.percent === '56.3%');
const q6 = E.chance(6, 16);
ok('6 of 16 reduces to 3 in 8', q6.inText === '3 in 8' && q6.percent === '37.5%');
ok('every square reads "every one"', E.chance(4, 4).inText === 'every one');
ok('no squares reads "never"', E.chance(0, 4).inText === 'never' && E.chance(0, 4).pct === 0);
ok('a chance out of nothing does not divide by zero', isFinite(E.chance(1, 0).pct));
ok('genotype rows carry their chance too',
   geno('pea-shape', 'R/r', 'R/r').rows.map((r) => r.chance.inText).join() === '1 in 4,1 in 2,1 in 4');
ok('and so do phenotype rows',
   pheno('cystic', 'F/f', 'F/f').rows.map((r) => r.chance.percent).join() === '25%,50%,25%');

console.log('\n— breeding is random, but the right kind of random —');
const shapeGenes = G('pea-shape');
const het = gt('pea-shape', 'R/r');
ok('the same seed always breeds the same family',
   eq(E.breed(shapeGenes, het, het, 50, E.seeded(7)).order,
      E.breed(shapeGenes, het, het, 50, E.seeded(7)).order));
ok('a different seed breeds a different family',
   !eq(E.breed(shapeGenes, het, het, 50, E.seeded(7)).order,
       E.breed(shapeGenes, het, het, 50, E.seeded(8)).order));
const big = E.breed(shapeGenes, het, het, 200000, E.seeded(1));
ok('the counts add up to what was bred',
   Object.values(big.counts).reduce((a, b) => a + b, 0) === 200000);
ok('no impossible offspring turn up',
   Object.keys(big.counts).every((k) => ['R/R', 'R/r', 'r/r'].includes(k)),
   Object.keys(big.counts).join(','));
ok('three quarters come out round over 200 000 offspring',
   near((big.counts['R/R'] + big.counts['R/r']) / 200000, 0.75, 0.004));

/* every study, not just the peas: does the sampler match its own square? */
let samplerBad = [];
Object.keys(E.STUDIES).forEach((study) => {
  const genes = G(study);
  const { p1, p2 } = defaultParents(study);
  const sq = E.punnett(genes, p1, p2);
  const want = E.phenotypeRatio(genes, sq);
  const litter = E.breed(genes, p1, p2, 120000, E.seeded(11));
  const seen = E.observedPhenotypes(genes, litter.counts);
  const impossible = Object.keys(litter.counts)
    .filter((k) => !sq.cells.flat().some((c) => c.key === k));
  if (impossible.length) samplerBad.push(`${study}: bred ${impossible.join()}`);
  want.rows.forEach((r) => {
    const got = (seen[r.key] || 0) / 120000;
    if (!near(got, r.count / sq.total, 0.006)) {
      samplerBad.push(`${study}/${r.key} ${got.toFixed(4)} vs ${(r.count / sq.total).toFixed(4)}`);
    }
  });
});
ok('every study breeds true to its own square, and nothing impossible',
   samplerBad.length === 0, samplerBad.join(' | '));

/* the real test of the sampler: across many seeded families chi-squared should
   fall below the 5% line about 95% of the time */
let below = 0;
const RUNS = 300;
for (let seed = 1; seed <= RUNS; seed++) {
  const litter = E.breed(shapeGenes, het, het, 400, E.seeded(seed));
  const seen = E.observedPhenotypes(shapeGenes, litter.counts);
  const want = E.phenotypeRatio(shapeGenes, E.punnett(shapeGenes, het, het));
  const obs = want.rows.map((r) => seen[r.key] || 0);
  const exp = want.rows.map((r) => (r.count / 4) * 400);
  if (E.chiSquared(obs, exp) <= E.chiCritical(1)) below += 1;
}
ok(`${RUNS} seeded families clear the 5% line about 95% of the time (${(below / RUNS * 100).toFixed(1)}%)`,
   below / RUNS >= 0.90 && below / RUNS <= 0.99, `${below}/${RUNS}`);

console.log('\n— chi-squared —');
ok("Mendel's own 556 seeds give χ² = 0.4700",
   near(E.chiSquared([315, 101, 108, 32], [312.75, 104.25, 104.25, 34.75]), 0.4700, 5e-5));
ok('a perfect match gives zero', E.chiSquared([9, 3, 3, 1], [9, 3, 3, 1]) === 0);
ok('a class that cannot happen is skipped, not divided by', E.chiSquared([4, 0], [4, 0]) === 0);
ok('the 5% line for 1 degree of freedom is 3.84', E.chiCritical(1) === 3.84);
ok('and for 3 degrees of freedom it is 7.81', E.chiCritical(3) === 7.81);
ok('a silly degree of freedom is clamped rather than undefined',
   isFinite(E.chiCritical(0)) && isFinite(E.chiCritical(99)));

console.log('\n— folding genotypes into what you would see —');
const folded = E.observedPhenotypes(shapeGenes, { 'R/R': 10, 'R/r': 20, 'r/r': 7 });
ok('RR and Rr are counted together under dominance', folded.round === 30, JSON.stringify(folded));
ok('and the recessives are counted apart', folded.wrinkled === 7);
ok('a genotype that is not of this cross is ignored, not counted',
   eq(E.observedPhenotypes(shapeGenes, { 'R/R': 4, 'Z/Z': 99, R: 3 }), { round: 4 }));
const foldedX = E.observedPhenotypes(G('colourBlind'),
  { 'X^B/X^b': 5, 'X^b/Y': 4, 'Y/Y': 99 });
ok('and a YY that somehow reached storage is thrown away',
   eq(foldedX, { 'girl-carrier': 5, 'boy-affected': 4 }), JSON.stringify(foldedX));

console.log('\n— the reducer —');
let s = createInitialState();
ok('the lab opens on Rr × Rr', E.genotypeText(G(s.study), s.p1) === 'Rr');
const e0 = s.epoch;
s = reducer(s, { type: 'flipAllele', which: 'p1', gene: 0, slot: 0 });
ok('flipping an allele changes it', E.genotypeText(G(s.study), s.p1) === 'rr');
ok('and that counts as a new cross', s.epoch === e0 + 1);
s = reducer(s, { type: 'flipAllele', which: 'p1', gene: 0, slot: 0 });
ok('flipping back returns to Rr, tidied', E.genotypeText(G(s.study), s.p1) === 'Rr');
s = reducer(s, { type: 'genotype', which: 'p2', gene: 0, value: 'r/r' });
ok('a genotype can be set outright', E.genotypeText(G(s.study), s.p2) === 'rr');
ok('which makes it a test cross', pheno(s.study, 'R/r', 'r/r').text === '1 : 1');
const before = s;
ok('an impossible genotype is refused outright',
   reducer(s, { type: 'genotype', which: 'p2', gene: 0, value: 'X/X' }) === s);
ok('an allele from nowhere is refused too',
   reducer(s, { type: 'allele', which: 'p2', gene: 0, slot: 0, value: 'Z' }) === s);
ok('a gene that does not exist is refused',
   reducer(s, { type: 'allele', which: 'p2', gene: 9, slot: 0, value: 'R' }) === s);

console.log('\n— the reducer will not build an impossible parent —');
let x = reducer(createInitialState(), { type: 'study', value: 'colourBlind' });
ok('the sex-linked study opens on a carrier mother and an unaffected father',
   E.genotypeText(G(x.study), x.p1) === 'XBXb' && E.genotypeText(G(x.study), x.p2) === 'XBY');
ok('a mother cannot be handed a Y',
   reducer(x, { type: 'allele', which: 'p1', gene: 0, slot: 0, value: 'Y' }) === x);
ok('and cannot be set to a father-shaped genotype',
   reducer(x, { type: 'genotype', which: 'p1', gene: 0, value: 'X^B/Y' }) === x);
ok('a father cannot be handed two X chromosomes',
   reducer(x, { type: 'genotype', which: 'p2', gene: 0, value: 'X^B/X^b' }) === x);
const flipped = reducer(x, { type: 'flipAllele', which: 'p1', gene: 0, slot: 1 });
ok('flipping a mother\'s allele skips the Y and lands on a real genotype',
   !E.genotypeText(G(x.study), flipped.p1).includes('Y'),
   E.genotypeText(G(x.study), flipped.p1));
let dad = x;
const dadSeen = new Set();
for (let i = 0; i < 6; i++) {
  dad = reducer(dad, { type: 'flipAllele', which: 'p2', gene: 0, slot: 0 });
  dadSeen.add(E.genotypeText(G(dad.study), dad.p2));
}
ok('cycling a father\'s allele only ever visits his two real genotypes',
   eq([...dadSeen].sort(), ['XBY', 'XbY']), [...dadSeen].join());
ok('allowedFor agrees with the guards',
   allowedFor(G('colourBlind'), 'p1', [['X^B', 'X^b']]) &&
   !allowedFor(G('colourBlind'), 'p1', [['X^b', 'Y']]) &&
   allowedFor(G('colourBlind'), 'p2', [['X^b', 'Y']]) &&
   !allowedFor(G('colourBlind'), 'p2', [['X^B', 'X^b']]));

console.log('\n— blood groups have six choices, not three —');
let b = reducer(createInitialState(), { type: 'study', value: 'blood' });
ok('the blood study opens on IᴬI × IᴮI, which can give all four groups',
   pheno('blood', E.genotypeKey(G('blood'), b.p1), E.genotypeKey(G('blood'), b.p2)).rows.length === 4);
ok('both parents are offered all six genotypes',
   E.parentGenotypes(E.GENES.blood, 'p1').length === 6 &&
   E.parentGenotypes(E.GENES.blood, 'p2').length === 6);
b = reducer(b, { type: 'genotype', which: 'p1', gene: 0, value: 'I^A/I^B' });
ok('a parent can be set to AB', E.genotypeText(G(b.study), b.p1) === 'IAIB');
const cycled = new Set();
let c3 = b;
for (let i = 0; i < 4; i++) {
  c3 = reducer(c3, { type: 'flipAllele', which: 'p1', gene: 0, slot: 0 });
  cycled.add(E.genotypeText(G(c3.study), c3.p1));
}
ok('clicking an allele cycles through all three, not just two', cycled.size >= 3, [...cycled].join());

console.log('\n— the family on the bench —');
s = reducer(before, { type: 'bred', counts: { 'R/r': 6, 'r/r': 4 }, order: ['R/r', 'r/r'], n: 10 });
ok('breeding adds to the family', s.sample.n === 10 && s.sample.counts['R/r'] === 6);
s = reducer(s, { type: 'bred', counts: { 'R/r': 3 }, order: ['R/r'], n: 3 });
ok('and breeding again adds to it', s.sample.n === 13 && s.sample.counts['R/r'] === 9);
const overflow = reducer(s, {
  type: 'bred', counts: { 'R/r': 500 }, order: new Array(500).fill('R/r'), n: 500,
});
ok('the counts keep climbing past the drawing limit', overflow.sample.n === 513);
ok('but the drawn family stops at the cap', overflow.sample.order.length === SHOWN_MAX);
s = reducer(s, { type: 'clearSample' });
ok('the family can be cleared', s.sample.n === 0);
s = reducer(s, { type: 'bred', counts: { 'R/r': 5 }, order: ['R/r'], n: 5 });
s = reducer(s, { type: 'flipAllele', which: 'p1', gene: 0, slot: 1 });
ok('changing the cross throws the old family away', s.sample.n === 0);
s = reducer(s, { type: 'bred', counts: { 'R/r': 5 }, order: ['R/r'], n: 5 });
s = reducer(s, { type: 'view', key: 'showGenotypes', value: false });
ok('but a view switch leaves it alone', s.sample.n === 5 && s.showGenotypes === false);
s = reducer(s, { type: 'study', value: 'snapdragon' });
ok('changing the study changes the genes and clears the family',
   s.study === 'snapdragon' && s.sample.n === 0);
ok('re-picking the same study changes nothing',
   reducer(s, { type: 'study', value: 'snapdragon' }) === s);
ok('an unknown study is refused', reducer(s, { type: 'study', value: 'dragons' }) === s);
s = reducer(s, { type: 'highlight', key: 'pink' });
ok('a phenotype can be picked out of the key', s.highlight === 'pink');
s = reducer(s, { type: 'highlight', key: 'pink' });
ok('and picking it again clears it', s.highlight === null);

console.log('\n— presets —');
let presetsOk = true;
Object.entries(E.PRESETS).forEach(([name, p]) => {
  const st = reducer(createInitialState(), { type: 'preset', name });
  const genes = G(st.study);
  if (st.study !== p.study) presetsOk = false;
  if (E.genotypeKey(genes, st.p1) !== p.p1 || E.genotypeKey(genes, st.p2) !== p.p2) presetsOk = false;
  if (!allowedFor(genes, 'p1', st.p1) || !allowedFor(genes, 'p2', st.p2)) presetsOk = false;
});
ok(`all ${Object.keys(E.PRESETS).length} presets set up a legal cross`, presetsOk);
ok('an unknown preset is refused',
   reducer(createInitialState(), { type: 'preset', name: 'nope' }).study === 'pea-shape');
ok('every study opens on a legal cross for both roles',
   Object.keys(E.STUDIES).every((id) => {
     const { p1, p2 } = defaultParents(id);
     return allowedFor(G(id), 'p1', p1) && allowedFor(G(id), 'p2', p2);
   }));

console.log('\n— challenge mode parks the visitor’s own cross —');
let mine = reducer(createInitialState(), { type: 'preset', name: 'dihybrid' });
mine = reducer(mine, { type: 'bred', counts: { 'R/r+Y/y': 4 }, order: ['R/r+Y/y'], n: 4 });
let ch = reducer(mine, { type: 'enterChallenge' });
ch = reducer(ch, { type: 'loadTask', task: { study: 'colourBlind', p1: 'X^B/X^b', p2: 'X^b/Y' }, frozen: true });
ok('the challenge takes the bench over', ch.study === 'colourBlind' && ch.frozen === true);
ok('and sets up a legal cross', allowedFor(G(ch.study), 'p2', ch.p2));
ch = reducer(ch, { type: 'unfreeze' });
ok('answering uncovers the square', ch.frozen === false);
ch = reducer(ch, { type: 'bred', counts: { 'X^b/Y': 9 }, order: ['X^b/Y'], n: 9 });
const backHome = reducer(ch, { type: 'leaveChallenge' });
ok('leaving hands the cross straight back',
   backHome.study === 'pea-both' && E.genotypeText(G(backHome.study), backHome.p1) === 'RrYy');
ok('and the family with it', backHome.sample.n === 4);
ok("the challenge's own offspring are not carried back",
   !Object.keys(backHome.sample.counts).includes('X^b/Y'));
/* a task whose parents do not fit the roles must still leave a legal bench */
const wonky = reducer(reducer(mine, { type: 'enterChallenge' }),
  { type: 'loadTask', task: { study: 'colourBlind', p1: 'X^b/Y', p2: 'X^B/X^b' }, frozen: false });
ok('a task with the parents the wrong way round still leaves a legal cross',
   allowedFor(G(wonky.study), 'p1', wonky.p1) && allowedFor(G(wonky.study), 'p2', wonky.p2));

console.log('\n— what the browser remembers —');
let keep = reducer(createInitialState(), { type: 'preset', name: 'carrierMother' });
keep = reducer(keep, {
  type: 'bred', counts: { 'X^B/X^b': 5, 'X^b/Y': 3 }, order: ['X^B/X^b', 'X^b/Y'], n: 8,
});
keep = reducer(keep, { type: 'view', key: 'showPhenoLabels', value: false });
keep = reducer(keep, { type: 'score', correct: true });
writeState(keep);
let back = readState();
ok('the study survives a reload', back.study === 'colourBlind');
ok('both parents survive, in their proper roles',
   E.genotypeText(G(back.study), back.p1) === 'XBXb' &&
   E.genotypeText(G(back.study), back.p2) === 'XBY');
ok('the family survives', back.sample.n === 8 && back.sample.counts['X^b/Y'] === 3);
ok('the view switches survive', back.showPhenoLabels === false);
ok('the score survives', back.score === 1 && back.attempts === 1);

store.set(STORE, JSON.stringify({
  v: 2, study: 'unicorns', p1: 'Z/Z', p2: null,
  sample: { n: 999, counts: { 'R/R': 5, 'Z/Z': 400, 'R/r': -3, 'r/r': 'lots' }, order: ['R/R', 'Z/Z', 'nope'] },
  score: { score: 50, attempts: 2 }, tab: 'challenge',
}));
const junk = readState();
ok('an unknown study falls back to the opening one', junk.study === 'pea-shape', junk.study);
ok('an unreadable genotype falls back to the default',
   E.genotypeText(G(junk.study), junk.p1) === 'Rr');
ok('a null genotype falls back too', E.genotypeText(G(junk.study), junk.p2) === 'Rr');
ok('offspring that could not belong to this cross are dropped',
   eq(junk.sample.counts, { 'R/R': 5 }), JSON.stringify(junk.sample.counts));
ok('and the total is recounted from what survived, not trusted', junk.sample.n === 5);
ok('a score bigger than its attempts is clamped', junk.score === 2 && junk.attempts === 2);
ok('a challenge is never restored — it belonged to that sitting', junk.tab === 'explore');

/* a father saved with a mother's genotype must not come back as one */
store.set(STORE, JSON.stringify({
  v: 2, study: 'colourBlind', p1: 'X^b/Y', p2: 'X^B/X^b', sample: null,
}));
const swapped = readState();
ok('a saved parent that could not exist is replaced, not restored',
   allowedFor(G('colourBlind'), 'p1', swapped.p1) &&
   allowedFor(G('colourBlind'), 'p2', swapped.p2),
   `${E.genotypeText(G('colourBlind'), swapped.p1)} × ${E.genotypeText(G('colourBlind'), swapped.p2)}`);

store.set(STORE, 'not json at all');
ok('unparseable storage just starts fresh', readState() === null);
store.set(STORE, JSON.stringify({ v: 1, study: 'cattle' }));
ok('a save from the older format is not guessed at', readState() === null);
store.set(STORE, JSON.stringify({ v: 3, study: 'cattle' }));
ok('nor one from a future format', readState() === null);
store.delete(STORE);
ok('no save at all is fine too', readState() === null);
ok('and the lab still opens', createInitialState().study === 'pea-shape');
globalThis.localStorage = {
  getItem() { throw new Error('storage denied'); },
  setItem() { throw new Error('storage denied'); },
};
ok('a browser that refuses storage does not take the lab down',
   readState() === null && (writeState(initialState), true));
globalThis.localStorage = realStorage;

console.log('\n— challenges —');
let ratios = 0, parents = 0, unsound = 0, studiesSeen = new Set();
for (let i = 0; i < 800; i++) {
  const t = newTask();
  if (!t) { unsound++; continue; }
  studiesSeen.add(t.study);
  const genes = G(t.study);
  if (t.type === 'ratio') {
    ratios++;
    const p1 = gt(t.study, t.p1), p2 = gt(t.study, t.p2);
    if (!p1 || !p2) { unsound++; continue; }
    if (!allowedFor(genes, 'p1', p1) || !allowedFor(genes, 'p2', p2)) unsound++;
    if (!sameOutcome(outcomeVector(t.study, p1, p2), t.answer)) unsound++;
    if (!t.options.some((o) => sameOutcome(o, t.answer))) unsound++;
    if (t.options.length < 3) unsound++;
    const texts = t.options.map((o) => describeOutcome(t.study, o));
    if (new Set(texts).size !== texts.length) unsound++;
    if (texts.some((v) => !v || v.includes('undefined'))) unsound++;
    /* every wrong answer must be a real outcome of some other cross */
    const real = new Set(outcomeCatalogue(t.study).map((o) => o.text));
    if (!texts.every((v) => real.has(v))) unsound++;
  } else {
    parents++;
    const s1 = gt(t.study, t.solution[0]), s2 = gt(t.study, t.solution[1]);
    if (!allowedFor(genes, 'p1', s1) || !allowedFor(genes, 'p2', s2)) unsound++;
    if (!sameOutcome(outcomeVector(t.study, s1, s2), t.wanted)) unsound++;
    if (sameOutcome(outcomeVector(t.study, gt(t.study, t.p1), gt(t.study, t.p2)), t.wanted)) unsound++;
    if (genes.length !== 1) unsound++;
    if (!t.wantedText || t.wantedText.includes('undefined')) unsound++;
  }
}
ok(`800 challenges are all answerable (${ratios} predict, ${parents} find-the-parents)`,
   unsound === 0 && ratios > 0 && parents > 0, `${unsound} unsound`);
ok('and they draw on every study on the shelf',
   studiesSeen.size === Object.keys(E.STUDIES).length,
   `${studiesSeen.size}/${Object.keys(E.STUDIES).length}`);

/* reading a cross backwards must accept every parent pair that works */
let acceptedAll = true;
ONE_GENE.forEach((study) => {
  const p1s = allGenotypes(study, 'p1'), p2s = allGenotypes(study, 'p2');
  p1s.forEach((a) => p2s.forEach((b) => {
    const want = outcomeVector(study, a, b);
    let matches = 0;
    p1s.forEach((u) => p2s.forEach((v) => {
      if (sameOutcome(outcomeVector(study, u, v), want)) matches++;
    }));
    if (matches < 1) acceptedAll = false;
  }));
});
ok('any parent pair with the right square counts as an answer', acceptedAll);
ok('every study offers at least three different outcomes to choose between',
   Object.keys(E.STUDIES).every((id) => outcomeCatalogue(id).length >= 3));

console.log('\n— describing an outcome in words —');
ok('a single class reads "all round"', describeOutcome('pea-shape', [1, 0]) === 'all round');
ok('two classes read "3 round : 1 wrinkled"',
   describeOutcome('pea-shape', [3, 1]) === '3 round : 1 wrinkled');
ok('a two-gene outcome names all four',
   describeOutcome('pea-both', [9, 3, 3, 1]) ===
     '9 round, yellow : 3 round, green : 3 wrinkled, yellow : 1 wrinkled, green');
ok('a sex-linked outcome names the sons and daughters',
   describeOutcome('colourBlind', [1, 1, 0, 1, 1]) ===
     '1 unaffected daughter : 1 carrier daughter : 1 unaffected son : 1 colour-blind son',
   describeOutcome('colourBlind', [1, 1, 0, 1, 1]));
ok('a blood outcome names the groups',
   describeOutcome('blood', [1, 1, 1, 1]) === '1 group A : 1 group AB : 1 group B : 1 group O');

console.log('\n— captions only appear where they fit —');
ok('a short name fits a big cell', E.captionFits('round', 113, 9.5));
ok('a long one does not fit a small cell',
   !E.captionFits('unaffected daughter', 83, 10.3));
ok('but does fit a wide one', E.captionFits('unaffected daughter', 113, 9.5));
ok('the four-by-four cells are never asked to hold a caption',
   !E.captionFits('round, yellow', E.PROFILES.wide.squareSize / 5, 9.5));
ok('an empty caption always fits', E.captionFits('', 50, 10));

console.log('\n— the drawing fits its frame —');
Object.values(E.PROFILES).forEach((P) => {
  const cell = P.squareSize / 5;
  const mostPhenotypes = Math.max(...Object.keys(E.STUDIES).map((id) => E.phenotypeOrder(G(id)).length));
  ok(`${P.name}: the square sits inside the drawing`,
     P.squareLeft + P.squareSize <= P.W && P.squareTop + P.squareSize <= P.capY - 8);
  ok(`${P.name}: the key clears the square`, P.legendX >= P.squareLeft + P.squareSize);
  ok(`${P.name}: the key sits inside the drawing`, P.legendX + P.legendW <= P.W);
  ok(`${P.name}: the parents do not overlap`,
     P.p1X + P.parentW <= P.crossX - 8 && P.crossX + 8 <= P.p2X && P.p2X + P.parentW <= P.W);
  ok(`${P.name}: the parents clear the square`, P.parentY + P.parentH <= P.squareTop - 30);
  ok(`${P.name}: even sixteen boxes leave room for a genotype`, cell >= 44, cell.toFixed(1));
  /* the compact drawing sets each row's odds on a second line, so a row needs
     room for both before the next one starts */
  const rowNeeds = P.name === 'compact' ? 30 : 18;
  const lastRow = P.squareTop + 22 + (mostPhenotypes - 1) * P.legendStep;
  ok(`${P.name}: all ${mostPhenotypes} phenotypes fit in the key`,
     lastRow + rowNeeds <= P.capY - 12, String(lastRow));
  ok(`${P.name}: the key's rows do not sit on top of each other`,
     P.legendStep >= rowNeeds, String(P.legendStep));
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
