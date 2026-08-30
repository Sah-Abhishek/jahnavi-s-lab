import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/lab-shell.css';

/* HashRouter, not BrowserRouter: the site is built to static files and may be
   opened straight off disk or dropped on any static host without a rewrite rule. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
