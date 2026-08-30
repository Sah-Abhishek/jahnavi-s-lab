/* ============================================================
   Inheritance — the challenge generator.
   Two questions. Reading a cross forwards ("what will these two
   have?") and reading it backwards ("what parents would give me
   this?") — the second being the one a breeder, or a genetic
   counsellor, actually asks.

   Wrong answers are never invented. Every option offered is the
   real outcome of some other cross of the same study, so a pupil
   who works it out properly is never tripped by a distractor that
   could not have happened at all.
   ============================================================ */
import {
  STUDIES, genesOf, parentGenotypes, genotypeKey, punnett,
  phenotypeOrder, phenotypeRatio, simplify, isSexLinked,
} from './engine.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const ONE_GENE = Object.keys(STUDIES).filter((k) => STUDIES[k].genes.length === 1);
const ALL_STUDIES = Object.keys(STUDIES);

/** Every genotype a parent in this role could have, for the whole study. */
export function allGenotypes(studyId, role = 'p1') {
  const genes = genesOf(studyId);
  let out = [[]];
  genes.forEach((g) => {
    const next = [];
    out.forEach((acc) => parentGenotypes(g, role).forEach((pair) => next.push(acc.concat([pair]))));
    out = next;
  });
  return out;
}

/** Counts over EVERY phenotype this study can show, zeros included — so two
    outcomes can be compared class by class however few classes turn up. */
export function outcomeVector(studyId, p1, p2) {
  const genes = genesOf(studyId);
  const order = phenotypeOrder(genes);
  const rows = phenotypeRatio(genes, punnett(genes, p1, p2)).rows;
  const found = new Map(rows.map((r) => [r.key, r.count]));
  return simplify(order.map((p) => found.get(p.key) || 0));
}

export const sameOutcome = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** An outcome written out the way it would be said aloud. */
export function describeOutcome(studyId, vector) {
  const order = phenotypeOrder(genesOf(studyId));
  const live = order.map((p, i) => ({ short: p.short, n: vector[i] })).filter((r) => r.n > 0);
  if (!live.length) return 'nothing at all';
  if (live.length === 1) return `all ${live[0].short}`;
  return live.map((r) => `${r.n} ${r.short}`).join(' : ');
}

/** Every different outcome this study can produce, and one cross that gives it.
    This is where the wrong answers come from. */
export function outcomeCatalogue(studyId) {
  const seen = new Map();
  allGenotypes(studyId, 'p1').forEach((a) => allGenotypes(studyId, 'p2').forEach((b) => {
    const v = outcomeVector(studyId, a, b);
    const text = describeOutcome(studyId, v);
    if (!seen.has(text)) seen.set(text, { vector: v, text, p1: a, p2: b });
  }));
  return [...seen.values()];
}

/** Predict what a cross will produce. */
function makeRatioTask() {
  for (let i = 0; i < 80; i++) {
    const study = pick(ALL_STUDIES);
    const genes = genesOf(study);
    const p1s = allGenotypes(study, 'p1'), p2s = allGenotypes(study, 'p2');
    /* two-gene crosses only get asked with both parents heterozygous, which is
       the case worth knowing; anything else is arithmetic, not insight */
    const bothHet = (gt) => gt.every((p) => p[0] !== p[1]);
    const p1 = genes.length > 1 ? p1s.find(bothHet) : pick(p1s);
    const p2 = genes.length > 1 ? p2s.find(bothHet) : pick(p2s);
    if (!p1 || !p2) continue;

    const truth = outcomeVector(study, p1, p2);
    const truthText = describeOutcome(study, truth);
    const others = outcomeCatalogue(study).filter((o) => o.text !== truthText);
    if (others.length < 2) continue;

    const chosen = shuffle(others).slice(0, 3).map((o) => o.vector);
    return {
      type: 'ratio', study,
      p1: genotypeKey(genes, p1), p2: genotypeKey(genes, p2),
      answer: truth,
      options: shuffle(chosen.concat([truth])),
    };
  }
  return null;
}

/** Work the cross backwards: what parents would give this? */
function makeParentsTask() {
  for (let i = 0; i < 120; i++) {
    const study = pick(ONE_GENE);
    const genes = genesOf(study);
    const p1s = allGenotypes(study, 'p1'), p2s = allGenotypes(study, 'p2');
    const target = pick(p1s), partner = pick(p2s);
    const wanted = outcomeVector(study, target, partner);

    /* a starting pair that does NOT already answer it, or the puzzle is over
       before it begins */
    const starts = [];
    p1s.forEach((a) => p2s.forEach((b) => {
      if (!sameOutcome(outcomeVector(study, a, b), wanted)) starts.push([a, b]);
    }));
    if (!starts.length) continue;
    const [s1, s2] = pick(starts);

    return {
      type: 'parents', study,
      sexLinked: isSexLinked(study),
      wanted,
      wantedText: describeOutcome(study, wanted),
      p1: genotypeKey(genes, s1), p2: genotypeKey(genes, s2),
      /* one worked solution, for showing the answer */
      solution: [genotypeKey(genes, target), genotypeKey(genes, partner)],
    };
  }
  return null;
}

export function newTask() {
  for (let i = 0; i < 30; i++) {
    const task = Math.random() < 0.5 ? makeRatioTask() : makeParentsTask();
    if (task) return task;
  }
  return makeRatioTask() || makeParentsTask();
}
