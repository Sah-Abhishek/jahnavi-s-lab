/* ============================================================
   A custom listbox, so gravity looks and behaves the same in
   every browser instead of inheriting a native <select> popup.
   Full keyboard support: arrows, Home/End, Enter/Space, Escape.
   ============================================================ */
import { useEffect, useRef, useState } from 'react';

export default function Listbox({ label, labelId, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const trigger = useRef(null);
  const optRefs = useRef([]);

  /* Values may be numbers (gravity, where float dust is a real risk) or plain
     strings (an id). Comparing a string with subtraction gives NaN, which is
     never less than the tolerance — so the two cases are told apart first. */
  const index = options.findIndex((o) => (
    typeof o.value === 'number' && typeof value === 'number'
      ? Math.abs(o.value - value) < 1e-9
      : o.value === value
  ));
  const current = options[index] || options[0];

  useEffect(() => {
    if (!open) return;
    optRefs.current[Math.max(index, 0)]?.focus();
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open, index]);

  const choose = (o) => { onChange(o.value); setOpen(false); trigger.current?.focus(); };

  const onListKey = (e) => {
    const i = optRefs.current.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = Math.min(options.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
      optRefs.current[n]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      optRefs.current[e.key === 'Home' ? 0 : options.length - 1]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (i >= 0) choose(options[i]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      if (e.key === 'Escape') { e.preventDefault(); trigger.current?.focus(); }
    }
  };

  return (
    <div className={`cselect${open ? ' open' : ''}`} ref={wrap}>
      <button type="button" className="cselect-trigger" ref={trigger}
              aria-haspopup="listbox" aria-expanded={open} aria-labelledby={labelId}
              onClick={() => setOpen((o) => !o)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); }
              }}>
        <span className="cselect-text">
          <span className="cselect-name">{current?.name}</span>
          <span className="cselect-sub">{current?.sub}</span>
        </span>
        <span className="cselect-num">{current?.num}</span>
        <svg className="cselect-chev" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1.5 1.75 6 6.25l4.5-4.5" />
        </svg>
      </button>
      <ul className="cselect-list" role="listbox" aria-label={label}
          hidden={!open} onKeyDown={onListKey}>
        {options.map((o, i) => (
          <li key={o.name} role="option" tabIndex={-1}
              ref={(n) => { optRefs.current[i] = n; }}
              aria-selected={i === index}
              onClick={() => choose(o)}>
            <span className="cselect-text">
              <span className="cselect-name">{o.name}</span>
              <span className="cselect-sub">{o.sub}</span>
            </span>
            <span className="cselect-num">{o.num}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
