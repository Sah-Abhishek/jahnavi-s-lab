/* ============================================================
   Light — challenge mode.

   Entering takes a snapshot of the visitor's own bench and hands
   it straight back on the way out, so a challenge never costs
   anybody the set-up they were in the middle of.

   While an answer is owed, the working out is blurred AND the rays
   stop at the element. Otherwise "is it real or virtual?" is
   answered by looking rather than by thinking, and the question
   was not worth asking.
   ============================================================ */
import { memo, useEffect, useState } from 'react';
import { newTask, check } from './challenges.js';
'./engine.js';
import { BENCHES } from './labState.js';

function ChallengePanel({ state: s, dispatch }) {
  const [task, setTask] = useState(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    dispatch({ type: 'enterChallenge' });
    return () => dispatch({ type: 'leaveChallenge' });
  }, [dispatch]);

  const load = () => {
    const t = newTask();
    setTask(t);
    setText('');
    setResult(null);
    const patch = { bench: t.bench };
    for (const key of ['mirror', 'lens', 'refract', 'eye']) {
      if (t.patch[key]) patch[key] = { ...s[key], ...t.patch[key] };
    }
    dispatch({ type: 'loadTask', task: t, patch });
  };

  useEffect(() => { if (!task) load(); /* eslint-disable-next-line */ }, []);

  const answer = (given) => {
    if (!task || result?.ok) return;
    const r = check(task, given);
    if (r.ok === null) { setResult(r); return; }
    setResult(r);
    dispatch({ type: 'score', correct: r.ok });
    if (r.ok) dispatch({ type: 'answered' });
  };

  const reveal = () => {
    setResult({ ok: false, shown: true, hint: task.working });
    dispatch({ type: 'answered' });
  };

  const benchName = task ? (BENCHES.find((b) => b.id === task.bench) || {}).name : '';

  return (
    <div className="card tabpanel">
      <div className="score-bar">
        <span>Score</span>
        <strong>{s.score} / {s.attempts}</strong>
      </div>

      {task && (
        <div className="task-box">
          <h3>{task.ask}</h3>
          <p>{task.prompt}</p>
          <p className="given">
            {task.given.map(([k, v]) => (
              <span className="given-item" key={k}><i>{k}</i> = <b>{v}</b></span>
            ))}
            <span className="on-bench">{benchName}</span>
          </p>
        </div>
      )}

      {task && task.kind === 'choice' ? (
        <div className="predict-btns">
          {task.choices.map((c) => (
            <button key={c.id} type="button"
                    className={`btn${result && result.ok && task.answer === c.id ? ' primary' : ''}`}
                    disabled={!!result && result.ok}
                    onClick={() => answer(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      ) : task && (
        <div className="answer-box">
          <label className="label" htmlFor="ans">
            Your answer{task.unit ? ` (in ${task.unit === '°' ? 'degrees' : task.unit})` : ''}
          </label>
          <input id="ans" className="co-input" type="text" inputMode="decimal"
                 value={text} placeholder={task.signMatters ? 'mind the sign' : ''}
                 disabled={!!result && result.ok}
                 onChange={(e) => setText(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') answer(text); }} />
          <div className="task-actions spaced">
            <button type="button" className="btn primary" disabled={!!result && result.ok}
                    onClick={() => answer(text)}>Check</button>
            <button type="button" className="btn" onClick={reveal}>Show me</button>
          </div>
        </div>
      )}

      {result && (
        <div className={`feedback show ${result.ok ? 'good' : result.ok === null ? 'info' : 'bad'}`}>
          {result.ok ? (
            <><span className="verdict-word">Yes.</span> {task.working}</>
          ) : result.shown ? (
            <><span className="verdict-word">Here it is.</span> {task.working}</>
          ) : (
            <>{result.sign && <span className="verdict-word">Nearly.</span>} {result.hint}</>
          )}
        </div>
      )}

      <div className="task-actions spaced">
        <button type="button" className="btn wide" onClick={load}>Another one</button>
      </div>

      <p className="micro">
        The bench behind this panel is set up as the question describes it — but the rays stop at
        the {task && (task.bench === 'lens' ? 'lens' : task.bench === 'mirror' ? 'mirror' : 'glass')}{' '}
        until you have answered, so the picture cannot answer for you.
      </p>
    </div>
  );
}

export default memo(ChallengePanel);
