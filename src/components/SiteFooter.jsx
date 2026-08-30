import { Link } from 'react-router-dom';
import { SUBJECTS, LABS } from '../data/labs';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="foot-brand">
          <strong>Jahnavi's Lab</strong>
          <p>Drag · predict · then check the working.</p>
        </div>
        <nav className="foot-cols" aria-label="Subjects">
          {SUBJECTS.map((sub) => {
            const ready = LABS.filter((l) => l.subject === sub.id && l.status === 'ready');
            return (
              <div key={sub.id} className="foot-col">
                <Link className="foot-head" to={`/labs?subject=${sub.id}`}>{sub.name}</Link>
                {ready.length
                  ? ready.map((l) => (
                      <Link key={l.slug} to={`/labs/${l.slug}`}>{l.title}</Link>
                    ))
                  : <span className="foot-soon">Coming soon</span>}
              </div>
            );
          })}
        </nav>
      </div>
      <p className="foot-fine">
        Everything you set up is kept in your own browser. Nothing leaves your device.
      </p>
    </footer>
  );
}
