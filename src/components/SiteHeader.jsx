import { NavLink, Link } from 'react-router-dom';
import ThemeSwitch from './ThemeSwitch';

/* A conical flask, drawn the way the labs are: outline, one wash of
   colour, and a measuring mark. Subject-neutral, so it suits maths
   and biology as readily as chemistry. */
function Flask() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <path className="mark-glass" d="M13 4v8.2L5.6 24.6A2.4 2.4 0 0 0 7.7 28h16.6a2.4 2.4
                                     0 0 0 2.1-3.4L19 12.2V4" />
      <path className="mark-fluid" d="M9.9 19h12.2l4.2 5.6A2.4 2.4 0 0 1 24.3 28H7.7a2.4 2.4
                                     0 0 1-2.1-3.4z" />
      <path className="mark-lip" d="M11 4h10" />
      <circle className="mark-bubble" cx="13.5" cy="23" r="1.5" />
      <circle className="mark-bubble" cx="18.5" cy="24.5" r="1" />
    </svg>
  );
}

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" to="/">
          <Flask />
          <span className="brand-text">
            <span className="brand-name">Jahnavi's Lab</span>
            <span className="brand-sub">labs you can play with</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/labs">All labs</NavLink>
        </nav>

        <ThemeSwitch />
      </div>
    </header>
  );
}
