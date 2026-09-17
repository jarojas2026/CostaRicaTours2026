import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ToursProvider } from './contexts/ToursContext';
import { ErrorBoundary } from './components/ErrorBoundary';

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
