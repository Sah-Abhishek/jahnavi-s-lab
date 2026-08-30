import { Link } from 'react-router-dom';
import { SUBJECTS, LABS, readyLabs } from '../data/labs';
import LabCard from '../components/LabCard';

const STEPS = [
  { n: '01', title: 'Drag something',
    body: 'Every lab is a real apparatus, not a video. Move the pieces and it responds at once.' },
  { n: '02', title: 'Predict what happens',
    body: 'Say what you think before you look. The working stays hidden until you commit.' },
  { n: '03', title: 'Check the working',
    body: 'Then see the whole calculation set out line by line, the way you would write it.' },
];

export default function Landing() {
  const featured = readyLabs()[0];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Physics · Chemistry · Maths · Biology</p>
          <h1>Jahnavi's Lab</h1>
          <p className="hero-lede">
            Science you can pick up and move. Each lab is a working experiment — pull it about,
            guess what happens next, then watch the numbers explain themselves.
          </p>
          <div className="hero-actions">
            <Link className="btn primary big" to="/labs">Browse the labs</Link>
            {featured && (
              <Link className="btn ghost big" to={`/labs/${featured.slug}`}>
                Start with {featured.title}
              </Link>
            )}
          </div>
          <p className="hero-note">
            No sign-in, no downloads. Works on a phone, and remembers where you left off.
          </p>
        </div>

        <div className="hero-art">
          <div className="hero-plate">
            <img src="./jahnavi.png" width="600" height="589"
                 alt="Jahnavi, waving hello" />
          </div>
          <p className="hero-caption">Hi! Pick a lab and let's take it apart.</p>
        </div>
      </section>

      <section className="subjects">
        <div className="section-head">
          <h2>Four shelves</h2>
          <p>Every lab lives on one of these. More arrive as they are built.</p>
        </div>
        <div className="subject-grid">
          {SUBJECTS.map((sub) => {
            const all = LABS.filter((l) => l.subject === sub.id);
            const ready = all.filter((l) => l.status === 'ready').length;
            return (
              <Link key={sub.id} className="subject-card" data-subject={sub.id}
                    to={`/labs?subject=${sub.id}`}>
                <h3>{sub.name}</h3>
                <p>{sub.blurb}</p>
                <span className="subject-count">
                  {ready ? `${ready} lab${ready > 1 ? 's' : ''} ready` : 'In the making'}
                  <span className="dim"> · {all.length} planned</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {featured && (
        <section className="featured">
          <div className="section-head">
            <h2>Open first</h2>
            <p>The lab that started all this.</p>
          </div>
          <div className="featured-row">
            <LabCard lab={featured} featured />
            <ul className="teaches">
              <li className="teaches-head">What you come away with</li>
              {featured.teaches.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </section>
      )}

      <section className="how">
        <div className="section-head">
          <h2>How every lab works</h2>
        </div>
        <ol className="how-grid">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="how-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
