import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './features/theme/context/ThemeContext';
import { SpacesProvider } from './features/spaces/context/SpacesContext';
import { DockProvider } from './features/dock/context/DockContext';
import { ZenShelfProvider } from './features/shelf/context/ZenShelfContext';
import { LanguageProvider } from './shared/context/LanguageContext';
import { ErrorBoundary } from './shared/components/ErrorBoundary/ErrorBoundary';
import { migrateLegacyBrandStorage } from './shared/utils/brandMigration';
import './shared/styles/global.css';

migrateLegacyBrandStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    <ErrorBoundary>
      <ThemeProvider>
        <SpacesProvider>
          <DockProvider>
            <ZenShelfProvider>
              <App />
            </ZenShelfProvider>
          </DockProvider>
        </SpacesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </LanguageProvider>
);

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
