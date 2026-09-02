/* ============================================================
   Moment of Force — challenges.
   Two kinds of problem: place a mass so the rod balances, or
   predict which way it tips before the rod is let go. The
   prediction kind freezes the beam and masks the working, so the
   answer has to come from the pupil rather than the screen.
   ============================================================ */
import { useEffect, useState } from 'react';
import { newTask } from './challenges';
import { U, getItems, getTotals, posDp, fmtRel, fmt } from './engine';

const NAMES = {
  cw: 'tipped to the right (clockwise)',
  acw: 'tipped to the left (anticlockwise)',
  bal: 'stayed balanced',
};

export default function ChallengePanel({ state: s, dispatch }) {
  const [task, setTask] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const u = U(s);
  const dp = posDp(s);

  /* opening the tab parks the user's own experiment; leaving puts it back */
  useEffect(() => {
    dispatch({ type: 'enterChallenge' });
    return () => dispatch({ type: 'leaveChallenge' });
  }, [dispatch]);

  const start = () => {
    const t = newTask(s);
    if (!t) return;
    setTask(t);
    setAnswered(false);
    setFeedback(null);
    dispatch({ type: 'loadTask', task: t, frozen: t.type === 'predict' });
  };

  const score = (correct) => dispatch({ type: 'score', correct });

  /** The placement problem, set out the way it would be marked. */
  const workingOut = (t) => {
    const parts = t.fixed.map((k) => `(${k.m} × ${s.g}) × ${Math.abs(k.x - t.f).toFixed(dp)}`);
    const sum = t.fixed.reduce((acc, k) => acc + k.m * s.g * Math.abs(k.x - t.f), 0);
    return (
      <span className="work">
        {parts.join(' + ')} = {fmt(sum)} {u.moment}<br />
        ({t.target.m} × {s.g}) × d = {fmt(sum)} {u.moment}<br />
        d = {t.target.d.toFixed(dp)} {u.len}
      </span>
    );
  };

  const check = () => {
    if (!task || task.type !== 'place' || answered) return;
    const mo = s.masses.find((m) => m.isTarget);
    const t = getTotals(getItems(s));
    setAnswered(true);
    if (t.balanced) {
      score(true);
      setFeedback({ cls: 'good', word: 'Balanced', body: (
        <>{task.target.m} {u.mass} at the {fmtRel(s, mo.x - task.f, dp)} {u.len} mark is
          exactly {task.target.d.toFixed(dp)} {u.len} from the pivot.{workingOut(task)}</>
      ) });
    } else {
      score(false);
      setFeedback({ cls: 'bad', word: 'Not yet', body: (
        <>There is still <strong>{fmt(Math.abs(t.net))} {u.moment}</strong> too
          much {t.net > 0 ? 'clockwise' : 'anticlockwise'} moment. It needs to
          be <strong>{task.target.d.toFixed(dp)} {u.len}</strong> from the pivot.{workingOut(task)}</>
      ) });
      dispatch({ type: 'revealTarget', x: task.target.x });
    }
  };

  const reveal = () => {
    if (!task || task.type !== 'place') return;
    dispatch({ type: 'revealTarget', x: task.target.x });
    if (!answered) { setAnswered(true); score(false); }
    setFeedback({ cls: 'info', word: 'Answer', body: (
      <>The {task.target.m} {u.mass} mass belongs at
        the <strong>{fmtRel(s, task.target.x - task.f, dp)} {u.len}</strong> mark — that
        is {task.target.d.toFixed(dp)} {u.len} from the pivot.{workingOut(task)}</>
    ) });
  };

  const predict = (guess) => {
    if (!task || task.type !== 'predict' || answered) return;
    setAnswered(true);
    dispatch({ type: 'unfreeze' });
    const acw = task.fixed.filter((k) => k.x < task.f)
                          .reduce((acc, k) => acc + k.m * s.g * (task.f - k.x), 0);
    const cw = task.fixed.filter((k) => k.x > task.f)
                         .reduce((acc, k) => acc + k.m * s.g * (k.x - task.f), 0);
    const right = guess === task.answer;
    score(right);
    setFeedback({ cls: right ? 'good' : 'bad', word: right ? 'Correct' : 'Not quite', body: (
      <>It {NAMES[task.answer]}.
        <span className="work">
          anticlockwise = {fmt(acw)} {u.moment}<br />
          clockwise = {fmt(cw)} {u.moment}
        </span>
      </>
    ) });
  };

  const given = task && (
    <span className="given">
      Pivot at the 0 mark<br />
      {task.fixed.map((k, i) => (
        <span key={i}>
          {k.m} {u.mass} at {fmtRel(s, k.x - task.f, dp)} {u.len}<br />
        </span>
      ))}
      g = {s.g} {u.field}
    </span>
  );

  const predicting = task?.type === 'predict';

  return (
    <div className="card tabpanel">
      <div className="score-bar">
        <span>Score</span><strong>{s.score} / {s.attempts}</strong>
      </div>

      <div className="task-box">
        {!task ? (
          <>
            <h3>Ready?</h3>
            <p>Press <strong>New challenge</strong> and the lab will set up a problem for you.</p>
          </>
        ) : predicting ? (
          <>
            <h3>Which way will it tip?</h3>
            <p>The rod is being held level. Work out both moments in your head, then
              choose.{given}</p>
          </>
        ) : (
          <>
            <h3>Balance the rod</h3>
            <p>Drag the <strong>{task.target.m} {u.mass}</strong> mass — the solid one — until
              the rod balances. The dashed masses are fixed.{given}</p>
          </>
        )}
      </div>

      {predicting && !answered && (
        <div className="predict-btns">
          <button className="btn predict" onClick={() => predict('acw')}>Tips to the left ↺</button>
          <button className="btn predict" onClick={() => predict('bal')}>Stays balanced</button>
          <button className="btn predict" onClick={() => predict('cw')}>Tips to the right ↻</button>
        </div>
      )}

      <div className="task-actions">
        <button className="btn primary" onClick={start}>New challenge</button>
        <button className="btn" disabled={!task || predicting || answered} onClick={check}>
          Check my answer
        </button>
        <button className="btn ghost" disabled={!task || predicting} onClick={reveal}>
          Show the answer
        </button>
      </div>

      {feedback && (
        <div className={`feedback show ${feedback.cls}`}>
          <span className="verdict-word">{feedback.word}</span>{feedback.body}
        </div>
      )}
    </div>
  );
}
