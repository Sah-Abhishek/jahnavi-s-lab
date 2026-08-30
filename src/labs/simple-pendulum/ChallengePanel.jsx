/* ============================================================
   Simple Pendulum — challenges.
   Two kinds. "Which is faster" holds both bobs at the top until a
   prediction is in, because the moment they swing the answer is
   obvious. "Make it keep time" asks for the length that gives a
   stated period, which is the formula used backwards.
   ============================================================ */
import { useEffect, useState } from 'react';
import Stepper from '../../components/Stepper';
import { newTask, lengthForPeriod, TUNE_TOLERANCE } from './challenges';
import { LEN_MIN, LEN_MAX, TAU, smallAnglePeriod, fmt, tidy } from './engine';

export default function ChallengePanel({ state: s, dispatch }) {
  const [task, setTask] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState(null);

  /* opening the tab parks the visitor's own apparatus; leaving puts it back */
  useEffect(() => {
    dispatch({ type: 'enterChallenge' });
    return () => dispatch({ type: 'leaveChallenge' });
  }, [dispatch]);

  const start = () => {
    const t = newTask(s.g);
    if (!t) return;
    setTask(t);
    setAnswered(false);
    setFeedback(null);
    dispatch({ type: 'loadTask', task: t, frozen: t.type === 'predict' });
  };

  const score = (correct) => dispatch({ type: 'score', correct });

  /* ---------- which one is faster ---------- */
  const predict = (guess) => {
    if (!task || task.type !== 'predict' || answered) return;
    setAnswered(true);
    dispatch({ type: 'unfreeze' });
    const right = guess === task.answer;
    score(right);
    const Ta = smallAnglePeriod(task.a.length, task.g);
    const Tb = smallAnglePeriod(task.b.length, task.g);
    const same = task.answer === 'same';
    setFeedback({
      cls: right ? 'good' : 'bad',
      word: right ? 'Correct' : 'Not quite',
      body: (
        <>
          {same
            ? <>They keep <strong>the same time</strong>. The strings are the same length, and
                the mass never entered the formula — {tidy(task.a.mass)} kg
                and {tidy(task.b.mass)} kg swing together.</>
            : <><strong>{task.answer.toUpperCase()}</strong> is faster — it is on the shorter
                string, and a shorter string means a shorter period.</>}
          <span className="work">
            A: 2π√({tidy(task.a.length)} ÷ {task.g}) = {fmt(Ta, 3)} s<br />
            B: 2π√({tidy(task.b.length)} ÷ {task.g}) = {fmt(Tb, 3)} s
          </span>
        </>
      ),
    });
  };

  /* ---------- make it keep time ---------- */
  const answerLength = task && task.type === 'tune' ? lengthForPeriod(task.period, task.g) : null;

  const working = (t) => (
    <span className="work">
      T = 2π √(L ÷ g) → L = g (T ÷ 2π)²<br />
      L = {t.g} × ({fmt(t.period, 3)} ÷ {fmt(TAU, 4)})²<br />
      L = <strong>{fmt(t.target, 2)} m</strong>
    </span>
  );

  const check = () => {
    if (!task || task.type !== 'tune' || answered) return;
    const got = s.a.length;
    const off = Math.abs(got - task.target);
    setAnswered(true);
    const right = off <= TUNE_TOLERANCE;
    score(right);
    setFeedback({
      cls: right ? 'good' : 'bad',
      word: right ? 'That keeps time' : 'Not yet',
      body: right
        ? <>{fmt(got, 2)} m gives a period of {fmt(smallAnglePeriod(got, task.g), 3)} s,
            against the {fmt(task.period, 3)} s asked for.{working(task)}</>
        : <>{fmt(got, 2)} m swings in {fmt(smallAnglePeriod(got, task.g), 3)} s — it needs to
            be <strong>{fmt(task.target, 2)} m</strong>, which
            is {fmt(off, 2)} m {got > task.target ? 'shorter' : 'longer'} than you
            set.{working(task)}</>,
    });
    if (!right) dispatch({ type: 'arm', which: 'a', key: 'length', value: task.target });
  };

  const reveal = () => {
    if (!task || task.type !== 'tune') return;
    dispatch({ type: 'arm', which: 'a', key: 'length', value: task.target });
    if (!answered) { setAnswered(true); score(false); }
    setFeedback({
      cls: 'info', word: 'Answer',
      body: <>The string has to be <strong>{fmt(task.target, 2)} m</strong> long.{working(task)}</>,
    });
  };

  const given = task && (
    <span className="given">
      g = {task.g} N/kg<br />
      {task.type === 'predict'
        ? <>A: {tidy(task.a.length)} m string, {tidy(task.a.mass)} kg bob<br />
            B: {tidy(task.b.length)} m string, {tidy(task.b.mass)} kg bob</>
        : <>wanted period T = {fmt(task.period, 3)} s<br />
            bob {tidy(task.a.mass)} kg · released from {tidy(task.a.amplitude)}°</>}
    </span>
  );

  const predicting = task?.type === 'predict';
  const tuning = task?.type === 'tune';

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
            <h3>Which one swings faster?</h3>
            <p>Both bobs are being held at the top. Work it out before you let them
              go.{given}</p>
          </>
        ) : (
          <>
            <h3>Make it keep time</h3>
            <p>Set the string so the pendulum swings with the period asked for. The formula
              runs backwards.{given}</p>
          </>
        )}
      </div>

      {predicting && !answered && (
        <div className="predict-btns">
          <button className="btn predict" onClick={() => predict('a')}>A swings faster</button>
          <button className="btn predict" onClick={() => predict('same')}>They keep the same time</button>
          <button className="btn predict" onClick={() => predict('b')}>B swings faster</button>
        </div>
      )}

      {tuning && (
        <div className="tune-box">
          <label className="field-label" htmlFor="tuneLen">Length of the string</label>
          <Stepper id="tuneLen" value={s.a.length} min={LEN_MIN} max={LEN_MAX} step={0.05}
                   unit="m" less="Shorter string" more="Longer string" disabled={answered}
                   format={(v) => v.toFixed(2)}
                   onChange={(v) => dispatch({ type: 'arm', which: 'a', key: 'length', value: v })} />
          <input type="range" min={0.2} max={2.5} step={0.05} value={Math.min(s.a.length, 2.5)}
                 disabled={answered} aria-label="Length of the string"
                 onChange={(e) => dispatch({ type: 'arm', which: 'a', key: 'length',
                                             value: parseFloat(e.target.value) })} />
          <p className="tune-now">
            gives T = <strong>{fmt(smallAnglePeriod(s.a.length, task.g), 3)} s</strong>
            {answerLength != null && (
              <span className="tune-target"> · wanted {fmt(task.period, 3)} s</span>
            )}
          </p>
        </div>
      )}

      <div className="task-actions">
        <button className="btn primary" onClick={start}>New challenge</button>
        <button className="btn" disabled={!tuning || answered} onClick={check}>Check my answer</button>
        <button className="btn ghost" disabled={!tuning} onClick={reveal}>Show the answer</button>
      </div>

      {feedback && (
        <div className={`feedback show ${feedback.cls}`}>
          <span className="verdict-word">{feedback.word}</span>{feedback.body}
        </div>
      )}
    </div>
  );
}
