/* ============================================================
   A number field flanked by its own − and + keys: precise on a
   desktop, tappable on a phone, and free of the browser's tiny
   native spinners.

   While the field has focus it shows what was typed, not what the
   state rounded it to — so "1." and "" survive long enough to
   become "1.5", and the caret never jumps mid-edit.
   ============================================================ */
import { useEffect, useRef, useState } from 'react';

const HOLD_DELAY = 420;   // before a held key starts repeating
const HOLD_RATE = 80;     // and how fast it repeats after that

function decimalsOf(v) {
  const t = Number(v).toPrecision(12).replace(/0+$/, '').replace(/\.$/, '');
  const i = t.indexOf('.');
  return i < 0 ? 0 : t.length - i - 1;
}

export default function Stepper({
  value, min, max, step, unit, onChange, disabled,
  format = (v) => String(v), less = 'Less', more = 'More', mini, id,
}) {
  const [draft, setDraft] = useState(null);
  const timers = useRef({ wait: null, run: null });

  const stopHold = () => {
    clearTimeout(timers.current.wait);
    clearInterval(timers.current.run);
    timers.current = { wait: null, run: null };
  };
  useEffect(() => stopHold, []);

  const bump = (dir) => {
    const st = Number(step) || 1;
    const from = isFinite(value) ? value : (isFinite(min) ? min : 0);
    let v = Math.min(isFinite(max) ? max : Infinity,
                     Math.max(isFinite(min) ? min : -Infinity,
                              Math.round((from + st * dir) / st) * st));
    v = Number(v.toFixed(Math.min(6, decimalsOf(st))));
    if (v !== value) { setDraft(null); onChange(v); }
  };

  const hold = (e, dir) => {
    if (disabled) return;
    e.preventDefault();
    bump(dir);
    stopHold();
    timers.current.wait = setTimeout(() => {
      timers.current.run = setInterval(() => bump(dir), HOLD_RATE);
    }, HOLD_DELAY);
  };

  const btn = (dir, label, glyph) => (
    <button type="button" className="step-btn" tabIndex={-1} aria-label={label}
            disabled={disabled}
            onPointerDown={(e) => hold(e, dir)}
            onPointerUp={stopHold} onPointerCancel={stopHold} onPointerLeave={stopHold}
            /* keyboard activation never fires pointerdown, so it needs its own path */
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(dir); } }}>
      {glyph}
    </button>
  );

  return (
    <div className={`stepper${mini ? ' mini' : ''}${disabled ? ' off' : ''}`}>
      {btn(-1, less, '−')}
      <span className="step-field">
        <input
          type="number" inputMode="decimal" id={id}
          min={min} max={max} step={step} disabled={disabled}
          value={draft !== null ? draft : format(value)}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const v = parseFloat(raw);
            if (isFinite(v)) onChange(v);        // mid-edit "" and "1." simply wait
          }}
          onBlur={() => setDraft(null)}          /* tidy the typed value once it is left */
        />
        <span className="unit">{unit}</span>
      </span>
      {btn(1, more, '+')}
    </div>
  );
}
