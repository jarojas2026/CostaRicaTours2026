import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToursProvider } from './contexts/ToursContext';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToursProvider>
        <App />
      </ToursProvider>
    </ErrorBoundary>
  </StrictMode>,
);
