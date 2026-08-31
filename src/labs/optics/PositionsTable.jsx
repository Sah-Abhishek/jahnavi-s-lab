/* ============================================================
   Light — the six standard positions.

   Every syllabus prints this table and expects it learnt. Here the
   lab fills it in by working each row out from where the object
   would be, so it is a result rather than a poster — and each row
   is a button, so the apparatus goes there and you can check it.
   ============================================================ */
import { mirrorImage, lensImage, num } from './engine.js';

const sizeWord = (m) => (Math.abs(Math.abs(m) - 1) < 0.02 ? 'same size'
  : Math.abs(m) > 1 ? 'magnified' : 'diminished');

export default function PositionsTable({ f, u, mirror, onGo }) {
  const F = Math.abs(f);
  const rows = mirror
    ? [
      ['at infinity', -400 * F, 'at F'],
      ['beyond C', -3 * F, 'between F and C'],
      ['at C', -2 * F, 'at C'],
      ['between C and F', -1.5 * F, 'beyond C'],
      ['at F', -F, 'at infinity'],
      ['between F and the pole', -0.5 * F, 'behind the mirror'],
    ]
    : [
      ['at infinity', -400 * F, 'at F′'],
      ['beyond 2F', -3 * F, 'between F′ and 2F′'],
      ['at 2F', -2 * F, 'at 2F′'],
      ['between 2F and F', -1.5 * F, 'beyond 2F′'],
      ['at F', -F, 'at infinity'],
      ['inside F', -0.5 * F, 'same side as the object'],
    ];

  return (
    <div className="table-wrap positions">
      <table>
        <thead>
          <tr>
            <th>Object</th><th>Image</th><th>Nature</th><th>Size</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([where, at, imageAt]) => {
            const im = mirror ? mirrorImage(f, at) : lensImage(f, at);
            const runaway = !isFinite(im.v);
            const now = Math.abs(u - at) / Math.max(1, Math.abs(at)) < 0.06;
            return (
              <tr key={where} className={now ? 'now' : ''}>
                <td data-label="Object" className="obj">
                  <button type="button" className="row-go"
                          onClick={() => onGo(at)}
                          title={`Put the object ${where}`}>{where}</button>
                </td>
                <td data-label="Image">{imageAt}</td>
                <td data-label="Nature">
                  {runaway ? '—' : `${im.real ? 'real' : 'virtual'}, ${im.erect ? 'erect' : 'inverted'}`}
                </td>
                <td data-label="Size">{runaway ? 'no image' : sizeWord(im.m)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
