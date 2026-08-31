/* ============================================================
   Light — the two graphs that are really experiments.

   1/v against 1/u is how a focal length is measured in a school
   laboratory: take half a dozen readings, plot them, and the line
   cuts both axes at 1/f. The lab can take the readings for you, but
   it is more use if you take them yourself, so there is a button.

   Deviation against incidence is the other one. The minimum is not
   a fact to be learnt but a place on a curve, and the curve is worth
   seeing: it comes down steeply, flattens, and goes up again, and
   the flat bit is why the measurement is a good one.
   ============================================================ */
import { prismDeviation, minDeviation, rad, deg, num } from './engine.js';

const W = 320, H = 210, PAD = { l: 46, r: 12, t: 14, b: 30 };
const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

function Axes({ x0, x1, y0, y1, xLabel, yLabel, xFmt, yFmt }) {
  const px = (x) => PAD.l + ((x - x0) / (x1 - x0)) * IW;
  const py = (y) => PAD.t + IH - ((y - y0) / (y1 - y0)) * IH;
  const ticks = (lo, hi) => {
    const raw = (hi - lo) / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    const st = (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
    const out = [];
    for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(v);
    return out;
  };
  return (
    <g className="inset-axes">
      <rect className="inset-field" x={PAD.l} y={PAD.t} width={IW} height={IH} />
      {ticks(x0, x1).map((v) => (
        <g key={`x${v}`}>
          <line className="inset-grid" x1={px(v)} y1={PAD.t} x2={px(v)} y2={PAD.t + IH} />
          <text className="inset-tick" x={px(v)} y={PAD.t + IH + 13} textAnchor="middle">
            {xFmt(v)}
          </text>
        </g>
      ))}
      {ticks(y0, y1).map((v) => (
        <g key={`y${v}`}>
          <line className="inset-grid" x1={PAD.l} y1={py(v)} x2={PAD.l + IW} y2={py(v)} />
          <text className="inset-tick" x={PAD.l - 5} y={py(v) + 3.5} textAnchor="end">
            {yFmt(v)}
          </text>
        </g>
      ))}
      {y0 < 0 && y1 > 0 && (
        <line className="inset-zero" x1={PAD.l} y1={py(0)} x2={PAD.l + IW} y2={py(0)} />
      )}
      {x0 < 0 && x1 > 0 && (
        <line className="inset-zero" x1={px(0)} y1={PAD.t} x2={px(0)} y2={PAD.t + IH} />
      )}
      <text className="inset-name x" x={PAD.l + IW} y={H - 4} textAnchor="end">{xLabel}</text>
      <text className="inset-name y" x={4} y={PAD.t + 2} textAnchor="start">{yLabel}</text>
    </g>
  );
}

/* ---------- 1/v against 1/u ---------- */
export function ConjugateGraph({ f, u, v, mirror, readings, onLog, onClear }) {
  const pts = readings.filter((r) => isFinite(r.u) && isFinite(r.v) && r.u && r.v)
    .map((r) => ({ x: 1 / r.u, y: 1 / r.v }));
  const here = isFinite(v) && v !== 0 && u !== 0 ? { x: 1 / u, y: 1 / v } : null;
  const all = here ? [...pts, here] : pts;
  const inv = 1 / f;
  const lim = Math.max(Math.abs(inv) * 1.6, ...all.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))), 0.02);
  const x0 = -lim, x1 = lim, y0 = -lim, y1 = lim;
  const px = (x) => PAD.l + ((x - x0) / (x1 - x0)) * IW;
  const py = (y) => PAD.t + IH - ((y - y0) / (y1 - y0)) * IH;

  /* 1/v = ±1/u + 1/f — a straight line whose two intercepts are both 1/f */
  const slope = mirror ? -1 : 1;
  const line = [x0, x1].map((x) => ({ x, y: slope * x + inv }));

  /* what the readings alone would say, without being told f */
  let fit = null;
  if (pts.length >= 2) {
    const c = pts.reduce((a, p) => a + (p.y - slope * p.x), 0) / pts.length;
    if (Math.abs(c) > 1e-9) fit = 1 / c;
  }

  return (
    <div className="inset">
      <p className="inset-head">
        1/v against 1/u — the line cuts both axes at 1/f
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="inset-svg" role="img"
           aria-label="A graph of one over v against one over u">
        <Axes x0={x0} x1={x1} y0={y0} y1={y1} xLabel="1/u" yLabel="1/v"
              xFmt={(t) => num(t, 2)} yFmt={(t) => num(t, 2)} />
        <line className="inset-line" x1={px(line[0].x)} y1={py(line[0].y)}
              x2={px(line[1].x)} y2={py(line[1].y)} />
        <circle className="inset-intercept" cx={px(0)} cy={py(inv)} r={3.4} />
        <circle className="inset-intercept" cx={px(-slope * inv)} cy={py(0)} r={3.4} />
        {pts.map((p, i) => (
          <g className="inset-reading" key={i}>
            <line x1={px(p.x) - 4} y1={py(p.y) - 4} x2={px(p.x) + 4} y2={py(p.y) + 4} />
            <line x1={px(p.x) - 4} y1={py(p.y) + 4} x2={px(p.x) + 4} y2={py(p.y) - 4} />
          </g>
        ))}
        {here && <circle className="inset-now" cx={px(here.x)} cy={py(here.y)} r={4.2} />}
      </svg>
      <p className="inset-note">
        Both intercepts are <b>1/f = {num(inv, 4)}</b> per cm, so f = {num(f, 2)} cm.
        {fit !== null && (
          <> Your {pts.length} readings on their own give <b>f = {num(fit, 2)} cm</b>.</>
        )}
      </p>
      <div className="task-actions">
        <button type="button" className="btn tiny" onClick={onLog}
                disabled={!isFinite(v) || v === 0}>Record this reading</button>
        <button type="button" className="btn tiny" onClick={onClear}
                disabled={!readings.length}>Clear</button>
      </div>
    </div>
  );
}

/* ---------- deviation against incidence ---------- */
export function DeviationGraph({ A, n, i }) {
  const Ar = rad(A);
  const md = minDeviation(Ar, n);
  const pts = [];
  for (let deg1 = 0.5; deg1 <= 89.5; deg1 += 0.5) {
    const p = prismDeviation(Ar, n, rad(deg1));
    if (p && !p.tir && isFinite(p.D)) pts.push({ x: deg1, y: deg(p.D) });
  }
  if (pts.length < 3 || !md) {
    return (
      <div className="inset">
        <p className="inset-head">Deviation against incidence</p>
        <p className="inset-note">
          Nothing gets out of this prism at any angle at all — it is wider than twice the
          critical angle, so every ray meets the second face past it.
        </p>
      </div>
    );
  }
  const x0 = Math.floor(pts[0].x) - 2, x1 = 90;
  const ys = pts.map((p) => p.y);
  const y0 = Math.min(...ys) - 2, y1 = Math.max(...ys) + 2;
  const px = (x) => PAD.l + ((x - x0) / (x1 - x0)) * IW;
  const py = (y) => PAD.t + IH - ((y - y0) / (y1 - y0)) * IH;
  const here = prismDeviation(Ar, n, rad(i));
  const dMin = deg(md.D), iMin = deg(md.i1);

  return (
    <div className="inset">
      <p className="inset-head">Deviation against incidence — and its minimum</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="inset-svg" role="img"
           aria-label="A graph of deviation against angle of incidence">
        <Axes x0={x0} x1={x1} y0={y0} y1={y1} xLabel="i₁ (°)" yLabel="D (°)"
              xFmt={(t) => num(t, 0)} yFmt={(t) => num(t, 0)} />
        <path className="inset-line curve"
              d={pts.map((p, k) => `${k ? 'L' : 'M'} ${px(p.x)} ${py(p.y)}`).join(' ')} />
        <line className="inset-min" x1={px(iMin)} y1={py(dMin)} x2={px(iMin)} y2={PAD.t + IH} />
        <circle className="inset-intercept" cx={px(iMin)} cy={py(dMin)} r={3.6} />
        <text className="inset-tag" x={px(iMin)} y={py(dMin) - 8} textAnchor="middle">
          D_min {num(dMin, 2)}°
        </text>
        {here && !here.tir && (
          <circle className="inset-now" cx={px(i)} cy={py(deg(here.D))} r={4.2} />
        )}
      </svg>
      <p className="inset-note">
        The curve is flat at the bottom, which is why minimum deviation is the measurement
        worth taking: being a degree out in i₁ barely moves D at all.
      </p>
    </div>
  );
}
