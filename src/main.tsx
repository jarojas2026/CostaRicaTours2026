import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ToursProvider } from './contexts/ToursContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installViteChunkRecovery } from './utils/viteChunkRecovery';
import { initClientSentry } from './observability/sentry';

installViteChunkRecovery(window);
// Opt-in: no-op unless VITE_SENTRY_DSN is set; the SDK loads in its own chunk.
void initClientSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToursProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToursProvider>
    </ErrorBoundary>
  </StrictMode>,
);
