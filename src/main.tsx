import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToursProvider } from './contexts/ToursContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToursProvider>
      <App />
    </ToursProvider>
  </StrictMode>,
);
