/* ============================================================
   The catalogue page.
   The chosen subject lives in the URL, so a filtered shelf can be
   linked to and the back button steps through filters the way a
   reader expects.
   ============================================================ */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SUBJECTS, LABS, subjectById } from '../data/labs';
import LabCard from '../components/LabCard';

export default function LabsIndex() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const subject = params.get('subject');
  const active = subjectById(subject) ? subject : 'all';

  const setSubject = (id) => {
    if (id === 'all') setParams({}, { replace: true });
    else setParams({ subject: id }, { replace: true });
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LABS.filter((l) => {
      if (active !== 'all' && l.subject !== active) return false;
      if (!q) return true;
      return [l.title, l.topic, l.blurb, ...(l.tags || [])]
        .join(' ').toLowerCase().includes(q);
    });
  }, [active, query]);

  const ready = shown.filter((l) => l.status === 'ready');
  const soon = shown.filter((l) => l.status !== 'ready');

  return (
    <div className="labs-page">
      <div className="page-head">
        <p className="eyebrow">The shelf</p>
        <h1>All labs</h1>
        <p className="page-lede">
          Pick a subject, or search for a topic. Labs marked <em>coming soon</em> are on the
          bench — the rest are ready to open.
        </p>
      </div>

      <div className="filter-bar">
        <div className="filter-chips" role="group" aria-label="Filter by subject">
          <button className={`chip${active === 'all' ? ' active' : ''}`}
                  onClick={() => setSubject('all')}>
            All <span className="chip-n">{LABS.length}</span>
          </button>
          {SUBJECTS.map((s) => (
            <button key={s.id} data-subject={s.id}
                    className={`chip${active === s.id ? ' active' : ''}`}
                    onClick={() => setSubject(s.id)}>
              {s.name} <span className="chip-n">
                {LABS.filter((l) => l.subject === s.id).length}
              </span>
            </button>
          ))}
        </div>
        <label className="search">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.6" /><path d="m10.4 10.4 3.1 3.1" />
          </svg>
          <input type="search" value={query} placeholder="Search topics…"
                 aria-label="Search labs"
                 onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {!shown.length && (
        <p className="empty-note">
          Nothing matches “{query}” yet. Try a broader word, or clear the subject filter.
        </p>
      )}

      {ready.length > 0 && (
        /* while only one lab is ready it spans, rather than sitting alone in a
           four-up grid looking like the page failed to load the rest */
        <div className={`lab-grid${ready.length === 1 ? ' single' : ''}`}>
          {ready.map((l) => <LabCard key={l.slug} lab={l} />)}
        </div>
      )}

      {soon.length > 0 && (
        <>
          <h2 className="shelf-head">On the bench</h2>
          <div className="lab-grid">
            {soon.map((l) => <LabCard key={l.slug} lab={l} />)}
          </div>
        </>
      )}
    </div>
  );
}
