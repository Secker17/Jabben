import { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GalleryProvider } from './context/GalleryContext';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { GlobalStyle } from './styles/GlobalStyle';

const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage })),
);
const WorkPage = lazy(() =>
  import('./pages/WorkPage').then((module) => ({ default: module.WorkPage })),
);
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })),
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((module) => ({
    default: module.ContactPage,
  })),
);
const StudioPage = lazy(() =>
  import('./pages/StudioPage').then((module) => ({
    default: module.StudioPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
);

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span>Developing</span>
      <i />
      <span>Developing photographs</span>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function PublicLayout() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <ScrollToTop />
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <GlobalStyle />
      <AuthProvider>
        <GalleryProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="work" element={<WorkPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="arbeid" element={<Navigate to="/work" replace />} />
                <Route path="om" element={<Navigate to="/about" replace />} />
                <Route
                  path="kontakt"
                  element={<Navigate to="/contact" replace />}
                />
              </Route>
              <Route path="studio" element={<StudioPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </GalleryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
