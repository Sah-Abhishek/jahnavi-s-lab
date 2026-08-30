/* ============================================================
   Three theme states, matching the stylesheet: an explicit light
   or dark choice stamps the root element; "auto" leaves it
   unstamped so prefers-color-scheme decides.

   The key is read by the inline script in index.html too, which
   applies it before the first paint — hence the shared name.
   ============================================================ */
import { useCallback, useEffect, useState } from 'react';

const THEME_KEY = 'jahnavis-lab/theme';

function read() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch (e) { /* storage denied */ }
  return 'auto';
}

export function useTheme() {
  const [theme, setTheme] = useState(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') {
      root.removeAttribute('data-theme');
      root.style.colorScheme = 'light dark';
    } else {
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme;
    }
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* unsaved */ }
  }, [theme]);

  return [theme, useCallback((t) => setTheme(t), [])];
}
