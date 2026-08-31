/* ============================================================
   Reflection — the working out.

   The lab does not hand over an answer; it shows the four lines
   anyone would write to get there. The same four lines serve the
   flat mirror, the mirror plane and the half-turn about a line,
   because underneath they are the same four lines.

   A shape gets one more panel: what survived. The perimeter is
   unchanged and the signed area has flipped sign — which is the
   arithmetic of "same size, other way round".
   ============================================================ */
import {
  subV, dot, lenV, normV,
  reflect2, foot2, signedDist2, lineText2, generalText2,
  reflectPlane, footPlane, signedDistPlane, planeText, planeNormal,
  reflectLine3, footLine3, distLine3, lineVectorText,
  perimeter, shoelace, vertexLabels, num, ptText, fracText, substituted, squares,
} from './engine';
import { lineOf, line3Of } from './labState';

/* ============================================================
   WHAT IS BEING WORKED OUT
   ============================================================ */

/** Everything the sheet and the status bar need, for either graph. */
export function readout(s) {
  const labels = vertexLabels(s.object);
  const three = s.dim === '3d';
  const pts = (three ? s.pts3 : s.pts2).slice(0, labels.length);

  if (!three) {
    const line = lineOf(s);
    const den = line.a * line.a + line.b * line.b;
    return {
      three: false, kind: 'line2', labels, pts, line,
      mirrorText: lineText2(line),
      rows: pts.map((p, i) => {
        const value = line.a * p.x + line.b * p.y + line.c;
        return {
          label: labels[i], p,
          value, t: value / den,
          dist: Math.abs(signedDist2(line, p)),
          side: Math.sign(signedDist2(line, p)),
          foot: foot2(line, p),
          image: reflect2(line, p),
        };
      }),
    };
  }

  if (s.mirror3 === 'plane') {
    const pl = s.plane;
    const n = planeNormal(pl);
    const den = dot(n, n);
    return {
      three: true, kind: 'plane', labels, pts, plane: pl, normal: n,
      mirrorText: planeText(pl),
      rows: pts.map((p, i) => {
        const value = dot(n, p) + pl.d;
        return {
          label: labels[i], p,
          value, t: value / den,
          dist: Math.abs(signedDistPlane(pl, p)),
          side: Math.sign(signedDistPlane(pl, p)),
          foot: footPlane(pl, p),
          image: reflectPlane(pl, p),
        };
      }),
    };
  }

  const ln = line3Of(s);
  const u = normV(ln.u);
  return {
    three: true, kind: 'line3', labels, pts, ln, unit: u,
    mirrorText: lineVectorText(ln),
    rows: pts.map((p, i) => ({
      label: labels[i], p,
      t: dot(subV(p, ln.A), u),
      dist: distLine3(ln, p),
      side: 0,
      foot: footLine3(ln, p),
      image: reflectLine3(ln, p),
    })),
  };
}

const same = (a, b, three) => (three
  ? lenV(subV(a, b)) < 1e-7
  : Math.hypot(a.x - b.x, a.y - b.y) < 1e-7);

/* ============================================================
   ABOVE THE APPARATUS
   ============================================================ */

export function StageHead({ state: s }) {
  const r = readout(s);
  const first = r.rows[0];
  const onMirror = r.rows.every((row) => same(row.p, row.image, r.three));
  const single = r.rows.length === 1;

  const word = r.kind === 'line3' ? 'Half-turn about' : 'Mirror';
  const pill = onMirror
    ? <span className="pill idle">On the mirror — it does not move</span>
    : r.kind === 'line3'
      ? <span className="pill wait">A half-turn, not a mirror image</span>
      : <span className="pill">Mirror image</span>;

  return (
    <div className="stage-head">
      {pill}
      <div className="net-readout">
        <span>{word}</span>
        <strong className="mirror-figure">{r.mirrorText}</strong>
      </div>
      <div className="net-readout">
        <span>{single ? 'Image' : 'Vertices'}</span>
        <strong>
          {single
            ? ptText(first.image, r.three, 3)
            : `${r.rows.length} reflected`}
        </strong>
      </div>
    </div>
  );
}

/* ============================================================
   THE SHEET
   ============================================================ */

/** The recipe, with this lab's actual numbers in it. */
function Working({ r }) {
  const row = r.rows[0];
  const L = row.label;
  const p = row.p;
  const lines = [];

  if (r.kind === 'line3') {
    const u = r.unit, A = r.ln.A;
    lines.push(
      ['the line', `through ${ptText(A, true)}, along ${ptText(r.ln.u, true)}`],
      ['a unit step along it', `û = ${ptText(u, true)}`],
      [`${L} − A`, ptText(subV(p, A), true)],
      ['how far along the foot is', `t = (${L} − A) · û = ${num(row.t)}`],
      ['the foot', `M = A + t û = ${ptText(row.foot, true)}`],
      ['the image', `${L}′ = 2M − ${L} = ${ptText(row.image, true)}`],
    );
  } else {
    const three = r.three;
    const n = three ? [r.plane.a, r.plane.b, r.plane.c] : [r.line.a, r.line.b];
    const cst = three ? r.plane.d : r.line.c;
    const coords = three ? [p.x, p.y, p.z] : [p.x, p.y];
    const nn = n.reduce((sum, v) => sum + v * v, 0);
    lines.push(
      ['the mirror', three ? planeText(r.plane) : generalText2(r.line)],
      ['its normal, squared', `${squares(n)} = ${num(nn)}`],
      [`put ${L} into it`, `${substituted(n, coords, cst)} = ${num(row.value)}`],
      ['the step', `t = ${num(row.value)} / ${num(nn)} = ${fracText(row.t)}`],
      ['the foot', `M = ${L} − t n = ${ptText(row.foot, three)}`],
      ['the image', `${L}′ = ${L} − 2t n = ${ptText(row.image, three)}`],
    );
  }

  return (
    <div className="working">
      <span className="working-head">The working, for {L}</span>
      <dl className="work-list">
        {lines.map(([k, v]) => (
          <div key={k} className="work-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="working-note">
        {r.kind === 'line3'
          ? 'The foot is the nearest point on the line, and the image is that point '
            + 'reached twice over. Take away the point you started from and you are '
            + 'exactly as far past the line as you began before it.'
          : 'The foot is one step of t along the normal; the image is that same step '
            + 'taken twice. That is the whole method — and it is why the mirror always '
            + 'ends up halfway between the two.'}
      </p>
    </div>
  );
}

/** What reflection left alone, for a shape. */
function Congruence({ r }) {
  const before = perimeter(r.pts, r.three);
  const after = perimeter(r.rows.map((x) => x.image), r.three);
  const flat = !r.three;
  const areaBefore = flat ? shoelace(r.pts) : null;
  const areaAfter = flat ? shoelace(r.rows.map((x) => x.image)) : null;
  const flipped = flat && Math.abs(areaBefore) > 1e-9
    && Math.sign(areaBefore) !== Math.sign(areaAfter);

  return (
    <>
      <div className="sums">
        <div className="sum tint-obj">
          <span className="sum-label">The object</span>
          <code className="expr">
            {r.pts.map((p) => ptText(p, r.three)).join(' ')}
          </code>
          <strong>{num(before, 3)}</strong>
          <span className="sum-foot">perimeter{flat ? `, area ${num(Math.abs(areaBefore), 3)}` : ''}</span>
        </div>
        <div className="cmp">=</div>
        <div className="sum tint-img">
          <span className="sum-label">The image</span>
          <code className="expr">
            {r.rows.map((x) => ptText(x.image, r.three)).join(' ')}
          </code>
          <strong>{num(after, 3)}</strong>
          <span className="sum-foot">perimeter{flat ? `, area ${num(Math.abs(areaAfter), 3)}` : ''}</span>
        </div>
      </div>
      <p className="sums-note">
        Every length is untouched — that is what makes reflection a congruence.
      </p>
      {flat && (
        <div className={`verdict ${flipped ? 'warn' : ''}`}>
          {flipped ? (
            <>
              But go round the vertices in order and the <strong>signed</strong> area has
              changed sign: <strong>{num(areaBefore, 3)}</strong> became{' '}
              <strong>{num(areaAfter, 3)}</strong>. The shape came back the same size
              and the other way round. No amount of sliding or turning can undo that,
              which is why a reflection is not a rotation in disguise.
            </>
          ) : (
            <>The vertices are in a straight line, so there is no area and no way round
              to reverse. Move one of them off the line to see the flip.</>
          )}
        </div>
      )}
    </>
  );
}

export default function CalcSheet({ state: s, masked }) {
  const r = readout(s);
  const single = r.rows.length === 1;
  const distHead = r.kind === 'line3' ? 'From the line' : 'From the mirror';
  const valueHead = r.kind === 'line3' ? 'Along the line, t'
    : r.three ? 'a x + b y + c z + d' : 'a x + b y + c';

  return (
    <section className={`card sheet-card refl-card${masked ? ' masked' : ''}`}>
      <div className="mask-note">Answer first</div>
      <div className="sheet-inner">
        <h2>
          The working out
          <span className="sub">
            {r.kind === 'line3' ? 'half-turn about ' : 'mirror '}{r.mirrorText}
          </span>
        </h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Point</th>
                <th>{valueHead}</th>
                <th>{distHead}</th>
                <th>Foot of the perpendicular</th>
                <th>Image</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => {
                const still = same(row.p, row.image, r.three);
                return (
                  <tr key={row.label} className={still ? 'idle' : undefined}>
                    <td className="obj">
                      <span className="swatch obj-swatch" />
                      {row.label} {ptText(row.p, r.three)}
                    </td>
                    <td data-label={valueHead}>
                      {r.kind === 'line3' ? num(row.t) : num(row.value)}
                    </td>
                    <td data-label={distHead}>
                      {num(row.dist, 3)}
                      {row.side !== 0 && !still && (
                        <span className="calc-exp"> ({row.side > 0 ? 'positive' : 'negative'} side)</span>
                      )}
                    </td>
                    <td data-label="Foot">{ptText(row.foot, r.three)}</td>
                    <td data-label="Image"><b>{ptText(row.image, r.three)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!single && <Congruence r={r} />}
        <Working r={r} />
      </div>
    </section>
  );
}
