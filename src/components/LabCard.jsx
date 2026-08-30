import { Link } from 'react-router-dom';
import { subjectById } from '../data/labs';

export default function LabCard({ lab, featured }) {
  const sub = subjectById(lab.subject);
  const ready = lab.status === 'ready';
  const Wrapper = ready ? Link : 'div';
  const props = ready ? { to: `/labs/${lab.slug}` } : { 'aria-disabled': true };

  return (
    <Wrapper {...props}
             className={`lab-card${featured ? ' featured' : ''}${ready ? '' : ' soon'}`}
             data-subject={lab.subject}>
      <div className="lab-card-top">
        <span className="subject-badge">{sub?.name}</span>
        {ready
          ? <span className="lab-level">{lab.level}</span>
          : <span className="soon-badge">Coming soon</span>}
      </div>
      <h3>{lab.title}</h3>
      <p className="lab-topic">{lab.topic}</p>
      <p className="lab-blurb">{lab.blurb}</p>
      {ready && (
        <span className="lab-go">
          Open the lab
          <svg viewBox="0 0 16 12" aria-hidden="true">
            <path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" />
          </svg>
        </span>
      )}
    </Wrapper>
  );
}
