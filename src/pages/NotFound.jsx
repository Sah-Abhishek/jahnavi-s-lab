import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="notfound">
      <p className="eyebrow">404</p>
      <h1>No lab here</h1>
      <p>That bench is empty. Everything that exists is on the shelf.</p>
      <Link className="btn primary" to="/labs">Browse the labs</Link>
    </div>
  );
}
