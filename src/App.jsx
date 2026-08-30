import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import Landing from './pages/Landing';
import LabsIndex from './pages/LabsIndex';
import LabPage from './pages/LabPage';
import NotFound from './pages/NotFound';

/** A new page should start at the top, the way a new page does. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <a className="skip" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main" className="site-main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/labs" element={<LabsIndex />} />
          <Route path="/labs/:slug" element={<LabPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <SiteFooter />
    </>
  );
}
