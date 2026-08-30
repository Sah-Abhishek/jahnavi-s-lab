/* ============================================================
   Inheritance — challenges.
   Reading a cross forwards, and reading it backwards. The
   forward one hides the square until a prediction is in, because
   the moment the colours appear there is nothing left to work out.
   ============================================================ */
import { useEffect, useState } from 'react';
import {
  newTask, outcomeVector, sameOutcome, describeOutcome,
} from './challenges';
import {
  genesOf, parentGenotypes, pairKey, phenotypeOf, genotypeText, punnett, phenotypeRatio,
  gameteText, parentLabel, alleleParts,
} from './engine';

/** Genotypes written as Xᵇ rather than X^b. */
const Geno = ({ parts }) => parts.map((p, i) => (
  <span key={i}>{p.base}{p.sup ? <sup>{p.sup}</sup> : null}</span>
));

/** A stored genotype key ('X^B/X^b') read back as ordinary lettering ('XBXb'). */
const keyText = (key) =>
  key.split('+').map((pair) => pair.split('/').map((a) => a.replace('^', '')).join('')).join('');
const solutionText = (task) =>
  `${keyText(task.solution[0])} × ${keyText(task.solution[1])}`;

export default function ChallengePanel({ state: s, dispatch }) {
  const [task, setTask] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState(null);

  /* opening the tab parks the visitor's own cross; leaving puts it back */
  useEffect(() => {
    dispatch({ type: 'enterChallenge' });
    return () => dispatch({ type: 'leaveChallenge' });
  }, [dispatch]);

  const start = () => {
    const t = newTask();
    if (!t) return;
    setTask(t);
    setAnswered(false);
    setFeedback(null);
    dispatch({ type: 'loadTask', task: t, frozen: t.type === 'ratio' });
  };

  const score = (correct) => dispatch({ type: 'score', correct });

  /** The square set out in words, for the feedback. */
  const working = (studyId, p1, p2) => {
    const genes = genesOf(studyId);
    const sq = punnett(genes, p1, p2);
    const r = phenotypeRatio(genes, sq);
    const gam = (list) => [...new Set(list.map(gameteText))].join(', ');
    return (
      <span className="work">
        {genotypeText(genes, p1)} × {genotypeText(genes, p2)}<br />
        gametes {gam(sq.rows)} × {gam(sq.cols)}<br />
        {r.rows.map((row) => `${row.count} ${row.short}`).join(' : ')} out of {sq.total}
      </span>
    );
  };

  /* ---------- predict what the cross gives ---------- */
  const answerRatio = (vector) => {
    if (!task || task.type !== 'ratio' || answered) return;
    setAnswered(true);
    dispatch({ type: 'unfreeze' });
    const right = sameOutcome(vector, task.answer);
    score(right);
    setFeedback({
      cls: right ? 'good' : 'bad',
      word: right ? 'Correct' : 'Not quite',
      body: (
        <>
          It gives <strong>{describeOutcome(task.study, task.answer)}</strong>.
          {working(task.study, s.p1, s.p2)}
        </>
      ),
    });
  };

  /* ---------- find parents that give a wanted outcome ---------- */
  const check = () => {
    if (!task || task.type !== 'parents' || answered) return;
    const got = outcomeVector(s.study, s.p1, s.p2);
    const right = sameOutcome(got, task.wanted);
    setAnswered(true);
    score(right);
    setFeedback({
      cls: right ? 'good' : 'bad',
      word: right ? 'That does it' : 'Not yet',
      body: right
        ? <>These two give <strong>{task.wantedText}</strong>, which is what was
            asked for.{working(s.study, s.p1, s.p2)}</>
        : <>These two give <strong>{describeOutcome(s.study, got)}</strong>, not{' '}
            <strong>{task.wantedText}</strong>. One pair that works
            is {solutionText(task)}.{working(s.study, s.p1, s.p2)}</>,
    });
  };

  const reveal = () => {
    if (!task || task.type !== 'parents') return;
    const genes = genesOf(task.study);
    task.solution[0].split('+').forEach((key, i) => {
      dispatch({ type: 'genotype', which: 'p1', gene: i, value: key });
    });
    task.solution[1].split('+').forEach((key, i) => {
      dispatch({ type: 'genotype', which: 'p2', gene: i, value: key });
    });
    if (!answered) { setAnswered(true); score(false); }
    setFeedback({
      cls: 'info', word: 'Answer',
      body: (
        <>
          <strong>{solutionText(task)}</strong> gives {task.wantedText}.
          It is not always the only pair that would — any cross with the same square counts.
          <span className="work">
            {genes[0].alleles[0]} = {genes[0].alleleName[genes[0].alleles[0]]},{' '}
            {genes[0].alleles[1]} = {genes[0].alleleName[genes[0].alleles[1]]}
          </span>
        </>
      ),
    });
  };

  const given = task && (
    <span className="given">
      {task.type === 'ratio'
        ? <>{parentLabel(task.study, 'p1')}: {keyText(task.p1)}<br />
            {parentLabel(task.study, 'p2')}: {keyText(task.p2)}</>
        : <>wanted: {task.wantedText}</>}
    </span>
  );

  const predicting = task?.type === 'ratio';
  const finding = task?.type === 'parents';
  const genes = genesOf(s.study);

  return (
    <div className="card tabpanel">
      <div className="score-bar">
        <span>Score</span><strong>{s.score} / {s.attempts}</strong>
      </div>

      <div className="task-box">
        {!task ? (
          <>
            <h3>Ready?</h3>
            <p>Press <strong>New challenge</strong> and the lab will set up a cross for you.</p>
          </>
        ) : predicting ? (
          <>
            <h3>What will these two give?</h3>
            <p>The square is covered up. Work out the gametes, fill it in in your head, then
              choose.{given}</p>
          </>
        ) : (
          <>
            <h3>Find the parents</h3>
            <p>Set both parents so their offspring come out as asked. There may be more than
              one answer that works.{given}</p>
          </>
        )}
      </div>

      {predicting && !answered && (
        <div className="predict-btns">
          {task.options.map((v, i) => (
            <button key={i} className="btn predict" onClick={() => answerRatio(v)}>
              {describeOutcome(task.study, v)}
            </button>
          ))}
        </div>
      )}

      {finding && (
        <div className="tune-box">
          {['p1', 'p2'].map((which) => {
            const options = parentGenotypes(genes[0], which);
            const name = parentLabel(s.study, which);
            return (
              <div key={which} className="gene-row">
                <span className="field-label">{name}</span>
                <div className={`segmented n${options.length}`} role="radiogroup" aria-label={name}>
                  {options.map((pair) => {
                    const key = pairKey(genes[0], pair);
                    const on = pairKey(genes[0], s[which][0]) === key;
                    return (
                      <button key={key} type="button" role="radio" aria-checked={on}
                              className={`seg${on ? ' active' : ''}`} disabled={answered}
                              onClick={() => dispatch({ type: 'genotype', which, gene: 0, value: key })}>
                        <span className="seg-name"><Geno parts={pair.map(alleleParts)} /></span>
                        <span className="seg-sub">{phenotypeOf(genes[0], pair).adult}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="tune-now">
            gives <strong>{describeOutcome(s.study, outcomeVector(s.study, s.p1, s.p2))}</strong>
            <span className="tune-target"> · wanted {task.wantedText}</span>
          </p>
        </div>
      )}

      <div className="task-actions">
        <button className="btn primary" onClick={start}>New challenge</button>
        <button className="btn" disabled={!finding || answered} onClick={check}>Check my answer</button>
        <button className="btn ghost" disabled={!finding} onClick={reveal}>Show the answer</button>
      </div>

      {feedback && (
        <div className={`feedback show ${feedback.cls}`}>
          <span className="verdict-word">{feedback.word}</span>{feedback.body}
        </div>
      )}
    </div>
  );
}
