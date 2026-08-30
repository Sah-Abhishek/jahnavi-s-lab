import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { labBySlug, subjectById } from '../data/labs';
import NotFound from './NotFound';

export default function LabPage() {
  const { slug } = useParams();
  const lab = labBySlug(slug);
  if (!lab) return <NotFound />;

  const sub = subjectById(lab.subject);
  const Lab = lab.component;

  return (
    <div className="lab-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/labs">All labs</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/labs?subject=${lab.subject}`}>{sub?.name}</Link>
      </nav>

      <header className="lab-head">
        <div>
          <p className="eyebrow">{lab.topic}</p>
          <h1>{lab.title}</h1>
          <p className="lab-lede">{lab.summary || lab.blurb}</p>
        </div>
        <div className="lab-meta">
          <span className="subject-badge" data-subject={lab.subject}>{sub?.name}</span>
          <span className="lab-level">{lab.level}</span>
        </div>
      </header>

      {Lab ? (
        <Suspense fallback={<div className="lab-loading">Setting up the apparatus…</div>}>
          <Lab />
        </Suspense>
      ) : (
        <div className="card soon-panel">
          <h2>This one is still on the bench</h2>
          <p>
            {lab.blurb} It is planned, but not built yet — the labs go up one at a time so each
            one is worth opening.
          </p>
          <Link className="btn primary" to="/labs">See what is ready</Link>
        </div>
      )}
    </div>
  );
}
