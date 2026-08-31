/* ============================================================
   Reflection — the controls.

   The mirror can be written or drawn, and the two are the same
   thing: type an equation and the mirror on the graph moves onto
   it; drag the mirror and the equation here rewrites itself. The
   box below is never showing anything but the line that is
   actually on the graph.
   ============================================================ */
import { memo } from 'react';
import Stepper from '../../components/Stepper';
import EquationField from './EquationField';
import {
  OBJECTS, vertexLabels, V,
  parseLine2, lineText2, generalText2, tidyLine,
  parsePlane3, planeText, tidyPlane,
  parseLine3, lineVectorText, lineSymmetricText,
  PRESETS_2D, PRESETS_3D, num,
} from './engine';
import { lineOf, line3Of } from './labState';

/* ---------- one vertex, as numbers ---------- */
function VertexBlock({ label, p, three, index, dispatch, range, disabled }) {
  const set = (key, value) => dispatch({ type: 'point', index, value: { ...p, [key]: value } });
  const axes = three ? ['x', 'y', 'z'] : ['x', 'y'];
  return (
    <div className="vertex-block">
      <div className="vertex-head">
        <span className="dot obj-swatch" />
        <span className="vertex-title">{label}</span>
        <span className="vertex-co">
          ({axes.map((k) => num(p[k])).join(', ')})
        </span>
      </div>
      <div className={`co-grid${three ? ' three' : ''}`}>
        {axes.map((k) => (
          <label key={k} className="co-cell">
            <span className="co-name">{k}</span>
            <Stepper mini value={p[k]} min={-range} max={range} step={1} unit=""
                     disabled={disabled}
                     less={`Lower ${k}`} more={`Raise ${k}`}
                     onChange={(v) => set(k, v)} />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ---------- the quick mirrors ---------- */
const QUICK_2D = [
  { text: 'y = 0', line: { a: 0, b: 1, c: 0 } },
  { text: 'x = 0', line: { a: 1, b: 0, c: 0 } },
  { text: 'y = x', line: { a: 1, b: -1, c: 0 } },
  { text: 'y = −x', line: { a: 1, b: 1, c: 0 } },
];
const QUICK_PLANE = [
  { text: 'z = 0', plane: { a: 0, b: 0, c: 1, d: 0 } },
  { text: 'y = 0', plane: { a: 0, b: 1, c: 0, d: 0 } },
  { text: 'x = 0', plane: { a: 1, b: 0, c: 0, d: 0 } },
  { text: 'x = y', plane: { a: 1, b: -1, c: 0, d: 0 } },
];
const QUICK_LINE3 = [
  { text: 'the x-axis', A: V(0, 0, 0), u: V(1, 0, 0) },
  { text: 'the y-axis', A: V(0, 0, 0), u: V(0, 1, 0) },
  { text: 'the z-axis', A: V(0, 0, 0), u: V(0, 0, 1) },
];

function ExplorePanel({ state: s, dispatch }) {
  const editable = s.mode !== 'challenge';
  const three = s.dim === '3d';
  const labels = vertexLabels(s.object);
  const pts = (three ? s.pts3 : s.pts2).slice(0, labels.length);
  const view = (key, value) => dispatch({ type: 'view', key, value });
  const presets = three ? PRESETS_3D : PRESETS_2D;
  const ln3 = line3Of(s);

  return (
    <div className="card tabpanel">
      {/* ---------- which graph ---------- */}
      <section className="ctrl-block">
        <div className="row-head"><span className="label">The graph</span></div>
        <div className="segmented n2" role="radiogroup" aria-label="Which graph">
          {[['2d', 'Flat', 'x and y'], ['3d', 'Space', 'x, y and z']].map(([id, name, sub]) => (
            <button key={id} type="button" role="radio" aria-checked={s.dim === id}
                    className={`seg${s.dim === id ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'dim', value: id })}>
              <span className="seg-name">{name}</span>
              <span className="seg-sub">{sub}</span>
            </button>
          ))}
        </div>
        <p className="micro">
          {three
            ? 'Drag to swing the view round, hold shift or scroll to move about, pinch '
              + 'to zoom. A point moves in the sheet facing you, so turn the scene to '
              + 'reach the direction you want.'
            : 'Everything on the graph can be dragged: the point, either end of the '
              + 'mirror, the mirror itself — and the paper, to travel across it.'}
        </p>
      </section>

      {/* ---------- the object ---------- */}
      <section className="ctrl-block">
        <div className="row-head"><span className="label">What is being reflected</span></div>
        <div className="segmented n3" role="radiogroup" aria-label="What is being reflected">
          {OBJECTS.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={s.object === o.id}
                    className={`seg${s.object === o.id ? ' active' : ''}`} disabled={!editable}
                    onClick={() => dispatch({ type: 'object', value: o.id })}>
              <span className="seg-name">
                {o.id === 'point' ? 'Point' : o.id === 'triangle' ? 'Triangle' : 'Quad'}
              </span>
              <span className="seg-sub">{o.n} {o.n === 1 ? 'vertex' : 'vertices'}</span>
            </button>
          ))}
        </div>
        {pts.map((p, i) => (
          <VertexBlock key={labels[i]} label={labels[i]} p={p} three={three} index={i}
                       dispatch={dispatch} range={s.range} disabled={!editable} />
        ))}
      </section>

      {/* ---------- the mirror ---------- */}
      <section className="ctrl-block">
        <div className="row-head">
          <span className="label" id="mirrorLabel">The mirror</span>
        </div>

        {three && (
          <div className="segmented n2" role="radiogroup" aria-label="The mirror in space">
            {[['plane', 'A plane', 'a real mirror'], ['line', 'A line', 'a half-turn']]
              .map(([id, name, sub]) => (
                <button key={id} type="button" role="radio" aria-checked={s.mirror3 === id}
                        className={`seg${s.mirror3 === id ? ' active' : ''}`} disabled={!editable}
                        onClick={() => dispatch({ type: 'mirror3', value: id })}>
                  <span className="seg-name">{name}</span>
                  <span className="seg-sub">{sub}</span>
                </button>
              ))}
          </div>
        )}

        {!three && (
          <>
            <EquationField id="mirror2" value={lineText2(lineOf(s))} disabled={!editable}
                           placeholder="y = 2x + 1"
                           parse={parseLine2}
                           onLine={(got) => dispatch({ type: 'line2', value: got.line })} />
            <p className="eq-alt">Also: <code>{generalText2(lineOf(s))}</code></p>
            <div className="quick">
              {QUICK_2D.map((q) => (
                <button key={q.text} className="btn tiny" disabled={!editable}
                        onClick={() => dispatch({ type: 'line2', value: tidyLine(q.line) })}>
                  {q.text}
                </button>
              ))}
            </div>
            <p className="micro">
              Write it however it comes: <code>y = 2x + 1</code>, <code>x = −2</code>,{' '}
              <code>3x − 4y + 5 = 0</code>, even <code>x/2 + y/3 = 1</code>. Or forget the
              equation and drag the mirror's two ends across the graph — the line above
              will keep up.
            </p>
          </>
        )}

        {three && s.mirror3 === 'plane' && (
          <>
            <EquationField id="mirror3p" value={planeText(s.plane)} disabled={!editable}
                           placeholder="x + y + z = 3"
                           parse={parsePlane3}
                           onLine={(got) => dispatch({ type: 'plane', value: got.plane })} />
            <div className="quick">
              {QUICK_PLANE.map((q) => (
                <button key={q.text} className="btn tiny" disabled={!editable}
                        onClick={() => dispatch({ type: 'plane', value: tidyPlane(q.plane) })}>
                  {q.text}
                </button>
              ))}
            </div>
            <div className="sub-ctrl">
              <span className="label">Its normal, and how far out it sits</span>
              <div className="co-grid three">
                {['a', 'b', 'c'].map((key) => (
                  <label key={key} className="co-cell">
                    <span className="co-name">{key}</span>
                    <Stepper mini value={s.plane[key]} min={-9} max={9} step={1} unit=""
                             disabled={!editable}
                             less={`Lower ${key}`} more={`Raise ${key}`}
                             onChange={(v) => dispatch({ type: 'planeCoef', key, value: v })} />
                  </label>
                ))}
              </div>
              <label className="co-cell wide">
                <span className="co-name">d</span>
                <Stepper mini value={s.plane.d} min={-40} max={40} step={1} unit=""
                         disabled={!editable}
                         less="Lower d" more="Raise d"
                         onChange={(v) => dispatch({ type: 'planeCoef', key: 'd', value: v })} />
              </label>
              <p className="micro">
                The plane is <code>a x + b y + c z + d = 0</code>. The three numbers
                <code> (a, b, c)</code> are the direction it faces — the arrow drawn on it —
                and <code>d</code> slides it along that direction without ever tilting it.
              </p>
            </div>
          </>
        )}

        {three && s.mirror3 === 'line' && (
          <>
            <EquationField id="mirror3l" value={lineVectorText(ln3)} disabled={!editable}
                           placeholder="r = (0, 0, 0) + t(1, 1, 0)"
                           parse={parseLine3}
                           onLine={(got) => dispatch({ type: 'line3', value: got.line })} />
            <p className="eq-alt">Also: <code>{lineSymmetricText(ln3)}</code></p>
            <div className="quick">
              {QUICK_LINE3.map((q) => (
                <button key={q.text} className="btn tiny" disabled={!editable}
                        onClick={() => dispatch({ type: 'line3', value: { A: q.A, u: q.u } })}>
                  {q.text}
                </button>
              ))}
            </div>
            <div className="sub-ctrl">
              <span className="label">Two points it passes through</span>
              {['A', 'B'].map((which) => {
                const p = which === 'A' ? s.lnA : s.lnB;
                return (
                  <div key={which} className="co-grid three">
                    {['x', 'y', 'z'].map((k) => (
                      <label key={k} className="co-cell">
                        <span className="co-name">{which}·{k}</span>
                        <Stepper mini value={p[k]} min={-s.range} max={s.range} step={1} unit=""
                                 disabled={!editable}
                                 less={`Lower ${k}`} more={`Raise ${k}`}
                                 onChange={(v) => dispatch({
                                   type: 'lnPoint', which, value: { ...p, [k]: v },
                                 })} />
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
            <p className="micro">
              A line in space needs a point and a direction — there is no single equation
              for it the way there is for a plane. Careful: this is <strong>not</strong> a
              mirror. Turning a point half a revolution about a line flips two directions,
              not one, so the result is not a mirror image at all.
            </p>
          </>
        )}
      </section>

      {/* ---------- what is drawn ---------- */}
      <section className="ctrl-block">
        <span className="label">Show</span>
        <div className="checks">
          <label className="chk">
            <input type="checkbox" checked={s.showPerp}
                   onChange={(e) => view('showPerp', e.target.checked)} />
            <span>The perpendicular</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={s.showDistance}
                   onChange={(e) => view('showDistance', e.target.checked)} />
            <span>Equal distances</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={s.showCoords}
                   onChange={(e) => view('showCoords', e.target.checked)} />
            <span>Coordinates</span>
          </label>
          {three && s.mirror3 === 'plane' && (
            <label className="chk">
              <input type="checkbox" checked={s.showNormal}
                     onChange={(e) => view('showNormal', e.target.checked)} />
              <span>The normal</span>
            </label>
          )}
        </div>
        <label className="chk spaced">
          <input type="checkbox" checked={s.snap}
                 onChange={(e) => dispatch({ type: 'snap', value: e.target.checked })} />
          <span>Snap to whole numbers</span>
        </label>
        <p className="micro">
          The graph is a window on the plane, not a frame around it: drag the paper or
          scroll to travel across it, pinch or <strong>Ctrl</strong>+scroll to zoom, and
          neither runs out. Moving about changes only where you are standing to look —
          nothing on the graph moves with you, so anything that goes off the edge is
          exactly where you left it. <strong>Reset view</strong> comes back to the origin.
        </p>
      </section>

      {/* ---------- ready-made set-ups ---------- */}
      <section className="ctrl-block">
        <span className="label">Ready-made set-ups</span>
        <div className="presets">
          {Object.entries(presets).map(([key, p]) => (
            <button key={key} className="btn preset" title={p.ask} disabled={!editable}
                    onClick={() => dispatch({ type: 'preset', name: key })}>
              {p.label}
              <span className="preset-ask">{p.ask}</span>
            </button>
          ))}
        </div>
        <button className="btn ghost wide" onClick={() => dispatch({ type: 'reset' })}>
          Reset the lab
        </button>
        <p className="micro">
          Your set-up is kept in this browser, so it is still here next time. Nothing
          leaves your device. <strong>Reset</strong> clears it and starts fresh.
        </p>
      </section>
    </div>
  );
}

export default memo(ExplorePanel);
