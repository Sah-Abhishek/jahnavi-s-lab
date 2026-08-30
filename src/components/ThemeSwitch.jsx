import { useTheme } from '../hooks/useTheme';

const ICONS = {
  light: (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle className="fill" cx="9" cy="9" r="3.4" />
      <path className="line" d="M9 1.2v2.1M9 14.7v2.1M1.2 9h2.1M14.7 9h2.1
                                M3.5 3.5l1.5 1.5M13 13l1.5 1.5M14.5 3.5L13 5M5 13l-1.5 1.5" />
    </svg>
  ),
  auto: (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle className="line" cx="9" cy="9" r="6.2" />
      <path className="fill" d="M9 2.8a6.2 6.2 0 0 0 0 12.4z" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path className="fill" d="M15 10.6A6.4 6.4 0 0 1 7.4 3a6.4 6.4 0 1 0 7.6 7.6z" />
    </svg>
  ),
};
const LABELS = { light: 'Light theme', auto: 'Match system theme', dark: 'Dark theme' };
const TITLES = { light: 'Light', auto: 'Match my system', dark: 'Dark' };

export default function ThemeSwitch() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Colour theme">
      {['light', 'auto', 'dark'].map((t) => (
        <button key={t} type="button" role="radio"
                className={`th${theme === t ? ' active' : ''}`}
                aria-checked={theme === t} title={TITLES[t]} aria-label={LABELS[t]}
                onClick={() => setTheme(t)}>
          {ICONS[t]}
        </button>
      ))}
    </div>
  );
}
