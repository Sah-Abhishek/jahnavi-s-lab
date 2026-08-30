/* ============================================================
   Inheritance — the state machine.
   Any change to the cross itself throws the litter away: the
   offspring on the bench belong to the parents that made them,
   and quietly carrying them over to a different cross would be
   the one thing a genetics lab must never do.
   ============================================================ */
import {
  STUDIES, PRESETS, genesOf, parentGenotypes, normalisePair,
  genotypeKey, parseGenotype, openingCross, pairKey,
} from './engine.js';

/** How many individuals the litter is drawn out as. Beyond this the counts
    still climb, but the dot grid stops growing — it is a picture, not a list. */
export const SHOWN_MAX = 240;

const emptySample = () => ({ n: 0, counts: {}, order: [] });

const OPENING = openingCross('pea-shape');

export const initialState = {
  study: 'pea-shape',
  p1: OPENING.p1,
  p2: OPENING.p2,
  showGenotypes: true,
  showPhenoLabels: true,
  highlight: null,   // a phenotype picked out of the legend
  sample: emptySample(),
  mode: 'explore',     // 'explore' | 'challenge'
  frozen: false,       // the square is hidden while a prediction is pending
  tab: 'explore',
  score: 0,
  attempts: 0,
  snapshot: null,
  epoch: 0,
};

/** A cross has changed, so whatever was bred from the old one is no longer
    this cross's offspring. */
const freshCross = (s) => ({ ...s, sample: emptySample(), epoch: s.epoch + 1 });

/** The cross a study opens on. */
export const defaultParents = (studyId) => openingCross(studyId);

/** Is this a genotype the parent in that role could actually have? A mother
    cannot carry a Y, and a father cannot carry two X chromosomes. */
export function allowedFor(genes, role, genotype) {
  if (!genotype || genotype.length !== genes.length) return false;
  return genes.every((g, i) =>
    parentGenotypes(g, role).some((p) => pairKey(g, p) === pairKey(g, genotype[i])));
}

/** Pull a genotype into something this parent could be, changing as little as
    possible — used when the study changes under a parent's feet. */
const coerce = (genes, role, genotype) =>
  (allowedFor(genes, role, genotype) ? genotype
    : genes.map((g, i) => parentGenotypes(g, role)[0] || g.alleles.slice(0, 2)));

function setStudy(s, studyId) {
  if (!STUDIES[studyId] || studyId === s.study) return s;
  const { p1, p2 } = defaultParents(studyId);
  return freshCross({ ...s, study: studyId, p1, p2 });
}

/** Read a genotype written as a key, keeping the old one if it does not fit —
    and never letting a parent end up as something it could not be. */
function fromKey(studyId, key, role, fallback) {
  const genes = genesOf(studyId);
  const parsed = parseGenotype(genes, key);
  return parsed && allowedFor(genes, role, parsed) ? parsed : fallback;
}

/** Set one allele, but only if the parent could still be a real parent
    afterwards. Returns null when it could not. */
function withAllele(genes, state, which, geneIndex, slot, value) {
  const gene = genes[geneIndex];
  const old = state[which][geneIndex];
  const pair = normalisePair(gene, slot === 0 ? [value, old[1]] : [old[0], value]);
  const allowed = parentGenotypes(gene, which)
    .some((p) => pairKey(gene, p) === pairKey(gene, pair));
  if (!allowed) return null;
  return state[which].map((p, i) => (i === geneIndex ? pair : p));
}

export function reducer(state, action) {
  const a = action;
  const genes = genesOf(state.study);

  switch (a.type) {
    case 'study':
      return setStudy(state, a.value);

    /* one allele of one gene of one parent, set outright */
    case 'allele': {
      const gene = genes[a.gene];
      if (!gene || !gene.alleles.includes(a.value)) return state;
      const pairs = withAllele(genes, state, a.which, a.gene, a.slot, a.value);
      if (!pairs) return state;
      return freshCross({ ...state, [a.which]: pairs });
    }
    /* clicking an allele in the diagram moves it on to the next one this parent
       could actually have — which for a mother never includes the Y */
    case 'flipAllele': {
      const gene = genes[a.gene];
      if (!gene) return state;
      const now = state[a.which][a.gene][a.slot];
      const start = gene.alleles.indexOf(now);
      for (let step = 1; step <= gene.alleles.length; step++) {
        const next = gene.alleles[(start + step) % gene.alleles.length];
        const pairs = withAllele(genes, state, a.which, a.gene, a.slot, next);
        if (pairs) return freshCross({ ...state, [a.which]: pairs });
      }
      return state;
    }
    /* a whole pair at once, from the segmented control */
    case 'genotype': {
      const gene = genes[a.gene];
      if (!gene) return state;
      const match = parentGenotypes(gene, a.which)
        .find((p) => pairKey(gene, p) === a.value);
      if (!match) return state;
      const pairs = state[a.which].map((p, i) => (i === a.gene ? match : p));
      return freshCross({ ...state, [a.which]: pairs });
    }

    case 'view':
      return { ...state, [a.key]: a.value };
    /* picking a phenotype out of the legend dims every cell that is not it */
    case 'highlight':
      return { ...state, highlight: state.highlight === a.key ? null : a.key };

    /* the litter is bred outside the reducer, so a double-invoked reducer in
       development can never breed twice over */
    case 'bred': {
      const counts = { ...state.sample.counts };
      Object.entries(a.counts).forEach(([k, n]) => { counts[k] = (counts[k] || 0) + n; });
      const order = state.sample.order.concat(a.order).slice(-SHOWN_MAX);
      return { ...state, sample: { n: state.sample.n + a.n, counts, order } };
    }
    case 'clearSample':
      return { ...state, sample: emptySample() };

    case 'preset': {
      const p = PRESETS[a.name];
      if (!p) return state;
      const base = leave(state);
      const fb = defaultParents(p.study);
      return freshCross({
        ...base,
        study: p.study,
        p1: fromKey(p.study, p.p1, 'p1', fb.p1),
        p2: fromKey(p.study, p.p2, 'p2', fb.p2),
      });
    }
    case 'reset':
      return freshCross({
        ...initialState,
        tab: state.tab === 'learn' ? 'learn' : 'explore',
        epoch: state.epoch,
      });

    /* ---------- challenge mode ---------- */
    case 'enterChallenge': {
      if (state.mode === 'challenge') return state;
      return {
        ...state,
        mode: 'challenge',
        snapshot: {
          study: state.study,
          p1: state.p1.map((p) => p.slice()),
          p2: state.p2.map((p) => p.slice()),
          sample: state.sample,
        },
      };
    }
    case 'leaveChallenge': {
      /* NOT freshCross: leaving restores the visitor's own cross *and* the
         litter they had bred from it. Only the challenge's own offspring go. */
      const restored = leave(state);
      return { ...restored, epoch: state.epoch + 1 };
    }
    case 'loadTask': {
      const t = a.task;
      const fb = defaultParents(t.study);
      return freshCross({
        ...state,
        study: t.study,
        p1: fromKey(t.study, t.p1, 'p1', fb.p1),
        p2: fromKey(t.study, t.p2, 'p2', fb.p2),
        frozen: !!a.frozen,
      });
    }
    case 'unfreeze':
      return { ...state, frozen: false };

    case 'score':
      return { ...state, attempts: state.attempts + 1, score: state.score + (a.correct ? 1 : 0) };
    case 'tab':
      return { ...state, tab: a.value };
    default:
      return state;
  }
}

/** Put the visitor's own cross back on the bench. */
function leave(s) {
  if (s.mode !== 'challenge') return s;
  const snap = s.snapshot;
  return {
    ...s, mode: 'explore', frozen: false, snapshot: null,
    ...(snap || {}),
  };
}

/* ============================================================
   SAVED SET-UP
   In this browser only. Storage can be unavailable (private
   windows, blocked site data) or full, so every call is guarded.
   ============================================================ */
const STORE_KEY = 'jahnavis-lab/inheritance/v2';

export function writeState(s) {
  /* while a challenge is running the cross on the bench is the task's, not the
     visitor's — persist what they left behind, not the puzzle */
  const src = (s.mode === 'challenge' && s.snapshot) ? s.snapshot : s;
  const genes = genesOf(src.study);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 2,
      study: src.study,
      p1: genotypeKey(genes, src.p1),
      p2: genotypeKey(genes, src.p2),
      sample: { n: src.sample.n, counts: src.sample.counts, order: src.sample.order },
      showGenotypes: s.showGenotypes,
      showPhenoLabels: s.showPhenoLabels,
      tab: s.tab,
      score: { score: s.score, attempts: s.attempts },
    }));
  } catch (e) { /* out of space or storage denied — carry on unsaved */ }
}

/** Read the saved set-up, distrusting every value in it. */
export function readState() {
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  if (!raw) return null;
  let d;
  try { d = JSON.parse(raw); } catch (e) { return null; }
  if (!d || d.v !== 2) return null;

  const bool = (v, dflt) => (typeof v === 'boolean' ? v : dflt);
  const s = { ...initialState };
  s.study = STUDIES[d.study] ? d.study : initialState.study;
  const fb = defaultParents(s.study);
  s.p1 = fromKey(s.study, d.p1, 'p1', fb.p1);
  s.p2 = fromKey(s.study, d.p2, 'p2', fb.p2);
  s.showGenotypes = bool(d.showGenotypes, true);
  s.showPhenoLabels = bool(d.showPhenoLabels, true);

  /* a saved litter is only kept if every genotype in it belongs to this cross */
  s.sample = emptySample();
  const sample = d.sample;
  if (sample && typeof sample === 'object' && sample.counts && typeof sample.counts === 'object') {
    const genes = genesOf(s.study);
    let n = 0;
    const counts = {};
    Object.entries(sample.counts).forEach(([k, v]) => {
      if (!parseGenotype(genes, k)) return;
      if (typeof v !== 'number' || !isFinite(v) || v < 0) return;
      counts[k] = Math.floor(v);
      n += Math.floor(v);
    });
    const order = Array.isArray(sample.order)
      ? sample.order.filter((k) => parseGenotype(genes, k)).slice(-SHOWN_MAX)
      : [];
    if (n > 0) s.sample = { n, counts, order };
  }

  if (d.score && typeof d.score === 'object') {
    const num = (v) => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    s.attempts = num(d.score.attempts);
    s.score = Math.min(num(d.score.score), s.attempts);
  }
  s.tab = ['explore', 'challenge', 'learn'].indexOf(d.tab) >= 0 ? d.tab : 'explore';
  /* a challenge is never restored — it belongs to the sitting it was set in */
  if (s.tab === 'challenge') s.tab = 'explore';
  return s;
}

export const createInitialState = () => readState() || initialState;
