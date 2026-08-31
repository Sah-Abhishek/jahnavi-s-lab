/* ============================================================
   A panel that floats over a full-bleed stage.

   Used by any lab whose apparatus takes the whole card: the
   controls sit on the right, the working out at the bottom left,
   and either can be put away so the drawing gets the room back.

   It is kept mounted while hidden — a challenge in progress must
   survive being tidied out of the way.
   ============================================================ */
export default function FloatPanel({ where, title, onClose, hidden, head, innerRef, children }) {
  return (
    <aside className={`float-panel ${where}`} hidden={hidden} aria-label={title} ref={innerRef}>
      <header className="float-head">
        {head || <span className="float-title">{title}</span>}
        <button type="button" className="float-close" onClick={onClose}
                aria-label={`Put the ${title.toLowerCase()} away`} title="Put away">
          ✕
        </button>
      </header>
      <div className="float-body">{children}</div>
    </aside>
  );
}
