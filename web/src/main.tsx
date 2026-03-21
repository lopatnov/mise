import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@picocss/pico/css/pico.orange.min.css';
import './i18n';
import App from './App.tsx';
import './styles/main.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
