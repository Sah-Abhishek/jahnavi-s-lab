/* ============================================================
   Reflection — challenges.

   Two kinds, and they pull in opposite directions on purpose.
   "Where does it land" is the method run forwards: you are given
   the mirror and asked for the image. "Find the mirror" runs it
   backwards, and cannot be answered by typing — the mirror has
   to be dragged onto the graph until the image falls where it
   is wanted, which is only possible if you have worked out that
   the mirror is the perpendicular bisector of the join.

   While a question is open the working-out sheet is blurred, so
   the answer cannot simply be read off the page.
   ============================================================ */
import { useEffect, useState } from 'react';
import EquationField from './EquationField';
import { newTask, checkImage } from './challenges';
import {
  reflect2, subV, addV, scaleV, normV, dot, parseLine2,
  lineText2, generalText2, planeText, lineVectorText, ptText, num, substituted, squares,
} from './engine';
import { lineOf } from './labState';

const blank = (three) => ({ x: '', y: '', z: three ? '' : undefined });

export default function ChallengePanel({ state: s, dispatch }) {
  const [task, setTask] = useState(null);
  const [guess, setGuess] = useState(() => blank(false));
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState(null);

  /* opening the tab parks the visitor's own set-up; leaving puts it back */
  useEffect(() => {
    dispatch({ type: 'enterChallenge' });
    return () => dispatch({ type: 'leaveChallenge' });
  }, [dispatch]);

  const start = () => {
    const t = newTask(s.dim);
    if (!t) return;
    setTask(t);
    setGuess(blank(t.dim === '3d'));
    setAnswered(false);
    setFeedback(null);
    dispatch({ type: 'loadTask', task: t });
  };

  const finish = (correct) => {
    setAnswered(true);
    dispatch({ type: 'score', correct });
  };

  const three = task?.dim === '3d';

  /* ---------- the mirror this task is set against ---------- */
  const mirrorText = !task ? '' : task.dim === '3d'
    ? (task.mirror === 'plane'
        ? planeText(task.plane)
        : lineVectorText({ A: task.lnA, u: subV(task.lnB, task.lnA) }))
    : lineText2(task.line);

  /* ---------- the working, shown once it is over ---------- */
  const working = (t) => {
    if (t.dim === '2d' && t.type === 'image') {
      const L = t.line;
      const val = L.a * t.point.x + L.b * t.point.y + L.c;
      const den = L.a * L.a + L.b * L.b;
      return (
        <span className="work">
          {generalText2(L)}, so n = ({num(L.a)}, {num(L.b)})<br />
          n·n = {squares([L.a, L.b])} = {num(den)}<br />
          {substituted([L.a, L.b], [t.point.x, t.point.y], L.c)} = {num(val)}<br />
          t = {num(val)} ÷ {num(den)} = {num(val / den)}<br />
          P′ = P − 2t n = <strong>{ptText(t.answer)}</strong>
        </span>
      );
    }
    if (t.dim === '3d' && t.mirror === 'plane') {
      const pl = t.plane;
      const val = pl.a * t.point.x + pl.b * t.point.y + pl.c * t.point.z + pl.d;
      const den = pl.a * pl.a + pl.b * pl.b + pl.c * pl.c;
      return (
        <span className="work">
          n = ({num(pl.a)}, {num(pl.b)}, {num(pl.c)}), so n·n = {squares([pl.a, pl.b, pl.c])} = {num(den)}<br />
          n·P + d = {substituted([pl.a, pl.b, pl.c], [t.point.x, t.point.y, t.point.z], pl.d)} = {num(val)}<br />
          t = {num(val)} ÷ {num(den)} = {num(val / den)}<br />
          P′ = P − 2t n = <strong>{ptText(t.answer, true)}</strong>
        </span>
      );
    }
    if (t.dim === '3d') {
      const u = normV(subV(t.lnB, t.lnA));
      const along = dot(subV(t.point, t.lnA), u);
      const foot = addV(t.lnA, scaleV(u, along));
      return (
        <span className="work">
          û = {ptText(u, true)}<br />
          t = (P − A)·û = {num(along)}<br />
          M = A + t û = {ptText(foot, true)}<br />
          P′ = 2M − P = <strong>{ptText(t.answer, true)}</strong>
        </span>
      );
    }
    /* find the mirror */
    const mid = { x: (t.point.x + t.image.x) / 2, y: (t.point.y + t.image.y) / 2 };
    return (
      <span className="work">
        the join runs from {ptText(t.point)} to {ptText(t.image)}<br />
        its midpoint is {ptText(mid)}, and the mirror must pass through it<br />
        the join's gradient is {num((t.image.y - t.point.y) / (t.image.x - t.point.x))},
        {' '}so the mirror's is the negative reciprocal<br />
        the mirror is <strong>{lineText2(t.line)}</strong>
      </span>
    );
  };

  /* ---------- marking ---------- */
  const checkCoordinates = () => {
    if (!task || answered) return;
    const keys = three ? ['x', 'y', 'z'] : ['x', 'y'];
    if (keys.some((k) => guess[k] === '' || !isFinite(Number(guess[k])))) {
      setFeedback({ cls: 'info', word: 'Nothing to mark', body: 'Fill in every coordinate first.' });
      return;
    }
    const right = checkImage(task, guess);
    finish(right);
    setFeedback({
      cls: right ? 'good' : 'bad',
      word: right ? 'Correct' : 'Not quite',
      body: right
        ? <>The image really is <strong>{ptText(task.answer, three)}</strong>.{working(task)}</>
        : <>You said {ptText({
              x: Number(guess.x), y: Number(guess.y), z: Number(guess.z || 0),
            }, three)}. It should be <strong>{ptText(task.answer, three)}</strong>.{working(task)}</>,
    });
  };

  /* the mirror the visitor has actually put on the graph */
  const drawn = task?.type === 'mirror' ? lineOf(s) : null;
  const landsAt = drawn ? reflect2(drawn, task.point) : null;
  const onTarget = landsAt
    && Math.hypot(landsAt.x - task.image.x, landsAt.y - task.image.y) < 0.02;

  const checkMirrorPlacement = () => {
    if (!task || answered) return;
    finish(!!onTarget);
    setFeedback({
      cls: onTarget ? 'good' : 'bad',
      word: onTarget ? 'That is the mirror' : 'Not there yet',
      body: onTarget
        ? <>You drew <strong>{lineText2(drawn)}</strong>, and it is the only line that
            works — the perpendicular bisector of the join.{working(task)}</>
        : <>Your line sends P to {ptText(landsAt)}, not {ptText(task.image)}. The mirror
            wanted is <strong>{lineText2(task.line)}</strong>.{working(task)}</>,
    });
    if (!onTarget) dispatch({ type: 'line2', value: task.line });
  };

  const reveal = () => {
    if (!task) return;
    if (!answered) finish(false);
    else dispatch({ type: 'answered' });
    if (task.type === 'mirror') dispatch({ type: 'line2', value: task.line });
    setFeedback({
      cls: 'info', word: 'Answer',
      body: task.type === 'mirror'
        ? <>The mirror is <strong>{lineText2(task.line)}</strong>.{working(task)}</>
        : <>The image is <strong>{ptText(task.answer, three)}</strong>.{working(task)}</>,
    });
  };

  const given = task && (
    <span className="given">
      {task.type === 'mirror' ? (
        <>P = {ptText(task.point)}<br />has to land on {ptText(task.image)}</>
      ) : (
        <>P = {ptText(task.point, three)}<br />
          {task.dim === '3d' && task.mirror === 'line' ? 'line ' : 'mirror '}{mirrorText}</>
      )}
    </span>
  );

  const imaging = task?.type === 'image';
  const mirroring = task?.type === 'mirror';

  return (
    <div className="card tabpanel">
      <div className="score-bar">
        <span>Score</span><strong>{s.score} / {s.attempts}</strong>
      </div>

      <div className="task-box">
        {!task ? (
          <>
            <h3>Ready?</h3>
            <p>
              Press <strong>New challenge</strong> and the lab will set a problem on the{' '}
              {s.dim === '3d' ? 'three-dimensional' : 'flat'} graph. Switch graphs on the
              Explore tab to be asked about the other one.
            </p>
          </>
        ) : mirroring ? (
          <>
            <h3>Find the mirror</h3>
            <p>
              Drag the mirror's two ends until P lands exactly on the ring. There is only
              one line that will do it.{given}
            </p>
          </>
        ) : (
          <>
            <h3>Where does it land?</h3>
            <p>
              {task.dim === '3d' && task.mirror === 'line'
                ? 'Turn the point half a revolution about this line and give its coordinates.'
                : 'Reflect the point in this mirror and give the coordinates of the image.'}
              {given}
            </p>
          </>
        )}
      </div>

      {imaging && (
        <div className="answer-box">
          <span className="label">The image is at</span>
          <div className={`co-grid${three ? ' three' : ''}`}>
            {(three ? ['x', 'y', 'z'] : ['x', 'y']).map((k) => (
              <label key={k} className="co-cell">
                <span className="co-name">{k}</span>
                <input className="co-input" type="number" inputMode="numeric"
                       aria-label={`the image's ${k} coordinate`}
                       value={guess[k]} disabled={answered}
                       onChange={(e) => setGuess((g) => ({ ...g, [k]: e.target.value }))}
                       onKeyDown={(e) => { if (e.key === 'Enter') checkCoordinates(); }} />
              </label>
            ))}
          </div>
          <p className="micro">Every answer here is a whole number.</p>
        </div>
      )}

      {mirroring && (
        <div className="answer-box">
          <span className="label">Your mirror, right now</span>
          <EquationField id="challengeMirror" value={lineText2(drawn)} disabled={answered}
                         placeholder="y = 2x + 1"
                         parse={parseLine2}
                         hint="Drag its two ends on the graph, or write it here."
                         onLine={(got) => dispatch({ type: 'line2', value: got.line })} />
          <p className="drawn-now">
            <span className="drawn-lands">which sends P to {ptText(landsAt, false, 3)}</span>
          </p>
          <p className="micro">
            {answered
              ? 'The mirror is on the answer now — drag it about and watch the image follow.'
              : onTarget
                ? 'The image is on the ring. Press Check my answer.'
                : 'The image moves as you go, so you can hunt for it — but the mirror is '
                  + 'the perpendicular bisector of the join, which you can work out instead.'}
          </p>
        </div>
      )}

      <div className="task-actions">
        <button className="btn primary" onClick={start}>New challenge</button>
        <button className="btn" disabled={!task || answered}
                onClick={mirroring ? checkMirrorPlacement : checkCoordinates}>
          Check my answer
        </button>
        <button className="btn ghost" disabled={!task} onClick={reveal}>Show the answer</button>
      </div>

      {feedback && (
        <div className={`feedback show ${feedback.cls}`}>
          <span className="verdict-word">{feedback.word}</span>{feedback.body}
        </div>
      )}
    </div>
  );
}
