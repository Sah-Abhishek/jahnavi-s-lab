/* ============================================================
   A box you can write an equation into.

   It marks what you type as you type it, and hands the line over
   the moment it becomes a real one — so the mirror on the graph
   follows the keystrokes rather than waiting for a submit. While
   the box has focus it shows what was typed; on leaving, it shows
   the tidied form of whatever is actually on the graph, which may
   by then have been dragged somewhere else entirely.
   ============================================================ */
import { useState } from 'react';

export default function EquationField({
  id, value, parse, onLine, placeholder, disabled, hint,
}) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);

  const type = (raw) => {
    setDraft(raw);
    if (!raw.trim()) { setError(null); return; }
    const got = parse(raw);
    if (got.error) setError(got.error);
    else { setError(null); onLine(got); }
  };

  return (
    <div className={`eqfield${error ? ' bad' : ''}`}>
      <input id={id} type="text" spellCheck="false" autoComplete="off"
             className="eq-input" value={draft !== null ? draft : value} disabled={disabled}
             placeholder={placeholder}
             onChange={(e) => type(e.target.value)}
             onBlur={() => { setDraft(null); setError(null); }}
             onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      {error
        ? <p className="eq-error">{error}</p>
        : <p className="eq-ok">{hint || 'Type it any way you like — press Enter to tidy it up.'}</p>}
    </div>
  );
}
